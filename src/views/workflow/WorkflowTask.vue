<template>
  <div class="workflow-task-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务管理</span>
          <div class="card-actions">
            <el-radio-group v-model="activeTab" @change="onTabChange">
              <el-radio-button value="todo">待办</el-radio-button>
              <el-radio-button value="done">已办</el-radio-button>
              <el-radio-button value="cc">抄送给我</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column prop="taskName" label="任务名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="defName" label="流程名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="nodeName" label="节点" min-width="120" />
        <el-table-column prop="startUser" label="发起人" width="100" align="center" />
        <el-table-column prop="statusDesc" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.taskStatus)" size="small">{{ row.statusDesc }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column v-if="activeTab === 'done'" prop="result" label="结果" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.result === 'approve' ? 'success' : 'danger'" size="small">
              {{ row.result === 'approve' ? '同意' : '驳回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="activeTab === 'todo'">
              <el-button v-if="!row.assignee" link type="primary" @click="handleClaim(row)">认领</el-button>
              <el-button link type="success" @click="handleApprove(row)">同意</el-button>
              <el-button link type="danger" @click="handleReject(row)">驳回</el-button>
            </template>
            <el-button link type="info" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 抄送给我表格 -->
      <template v-if="activeTab === 'cc'">
        <el-table v-loading="loading" :data="ccList" border style="width: 100%">
          <el-table-column label="标题" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.title || row.defName || '-' }}</template>
          </el-table-column>
          <el-table-column prop="defName" label="流程名称" min-width="130" show-overflow-tooltip />
          <el-table-column prop="ccBy" label="抄送人" width="100" align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.instStatus)" size="small">{{ row.statusDesc }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="已读" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.readStatus === 1 ? 'info' : 'danger'" size="small">
                {{ row.readStatus === 1 ? '已读' : '未读' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="抄送时间" width="160" align="center">
            <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleCcDetail(row)">查看</el-button>
              <el-button v-if="row.readStatus !== 1" link type="info" @click="handleCcRead(row)">已读</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top: 10px">
          <el-button size="small" @click="handleMarkAllRead">全部标记已读</el-button>
        </div>
      </template>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 审批对话框 -->
    <el-dialog v-model="approvalVisible" :title="approvalTitle" width="600px">
      <!-- 节点关联表单 -->
      <div v-if="approvalFormFields.length > 0" class="approval-form-section">
        <div class="approval-form-title">关联表单</div>
        <FormRenderer :fields="approvalFormFields" v-model="approvalFormData" />
      </div>
      <el-form :model="approvalForm" label-width="80px">
        <!-- 无节点表单时显示默认审批意见 -->
        <el-form-item v-if="approvalFormFields.length === 0" label="审批意见">
          <el-input v-model="approvalForm.comment" type="textarea" :rows="3" placeholder="请输入审批意见" />
        </el-form-item>
        <!-- 有节点表单时隐藏默认意见（表单里已有） -->
        <el-form-item v-else>
          <el-input v-model="approvalForm.comment" type="textarea" :rows="2" placeholder="补充说明（选填）" />
        </el-form-item>
        <el-form-item v-if="approvalForm.action === 'transfer'" label="转办给">
          <el-input v-model="approvalForm.targetUser" placeholder="目标用户名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approvalVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApproval">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import FormRenderer from '@/components/workflow/FormRenderer.vue'
import type { FormField } from '@/components/workflow/FormRenderer.vue'
import {
  getTodoTasks,
  getDoneTasks,
  claimWorkflowTask,
  completeWorkflowTask,
  getMyCcRecords,
  markCcRead,
  markAllCcRead,
  type WorkflowTask,
  type WorkflowCcRecord
} from '@/api/workflow'

const activeTab = ref<'todo' | 'done' | 'cc'>('todo')
const router = useRouter()
const loading = ref(false)
const tableData = ref<WorkflowTask[]>([])
const ccList = ref<WorkflowCcRecord[]>([])
const pagination = reactive({ current: 1, size: 10, total: 0 })

// 审批弹窗
const approvalVisible = ref(false)
const approvalTitle = ref('审批')
const approvalFormFields = ref<any[]>([])
const approvalFormData = ref<Record<string, any>>({})

const approvalForm = reactive({
  taskId: '',
  action: 'approve' as 'approve' | 'reject' | 'transfer',
  comment: '',
  targetUser: ''
})

onMounted(() => loadData())

function onTabChange() {
  pagination.current = 1
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    if (activeTab.value === 'cc') {
      const res: any = await getMyCcRecords({ current: pagination.current, size: pagination.size })
      ccList.value = res?.records || []
      pagination.total = res?.total || 0
    } else {
      const params = { current: pagination.current, size: pagination.size }
      const res: any = activeTab.value === 'todo'
        ? await getTodoTasks(params)
        : await getDoneTasks(params)
      tableData.value = res?.records || []
      pagination.total = res?.total || 0
    }
  } finally {
    loading.value = false
  }
}

async function handleCcDetail(row: WorkflowCcRecord) {
  if (row.readStatus !== 1) {
    await markCcRead(row.id).catch(() => {})
  }
  router.push({ path: '/workflow/monitor', query: { instanceId: row.instanceId } })
}

async function handleCcRead(row: WorkflowCcRecord) {
  await markCcRead(row.id)
  ElMessage.success('已标记已读')
  loadData()
}

async function handleMarkAllRead() {
  await markAllCcRead()
  ElMessage.success('全部已读')
  loadData()
}

function formatTime(time?: string): string {
  return time ? time.replace('T', ' ').substring(0, 16) : '-'
}

function getStatusType(status?: number): any {
  const map: Record<number, any> = {
    0: 'info', 1: 'warning', 2: 'success', 3: 'danger', 4: 'info', 5: 'info', 6: 'warning'
  }
  return map[status || 0] || 'info'
}

async function handleClaim(row: WorkflowTask) {
  try {
    await ElMessageBox.confirm(`确认认领任务「${row.taskName}」？`, '认领确认')
    await claimWorkflowTask(row.taskId)
    ElMessage.success('认领成功')
    loadData()
  } catch { /* ignore */ }
}

async function handleApprove(row: WorkflowTask) {
  approvalTitle.value = '审批 - 同意'
  approvalForm.taskId = row.taskId
  approvalForm.action = 'approve'
  approvalForm.comment = ''
  await loadNodeForm(row)
  approvalVisible.value = true
}

async function loadNodeForm(row: WorkflowTask) {
  approvalFormFields.value = []
  approvalFormData.value = {}
  try {
    let formId = null

    // 方法1: 从任务的 formJson（节点 configJson）读 formId
    if (row.formJson) {
      try {
        const cfg = JSON.parse(row.formJson)
        formId = cfg.formId || cfg.nodeFormId
      } catch { /* ignore */ }
    }

    // 方法2: 从流程定义的节点配置读 formId（兜底）
    if (!formId && row.defId && row.nodeId) {
      try {
        const { getWorkflowDefDetail, getWorkflowFormDetail } = await import('@/api/workflow')
        const defRes: any = await getWorkflowDefDetail(row.defId)
        const node = defRes?.nodes?.find((n: any) => n.nodeId === row.nodeId)
        if (node?.configJson) {
          const cfg = JSON.parse(node.configJson)
          formId = cfg.formId || cfg.nodeFormId
        }
      } catch { /* ignore */ }
    }

    // 加载表单 schema
    if (formId) {
      const { getWorkflowFormDetail } = await import('@/api/workflow')
      const res: any = await getWorkflowFormDetail(formId)
      if (res?.schemaJson) {
        approvalFormFields.value = JSON.parse(res.schemaJson)
      }
    }

    // 加载实例表单数据预填
    try {
      const { getWorkflowInstanceDetail } = await import('@/api/workflow')
      const instRes: any = await getWorkflowInstanceDetail(row.instanceId)
      if (instRes?.formJson) {
        approvalFormData.value = JSON.parse(instRes.formJson)
      }
    } catch { /* ignore */ }
  } catch (e) {
    console.warn('加载节点表单失败:', e)
  }
}

async function handleReject(row: WorkflowTask) {
  approvalTitle.value = '审批 - 驳回'
  approvalForm.taskId = row.taskId
  approvalForm.action = 'reject'
  approvalForm.comment = ''
  await loadNodeForm(row)
  approvalVisible.value = true
}

async function submitApproval() {
  console.log('[Task] submitApproval called, formData =', JSON.stringify(approvalFormData.value))
  try {
    await completeWorkflowTask({
      taskId: approvalForm.taskId,
      action: approvalForm.action,
      comment: approvalForm.comment,
      targetUser: approvalForm.targetUser || undefined,
      formJson: JSON.stringify(approvalFormData.value)
    })
    ElMessage.success('操作成功')
    approvalVisible.value = false
    loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

function handleDetail(row: WorkflowTask) {
  // 跳转到流程监控详情
  router.push({ path: '/workflow/monitor', query: { instanceId: row.instanceId } })
}
</script>

<style scoped>
.workflow-task-page {
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

.approval-form-section {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
}

.approval-form-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--ink, #333);
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
