<template>
  <div class="form-designer">
    <!-- 左侧：组件面板 -->
    <div class="designer-left">
      <div class="panel-title">组件</div>
      <div class="field-palette">
        <div
          v-for="item in fieldTypes"
          :key="item.type"
          class="palette-item"
          draggable="true"
          @dragstart="onPaletteDragStart(item.type, $event)"
        >
          <span class="palette-icon">{{ item.icon }}</span>
          <span class="palette-label">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 中间：画布 -->
    <div class="designer-center">
      <div class="panel-title">表单预览 <span class="grid-hint">拖拽组件调整位置</span></div>

      <div v-if="fields.length === 0" class="empty-canvas"
        @dragover.prevent
        @drop.prevent="onCanvasDrop(0, $event)"
      >
        从左侧拖入组件开始设计
      </div>

      <div class="canvas-rows" @dragover.prevent @drop.prevent="onCanvasDrop(-1, $event)">
        <template v-for="(rowFields, rowIdx) in groupedRows" :key="'row-' + rowIdx">
          <!-- 行上方插入区 -->
          <div
            class="row-insert"
            :class="{ active: hoverKey === 'row-top-' + rowIdx }"
            @dragover.prevent.stop="hoverKey = 'row-top-' + rowIdx"
            @drop.prevent.stop="onRowInsertDrop(rowIdx, $event)"
          ></div>

          <div
            class="canvas-row"
            :class="{ 'row-hover': hoverKey === 'row-' + rowIdx }"
            @dragover.prevent.stop="hoverKey = 'row-' + rowIdx"
            @drop.prevent.stop="onCanvasDrop(rowIdx, $event)"
          >
            <template v-for="(field, fIdx) in rowFields" :key="field.id">
              <!-- 字段左侧插入区 -->
              <div
                class="field-insert"
                :class="{ active: hoverKey === 'field-' + rowIdx + '-' + fIdx }"
                @dragover.prevent.stop="hoverKey = 'field-' + rowIdx + '-' + fIdx"
                @drop.prevent.stop="onFieldInsertDrop(rowIdx, fIdx, $event)"
              ></div>

              <div
                class="canvas-field"
                :class="{ selected: selectedField?.id === field.id, dragging: dragFieldId === field.id }"
                :style="{ width: calcWidth(field.span || 24) }"
                draggable="true"
                @dragstart="onFieldDragStart(field, $event)"
                @dragend="onFieldDragEnd"
                @click="selectField(field)"
              >
                <!-- 分割线 -->
                <template v-if="field.type === 'divider'">
                  <el-divider>{{ field.label || '' }}</el-divider>
                  <div class="field-del">
                    <el-button link size="small" type="danger" @click.stop="removeField(field)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </template>
                <!-- 其他组件 -->
                <template v-else>
                  <div class="field-hd">
                    <span class="tag">{{ getTypeLabel(field.type) }}</span>
                    <span class="name">{{ field.label || field.id }}</span>
                    <span class="sp">span:{{ field.span || 24 }}</span>
                    <span v-if="field.required" class="req">*</span>
                    <div class="ops">
                      <el-button link size="small" type="danger" @click.stop="removeField(field)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </div>
                  <div class="field-body" @click.stop="selectField(field)">
                    <el-input v-if="field.type === 'input'" disabled size="small" :placeholder="field.placeholder || field.label" />
                    <el-input v-else-if="field.type === 'textarea'" type="textarea" :rows="2" disabled size="small" />
                    <el-input-number v-else-if="field.type === 'number'" disabled size="small" style="width:100%" />
                    <el-date-picker v-else-if="field.type === 'date'" type="date" disabled size="small" style="width:100%" />
                    <el-date-picker v-else-if="field.type === 'datetime'" type="datetime" disabled size="small" style="width:100%" />
                    <el-select v-else-if="field.type === 'select'" disabled size="small" style="width:100%" />
                    <el-radio-group v-else-if="field.type === 'radio'" disabled>
                      <el-radio v-for="o in field.options" :key="o.value" :value="o.value">{{ o.label }}</el-radio>
                    </el-radio-group>
                    <el-checkbox-group v-else-if="field.type === 'checkbox'" disabled>
                      <el-checkbox v-for="o in field.options" :key="o.value" :value="o.value">{{ o.label }}</el-checkbox>
                    </el-checkbox-group>
                    <el-upload v-else-if="field.type === 'upload'" action="#" disabled>
                      <el-button size="small" disabled>上传</el-button>
                    </el-upload>
                    <el-select v-else-if="field.type === 'user'" disabled size="small" style="width:100%" />
                    <div v-else-if="field.type === 'text'" class="static-text">{{ field.tip || '静态文本' }}</div>
                    <el-input v-else disabled size="small" />
                  </div>
                </template>
              </div>
            </template>
            <!-- 行末尾插入区 -->
            <div
              class="field-insert"
              :class="{ active: hoverKey === 'field-end-' + rowIdx }"
              @dragover.prevent.stop="hoverKey = 'field-end-' + rowIdx"
              @drop.prevent.stop="onFieldInsertDrop(rowIdx, rowFields.length, $event)"
            ></div>
          </div>
        </template>

        <!-- 行下方插入区（最后一行之后） -->
        <div
          class="row-insert"
          :class="{ active: hoverKey === 'row-bottom' }"
          @dragover.prevent.stop="hoverKey = 'row-bottom'"
          @drop.prevent.stop="onRowInsertDrop(groupedRows.length, $event)"
        ></div>

        <!-- 底部提示区 -->
        <div
          class="drop-hint"
          :class="{ active: hoverKey === 'bottom' }"
          @dragover.prevent.stop="hoverKey = 'bottom'"
          @drop.prevent.stop="onCanvasDrop(-1, $event)"
        >
          拖拽组件到此添加新行
        </div>
      </div>
    </div>

    <!-- 右侧：属性面板 -->
    <div class="designer-right">
      <div class="panel-title">属性配置</div>
      <template v-if="selectedField">
        <el-form :model="selectedField" label-width="75px" size="small">
          <el-form-item label="字段ID">
            <el-input v-model="selectedField.id" />
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="selectedField.label" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="selectedField.type" style="width:100%">
              <el-option v-for="t in fieldTypes" :key="t.type" :label="t.label" :value="t.type" />
            </el-select>
          </el-form-item>
          <el-form-item label="宽度(span)">
            <el-slider v-model="fieldSpan" :min="4" :max="24" :step="4" show-stops :marks="{4:'',8:'',12:'',16:'',24:''}" />
            <div class="tip">{{ spanTip }}</div>
          </el-form-item>
          <template v-if="selectedField.type !== 'divider'">
            <el-form-item label="只读"><el-switch v-model="selectedField.readonly" /></el-form-item>
            <el-form-item label="默认值">
              <el-input v-if="['input','textarea','number','date','datetime'].includes(selectedField.type)" v-model="selectedField.defaultValue" />
              <el-select v-else-if="['select','radio'].includes(selectedField.type)" v-model="selectedField.defaultValue" clearable style="width:100%">
                <el-option v-for="o in selectedField.options" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
              <el-input v-else v-model="selectedField.defaultValue" />
            </el-form-item>
            <el-form-item label="必填"><el-switch v-model="selectedField.required" /></el-form-item>
            <el-form-item label="占位提示"><el-input v-model="selectedField.placeholder" /></el-form-item>
            <el-form-item v-if="selectedField.type === 'number'" label="最小值"><el-input-number v-model="selectedField.min" style="width:100%" /></el-form-item>
            <el-form-item v-if="selectedField.type === 'number'" label="最大值"><el-input-number v-model="selectedField.max" style="width:100%" /></el-form-item>
            <el-form-item v-if="selectedField.type === 'number'" label="小数位"><el-input-number v-model="selectedField.precision" :min="0" :max="6" style="width:100%" /></el-form-item>
            <template v-if="['select','radio','checkbox'].includes(selectedField.type)">
              <el-form-item label="数据来源">
                <el-radio-group v-model="dsMode" @change="onDsChange">
                  <el-radio value="static">静态</el-radio>
                  <el-radio value="remote">远程</el-radio>
                  <el-radio value="dict">字典</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="dsMode === 'static'" label="选项">
                <div class="opt-list">
                  <div v-for="(o,i) in selectedField.options" :key="i" class="opt-row">
                    <el-input v-model="o.label" size="small" placeholder="选项名" style="width:45%" />
                    <el-input v-model="o.value" size="small" placeholder="值" style="width:35%" />
                    <el-button link size="small" type="danger" @click="selectedField.options!.splice(i,1);emitUpdate()">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                  <el-button size="small" type="primary" link @click="selectedField.options!.push({label:'选项'+(selectedField.options!.length+1),value:String(selectedField.options!.length+1)});emitUpdate()">
                    <el-icon><Plus /></el-icon> 添加选项
                  </el-button>
                </div>
              </el-form-item>
              <template v-if="dsMode === 'remote'">
                <el-form-item label="远程URL"><el-input v-model="selectedField.remoteUrl" /></el-form-item>
                <el-form-item label="标签字段"><el-input v-model="selectedField.remoteLabelField" placeholder="label" /></el-form-item>
                <el-form-item label="值字段"><el-input v-model="selectedField.remoteValueField" placeholder="value" /></el-form-item>
              </template>
              <el-form-item v-if="dsMode === 'dict'" label="字典类型">
                <el-select v-model="selectedField.dictType" filterable style="width:100%">
                  <el-option v-for="d in dictTypes" :key="d.type" :label="d.name" :value="d.type" />
                </el-select>
              </el-form-item>
            </template>
            <template v-if="selectedField.type === 'upload'">
              <el-form-item label="列表样式">
                <el-radio-group v-model="selectedField.uploadListType">
                  <el-radio value="text">文本</el-radio>
                  <el-radio value="picture">图片</el-radio>
                  <el-radio value="picture-card">卡片</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="文件类型"><el-input v-model="selectedField.uploadAccept" placeholder=".jpg,.png" /></el-form-item>
              <el-form-item label="数量限制"><el-input-number v-model="selectedField.uploadLimit" :min="1" style="width:100%" /></el-form-item>
            </template>
          </template>
          <el-form-item :label="selectedField.type === 'divider' ? '分割线文字' : '提示文字'">
            <el-input v-model="selectedField.tip" />
          </el-form-item>
        </el-form>
      </template>
      <el-empty v-else description="点击字段查看属性" :image-size="80" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import { getDictTypes } from '@/api/dict'
