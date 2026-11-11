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
            <el-tag :type="resultTagType(row)" size="small">{{ resultLabel(row) }}</el-tag>
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

    <!-- 详情抽屉：页内展示任务/抄送信息，不跳转 -->
    <el-drawer v-model="detailVisible" :title="detailTask ? '任务详情' : '抄送详情'" size="58%">
      <template v-if="detailTask || detailCc">
        <!-- 摘要条 -->
        <div class="detail-summary">
          <div class="summary-title-row">
            <span class="summary-title">
              {{ detailTask ? (detailTask.taskName || detailTask.nodeName || '-') : (detailCc?.title || detailCc?.defName || '-') }}
            </span>
            <el-tag :type="getStatusType(detailTask ? detailTask.taskStatus : detailCc?.instStatus)" size="small">
              {{ detailTask ? detailTask.statusDesc : detailCc?.statusDesc }}
            </el-tag>
          </div>
          <div v-if="detailTask" class="summary-meta">
            <span class="meta-item"><span class="meta-label">流程名称</span>{{ detailTask.defName || '-' }}</span>
            <span class="meta-item"><span class="meta-label">节点</span>{{ detailTask.nodeName || '-' }}</span>
            <span class="meta-item"><span class="meta-label">发起人</span>{{ detailTask.startUser || '-' }}</span>
            <span class="meta-item"><span class="meta-label">处理人</span>{{ detailTask.assignee || '未认领' }}</span>
            <span class="meta-item"><span class="meta-label">创建时间</span>{{ formatTime(detailTask.createTime) }}</span>
            <span v-if="detailTask.completeTime" class="meta-item">
              <span class="meta-label">完成时间</span>{{ formatTime(detailTask.completeTime) }}
            </span>
          </div>
          <div v-else class="summary-meta">
            <span class="meta-item"><span class="meta-label">流程名称</span>{{ detailCc?.defName || '-' }}</span>
            <span class="meta-item"><span class="meta-label">抄送人</span>{{ detailCc?.ccBy || '-' }}</span>
            <span class="meta-item"><span class="meta-label">抄送时间</span>{{ formatTime(detailCc?.createTime) }}</span>
            <span class="meta-item"><span class="meta-label">已读</span>{{ detailCc?.readStatus === 1 ? '已读' : '未读' }}</span>
          </div>
        </div>

        <!-- 审批结果（已办任务） -->
        <div v-if="detailTask?.result || detailTask?.comment" class="detail-section">
          <div class="form-hd">审批结果</div>
          <div class="kv-list">
            <div v-if="detailTask?.result" class="kv-item">
              <span class="kv-label">结果</span>
              <span class="kv-value">
                <el-tag :type="getResultTagType(detailTask.result)" size="small">{{ getResultLabel(detailTask.result) }}</el-tag>
              </span>
            </div>
            <div v-if="detailTask?.comment" class="kv-item">
              <span class="kv-label">审批意见</span>
              <span class="kv-value">{{ detailTask.comment }}</span>
            </div>
          </div>
        </div>

        <!-- 流程表单 -->
        <div v-if="detailFormEntries.length > 0" class="detail-section">
          <div class="form-hd">流程表单</div>
          <div class="kv-list">
            <div v-for="[k, v] in detailFormEntries" :key="k" class="kv-item">
              <span class="kv-label">{{ k }}</span>
              <span class="kv-value">{{ formatValue(v) }}</span>
            </div>
          </div>
        </div>

        <!-- 节点表单 -->
        <div v-if="detailNodeForm.fields.length > 0 || Object.keys(detailNodeForm.data).length > 0" class="detail-section">
          <div class="form-hd">节点 · {{ detailTask?.nodeName || detailTask?.nodeId }}</div>
          <FormRenderer
            v-if="detailNodeForm.fields.length > 0"
            :fields="detailNodeForm.fields"
            :model-value="detailNodeForm.data"
            :readonly="true"
            label-width="90px"
            size="small"
          />
          <div v-else class="kv-list">
            <div v-for="(v, k) in detailNodeForm.data" :key="k" class="kv-item">
              <span class="kv-label">{{ k }}</span>
              <span class="kv-value">{{ formatValue(v) }}</span>
            </div>
          </div>
        </div>

        <!-- 流转记录 -->
        <div class="detail-section">
          <div class="form-hd">流转记录</div>
          <HistoryTimeline v-if="detailHistory.length > 0" :history="detailHistory" />
          <el-empty v-else description="暂无操作记录" :image-size="60" />
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import FormRenderer from '@/components/workflow/FormRenderer.vue'
import HistoryTimeline from '@/components/workflow/HistoryTimeline.vue'
import {
  getTodoTasks,
  getDoneTasks,
  claimWorkflowTask,
  completeWorkflowTask,
  getMyCcRecords,
  markCcRead,
  markAllCcRead,
  getWorkflowInstanceDetail,
  getWorkflowHistory,
  getWorkflowNodeForm,
  getWorkflowDefDetail,
  getWorkflowFormDetail,
  type WorkflowTask,
  type WorkflowCcRecord,
  type WorkflowHistory
} from '@/api/workflow'

const activeTab = ref<'todo' | 'done' | 'cc'>('todo')
const loading = ref(false)
const tableData = ref<WorkflowTask[]>([])
const ccList = ref<WorkflowCcRecord[]>([])
const pagination = reactive({ current: 1, size: 10, total: 0 })

