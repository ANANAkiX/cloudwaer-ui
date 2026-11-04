<template>
  <div class="form-renderer">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-width="labelWidth"
      :disabled="readonly"
      :size="size"
    >
      <div class="form-rows">
        <div v-for="(rowFields, rowIdx) in groupedRows" :key="'row-' + rowIdx" class="form-row">
          <template v-for="field in rowFields" :key="field.id">
            <!-- 分割线 -->
            <div v-if="field.type === 'divider'" class="form-grid-item" :style="gridStyle(field)">
              <el-divider :content-position="'center'">{{ field.label || '' }}</el-divider>
            </div>
            <!-- 静态文本 -->
            <div v-else-if="field.type === 'text'" class="form-grid-item" :style="gridStyle(field)">
              <div class="static-text">{{ field.tip || field.label }}</div>
            </div>
            <!-- 表单字段 -->
            <el-form-item
              v-else
              class="form-grid-item"
              :style="gridStyle(field)"
              :label="field.label"
              :prop="field.id"
              :required="field.required"
            >
            <!-- 单行文本 -->
            <el-input
              v-if="field.type === 'input'"
              v-model="formData[field.id]"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :maxlength="field.max"
              :disabled="isReadonly(field)"
              clearable
            />

            <!-- 多行文本 -->
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="formData[field.id]"
              type="textarea"
              :rows="3"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :maxlength="field.max"
            />

            <!-- 数字 -->
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="formData[field.id]"
              :min="field.min"
              :max="field.max"
              :precision="field.precision"
              :placeholder="field.placeholder"
              style="width: 100%"
            />

            <!-- 日期 -->
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="formData[field.id]"
              type="date"
              :placeholder="field.placeholder || '选择日期'"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />

            <!-- 日期时间 -->
            <el-date-picker
              v-else-if="field.type === 'datetime'"
              v-model="formData[field.id]"
              type="datetime"
              :placeholder="field.placeholder || '选择日期时间'"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />

            <!-- 单选 -->
            <el-radio-group v-else-if="field.type === 'radio'" v-model="formData[field.id]">
              <el-radio v-for="opt in field.options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </el-radio>
            </el-radio-group>

            <!-- 多选 -->
            <el-checkbox-group v-else-if="field.type === 'checkbox'" v-model="formData[field.id]">
              <el-checkbox v-for="opt in field.options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </el-checkbox>
            </el-checkbox-group>

            <!-- 下拉 -->
            <el-select
              v-else-if="field.type === 'select'"
              v-model="formData[field.id]"
              :placeholder="field.placeholder || '请选择'"
              :disabled="isReadonly(field)"
              clearable
              style="width: 100%"
            >
              <el-option v-for="opt in field.options" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>

            <!-- 文件上传 -->
            <el-upload
              v-else-if="field.type === 'upload'"
              :file-list="getUploadList(field)"
              :action="uploadAction"
              :limit="field.uploadLimit || field.max"
              :accept="field.uploadAccept"
              :list-type="field.uploadListType || 'text'"
              :disabled="isReadonly(field)"
              :headers="uploadHeaders"
              :on-success="makeUploadSuccess(field)"
              :on-remove="makeUploadRemove(field)"
            >
              <el-button size="small" :disabled="isReadonly(field)">点击上传</el-button>
            </el-upload>

            <!-- 人员选择 -->
            <el-select
              v-else-if="field.type === 'user'"
              v-model="formData[field.id]"
              :placeholder="field.placeholder || '选择人员'"
              filterable
              clearable
              style="width: 100%"
            >
              <el-option v-for="u in userList" :key="u.value" :label="u.label" :value="u.value" />
            </el-select>

            <!-- 未知类型 -->
            <el-input
              v-else
              v-model="formData[field.id]"
              :placeholder="field.placeholder"
              disabled
            />

            <!-- 提示 -->
            <div v-if="field.tip" class="field-tip">{{ field.tip }}</div>
            </el-form-item>
          </template>
        </div>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