import { getWorkflowForms } from '@/api/workflow'

export interface DesignerField {
  id: string
  label: string
  type: 'input' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'radio' | 'checkbox' | 'upload' | 'user' | 'divider' | 'text'
  span?: number
  row: number
  readonly?: boolean
  defaultValue?: any
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  precision?: number
  options?: { label: string; value: any }[]
  remoteUrl?: string
  remoteLabelField?: string
  remoteValueField?: string
  dictType?: string
  uploadListType?: string
  uploadAccept?: string
  uploadLimit?: number
  tip?: string
}

const props = defineProps<{ modelValue?: DesignerField[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: DesignerField[]): void }>()

const fields = ref<DesignerField[]>([...(props.modelValue || [])])
const selectedField = ref<DesignerField | null>(null)
const dictTypes = ref<{ type: string; name: string }[]>([])
let counter = 0

// ===== 行分组 =====
const groupedRows = computed(() => {
  const max = fields.value.reduce((m, f) => Math.max(m, f.row), 0)
  const rows: DesignerField[][] = []
  for (let i = 0; i <= max; i++) rows.push(fields.value.filter(f => f.row === i))
  return rows.filter(r => r.length > 0)
})

// ===== span =====
const fieldSpan = computed({
  get: () => selectedField.value?.span || 24,
  set: (v: number) => { if (selectedField.value) { selectedField.value.span = v; emitUpdate() } }
})
const spanTip = computed(() => {
  const s = fieldSpan.value
  return s <= 8 ? `一行可放 ${Math.floor(24/s)} 个` : s <= 12 ? '一行可放 2 个' : '独占一行'
})

