<template>
  <div class="process-monitor">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>流程监控</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索业务Key/流程名称"
              clearable
              style="width: 260px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 120px" @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="运行中" value="running" />
              <el-option label="已完成" value="completed" />
              <el-option label="已挂起" value="suspended" />
              <el-option label="已终止" value="terminated" />
            </el-select>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button type="success" @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 统计卡片 -->
      <div class="stats-cards">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card class="stat-card running">
              <div class="stat-content">
                <div class="stat-number">{{ stats.running }}</div>
                <div class="stat-label">运行中</div>
              </div>
              <el-icon class="stat-icon"><VideoPlay /></el-icon>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card completed">
              <div class="stat-content">
                <div class="stat-number">{{ stats.completed }}</div>
                <div class="stat-label">已完成</div>
              </div>
              <el-icon class="stat-icon"><CircleCheck /></el-icon>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card suspended">
              <div class="stat-content">
                <div class="stat-number">{{ stats.suspended }}</div>
                <div class="stat-label">已挂起</div>
              </div>
              <el-icon class="stat-icon"><VideoPause /></el-icon>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card terminated">
              <div class="stat-content">
                <div class="stat-number">{{ stats.terminated }}</div>
                <div class="stat-label">已终止</div>
              </div>
              <el-icon class="stat-icon"><CircleClose /></el-icon>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 流程实例列表 -->
    <el-card class="instance-list-card">
      <template #header>
        <div class="card-header">
          <span>流程实例</span>
          <div class="header-actions">
            <el-button-group>
              <el-button
                :type="viewMode === 'table' ? 'primary' : ''"
                @click="viewMode = 'table'"
              >
                <el-icon><List /></el-icon>
                列表视图
              </el-button>
              <el-button
                :type="viewMode === 'timeline' ? 'primary' : ''"
                @click="viewMode = 'timeline'"
              >
                <el-icon><Clock /></el-icon>
                时间线视图
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <!-- 表格视图 -->
      <el-table
        v-if="viewMode === 'table'"
        :data="tableData"
        border
        style="width: 100%"
        v-loading="loading"
        table-layout="fixed"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="processInstanceId" label="实例ID" min-width="200">
          <template #default="scope">
            <el-tag type="info" size="small">{{ scope.row.id }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="processDefinitionName" label="流程名称" min-width="180">
          <template #default="scope">
            <div class="process-name">
              <el-icon><Document /></el-icon>
              <span>{{ scope.row.processDefinitionName || scope.row.processDefinitionKey }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="businessKey" label="业务Key" min-width="150">
          <template #default="scope">
            <el-tag v-if="scope.row.businessKey" size="small">{{ scope.row.businessKey }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" min-width="160">
          <template #default="scope">
            <span>{{ formatTime(scope.row.startTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="endTime" label="结束时间" min-width="160">
          <template #default="scope">
            <span>{{ formatTime(scope.row.endTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="运行时长" width="120" align="center">
          <template #default="scope">
            <span>{{ formatDuration(scope.row.startTime, scope.row.endTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- 暂时注释掉当前任务列，后端DTO中没有此字段 -->
        <!-- <el-table-column prop="currentTask" label="当前任务" min-width="150">
          <template #default="scope">
            <span v-if="scope.row.currentTask">{{ scope.row.currentTask }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column> -->
        <el-table-column label="操作" width="280" fixed="right" align="center">
          <template #default="scope">
            <el-button-group>
              <el-button size="small" type="primary" @click="viewInstanceDetail(scope.row)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
              <el-button
                v-if="scope.row.status === 'running'"
                size="small"
                type="warning"
                @click="suspendInstance(scope.row)"
              >
                <el-icon><VideoPause /></el-icon>
                挂起
              </el-button>
              <el-button
                v-if="scope.row.status === 'suspended'"
                size="small"
                type="success"
                @click="activateInstance(scope.row)"
              >
                <el-icon><VideoPlay /></el-icon>
                激活
              </el-button>
              <el-button
                v-if="scope.row.status === 'rejected'"
                size="small"
                type="warning"
                @click="restartInstance(scope.row)"
              >
                <el-icon><Refresh /></el-icon>
                &#x91CD;&#x65B0;&#x53D1;&#x8D77;
              </el-button>
              <el-button
                v-if="scope.row.status === 'running'"
                size="small"
                type="danger"
                @click="terminateInstance(scope.row)"
              >
                <el-icon><CircleClose /></el-icon>
                终止
              </el-button>
              <el-dropdown @command="(command: string) => handleMoreAction(command, scope.row)">
                <el-button size="small">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="diagram">
                      <el-icon><Picture /></el-icon>
                      流程图
                    </el-dropdown-item>
                    <el-dropdown-item command="variables">
                      <el-icon><Document /></el-icon>
                      流程变量
                    </el-dropdown-item>
                    <el-dropdown-item command="history">
                      <el-icon><Clock /></el-icon>
                      操作历史
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 时间线视图 -->
      <div v-else class="timeline-view">
        <el-timeline>
          <el-timeline-item
            v-for="item in tableData"
            :key="item.id"
            :timestamp="formatTime(item.startTime)"
            :type="getTimelineType(item.status)"
          >
            <el-card class="timeline-card">
              <div class="timeline-header">
                <div class="process-info">
                  <h4>{{ item.processDefinitionName || item.processDefinitionKey }}</h4>
                  <el-tag :type="getStatusType(item.status)" size="small">
                    {{ getStatusText(item.status) }}
                  </el-tag>
                </div>
                <div class="timeline-actions">
                  <el-button size="small" type="primary" @click="viewInstanceDetail(item)">详情</el-button>
                </div>
              </div>
              <div class="timeline-content">
                <p><strong>实例ID:</strong> {{ item.id }}</p>
                <p><strong>业务Key:</strong> {{ item.businessKey || '-' }}</p>
                <!-- <p><strong>当前任务:</strong> {{ item.currentTask || '-' }}</p> -->
                <p><strong>运行时长:</strong> {{ formatDuration(item.startTime, item.endTime) }}</p>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pageParams.current"
          v-model:page-size="pageParams.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pageParams.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 批量操作栏 -->
    <div v-if="selectedRows.length > 0" class="batch-actions">
      <el-card>
        <div class="batch-content">
          <span>已选择 {{ selectedRows.length }} 项</span>
          <div class="batch-buttons">
            <el-button type="warning" @click="handleBatchSuspend">批量挂起</el-button>
            <el-button type="success" @click="handleBatchActivate">批量激活</el-button>
            <el-button type="danger" @click="handleBatchTerminate">批量终止</el-button>
            <el-button @click="clearSelection">清空选择</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 实例详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="流程实例详情"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="instance-detail" v-if="currentInstance">
        <el-tabs v-model="activeTab">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="实例ID">
                {{ currentInstance.id }}
              </el-descriptions-item>
              <el-descriptions-item label="流程定义Key">
                {{ currentInstance.processDefinitionKey }}
              </el-descriptions-item>
              <el-descriptions-item label="流程定义名称">
                {{ currentInstance.processDefinitionName || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="业务Key">
                {{ currentInstance.businessKey || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="开始时间">
                {{ formatTime(currentInstance.startTime) }}
              </el-descriptions-item>
              <el-descriptions-item label="结束时间">
                {{ formatTime(currentInstance.endTime) }}
              </el-descriptions-item>
              <el-descriptions-item label="发起人">
                <!-- {{ currentInstance.startUserId || '-' }} -->
                <span>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusType(currentInstance.status)">
                  {{ getStatusText(currentInstance.status) }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 流程图 -->
          <el-tab-pane label="流程图" name="diagram">
            <div class="process-diagram">
              <!-- 优先使用 BPMN XML + bpmn-js 只读渲染（无左侧 palette） -->
              <div v-if="processBpmnXml" class="bpmn-viewer-layout">
                <div class="bpmn-viewer-canvas" ref="bpmnCanvasRef"></div>
                <div class="bpmn-viewer-props">
                  <el-card v-if="selectedBpmnElement">
                    <template #header>
                      <span>节点属性</span>
                    </template>
                    <el-form :model="selectedBpmnProps" label-width="90px" size="small">
                      <el-form-item label="ID">
                        <el-input v-model="selectedBpmnProps.id" disabled />
                      </el-form-item>
                      <el-form-item label="类型">
                        <el-input v-model="selectedBpmnProps.type" disabled />
                      </el-form-item>
                      <el-form-item label="节点名称">
                        <el-input v-model="selectedBpmnProps.name" disabled />
                      </el-form-item>
                      <el-form-item label="处理人" v-if="selectedBpmnProps.assignee">
                        <el-input v-model="selectedBpmnProps.assignee" disabled />
                      </el-form-item>
                      <el-form-item label="候选用户" v-if="selectedBpmnProps.candidateUsers">
                        <el-input v-model="selectedBpmnProps.candidateUsers" disabled />
                      </el-form-item>
                      <el-form-item label="候选组" v-if="selectedBpmnProps.candidateGroups">
                        <el-input v-model="selectedBpmnProps.candidateGroups" disabled />
                      </el-form-item>
                      <el-form-item label="条件表达式" v-if="selectedBpmnProps.conditionExpression">
                        <el-input v-model="selectedBpmnProps.conditionExpression" disabled />
                      </el-form-item>
                    </el-form>
                  </el-card>
                  <el-empty v-else description="点击流程节点查看属性" />
                </div>
              </div>

              <!-- 兜底：仍可展示后端生成的 SVG -->
              <div
                v-else-if="processDiagram && processDiagram.includes('<svg')"
                style="width: 100%; height: 600px; overflow: auto; border: 1px solid #ddd; background: white;"
              >
                <div v-html="processDiagram"></div>
              </div>

              <!-- BPMN XML 兜底：显示格式化的XML -->
              <pre
                v-else-if="processDiagram && (processDiagram.includes('<bpmn:definitions') || processDiagram.includes('<definitions'))"
                class="bpmn-xml"
              >{{ formatXml(processDiagram) }}</pre>

              <div v-else class="no-diagram">
                <el-icon><Picture /></el-icon>
                <p>暂无流程图</p>
              </div>
            </div>
          </el-tab-pane>

          <!-- 流程变量 -->
          <el-tab-pane label="流程变量" name="variables">
            <div class="process-variables">
              <el-table :data="displayProcessVariables" border>
                <el-table-column prop="name" label="变量名" min-width="150" />
                <el-table-column prop="type" label="类型" width="100" />
                <el-table-column prop="value" label="值" min-width="200">
                  <template #default="scope">
                    <span v-if="scope.row.type === 'string'">{{ scope.row.value }}</span>
                    <el-tag v-else-if="scope.row.type === 'boolean'" :type="scope.row.value ? 'success' : 'danger'">
                      {{ scope.row.value ? '是' : '否' }}
                    </el-tag>
                    <span v-else>{{ JSON.stringify(scope.row.value) }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <!-- 动态表单的预览 -->
          <el-tab-pane label="动态表单" name="form">
            <div class="process-form">
              <form-create
                v-if="formViewRule.length > 0"
                v-model="formViewData"
                :rule="formViewRule"
                :option="formViewOptions"
              />
              <div v-else class="empty-form">动态表单</div>
            </div>
          </el-tab-pane>

          <!-- 操作历史 -->
          <el-tab-pane label="操作历史" name="history">
            <div class="operation-history">
              <el-timeline>
                <el-timeline-item
                  v-for="history in operationHistory"
                  :key="history.id"
                  :timestamp="formatTime(history.time)"
                  :type="getHistoryType(history.type)"
                >
                  <el-card>
                    <div class="history-content">
                      <p><strong>{{ history.userName }}</strong> {{ history.action }}</p>
                      <p v-if="history.comment">备注: {{ history.comment }}</p>
                      <p v-if="history.duration">耗时: {{ history.duration }}</p>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Refresh, List, Clock, VideoPlay, VideoPause, CircleCheck,
  CircleClose, Document, View, ArrowDown, Picture, Delete
} from '@element-plus/icons-vue'
import type { FlowableProcessInstance } from '@/api/flowable'
import FcDesigner from '@/components/FcDesigner'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import { deleteFlowableProcess, suspendFlowableProcess, activateFlowableProcess, restartFlowableProcess, terminateFlowableProcess, getProcessDiagram, getProcessVariables, getProcessHistory, getProcessBpmnXml } from '@/api/flowable'

// 响应式数据
const loading = ref(false)
const viewMode = ref<'table' | 'timeline'>('table')
const searchKeyword = ref('')
const statusFilter = ref('')
const detailDialogVisible = ref(false)
const activeTab = ref('basic')
const selectedRows = ref<FlowableProcessInstance[]>([])

// 分页参数
const pageParams = reactive({
  current: 1,
  size: 20,
  total: 0
})

// 表格数据
const tableData = ref<FlowableProcessInstance[]>([])

// 统计数据
const stats = reactive({
  running: 0,
  completed: 0,
  suspended: 0,
  terminated: 0,
  rejected: 0
})

// 当前实例
const currentInstance = ref<FlowableProcessInstance | null>(null)

// 流程图
const processDiagram = ref<string>('')
const processBpmnXml = ref<string>('')

const bpmnCanvasRef = ref<HTMLElement | null>(null)
let bpmnViewer: any = null

const selectedBpmnElement = ref<any>(null)
const selectedBpmnProps = reactive({
  id: '',
  name: '',
  type: '',
  assignee: '',
  candidateUsers: '',
  candidateGroups: '',
  conditionExpression: ''
})

// 流程变量
const processVariables = ref<any[]>([])

const formJsonValue = ref<string>('')
const formViewRule = ref<any[]>([])
const formViewOptions = ref<Record<string, any>>({})
const formViewData = ref<Record<string, any>>({})
const formCreate = (FcDesigner as any).formCreate
const displayProcessVariables = computed(() => (processVariables.value || []).filter((item) => item?.name !== 'formJson' && item?.name !== 'form_json'))

// 操作历史
const operationHistory = ref<any[]>([])

// BPMN容器引用 - 移除，不再需要
// const bpmnContainer = ref<HTMLElement | null>(null)

// 方法
// ??
const parseFormJsonPayload = (raw: any) => {
  if (!raw) return null
  try {
    let data = raw
    if (typeof data === 'string') {
      data = JSON.parse(data)
    }
    if (typeof data === 'string') {
      data = JSON.parse(data)
    }
    return data && typeof data === 'object' ? data : null
  } catch (error) {
    console.error(error)
    return null
  }
}

const parseFormCreateJson = (raw: any) => {
  if (!raw) return null
  try {
    if (typeof raw === 'string') {
      if (formCreate?.parseJson) {
        return formCreate.parseJson(raw)
      }
      return JSON.parse(raw)
    }
    return raw
  } catch (error) {
    console.error( error)
    return null
  }
}

const normalizeFormViewOptions = (options: any) => {
  const normalized = options && typeof options === 'object' ? { ...options } : {}
  normalized.submitBtn = false
  normalized.resetBtn = false
  normalized.disabled = true
  normalized.form = normalized.form || {}
  normalized.form.disabled = true
  return normalized
}

const resetFormView = () => {
  formJsonValue.value = ''
  formViewRule.value = []
  formViewOptions.value = {}
  formViewData.value = {}
}

const initFormView = (raw: any) => {
  const payload = parseFormJsonPayload(raw)
  if (!payload) {
    resetFormView()
    return
  }
  const rule = parseFormCreateJson(payload.rule || payload.rules)
  const options = parseFormCreateJson(payload.options || payload.option)
  formViewRule.value = Array.isArray(rule) ? rule : []
  formViewOptions.value = normalizeFormViewOptions(options)
  formViewData.value = {}
}

const applyProcessVariables = (variables: any[]) => {
  processVariables.value = Array.isArray(variables) ? variables : []
  const formVar = (processVariables.value || []).find((item) => item?.name === 'formJson' || item?.name === 'form_json')
  formJsonValue.value = formVar && formVar.value != null ? String(formVar.value) : ''
  initFormView(formJsonValue.value)
}

const loadData = async () => {
  try {
    loading.value = true
    const params = {
      current: pageParams.current,
      size: pageParams.size,
      keyword: searchKeyword.value,
      status: statusFilter.value
    }
    // 调用API获取流程实例数据
    const { getProcessInstances } = await import('@/api/flowable')
    const response = await getProcessInstances(params)

    tableData.value = response.records || []
    pageParams.total = response.total || 0

    // 更新统计数据
    updateStats(tableData.value)

  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
    tableData.value = []
    pageParams.total = 0
    updateStats([])
  } finally {
    loading.value = false
  }
}

const updateStats = (data: FlowableProcessInstance[]) => {
  stats.running = data.filter(item => item.status === 'running').length
  stats.completed = data.filter(item => item.status === 'completed').length
  stats.suspended = data.filter(item => item.status === 'suspended').length
  stats.terminated = data.filter(item => item.status === 'terminated').length
  stats.rejected = data.filter(item => item.status === 'rejected').length
}

const handleSearch = () => {
  pageParams.current = 1
  loadData()
}

const refreshData = () => {
  loadData()
  ElMessage.success('数据已刷新')
}

const handleSelectionChange = (selection: FlowableProcessInstance[]) => {
  selectedRows.value = selection
}

const handleSizeChange = (size: number) => {
  pageParams.size = size
  pageParams.current = 1
  loadData()
}

const handleCurrentChange = (current: number) => {
  pageParams.current = current
  loadData()
}

const viewInstanceDetail = async (row: FlowableProcessInstance) => {
  currentInstance.value = row

  try {
    // 并行获取流程图、流程变量和操作历史（流程图优先取 BPMN XML 用于只读渲染）
    const [bpmnXmlResponse, diagramResponse, variablesResponse, historyResponse] = await Promise.all([
      getProcessBpmnXml(row.id).catch(() => ''),
      getProcessDiagram(row.id),
      getProcessVariables(row.id),
      getProcessHistory(row.id)
    ])

    processBpmnXml.value = typeof bpmnXmlResponse === 'string' ? bpmnXmlResponse : ''

    // 设置流程图（兜底：SVG）
    processDiagram.value = diagramResponse

    // 设置流程变量
    applyProcessVariables(variablesResponse)

    // 设置操作历史
    operationHistory.value = historyResponse

    // 显示对话框
    detailDialogVisible.value = true

  } catch (error) {
    console.error('获取流程详情失败:', error)
    ElMessage.error('获取流程详情失败')

    // 设置默认值以防API调用失败
    processDiagram.value = ''
    processBpmnXml.value = ''
    destroyBpmnViewer()
    processVariables.value = []
    resetFormView()
    operationHistory.value = []
  }
}

const suspendInstance = async (row: FlowableProcessInstance) => {
  try {
    await ElMessageBox.confirm('确定要挂起此流程实例吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await suspendFlowableProcess(row.id)
    ElMessage.success('流程实例已挂起')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('挂起失败:', error)
      ElMessage.error('挂起失败')
    }
  }
}

const restartInstance = async (row: FlowableProcessInstance) => {
  try {
    await ElMessageBox.confirm('是否重新发起该流程实例？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await restartFlowableProcess(row.id)
    ElMessage.success('重新发起成功')
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('restart process failed:', error)
      ElMessage.error('重新发起失败')
    }
  }
}

const activateInstance = async (row: FlowableProcessInstance) => {
  try {
    await ElMessageBox.confirm('确定要激活此流程实例吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await activateFlowableProcess(row.id)
    ElMessage.success('流程实例已激活')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('激活失败:', error)
      ElMessage.error('激活失败')
    }
  }
}

const terminateInstance = async (row: FlowableProcessInstance) => {
  try {
    await ElMessageBox.confirm('确定要终止此流程实例吗？终止后不可恢复！', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await terminateFlowableProcess(row.id)
    ElMessage.success('流程实例已终止')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('终止失败:', error)
      ElMessage.error('终止失败')
    }
  }
}

const handleMoreAction = async (command: string, row: FlowableProcessInstance) => {
  switch (command) {
    case 'diagram':
      await showProcessDiagram(row)
      break
    case 'variables':
      await showProcessVariables(row)
      break
    case 'history':
      await showOperationHistory(row)
      break
    case 'delete':
      await handleDelete(row)
      break
  }
}

const showProcessDiagram = (row: FlowableProcessInstance) => {
  activeTab.value = 'diagram'
  viewInstanceDetail(row)
}

const showProcessVariables = (row: FlowableProcessInstance) => {
  activeTab.value = 'variables'
  viewInstanceDetail(row)
}

const showOperationHistory = (row: FlowableProcessInstance) => {
  activeTab.value = 'history'
  viewInstanceDetail(row)
}

const handleDelete = async (row: FlowableProcessInstance) => {
  try {
    await ElMessageBox.confirm('确定要删除此流程实例吗？删除后不可恢复！', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteFlowableProcess(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleBatchSuspend = async () => {
  try {
    await ElMessageBox.confirm(`确定要挂起选中的 ${selectedRows.value.length} 个流程实例吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // TODO: 调用批量挂起API
    ElMessage.success('批量挂起成功')
    clearSelection()
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量挂起失败:', error)
      ElMessage.error('批量挂起失败')
    }
  }
}

const handleBatchActivate = async () => {
  try {
    await ElMessageBox.confirm(`确定要激活选中的 ${selectedRows.value.length} 个流程实例吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // TODO: 调用批量激活API
    ElMessage.success('批量激活成功')
    clearSelection()
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量激活失败:', error)
      ElMessage.error('批量激活失败')
    }
  }
}

const handleBatchTerminate = async () => {
  try {
    await ElMessageBox.confirm(`确定要终止选中的 ${selectedRows.value.length} 个流程实例吗？终止后不可恢复！`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // TODO: 调用批量终止API
    ElMessage.success('批量终止成功')
    clearSelection()
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量终止失败:', error)
      ElMessage.error('批量终止失败')
    }
  }
}

const clearSelection = () => {
  selectedRows.value = []
}

const getStatusType = (status?: string) => {
  switch (status) {
    case 'running': return 'success'
    case 'completed': return 'info'
    case 'suspended': return 'warning'
    case 'terminated': return 'danger'
    case 'rejected': return 'danger'
    default: return ''
  }
}

const getStatusText = (status?: string) => {
  switch (status) {
    case 'running': return '运行中'
    case 'completed': return '已完成'
    case 'suspended': return '已挂起'
    case 'terminated': return '已终止'
    case 'rejected': return '\u5DF2\u62D2\u7EDD'

    default: return '未知'
  }
}

const getTimelineType = (status?: string) => {
  switch (status) {
    case 'running': return 'primary'
    case 'completed': return 'success'
    case 'suspended': return 'warning'
    case 'terminated': return 'danger'
    case 'rejected': return 'danger'
    default: return 'info'
  }
}

const getFlowableAttr = (businessObject: any, name: string) => {
  if (!businessObject) return ''
  const direct = businessObject[name]
  if (direct !== undefined && direct !== null && direct !== '') return String(direct)
  const attrs = businessObject.$attrs
  if (!attrs) return ''
  const key = `flowable:${name}`
  return attrs[key] ? String(attrs[key]) : ''
}

const updateSelectedBpmnProps = (element: any) => {
  selectedBpmnElement.value = element || null
  const bo = element?.businessObject
  selectedBpmnProps.id = element?.id || ''
  selectedBpmnProps.type = element?.type || ''
  selectedBpmnProps.name = bo?.name || ''
  selectedBpmnProps.assignee = getFlowableAttr(bo, 'assignee')
  selectedBpmnProps.candidateUsers = getFlowableAttr(bo, 'candidateUsers')
  selectedBpmnProps.candidateGroups = getFlowableAttr(bo, 'candidateGroups')
  selectedBpmnProps.conditionExpression = bo?.conditionExpression ? String(bo.conditionExpression) : ''
}

const destroyBpmnViewer = () => {
  try {
    if (bpmnViewer && typeof bpmnViewer.destroy === 'function') {
      bpmnViewer.destroy()
    }
  } catch (e) {
    // ignore
  } finally {
    bpmnViewer = null
  }
}

const initBpmnViewer = async (xml: string) => {
  if (!xml || !xml.trim()) return
  await nextTick()
  if (!bpmnCanvasRef.value) return

  destroyBpmnViewer()

  const [{ default: NavigatedViewer }, { default: customTranslate }] = await Promise.all([
    import('bpmn-js/lib/NavigatedViewer'),
    import('./bpmn/translate')
  ])

  const customTranslateModule = {
    translate: ['value', customTranslate]
  }

  bpmnViewer = new NavigatedViewer({
    container: bpmnCanvasRef.value,
    additionalModules: [customTranslateModule]
  })

  await bpmnViewer.importXML(xml)

  const canvas = bpmnViewer.get('canvas')
  canvas.zoom('fit-viewport')

  const eventBus = bpmnViewer.get('eventBus')
  eventBus.on('element.click', (event: any) => {
    const el = event?.element
    if (!el || !el.id) return

    updateSelectedBpmnProps(el)

    const selection = bpmnViewer.get('selection')
    selection.select(el)

    try {
      const overlays = bpmnViewer.get('overlays')
      overlays.clear()
    } catch (e) {
      // ignore
    }
  })
}

watch(
  () => detailDialogVisible.value,
  async (visible) => {
    if (!visible) {
      processBpmnXml.value = ''
      updateSelectedBpmnProps(null)
      destroyBpmnViewer()
      return
    }
    if (activeTab.value === 'diagram' && processBpmnXml.value) {
      await initBpmnViewer(processBpmnXml.value)
    }
  }
)

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab !== 'diagram') return
    if (!detailDialogVisible.value) return
    if (!processBpmnXml.value) return
    await initBpmnViewer(processBpmnXml.value)
  }
)

watch(
  () => processBpmnXml.value,
  async (xml) => {
    if (!detailDialogVisible.value) return
    if (activeTab.value !== 'diagram') return
    if (!xml) return
    await initBpmnViewer(xml)
  }
)

const formatXml = (xml: string) => {
  // 简单的XML格式化方法
  try {
    const PADDING = ' '.repeat(2) // 缩进2个空格
    const reg = /(>)(<)(\/*)/g
    let pad = 0

    xml = xml.replace(reg, '$1\r\n$2$3') // 在标签之间添加换行

    return xml.split('\r\n').map((node) => {
      let indent = 0
      if (node.match(/.+<\/\w[^>]*>$/)) {
        // 自闭合标签
        indent = 0
      } else if (node.match(/^<\/\w/) && pad > 0) {
        // 结束标签
        indent = pad - 1
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        // 开始标签
        indent = pad
        pad++
      } else if (node.match(/^<\w[^>]*\/>.*$/)) {
        // 自闭合标签
        indent = pad
      } else {
        // 文本内容
        indent = pad
      }

      return PADDING.repeat(indent) + node
    }).join('\r\n')
  } catch (e) {
    return xml // 如果格式化失败，返回原始XML
  }
}

const getHistoryType = (type: string) => {
  switch (type) {
    case 'start': return 'primary'
    case 'restart': return 'primary'
    case 'wait': return 'info'
    case 'complete': return 'success'
    case 'approve': return 'success'
    case 'reject': return 'danger'
    case 'end': return 'info'
    default: return 'info'
  }
}

const formatTime = (time?: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString()
}

const formatDuration = (startTime?: string, endTime?: string) => {
  if (!startTime) return '-'

  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const duration = end.getTime() - start.getTime()

  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟`
  } else {
    return '不到1分钟'
  }
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.process-monitor {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
  }

  .stats-cards {
    margin-top: 20px;

    .stat-card {
      position: relative;
      overflow: hidden;

      .stat-content {
        position: relative;
        z-index: 1;

        .stat-number {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 5px;
        }

        .stat-label {
          color: #909399;
          font-size: 14px;
        }
      }

      .stat-icon {
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 40px;
        opacity: 0.1;
      }

      &.running .stat-icon {
        color: #67c23a;
      }

      &.completed .stat-icon {
        color: #409eff;
      }

      &.suspended .stat-icon {
        color: #e6a23c;
      }

      &.terminated .stat-icon {
        color: #f56c6c;
      }
    }
  }

  .instance-list-card {
    margin-top: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .process-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .timeline-view {
      .timeline-card {
        margin-bottom: 10px;

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .process-info {
            display: flex;
            align-items: center;
            gap: 10px;

            h4 {
              margin: 0;
              font-size: 16px;
            }
          }
        }

        .timeline-content {
          margin-top: 10px;

          p {
            margin: 5px 0;
            font-size: 14px;
            color: #606266;

            strong {
              color: #303133;
            }
          }
        }
      }
    }

    .pagination {
      margin-top: 20px;
      text-align: right;
    }
  }

  .batch-actions {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;

    .batch-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .batch-buttons {
        display: flex;
        gap: 10px;
      }
    }
  }

  .instance-detail {
     .process-diagram {
       text-align: center;

       .bpmn-viewer-layout {
         display: flex;
         height: 600px;
         border: 1px solid #ddd;
         background: #fff;
         overflow: hidden;
       }

       .bpmn-viewer-canvas {
         flex: 1;
         min-width: 0;
       }

       .bpmn-viewer-canvas :deep(.bjs-container) {
         height: 100%;
       }

       .bpmn-viewer-props {
         width: 320px;
         border-left: 1px solid #ebeef5;
         overflow: auto;
         padding: 12px;
         background: #fafafa;
       }

       .no-diagram {
         padding: 40px;
         color: #909399;
       }


      .bpmn-canvas {
        background: #f8f9fa;
        border-radius: 4px;
        position: relative;

        pre {
          background: #f8f9fa;
          border: none;
          border-radius: 4px;
          padding: 16px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
          height: 570px;
          overflow: auto;
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;
        }
      }

      .bpmn-xml {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 16px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        max-height: 600px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }

    .el-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }

    .process-variables {
      max-height: 400px;
      overflow-y: auto;
    }

    .operation-history {
      max-height: 400px;
      overflow-y: auto;

      .history-content {
        p {
          margin: 5px 0;
          font-size: 14px;

          strong {
            color: #303133;
          }
        }
      }
    }
  }
}
</style>