/** 表单字段定义 */
export interface FormField {
  id: string
  label: string
  type: 'input' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'radio' | 'checkbox' | 'upload' | 'user' | 'divider' | 'text'
  span?: number
  row?: number
  readonly?: boolean
  defaultValue?: any
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  precision?: number
  options?: { label: string; value: any; children?: any[] }[]
  remoteUrl?: string
  remoteLabelField?: string
  remoteValueField?: string
  dictType?: string
  uploadListType?: 'text' | 'picture' | 'picture-card'
  uploadAccept?: string
  uploadLimit?: number
  tip?: string
  visibleWhen?: { field: string; value: any }
}

const props = withDefaults(defineProps<{
  /** 表单字段定义（JSON Schema 解析后的数组） */
  fields: FormField[]
  /** 初始数据 */
  modelValue?: Record<string, any>
  /** 只读模式 */
  readonly?: boolean
  /** 标签宽度 */
  labelWidth?: string
  /** 尺寸 */
  size?: 'small' | 'default' | 'large'
}>(), {
  modelValue: () => ({}),
  readonly: false,
  labelWidth: '100px',
  size: 'default'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
  (e: 'validate', valid: boolean): void
}>()

const formRef = ref<FormInstance>()
const formData = ref<Record<string, any>>({})
const userList = ref<{ label: string; value: string }[]>([])
const uploadAction = '/api/admin/file/upload'

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token') || ''
  return {
    Authorization: `Bearer ${token}`,
    'X-Client-Id': 'admin'
  }
})

function getUploadList(field: FormField) {
  const val = formData.value[field.id]
  if (!val) return []
  if (Array.isArray(val)) {
    return val.map((item: any) => {
      if (typeof item === 'string') {
        return { name: item.split('/').pop(), url: item }
      }
      return { name: item.name, url: item.accessUrl || item.url }
    })
  }
  return []
}

function makeUploadRemove(field: FormField) {
  return (file: any) => {
    const existing = formData.value[field.id]
    if (Array.isArray(existing)) {
      formData.value[field.id] = existing.filter((f: any) => f.url !== file.url)
    }
  }
}

function makeUploadSuccess(field: FormField) {
  return (res: any, file: any) => onUploadSuccess(field, res, file)
}

function onUploadSuccess(field: FormField, res: any, file: any) {
  // 存储真实的 accessUrl，而非 blob URL
  const url = res?.data?.accessUrl || res?.accessUrl || file?.url
  const name = res?.data?.fileName || file?.name
  const existing = formData.value[field.id]
  const list = Array.isArray(existing) ? [...existing] : []
  list.push({ name, url })
  formData.value[field.id] = list
}

function gridStyle(field: FormField) {
  const span = field.span || 24
  return {
    width: `calc(${span} / 24 * 100%)`,
    paddingRight: '8px'
  }
}

// 行分组
const groupedRows = computed(() => {
  const list = visibleFields.value
  const maxRow = list.reduce((max, f) => Math.max(max, f.row ?? 0), 0)
  const rows: FormField[][] = []
  for (let i = 0; i <= maxRow; i++) {
    rows.push(list.filter(f => (f.row ?? 0) === i))
  }
  return rows.filter(r => r.length > 0)
})

// ===== 构建表单数据和校验规则 =====
const formRules = computed<FormRules>(() => {
  const rules: FormRules = {}
  props.fields.forEach(field => {
    const fieldRules: any[] = []
    if (field.required) {
      fieldRules.push({ required: true, message: `请输入${field.label}`, trigger: 'blur' })
    }
    if (field.type === 'number' && (field.min !== undefined || field.max !== undefined)) {
      fieldRules.push({
        type: 'number',
        min: field.min,
        max: field.max,
        message: `${field.label}应在 ${field.min ?? '-∞'} ~ ${field.max ?? '+∞'} 之间`,
        trigger: 'blur'
      })
    }
    if (fieldRules.length > 0) {
      rules[field.id] = fieldRules
    }
  })
  return rules
})