// ===== 数据来源 =====
const dsMode = ref<'static'|'remote'|'dict'>('static')
function onDsChange(v: string) {
  const f = selectedField.value; if (!f) return
  if (v === 'static') { f.remoteUrl = f.dictType = undefined; f.options ??= [{label:'选项1',value:'1'},{label:'选项2',value:'2'}] }
  else if (v === 'remote') { f.options = []; f.dictType = undefined }
  else { f.options = []; f.remoteUrl = f.remoteLabelField = f.remoteValueField = undefined }
  emitUpdate()
}

// ===== 字段类型 =====
const fieldTypes = [
  { type: 'input', label: '单行文本', icon: '✏' },
  { type: 'textarea', label: '多行文本', icon: '📝' },
  { type: 'number', label: '数字', icon: '#' },
  { type: 'date', label: '日期', icon: '📅' },
  { type: 'datetime', label: '日期时间', icon: '🕐' },
  { type: 'select', label: '下拉选择', icon: '▼' },
  { type: 'radio', label: '单选', icon: '◉' },
  { type: 'checkbox', label: '多选', icon: '☑' },
  { type: 'upload', label: '文件上传', icon: '📎' },
  { type: 'user', label: '人员选择', icon: '👤' },
  { type: 'divider', label: '分割线', icon: '—' },
  { type: 'text', label: '静态文本', icon: 'T' }
]
function getTypeLabel(t: string) { return fieldTypes.find(x => x.type === t)?.label || t }
function calcWidth(span: number) { return `calc(${span} / 24 * 100% - 8px)` }

