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

    <!-- 详情抽屉：摘要条 + 左流程图 + 右侧栏（表单/流转/任务） -->
    <el-drawer v-model="detailVisible" title="流程详情" size="86%">
      <template v-if="detailInstance">
        <!-- 顶部摘要条 -->
        <div class="detail-summary">
          <div class="summary-title-row">
            <span class="summary-title">{{ detailInstance.title }}</span>
            <el-tag :type="getStatusType(detailInstance.instStatus)" size="small">
              {{ detailInstance.statusDesc }}
            </el-tag>
          </div>
          <div class="summary-meta">
            <span class="meta-item"><span class="meta-label">流程名称</span>{{ detailInstance.defName }}</span>
            <span class="meta-item"><span class="meta-label">发起人</span>{{ detailInstance.startUser }}</span>
            <span class="meta-item"><span class="meta-label">发起时间</span>{{ formatTime(detailInstance.startTime) }}</span>
            <span class="meta-item"><span class="meta-label">结束时间</span>{{ formatTime(detailInstance.endTime) }}</span>
          </div>
        </div>

        <!-- 主体两栏 -->
        <div class="detail-body">
          <!-- 左：流程图 -->
          <div class="detail-diagram">
            <div class="panel-hd">
              <span class="panel-title">流程图</span>
              <span class="legend">
                <span class="legend-item"><span class="dot dot-done"></span> 已完成</span>
                <span class="legend-item"><span class="dot dot-active"></span> 进行中</span>
                <span class="legend-item"><span class="dot dot-pending"></span> 未到达</span>
              </span>
            </div>
            <div class="diagram-canvas-wrap">
              <FlowCanvas
                :nodes="processNodes"
                :edges="processEdges"
                :readonly="true"
                @node-click="onNodeClick"
              />
            </div>
          </div>

          <!-- 右：表单数据 / 流转记录 / 任务列表 -->
          <div class="detail-side">
            <div v-if="selectedNodeName" class="node-filter-chip">
              <span>已选节点 · {{ selectedNodeName }}</span>
              <el-button link type="primary" size="small" @click="clearNodeFilter">查看全部</el-button>
            </div>
            <el-tabs v-model="sideTab" class="side-tabs">
              <el-tab-pane label="表单数据" name="form">
                <template v-if="selectedNodeId">
                  <!-- 聚焦单个节点 -->
                  <div v-if="selectedNodeForm" class="form-block">
                    <div class="form-hd">节点 · {{ selectedNodeForm.nodeName }}</div>
                    <FormRenderer
                      v-if="selectedNodeForm.fields.length > 0"
                      :fields="selectedNodeForm.fields"
                      :model-value="selectedNodeForm.data"
                      :readonly="true"
                      label-width="90px"
                      size="small"
                    />
                    <div v-else class="kv-list">
                      <div v-for="(v, k) in selectedNodeForm.data" :key="k" class="kv-item">
                        <span class="kv-label">{{ k }}</span>
                        <span class="kv-value">{{ formatValue(v) }}</span>
                      </div>
                    </div>
                  </div>
                  <el-empty v-else description="该节点暂无表单数据" :image-size="60" />
                </template>
                <template v-else>
                  <!-- 流程表单 -->
                  <div v-if="formDataEntries.length > 0" class="form-block">
                    <div class="form-hd">流程表单</div>
                    <div class="kv-list">
                      <div v-for="[k, v] in formDataEntries" :key="k" class="kv-item">
                        <span class="kv-label">{{ k }}</span>
                        <span class="kv-value">{{ formatValue(v) }}</span>
                      </div>
                    </div>
                  </div>
                  <!-- 已到达节点的表单，按流转顺序分组 -->
                  <div v-for="nf in nodeFormList" :key="nf.nodeId" class="form-block">
                    <div class="form-hd">节点 · {{ nf.nodeName }}</div>
                    <FormRenderer
                      v-if="nf.fields.length > 0"
                      :fields="nf.fields"
                      :model-value="nf.data"
                      :readonly="true"
                      label-width="90px"
                      size="small"
                    />
                    <div v-else class="kv-list">
                      <div v-for="(v, k) in nf.data" :key="k" class="kv-item">
                        <span class="kv-label">{{ k }}</span>
                        <span class="kv-value">{{ formatValue(v) }}</span>
                      </div>
                    </div>
                  </div>
                  <el-empty
                    v-if="formDataEntries.length === 0 && nodeFormList.length === 0"
                    description="暂无表单数据"
                    :image-size="60"
                  />
                </template>
              </el-tab-pane>

              <el-tab-pane name="history">
                <template #label>流转记录<span v-if="visibleHistory.length" class="tab-count">{{ visibleHistory.length }}</span></template>
                <HistoryTimeline v-if="visibleHistory.length > 0" :history="visibleHistory" />
                <el-empty
                  v-else
                  :description="selectedNodeName ? '该节点暂无操作记录' : '暂无操作记录'"
                  :image-size="60"
                />
              </el-tab-pane>

              <el-tab-pane label="任务列表" name="tasks">
                <el-table :data="taskList" border size="small">
                  <el-table-column prop="taskName" label="任务名称" min-width="110" />
                  <el-table-column prop="nodeName" label="节点" min-width="90" />
                  <el-table-column prop="assignee" label="处理人" width="85" align="center" />
                  <el-table-column prop="statusDesc" label="状态" width="75" align="center" />
                  <el-table-column prop="comment" label="意见" min-width="110" show-overflow-tooltip />
                </el-table>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
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
  getWorkflowFormDetail,
  getWorkflowNodeForm,
  type WorkflowInstance,
  type WorkflowTask,
  type WorkflowHistory
} from '@/api/workflow'

