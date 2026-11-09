<template>
  <div class="workflow-apply-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>流程申请</span>
          <div class="card-actions">
            <el-radio-group v-model="activeTab" @change="loadData">
              <el-radio-button value="available">可申请</el-radio-button>
              <el-radio-button value="started">我的申请</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <!-- 可申请流程 -->
      <template v-if="activeTab === 'available'">
        <div v-loading="loading" class="def-grid">
          <div v-for="item in defList" :key="item.id" class="def-card" @click="handleStart(item)">
            <div class="def-card-icon">📋</div>
            <div class="def-card-body">
              <div class="def-card-title">{{ item.defName }}</div>
              <div class="def-card-desc">{{ item.remark || item.category || '-' }}</div>
              <div class="def-card-meta">v{{ item.version }}</div>
            </div>
          </div>
          <el-empty v-if="defList.length === 0 && !loading" description="暂无可申请的流程" />
        </div>
      </template>

      <!-- 我的申请 -->
      <template v-else>
        <el-table v-loading="loading" :data="instanceList" border style="width: 100%">
          <el-table-column prop="title" label="流程标题" min-width="180" show-overflow-tooltip />
          <el-table-column prop="defName" label="流程名称" min-width="140" />
          <el-table-column prop="statusDesc" label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.instStatus)" size="small">{{ row.statusDesc }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="startTime" label="发起时间" width="160" align="center">
            <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleView(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-container">
          <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50]" :total="pagination.total" layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData" @current-change="loadData" />
        </div>
      </template>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="流程详情" size="60%">
      <template v-if="detailInstance">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="流程标题">{{ detailInstance.title }}</el-descriptions-item>
          <el-descriptions-item label="流程名称">{{ detailInstance.defName }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(detailInstance.instStatus)" size="small">{{ detailInstance.statusDesc }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发起时间">{{ formatTime(detailInstance.startTime) }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 16px; display: flex; gap: 10px">
          <el-button v-if="detailInstance.instStatus === 0" size="small" type="warning" @click="handleSuspend(detailInstance)">挂起</el-button>
          <el-button v-if="detailInstance.instStatus === 0" size="small" type="danger" @click="handleCancel(detailInstance)">取消</el-button>
          <el-button size="small" type="danger" plain @click="handleDelete(detailInstance)">删除</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 启动流程弹窗 -->
    <el-dialog v-model="startVisible" :title="`发起流程 - ${currentDef?.defName || ''}`" width="550px">
      <el-form :model="startForm" label-width="90px">
        <el-form-item label="流程标题" required>
          <el-input v-model="startForm.title" placeholder="请输入流程标题" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="startForm.priority" style="width: 100%">
            <el-option label="低" value="low" />
            <el-option label="普通" value="normal" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务键">
          <el-input v-model="startForm.businessKey" placeholder="可选，关联业务标识" />
        </el-form-item>
        <template v-if="formFields.length > 0">
          <el-divider content-position="left">表单信息</el-divider>
          <FormRenderer ref="formRendererRef" :fields="formFields" v-model="startForm.formData" />
        </template>
      </el-form>
      <template #footer>
        <el-button @click="startVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitStart">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import FormRenderer from '@/components/workflow/FormRenderer.vue'
import type { FormField } from '@/components/workflow/FormRenderer.vue'
import {
  getWorkflowDefs,
  getStartedInstances,
  startWorkflow,
  getWorkflowFormDetail,
  type WorkflowDef,
  type WorkflowInstance
} from '@/api/workflow'

const activeTab = ref<'available' | 'started'>('available')
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)

const defList = ref<WorkflowDef[]>([])
const instanceList = ref<WorkflowInstance[]>([])
const pagination = reactive({ current: 1, size: 10, total: 0 })

const startVisible = ref(false)
const detailVisible = ref(false)
const detailInstance = ref<WorkflowInstance | null>(null)
const currentDef = ref<WorkflowDef | null>(null)
const formFields = ref<FormField[]>([])
const formRendererRef = ref()
const startForm = reactive({
  title: '',
  priority: 'normal',
  businessKey: '',
  formData: {} as Record<string, any>
})

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    if (activeTab.value === 'available') {
      const res: any = await getWorkflowDefs({ current: 1, size: 100 })
      defList.value = res?.records?.filter((d: any) => d.defStatus === 1) || []
    } else {
      const res: any = await getStartedInstances({
        current: pagination.current,
        size: pagination.size
      })
      instanceList.value = res?.records || []
      pagination.total = res?.total || 0
    }
  } finally {
    loading.value = false
  }
}