function selectField(f: DesignerField) {
  selectedField.value = f
  dsMode.value = f.remoteUrl ? 'remote' : f.dictType ? 'dict' : 'static'
}

// ===== 拖拽状态 =====
let dragFieldId: string | null = null
let dragNewType: string | null = null
const hoverKey = ref('')

// ===== 面板拖入 =====
function onPaletteDragStart(type: string, e: DragEvent) {
  dragNewType = type
  dragFieldId = null
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', type)
    e.dataTransfer.effectAllowed = 'copy'
  }
}

// ===== 画布内拖拽 =====
function onFieldDragStart(field: DesignerField, e: DragEvent) {
  dragFieldId = field.id
  dragNewType = null
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', field.id)
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onFieldDragEnd() { dragFieldId = null; dragNewType = null; hoverKey.value = '' }

// ===== drop 处理 =====
function createField(type: string, row: number): DesignerField {
  counter++
  const f: DesignerField = {
    id: (type === 'divider' ? 'dv_' : 'f_') + Date.now() + '_' + counter,
    label: type === 'divider' ? '' : getTypeLabel(type),
    type,
    span: type === 'divider' ? 24 : 8,
    row,
    readonly: false,
    required: false
  }
  if (['select','radio','checkbox'].includes(type)) f.options = [{label:'选项1',value:'1'},{label:'选项2',value:'2'}]
  return f
}

// 空画布 / 底部：新增到新行
function onCanvasDrop(rowIdx: number, e: DragEvent) {
  hoverKey.value = ''
  const targetRow = rowIdx >= 0 ? rowIdx : fields.value.reduce((m,f) => Math.max(m, f.row), -1) + 1
  if (dragNewType) {
    fields.value.push(createField(dragNewType, targetRow))
    selectedField.value = fields.value[fields.value.length - 1]
    emitUpdate()
  } else if (dragFieldId) {
    const f = fields.value.find(x => x.id === dragFieldId)
    if (f) { f.row = targetRow; emitUpdate() }
    dragFieldId = null
  }
}

// 行间插入：新行
function onRowInsertDrop(rowIdx: number, e: DragEvent) {
  hoverKey.value = ''
  for (const f of fields.value) if (f.row >= rowIdx) f.row++
  if (dragNewType) {
    fields.value.push(createField(dragNewType, rowIdx))
    selectedField.value = fields.value[fields.value.length - 1]
    emitUpdate()
  } else if (dragFieldId) {
    const f = fields.value.find(x => x.id === dragFieldId)
    if (f) { f.row = rowIdx; emitUpdate() }
    dragFieldId = null
  }
}

// 行内插入：指定位置
function onFieldInsertDrop(rowIdx: number, insertIdx: number, e: DragEvent) {
  hoverKey.value = ''
  // 计算全局插入位置
  let globalIdx = 0
  for (const f of fields.value) if (f.row < rowIdx) globalIdx++
  globalIdx += insertIdx

  if (dragNewType) {
    fields.value.splice(globalIdx, 0, createField(dragNewType, rowIdx))
    selectedField.value = fields.value[globalIdx]
    emitUpdate()
  } else if (dragFieldId) {
    const oldIdx = fields.value.findIndex(x => x.id === dragFieldId)
    if (oldIdx < 0) return
    const f = fields.value[oldIdx]
    fields.value.splice(oldIdx, 1)
    // 修正插入位置
    let gIdx = 0
    for (const x of fields.value) if (x.row < rowIdx) gIdx++
    gIdx += insertIdx
    if (oldIdx < gIdx) gIdx--
    f.row = rowIdx
    fields.value.splice(gIdx, 0, f)
    emitUpdate()
    dragFieldId = null
  }
}

function removeField(f: DesignerField) {
  const i = fields.value.findIndex(x => x.id === f.id)
  if (i >= 0) { fields.value.splice(i, 1); if (selectedField.value?.id === f.id) selectedField.value = null; emitUpdate() }
}

function emitUpdate() { emit('update:modelValue', [...fields.value]) }

// ===== 加载 =====
onMounted(async () => {
  try { const r: any = await getDictTypes(); dictTypes.value = r?.records || r || [] } catch {}
})

// ===== 暴露 =====
function getFields() { return fields.value }
function setFields(fs: DesignerField[]) {
  fields.value = fs.map((f, i) => ({ ...f, row: f.row ?? i }))
  selectedField.value = null
}
defineExpose({ getFields, setFields })
</script>

<style scoped>
.form-designer { display: flex; height: 1050px; background: var(--bg, #f7f8fa); }
.designer-left { width: 160px; border-right: 1px solid var(--border, #e2e8f0); overflow-y: auto; padding: 16px 12px; background: var(--card, #fff); flex-shrink: 0; }
.designer-center { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg, #f7f8fa); min-width: 0; }
.designer-right { width: 280px; border-left: 1px solid var(--border, #e2e8f0); overflow-y: auto; padding: 16px 12px; background: var(--card, #fff); flex-shrink: 0; }
.panel-title { font-size: 13px; font-weight: 600; color: var(--ink, #333); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #e2e8f0); display: flex; justify-content: space-between; }
.grid-hint { font-size: 10px; font-weight: 400; color: var(--muted, #999); }
.tip { font-size: 11px; color: var(--muted, #999); margin-top: 4px; }

.field-palette { display: flex; flex-direction: column; gap: 8px; }
.palette-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; cursor: grab; transition: all 0.2s; background: var(--card, #fff); }
.palette-item:hover { border-color: #3b82f6; background: color-mix(in srgb, #3b82f6 5%, var(--card, #fff)); transform: translateX(2px); }
.palette-icon { font-size: 14px; width: 20px; text-align: center; }
.palette-label { font-size: 12px; color: var(--ink, #333); }

.empty-canvas { text-align: center; padding: 60px 0; color: var(--muted, #999); font-size: 13px; border: 2px dashed var(--border, #d0d4dd); border-radius: 8px; }

.canvas-rows { display: flex; flex-direction: column; gap: 0; }
.canvas-row { display: flex; flex-wrap: wrap; gap: 0; min-height: 48px; padding: 4px; border-radius: 6px; border: 2px dashed transparent; transition: all 0.15s; }
.canvas-row.row-hover { border-color: #3b82f6; background: color-mix(in srgb, #3b82f6 4%, transparent); }

.row-insert { height: 8px; margin: -1px 0; border-radius: 4px; transition: all 0.15s; }
.row-insert.active { height: 36px; background: color-mix(in srgb, #3b82f6 8%, transparent); border: 2px dashed #3b82f6; margin: 4px 0; }

.field-insert { width: 8px; min-width: 8px; align-self: stretch; border-radius: 4px; transition: all 0.15s; }
.field-insert.active { width: 32px; min-width: 32px; background: color-mix(in srgb, #3b82f6 8%, transparent); border: 2px dashed #3b82f6; }

.drop-hint { min-height: 60px; border: 2px dashed var(--border, #d0d4dd); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--muted, #999); font-size: 12px; transition: all 0.2s; margin-top: 8px; }
.drop-hint.active, .drop-hint:hover { border-color: #3b82f6; color: #3b82f6; background: color-mix(in srgb, #3b82f6 5%, transparent); }

.canvas-field { background: var(--card, #fff); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: all 0.2s; min-width: 0; position: relative; }
.canvas-field:hover { border-color: #3b82f6; }
.canvas-field.selected { border-color: #3b82f6; box-shadow: 0 2px 8px rgba(59,130,246,0.2); }
.canvas-field.dragging { opacity: 0.4; border-style: dashed; }

.field-hd { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.field-hd .tag { font-size: 10px; padding: 1px 5px; border-radius: 3px; background: color-mix(in srgb, #3b82f6 10%, var(--card, #fff)); color: #3b82f6; flex-shrink: 0; }
.field-hd .name { font-size: 12px; font-weight: 500; color: var(--ink, #333); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.field-hd .sp { font-size: 10px; padding: 1px 4px; border-radius: 3px; background: color-mix(in srgb, var(--ink,#333) 6%, var(--card,#fff)); color: var(--muted, #888); flex-shrink: 0; }
.field-hd .req { color: #ef4444; font-size: 13px; }
.field-hd .ops { display: flex; gap: 2px; flex-shrink: 0; }
.field-body { pointer-events: none; }
.field-del { position: absolute; top: 4px; right: 4px; }
.static-text { font-size: 13px; color: var(--ink, #333); padding: 8px 0; }

.opt-list { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.opt-row { display: flex; gap: 6px; align-items: center; }
</style>