interface NodeFormEntry {
  nodeId: string
  nodeName: string
  fields: any[]
  data: Record<string, any>
}

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
const formDataEntries = ref<[string, any][]>([])
const nodeForms = ref<Record<string, NodeFormEntry>>({})

// 右侧栏
const sideTab = ref<'form' | 'history' | 'tasks'>('form')
const selectedNodeId = ref('')
const selectedNodeName = ref('')

const visibleHistory = computed(() =>
  selectedNodeId.value
    ? historyList.value.filter(h => h.nodeId === selectedNodeId.value)
    : historyList.value
)

const nodeFormList = computed(() => {
  const order: string[] = []
  for (const h of historyList.value) {
    if (h.nodeId && nodeForms.value[h.nodeId] && !order.includes(h.nodeId)) order.push(h.nodeId)
  }
  for (const nid of Object.keys(nodeForms.value)) {
    if (!order.includes(nid)) order.push(nid)
  }
  return order.map(nid => nodeForms.value[nid])
})

const selectedNodeForm = computed(() =>
  selectedNodeId.value ? nodeForms.value[selectedNodeId.value] || null : null
)

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

function onNodeClick(node: any) {
  // 再次点击同一节点 = 取消筛选
  if (selectedNodeId.value === node.nodeId) {
    clearNodeFilter()
    return
  }
  selectedNodeId.value = node.nodeId
  selectedNodeName.value = node.nodeName || node.nodeId
  // 有记录看记录，否则看表单
  const hasHistory = historyList.value.some(h => h.nodeId === node.nodeId)
  if (hasHistory) sideTab.value = 'history'
  else if (nodeForms.value[node.nodeId]) sideTab.value = 'form'
}

function clearNodeFilter() {
  selectedNodeId.value = ''
  selectedNodeName.value = ''
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

async function loadNodeForms(instanceId: string) {
  const visited = [...new Set(historyList.value.map(h => h.nodeId).filter(Boolean))] as string[]
  const nameMap: Record<string, string> = {}
  for (const n of processNodes.value) nameMap[n.nodeId] = n.nodeName || n.nodeId
  const forms: Record<string, NodeFormEntry> = {}
  await Promise.all(visited.map(async (nid) => {
    try {
      const res: any = await getWorkflowNodeForm(instanceId, nid)
      const fields = res?.formSchema ? JSON.parse(res.formSchema) : []
      const data = res?.formData ? JSON.parse(res.formData) : {}
      if (fields.length > 0 || Object.keys(data).length > 0) {
        forms[nid] = { nodeId: nid, nodeName: nameMap[nid] || nid, fields, data }
      }
    } catch { /* 单个节点表单失败不影响整体 */ }
  }))
  nodeForms.value = forms
}

async function handleDetail(row: WorkflowInstance) {
  try {
    const res: any = await getWorkflowInstanceDetail(row.instanceId)
    detailInstance.value = res
    detailVisible.value = true
    sideTab.value = 'form'
    selectedNodeId.value = ''
    selectedNodeName.value = ''

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
    let defRes: any = null
    try {
      const defId = (detailInstance.value as any)?.defId || (row as any).defId || 0
      defRes = await getWorkflowDefDetail(defId)
      processNodes.value = defRes?.nodes || []
      processEdges.value = defRes?.edges || []
      markNodeStates()
    } catch {
      processNodes.value = []
      processEdges.value = []
    }

    // 解析流程表单数据（映射字段ID→标签）
    try {
      const formJson = (detailInstance.value as any)?.formJson
      if (formJson) {
        const data = JSON.parse(formJson)
        let labelMap: Record<string, string> = {}
        try {
          if (defRes?.formId) {
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

    // 已到达节点的节点表单
    await loadNodeForms(row.instanceId)
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

/* ===== 详情摘要条 ===== */
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

/* ===== 主体两栏 ===== */
.detail-body {
  display: flex;
  gap: 14px;
  margin-top: 14px;
  height: min(580px, calc(100vh - 270px));
  min-height: 380px;
}

.detail-diagram {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--cw-border);
  border-radius: 8px;
  background: var(--cw-surface);
  overflow: hidden;
}

.panel-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--cw-border);
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cw-text);
}

.legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--cw-control-text);
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
.dot-done { background: var(--el-color-success); }
.dot-active { background: var(--el-color-primary); }
.dot-pending { background: var(--el-color-info); opacity: 0.45; }

.diagram-canvas-wrap {
  flex: 1;
  min-height: 0;
}

.diagram-canvas-wrap :deep(.flow-canvas) {
  height: 100%;
  border: none;
  border-radius: 0;
}

/* 只读监控视图不需要设计器操作提示 */
.diagram-canvas-wrap :deep(.toolbar-hint) {
  display: none;
}

/* ===== 右侧栏 ===== */
.detail-side {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--cw-border);
  border-radius: 8px;
  background: var(--cw-surface);
  overflow: hidden;
}

.node-filter-chip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 12px;
  font-size: 12px;
  color: var(--cw-accent);
  background: var(--cw-control-bg);
  border-bottom: 1px solid var(--cw-border);
}

.side-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.side-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 12px;
}

.side-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 14px;
}

.side-tabs :deep(.el-tab-pane) {
  min-height: 100%;
}

.tab-count {
  display: inline-block;
  margin-left: 4px;
  padding: 0 6px;
  font-size: 10px;
  line-height: 16px;
  border-radius: 8px;
  color: var(--cw-accent);
  background: color-mix(in srgb, var(--cw-accent) 14%, transparent);
}

/* ===== 表单键值列表 ===== */
.form-block {
  margin-bottom: 14px;
}

.form-block:last-child {
  margin-bottom: 0;
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
