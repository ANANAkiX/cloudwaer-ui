<template>
  <div class="workflow-monitor-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>流程监控</span>
          <div class="card-actions">
            <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px" @change="loadData">
              <el-option label="运行中" :value="0" />
              <el-option label="已完成" :value="1" />
              <el-option label="已挂起" :value="2" />
              <el-option label="被驳回" :value="3" />
              <el-option label="已终止" :value="4" />
            </el-select>
            <el-input v-model="keyword" placeholder="搜索流程名称/标题" clearable style="width: 200px"
              @keyup.enter="loadData" @clear="loadData" />
            <el-button type="primary" @click="loadData">搜索</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column prop="title" label="流程标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="defName" label="流程名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="startUser" label="发起人" width="100" align="center" />
        <el-table-column prop="statusDesc" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.instStatus)" size="small">{{ row.statusDesc }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" size="small">{{ row.priority }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="发起时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.startTime) }}</template>
        </el-table-column>
        <el-table-column prop="endTime" label="结束时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.endTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
            <el-button v-if="row.instStatus === 0" link type="warning" @click="handleSuspend(row)">挂起</el-button>
            <el-button v-if="row.instStatus === 2" link type="success" @click="handleActivate(row)">激活</el-button>
            <el-button v-if="row.instStatus === 0 || row.instStatus === 2" link type="danger"
              @click="handleTerminate(row)">终止</el-button>
            <el-button v-if="row.instStatus === 3" link type="warning" @click="handleRestart(row)">重启</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50]" :total="pagination.total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData" @current-change="loadData" />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="流程详情" size="80%">
      <template v-if="detailInstance">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="流程标题">{{ detailInstance.title }}</el-descriptions-item>
          <el-descriptions-item label="流程名称">{{ detailInstance.defName }}</el-descriptions-item>
          <el-descriptions-item label="发起人">{{ detailInstance.startUser }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(detailInstance.instStatus)" size="small">
              {{ detailInstance.statusDesc }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发起时间">{{ formatTime(detailInstance.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatTime(detailInstance.endTime) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 流程表单数据 -->
        <div v-if="formDataEntries.length > 0" class="form-data-section">
          <div class="section-title">📋 流程表单</div>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item v-for="[k, v] in formDataEntries" :key="k" :label="k">
              {{ formatValue(v) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 节点关联表单 -->
        <div v-if="nodeFormFields.length > 0" class="form-data-section">
          <div class="section-title">📋 节点关联表单</div>
          <FormRenderer :fields="nodeFormFields" v-model="nodeFormData" :readonly="true" />
        </div>

        <!-- 流程图 + 节点历史 -->
        <div class="process-view">
          <!-- 流程图 -->
          <div class="process-canvas">
            <div class="section-title">
              <span>流程图</span>
              <span class="legend">
                <span class="legend-item"><span class="dot dot-done"></span> 已完成</span>
                <span class="legend-item"><span class="dot dot-active"></span> 进行中</span>
                <span class="legend-item"><span class="dot dot-pending"></span> 未到达</span>
              </span>
            </div>
            <FlowCanvas
              :nodes="processNodes"
              :edges="processEdges"
              :readonly="true"
              @node-click="onNodeClick"
            />
          </div>

          <!-- 节点历史 -->
          <div class="node-history">
            <div class="section-title">
              <span>📋 {{ selectedNodeName || '点击节点查看历史' }}</span>
            </div>
            <div v-if="selectedNodeHistory.length > 0" class="node-history-list">
              <div v-for="h in selectedNodeHistory" :key="h.id" class="history-item">
                <div class="history-header">
                  <el-tag :type="getActionTagType(h.action)" size="small">{{ getActionLabel(h.action) }}</el-tag>
                  <span class="history-operator">{{ h.operator || '系统' }}</span>
                  <span class="history-time">{{ formatTime(h.createTime) }}</span>
                </div>
                <div v-if="h.detail" class="history-detail">{{ h.detail }}</div>
              </div>
            </div>
            <el-empty v-else-if="selectedNodeName" description="该节点暂无操作记录" :image-size="60" />
            <el-empty v-else description="点击左侧流程图中的节点" :image-size="60" />
          </div>
        </div>

        <!-- 全部历史（折叠） -->
        <el-collapse style="margin-top: 12px">
          <el-collapse-item title="完整操作记录" name="all">
            <HistoryTimeline :history="historyList" />
          </el-collapse-item>
          <el-collapse-item title="任务列表" name="tasks">
            <el-table :data="taskList" border size="small">
              <el-table-column prop="taskName" label="任务名称" min-width="120" />
              <el-table-column prop="nodeName" label="节点" min-width="100" />
              <el-table-column prop="assignee" label="处理人" width="90" />
              <el-table-column prop="statusDesc" label="状态" width="80" />
              <el-table-column prop="comment" label="意见" min-width="120" show-overflow-tooltip />
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import HistoryTimeline from '@/components/workflow/HistoryTimeline.vue'
import FormRenderer from '@/components/workflow/FormRenderer.vue'
import FlowCanvas from '@/components/workflow/FlowCanvas.vue'
import {
  getWorkflowInstances,
  getWorkflowInstanceDetail,
  suspendWorkflowInstance,
  activateWorkflowInstance,
  terminateWorkflowInstance,
  restartWorkflowInstance,
  getTasksByInstance,
  getWorkflowHistory,
  getWorkflowDefDetail,
  type WorkflowInstance,
  type WorkflowTask,
  type WorkflowHistory
} from '@/api/workflow'

const loading = ref(false)
const tableData = ref<WorkflowInstance[]>([])
const statusFilter = ref<number | undefined>()
const keyword = ref('')
const pagination = reactive({ current: 1, size: 10, total: 0 })

// 详情
const detailVisible = ref(false)
const detailInstance = ref<WorkflowInstance | null>(null)
const historyList = ref<WorkflowHistory[]>([])
const taskList = ref<WorkflowTask[]>([])
const processNodes = ref<any[]>([])
const processEdges = ref<any[]>([])
const selectedNodeName = ref('')
const selectedNodeHistory = ref<WorkflowHistory[]>([])
const formDataEntries = ref<[string, any][]>([])
const nodeFormFields = ref<any[]>([])
const nodeFormData = ref<Record<string, any>>({})

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const res: any = await getWorkflowInstances({
      current: pagination.current,
      size: pagination.size,
      status: statusFilter.value !== undefined ? String(statusFilter.value) : undefined,
      keyword: keyword.value || undefined
    })
    tableData.value = res?.records || []
    pagination.total = res?.total || 0
  } finally {
    loading.value = false
  }
}

function getActionLabel(action: string): string {
  const map: Record<string, string> = { start:'发起',create:'创建',claim:'认领',approve:'同意',reject:'驳回',transfer:'转办',return:'退回',cc:'抄送',end:'结束',branch_end:'分支完成',restart:'重新发起',timer_fire:'定时触发',wait:'等待处理',error:'异常' }
  return map[action] || action
}

function getActionTagType(action: string): any {
  const map: Record<string, any> = { start:'primary',approve:'success',reject:'danger',transfer:'warning',return:'warning',cc:'info',end:'success',branch_end:'info' }
  return map[action] || 'info'
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

function getPriorityType(priority?: string): any {
  const map: Record<string, any> = {
    urgent: 'danger', high: 'warning', normal: 'primary', low: 'info'
  }
  return map[priority || 'normal'] || 'primary'
}

function formatValue(v: any): string {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    // 文件上传：显示文件名
    if (v.length > 0 && v[0]?.name) return v.map((f: any) => f.name).join(', ')
    return JSON.stringify(v)
  }
  if (typeof v === 'object') {
    // 复杂对象：显示关键字段或截断
    const str = JSON.stringify(v)
    return str.length > 80 ? str.substring(0, 80) + '...' : str
  }
  return String(v)
}

async function onNodeClick(node: any) {
  selectedNodeName.value = node.nodeName || node.nodeId
  selectedNodeHistory.value = historyList.value.filter(h => h.nodeId === node.nodeId)

  // 从 wf_instance_node_form 表加载节点表单
  nodeFormFields.value = []
  nodeFormData.value = {}
  try {
    const { getWorkflowNodeForm } = await import('@/api/workflow')
    const instId = detailInstance.value?.instanceId || (detailInstance.value as any)?.instanceId || ''
    const res: any = await getWorkflowNodeForm(instId, node.nodeId)
    console.warn('[Monitor] nodeForm:', res ? 'found' : 'empty', 'schema=' + !!res?.formSchema, 'data=' + !!res?.formData)
    if (res?.formSchema) {
      nodeFormFields.value = JSON.parse(res.formSchema)
    }
    if (res?.formData) {
      nodeFormData.value = JSON.parse(res.formData)
    }
  } catch (e) {
    console.warn('[Monitor] nodeForm error:', e)
  }
}

function markNodeStates() {
  const done = new Set<string>()
  const active = new Set<string>()
  for (const h of historyList.value) {
    if (!h.nodeId) continue
    if (['approve','reject','transfer','return','branch_end','end'].includes(h.action)) done.add(h.nodeId)
    else if (['start','create','claim'].includes(h.action)) active.add(h.nodeId)
  }
  for (const t of taskList.value) {
    if (!t.nodeId) continue
    if ([2,3,4,6].includes(t.taskStatus||0)) { done.add(t.nodeId); active.delete(t.nodeId) }
    else if ([0,1].includes(t.taskStatus||0)) active.add(t.nodeId)
  }
  processNodes.value = processNodes.value.map(n => {
    let s = 'pending'
    if (done.has(n.nodeId) || n.nodeType === 'start') s = 'done'
    else if (active.has(n.nodeId)) s = 'active'
    return { ...n, _state: s }
  })
}

async function handleDetail(row: WorkflowInstance) {
  try {
    const res: any = await getWorkflowInstanceDetail(row.instanceId)
    detailInstance.value = res
    detailVisible.value = true

    // 加载任务列表
    const taskRes: any = await getTasksByInstance(row.instanceId)
    taskList.value = taskRes?.records || []

    // 加载历史
    try {
      const historyRes: any = await getWorkflowHistory(row.instanceId)
      historyList.value = historyRes || []
    } catch {
      historyList.value = []
    }

    // 加载流程定义（节点+连线）
    try {
      const defId = (detailInstance.value as any)?.defId || (row as any).defId || 0
      const defRes: any = await getWorkflowDefDetail(defId)
      processNodes.value = defRes?.nodes || []
      processEdges.value = defRes?.edges || []
      markNodeStates()
    } catch {
      processNodes.value = []
      processEdges.value = []
    }

    selectedNodeName.value = ''
    selectedNodeHistory.value = []

    // 解析流程表单数据（映射字段ID→标签）
    try {
      const formJson = (detailInstance.value as any)?.formJson
      if (formJson) {
        const data = JSON.parse(formJson)
        // 加载表单 schema 来映射标签
        let labelMap: Record<string, string> = {}
        try {
          const defId = (detailInstance.value as any)?.defId || (row as any).defId || 0
          const defRes: any = await getWorkflowDefDetail(defId)
          if (defRes?.formId) {
            const { getWorkflowFormDetail } = await import('@/api/workflow')
            const formRes: any = await getWorkflowFormDetail(defRes.formId)
            if (formRes?.schemaJson) {
              const fields = JSON.parse(formRes.schemaJson)
              for (const f of fields) {
                if (f.id && f.label) labelMap[f.id] = f.label
              }
            }
          }
        } catch { /* ignore */ }
        formDataEntries.value = Object.entries(data).map(([k, v]) => [labelMap[k] || k, v])
      } else {
        formDataEntries.value = []
      }
    } catch {
      formDataEntries.value = []
    }
  } catch {
    ElMessage.error('加载详情失败')
  }
}

async function handleSuspend(row: WorkflowInstance) {
  try {
    await ElMessageBox.confirm('确认挂起该流程实例？', '挂起确认', { type: 'warning' })
    await suspendWorkflowInstance(row.instanceId)
    ElMessage.success('已挂起')
    loadData()
  } catch { /* ignore */ }
}

async function handleActivate(row: WorkflowInstance) {
  try {
    await activateWorkflowInstance(row.instanceId)
    ElMessage.success('已激活')
    loadData()
  } catch { /* ignore */ }
}

async function handleTerminate(row: WorkflowInstance) {
  try {
    await ElMessageBox.confirm('确认终止该流程实例？此操作不可撤销。', '终止确认', { type: 'error' })
    await terminateWorkflowInstance(row.instanceId)
    ElMessage.success('已终止')
    loadData()
  } catch { /* ignore */ }
}

async function handleRestart(row: WorkflowInstance) {
  try {
    await ElMessageBox.confirm('确认重新发起该流程？', '重启确认', { type: 'warning' })
    await restartWorkflowInstance(row.instanceId)
    ElMessage.success('已重新发起')
    loadData()
  } catch { /* ignore */ }
}
</script>

<style scoped>
.workflow-monitor-page {
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

.process-view {
  display: flex;
  flex-direction: row;
  gap: 16px;
  margin-top: 16px;
  height: 400px;
}

.process-canvas {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
}

.process-canvas .section-title {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.process-canvas :deep(.flow-canvas) {
  height: 340px;
  border: none;
  border-radius: 0;
}

.node-history {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}

.node-history .section-title {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.node-history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  font-weight: 400;
  color: var(--muted, #888);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot-done { background: #22c55e; }
.dot-active { background: #3b82f6; }
.dot-pending { background: #d0d4dd; }

.history-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border, #e2e8f0);
}

.history-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.history-operator {
  font-size: 12px;
  font-weight: 500;
  color: var(--ink, #333);
}

.history-time {
  font-size: 11px;
  color: var(--muted, #999);
  margin-left: auto;
}

.form-data-section {
  margin-top: 12px;
}

.form-data-section .section-title {
  margin-bottom: 8px;
}

.history-detail {
  font-size: 12px;
  color: var(--muted, #666);
  background: var(--bg, #f8fafc);
  padding: 6px 10px;
  border-radius: 4px;
}
</style>