function formatTime(time?: string): string {
  return time ? time.replace('T', ' ').substring(0, 16) : '-'
}

function getStatusType(status?: number): any {
  const map: Record<number, any> = {
    0: 'primary', 1: 'success', 2: 'warning', 3: 'danger', 4: 'info', 5: 'info'
  }
  return map[status || 0] || 'info'
}

async function handleStart(def: WorkflowDef) {
  currentDef.value = def
  startForm.title = def.defName
  startForm.priority = 'normal'
  startForm.businessKey = ''
  startForm.formData = {}

  formFields.value = []
  if (def.formId) {
    try {
      const res: any = await getWorkflowFormDetail(def.formId as string | number)
      if (res?.schemaJson) {
        formFields.value = JSON.parse(res.schemaJson)
      }
    } catch { /* ignore */ }
  }

  startVisible.value = true
}

async function submitStart() {
  if (!startForm.title.trim()) {
    ElMessage.warning('请输入流程标题')
    return
  }
  submitting.value = true
  try {
    if (formFields.value.length > 0 && formRendererRef.value) {
      const valid = await formRendererRef.value.validate()
      if (!valid) {
        submitting.value = false
        return
      }
    }

    await startWorkflow({
      defKey: currentDef.value!.defKey,
      title: startForm.title,
      priority: startForm.priority,
      businessKey: startForm.businessKey || undefined,
      formJson: Object.keys(startForm.formData).length > 0 ? JSON.stringify(startForm.formData) : undefined,
      variables: { ...startForm.formData }
    })
    ElMessage.success('流程发起成功')
    startVisible.value = false
    activeTab.value = 'started'
    loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '发起失败')
  } finally {
    submitting.value = false
  }
}

function handleView(row: WorkflowInstance) {
  detailInstance.value = row
  detailVisible.value = true
}

async function handleSuspend(row: WorkflowInstance) {
  try {
    await ElMessageBox.confirm('确认挂起该流程？', '挂起确认', { type: 'warning' })
    const { suspendWorkflowInstance } = await import('@/api/workflow')
    await suspendWorkflowInstance(row.instanceId)
    ElMessage.success('已挂起')
    loadData()
  } catch { /* ignore */ }
}

async function handleCancel(row: WorkflowInstance) {
  try {
    await ElMessageBox.confirm('确认取消该流程？', '取消确认', { type: 'warning' })
    const { terminateWorkflowInstance } = await import('@/api/workflow')
    await terminateWorkflowInstance(row.instanceId)
    ElMessage.success('已取消')
    loadData()
  } catch { /* ignore */ }
}

async function handleDelete(row: WorkflowInstance) {
  try {
    await ElMessageBox.confirm('确认删除该流程？此操作不可撤销。', '删除确认', { type: 'error' })
    const { deleteWorkflowInstance } = await import('@/api/workflow')
    await deleteWorkflowInstance(row.instanceId)
    ElMessage.success('已删除')
    loadData()
  } catch { /* ignore */ }
}
</script>

<style scoped>
.workflow-apply-page {
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
}

.def-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.def-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--card, #fff);
}

.def-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.def-card-icon {
  font-size: 32px;
}

.def-card-body {
  flex: 1;
  min-width: 0;
}

.def-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink, #333);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.def-card-desc {
  font-size: 12px;
  color: var(--muted, #888);
  margin-bottom: 4px;
}

.def-card-meta {
  font-size: 11px;
  color: var(--muted, #aaa);
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