// 详情抽屉
const detailVisible = ref(false)
const detailTask = ref<WorkflowTask | null>(null)
const detailCc = ref<WorkflowCcRecord | null>(null)
const detailFormEntries = ref<[string, any][]>([])
const detailNodeForm = ref<{ fields: any[]; data: Record<string, any> }>({ fields: [], data: {} })
const detailHistory = ref<WorkflowHistory[]>([])

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
    row.readStatus = 1
  }
  detailCc.value = row
  detailTask.value = null
  detailVisible.value = true
  await loadDetailContext()
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

function resultLabel(row: WorkflowTask): string {
  const byResult: Record<string, string> = { approve: '同意', reject: '驳回', transfer: '转办', return: '退回' }
  if (row.result && byResult[row.result]) return byResult[row.result]
  // 转办/退回未写 result 字段时按任务状态回退
  const byStatus: Record<number, string> = { 2: '同意', 3: '驳回', 4: '转办', 6: '退回' }
  return byStatus[row.taskStatus || 0] || row.statusDesc || '-'
}

function resultTagType(row: WorkflowTask): any {
  const label = resultLabel(row)
  if (label === '同意') return 'success'
  if (label === '驳回') return 'danger'
  return 'warning'
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
  // 页内抽屉展示任务信息，不跳转流程监控
  detailTask.value = row
  detailCc.value = null
  detailVisible.value = true
  loadDetailContext(row.defId)
}

async function loadDetailContext(defId?: string | number) {
  const instId = detailTask.value?.instanceId || detailCc.value?.instanceId || ''
  detailFormEntries.value = []
  detailNodeForm.value = { fields: [], data: {} }
  detailHistory.value = []
  if (!instId) return

  // 流程定义（表单标签映射用）
  let defRes: any = null
  const effDefId = defId || (detailTask.value as any)?.defId
  if (effDefId) {
    try {
      defRes = await getWorkflowDefDetail(effDefId)
    } catch { /* ignore */ }
  }

  // 流程表单数据（字段ID→标签）
  try {
    const instRes: any = await getWorkflowInstanceDetail(instId)
    if (instRes) {
      // 列表行缺的字段从实例回填（如流程名称/发起人）
      const t = detailTask.value
      if (t) {
        if (!t.defName && instRes.defName) t.defName = instRes.defName
        if (!t.startUser && instRes.startUser) t.startUser = instRes.startUser
      } else if (detailCc.value) {
        const c = detailCc.value
        if (!c.defName && instRes.defName) c.defName = instRes.defName
        if (!c.title && instRes.title) c.title = instRes.title
      }
    }
    if (instRes?.formJson) {
      const data = JSON.parse(instRes.formJson)
      let labelMap: Record<string, string> = {}
      try {
        if (defRes?.formId) {
          const formRes: any = await getWorkflowFormDetail(defRes.formId)
          if (formRes?.schemaJson) {
            for (const f of JSON.parse(formRes.schemaJson)) {
              if (f.id && f.label) labelMap[f.id] = f.label
            }
          }
        }
      } catch { /* ignore */ }
      detailFormEntries.value = Object.entries(data).map(([k, v]) => [labelMap[k] || k, v])
    }
  } catch { /* ignore */ }

  // 节点表单（仅任务有节点）
  const nodeId = detailTask.value?.nodeId
  if (nodeId) {
    try {
      const res: any = await getWorkflowNodeForm(instId, nodeId)
      detailNodeForm.value = {
        fields: res?.formSchema ? JSON.parse(res.formSchema) : [],
        data: res?.formData ? JSON.parse(res.formData) : {}
      }
    } catch { /* ignore */ }
  }

  // 流转记录
  try {
    const historyRes: any = await getWorkflowHistory(instId)
    detailHistory.value = historyRes || []
  } catch {
    detailHistory.value = []
  }
}

function formatValue(v: any): string {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    if (v.length > 0 && v[0]?.name) return v.map((f: any) => f.name).join(', ')
    return JSON.stringify(v)
  }
  if (typeof v === 'object') {
    const str = JSON.stringify(v)
    return str.length > 80 ? str.substring(0, 80) + '...' : str
  }
  return String(v)
}

function getResultLabel(r?: string): string {
  const map: Record<string, string> = {
    approve: '同意', reject: '驳回', transfer: '转办', return: '退回', countersign: '加签', cc: '抄送'
  }
  return map[r || ''] || r || '-'
}

function getResultTagType(r?: string): any {
  const map: Record<string, any> = {
    approve: 'success', reject: 'danger', transfer: 'warning', return: 'warning'
  }
  return map[r || ''] || 'info'
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
  border: 1px solid var(--cw-border);
  border-radius: 6px;
}

.approval-form-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--cw-text);
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* ===== 详情抽屉 ===== */
.detail-summary {
  padding: 12px 16px;
  border: 1px solid var(--cw-border);
  border-radius: 8px;
  background: var(--cw-surface);
}

.summary-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cw-text);
  word-break: break-all;
}

.summary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 22px;
  margin-top: 8px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--cw-text);
}

.meta-label {
  color: var(--cw-control-text);
}

.detail-section {
  margin-top: 14px;
}

.form-hd {
  font-size: 12px;
  font-weight: 600;
  color: var(--cw-text);
  padding: 4px 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--cw-accent) 8%, var(--cw-surface));
}

.kv-list {
  display: flex;
  flex-direction: column;
}

.kv-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 7px 2px;
  border-bottom: 1px solid var(--cw-border);
  font-size: 12px;
}

.kv-item:last-child {
  border-bottom: none;
}

.kv-label {
  flex-shrink: 0;
  color: var(--cw-control-text);
}

.kv-value {
  color: var(--cw-text);
  text-align: right;
  word-break: break-all;
}
</style>