// ===== 联动显隐 =====
const visibleFields = computed(() => {
  return props.fields.filter(field => {
    if (!field.visibleWhen) return true
    return formData.value[field.visibleWhen.field] === field.visibleWhen.value
  })
})

// ===== 初始化 =====
let isInternalUpdate = false

watch(() => props.modelValue, (val) => {
  if (isInternalUpdate) return
  isInternalUpdate = true
  formData.value = {}
  if (val) {
    Object.keys(val).forEach(key => {
      formData.value[key] = val[key]
    })
  }
  nextTick(() => { isInternalUpdate = false })
}, { immediate: true, deep: true })

// 初始化默认值 + 加载数据源（只执行一次，防重复请求）
const loadedDataSources = ref<Set<string>>(new Set())

watch(() => props.fields, (fieldsList) => {
  if (!fieldsList) return
  for (const field of fieldsList) {
    if (field.defaultValue !== undefined && formData.value[field.id] === undefined) {
      formData.value[field.id] = field.defaultValue
    }
  }
  // 加载远程/字典数据（每个字段只加载一次）
  for (const field of fieldsList) {
    const key = field.id
    if (loadedDataSources.value.has(key)) continue
    if (field.remoteUrl && ['select', 'radio', 'checkbox'].includes(field.type)) {
      loadedDataSources.value.add(key)
      loadRemoteOptions(field)
    } else if (field.dictType && ['select', 'radio', 'checkbox'].includes(field.type)) {
      loadedDataSources.value.add(key)
      loadDictOptions(field)
    }
  }
}, { immediate: true })

// 远程选项缓存
const remoteOptionsMap = ref<Record<string, { label: string; value: any }[]>>({})

async function loadRemoteOptions(field: FormField) {
  if (!field.remoteUrl) return
  try {
    const resp = await fetch(field.remoteUrl)
    const data = await resp.json()
    const list = Array.isArray(data) ? data : (data.data || data.records || [])
    const labelField = field.remoteLabelField || 'label'
    const valueField = field.remoteValueField || 'value'
    remoteOptionsMap.value[field.id] = list.map((item: any) => ({
      label: item[labelField],
      value: item[valueField]
    }))
    field.options = remoteOptionsMap.value[field.id]
  } catch (e) {
    console.warn('远程数据加载失败:', field.remoteUrl, e)
  }
}

async function loadDictOptions(field: FormField) {
  if (!field.dictType) return
  try {
    const { getDictByType } = await import('@/api/dict')
    const items = await getDictByType(field.dictType)
    field.options = (items || []).map((item: any) => ({
      label: item.label,
      value: item.value
    }))
    remoteOptionsMap.value[field.id] = field.options
  } catch (e) {
    console.warn('字典数据加载失败:', field.dictType, e)
  }
}

// 判断字段是否只读
function isReadonly(field: FormField): boolean {
  return field.readonly === true || props.readonly
}

watch(formData, (val) => {
  if (isInternalUpdate) return
  console.log('[FormRenderer] emit:', JSON.stringify(val))
  emit('update:modelValue', { ...val })
}, { deep: true })

// ===== 校验 =====
async function validate(): Promise<boolean> {
  if (!formRef.value) return true
  try {
    await formRef.value.validate()
    emit('validate', true)
    return true
  } catch {
    emit('validate', false)
    return false
  }
}

function resetFields() {
  formRef.value?.resetFields()
}

// 暴露给父组件
defineExpose({ validate, resetFields, formData })
</script>

<style scoped>
.form-renderer {
  width: 100%;
}

.form-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  min-height: 32px;
}

.form-grid-item {
  min-width: 0;
}

.static-text {
  font-size: 14px;
  color: var(--ink, #333);
  padding: 8px 0;
  line-height: 1.6;
}

.field-tip {
  font-size: 11px;
  color: var(--muted, #999);
  margin-top: 4px;
}
</style>
