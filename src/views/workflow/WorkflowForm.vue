<template>
  <div class="workflow-form-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>表单管理</span>
          <div class="card-actions">
            <el-select v-model="categoryFilter" placeholder="分类" clearable style="width: 120px" @change="loadData">
              <el-option v-for="d in dicts.workflow_form_category" :key="d.value" :label="d.label" :value="d.value" />
            </el-select>
            <el-input v-model="keyword" placeholder="搜索表单" clearable style="width: 200px"
              @keyup.enter="loadData" @clear="loadData" />
            <el-button type="primary" @click="loadData">搜索</el-button>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon> 新增表单
            </el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column prop="formKey" label="表单标识" min-width="120" show-overflow-tooltip />
        <el-table-column prop="formName" label="表单名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="分类" width="100" align="center">
          <template #default="{ row }">{{ getDictLabel(dicts.workflow_form_category, row.category) }}</template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="70" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.formStatus === 1 ? 'success' : row.formStatus === 2 ? 'danger' : 'info'" size="small">
              {{ getDictLabel(dicts.workflow_form_status, row.formStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="info" @click="handlePreview(row)">预览</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50]" :total="pagination.total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData" @current-change="loadData" />
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="1500px" top="2vh" @close="resetForm">
      <div class="form-edit-layout">
        <!-- 左侧：基础信息 + 字段设计 -->
        <div class="form-edit-main">
          <!-- 基础信息 -->
          <el-form :model="form" label-width="80px" class="base-form">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="表单标识" required>
                  <el-input v-model="form.formKey" placeholder="唯一标识" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="表单名称" required>
                  <el-input v-model="form.formName" placeholder="表单名称" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="分类">
                  <el-select v-model="form.category" placeholder="选择分类" clearable style="width: 100%">
                    <el-option v-for="d in dicts.workflow_form_category" :key="d.value" :label="d.label" :value="d.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="状态">
                  <el-select v-model="form.formStatus" style="width: 100%">
                    <el-option v-for="d in dicts.workflow_form_status" :key="d.value" :label="d.label" :value="Number(d.value)" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="备注">
              <el-input v-model="form.remark" placeholder="备注" />
            </el-form-item>
          </el-form>

          <!-- 字段设计区 -->
          <div class="field-designer-wrapper">
            <FormDesigner ref="formDesignerRef" :model-value="formFields" @update:model-value="onFieldsUpdate" />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="handlePreviewDialog">
          <el-icon><View /></el-icon> 预览
        </el-button>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" title="表单预览" width="700px" append-to-body @closed="onPreviewClosed">
      <FormRenderer v-if="showPreviewContent" :key="previewKey" :fields="previewFields" v-model="previewData" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, View } from '@element-plus/icons-vue'
import FormRenderer from '@/components/workflow/FormRenderer.vue'
import FormDesigner, { type DesignerField } from '@/components/workflow/FormDesigner.vue'
import type { FormField } from '@/components/workflow/FormRenderer.vue'
import {
  getWorkflowForms,
  saveWorkflowForm,
  deleteWorkflowForm,
  type WorkflowForm
} from '@/api/workflow'
import { useDict, mapDictOptions } from '@/utils/dict'
import type { DictItem } from '@/api/dict'

const { dicts } = useDict(['workflow_form_category', 'workflow_form_status'])

function getDictLabel(list: DictItem[] | undefined, value: any): string {
  if (!list || value === undefined || value === null) return String(value ?? '-')
  const item = list.find(d => String(d.value) === String(value))
  return item ? item.label : String(value)
}

const loading = ref(false)
const tableData = ref<WorkflowForm[]>([])
const keyword = ref('')
const categoryFilter = ref('')
const pagination = reactive({ current: 1, size: 10, total: 0 })

const dialogVisible = ref(false)
const dialogTitle = ref('新增表单')
const form = reactive<WorkflowForm>({
  formKey: '',
  formName: '',
  category: '',
  formStatus: 0,
  remark: '',
  schemaJson: ''
})

const previewVisible = ref(false)
const formDesignerRef = ref()
const formFields = ref<DesignerField[]>([])
const previewFields = ref<any[]>([])
const previewData = ref<Record<string, any>>({})
const previewKey = ref(0)
const showPreviewContent = ref(false)

function handlePreviewDialog() {
  const source = formDesignerRef.value ? formDesignerRef.value.getFields() : formFields.value
  previewFields.value = JSON.parse(JSON.stringify(source))
  previewData.value = {}
  showPreviewContent.value = false
  previewKey.value++
  previewVisible.value = true
  // 下一 tick 再显示内容，确保旧组件已销毁
  setTimeout(() => {
    showPreviewContent.value = true
  }, 50)
}

function onPreviewClosed() {
  showPreviewContent.value = false
  previewData.value = {}
  previewFields.value = []
}

function onFieldsUpdate(fields: DesignerField[]) {
  formFields.value = fields
}

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const res: any = await getWorkflowForms({
      current: pagination.current,
      size: pagination.size,
      keyword: keyword.value || undefined,
      category: categoryFilter.value || undefined
    })
    tableData.value = res?.records || []
    pagination.total = res?.total || 0
  } finally {
    loading.value = false
  }
}

function formatTime(time?: string): string {
  return time ? time.replace('T', ' ').substring(0, 16) : '-'
}

function handleAdd() {
  dialogTitle.value = '新增表单'
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: WorkflowForm) {
  dialogTitle.value = '编辑表单'
  Object.assign(form, row)
  try {
    formFields.value = row.schemaJson ? JSON.parse(row.schemaJson) : []
  } catch {
    formFields.value = []
  }
  dialogVisible.value = true
}

function handlePreview(row: WorkflowForm) {
  try {
    previewFields.value = row.schemaJson ? JSON.parse(row.schemaJson) : []
    previewData.value = {}
    showPreviewContent.value = false
    previewKey.value++
    previewVisible.value = true
    setTimeout(() => {
      showPreviewContent.value = true
    }, 50)
  } catch {
    ElMessage.error('Schema 解析失败')
  }
}

async function handleDelete(row: WorkflowForm) {
  try {
    await ElMessageBox.confirm(`确认删除表单「${row.formName}」？`, '删除确认', { type: 'warning' })
    await deleteWorkflowForm(row.id as string | number)
    ElMessage.success('删除成功')
    loadData()
  } catch { /* ignore */ }
}

async function handleSubmit() {
  try {
    if (formDesignerRef.value) {
      form.schemaJson = JSON.stringify(formDesignerRef.value.getFields())
    }
    await saveWorkflowForm(form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (e: any) {
  }
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    formKey: '',
    formName: '',
    category: '',
    formStatus: 0,
    remark: '',
    schemaJson: ''
  })
  formFields.value = []
}
</script>

<style scoped>
.workflow-form-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 弹窗内布局 */
.form-edit-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-edit-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.base-form {
  padding: 0 4px;
}

.field-designer-wrapper {
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}
</style>
