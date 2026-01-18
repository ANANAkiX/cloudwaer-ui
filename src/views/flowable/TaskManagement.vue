<template>
  <div class="task-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务管理</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索任务名称/业务Key"
              clearable
              style="width: 260px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="taskType" placeholder="任务类型" style="width: 120px" @change="handleSearch">
              <el-option label="待办任务" value="todo" />
              <el-option label="已办任务" value="done" />
              <el-option label="全部任务" value="all" />
            </el-select>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button type="success" @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 任务统计 -->
      <div class="stats-cards">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card class="stat-card todo">
              <div class="stat-content">
                <div class="stat-number">{{ stats.todo }}</div>
                <div class="stat-label">待办任务</div>
              </div>
              <el-icon class="stat-icon"><Clock /></el-icon>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card done">
              <div class="stat-content">
                <div class="stat-number">{{ stats.done }}</div>
                <div class="stat-label">已办任务</div>
              </div>
              <el-icon class="stat-icon"><Check /></el-icon>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card overdue">
              <div class="stat-content">
                <div class="stat-number">{{ stats.overdue }}</div>
                <div class="stat-label">逾期任务</div>
              </div>
              <el-icon class="stat-icon"><Warning /></el-icon>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card today">
              <div class="stat-content">
                <div class="stat-number">{{ stats.today }}</div>
                <div class="stat-label">今日到期</div>
              </div>
              <el-icon class="stat-icon"><Calendar /></el-icon>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 任务列表 -->
    <el-card class="task-list-card">
      <template #header>
        <div class="card-header">
          <span>{{ getTaskTypeText() }}</span>
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
                :type="viewMode === 'card' ? 'primary' : ''" 
                @click="viewMode = 'card'"
              >
                <el-icon><Grid /></el-icon>
                卡片视图
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
        <el-table-column prop="id" label="任务ID" min-width="150">
          <template #default="scope">
            <el-tag type="info" size="small">{{ scope.row.id }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="任务名称" min-width="180">
          <template #default="scope">
            <div class="task-name">
              <el-icon><Document /></el-icon>
              <span>{{ scope.row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="processDefinitionName" label="流程名称" min-width="150">
          <template #default="scope">
            <span>{{ scope.row.processDefinitionName || scope.row.processDefinitionKey }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="businessKey" label="业务Key" min-width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.businessKey" size="small">{{ scope.row.businessKey }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="assignee" label="处理人" min-width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.assignee" type="success" size="small">{{ scope.row.assignee }}</el-tag>
            <el-tag v-else type="warning" size="small">未分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="160">
          <template #default="scope">
            <span>{{ formatTime(scope.row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="dueDate" label="到期时间" min-width="160">
          <template #default="scope">
            <span :class="{ 'overdue': isOverdue(scope.row.dueDate) }">
              {{ formatTime(scope.row.dueDate) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100" align="center">
          <template #default="scope">
            <el-tag :type="getPriorityType(scope.row.priority)" size="small">
              {{ getPriorityText(scope.row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right" align="center">
          <template #default="scope">
            <el-button-group>
              <el-button 
                v-if="taskType === 'todo'"
                size="small" 
                type="primary" 
                @click="openCompleteDialog(scope.row)"
              >
                <el-icon><Check /></el-icon>
                处理
              </el-button>
              <el-button 
                v-if="taskType === 'todo' && !scope.row.assignee"
                size="small" 
                type="warning" 
                @click="claimTask(scope.row)"
              >
                <el-icon><User /></el-icon>
                认领
              </el-button>
              <el-button size="small" type="info" @click="viewTaskDetail(scope.row)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
              <el-button size="small" type="success" @click="viewProcessDiagram(scope.row)">
                <el-icon><Picture /></el-icon>
                流程图
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 卡片视图 -->
      <div v-else class="card-view">
        <el-row :gutter="20">
          <el-col :span="8" v-for="task in tableData" :key="task.id">
            <el-card class="task-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span class="task-title">{{ task.name }}</span>
                  <el-tag :type="getPriorityType(task.priority)" size="small">
                    {{ getPriorityText(task.priority) }}
                  </el-tag>
                </div>
              </template>
              <div class="card-content">
                <div class="task-info">
                  <p><strong>流程:</strong> {{ task.processDefinitionName || task.processDefinitionKey }}</p>
                  <p><strong>业务Key:</strong> {{ task.businessKey || '-' }}</p>
                  <p><strong>处理人:</strong> 
                    <el-tag v-if="task.assignee" type="success" size="small">{{ task.assignee }}</el-tag>
                    <el-tag v-else type="warning" size="small">未分配</el-tag>
                  </p>
                  <p><strong>创建时间:</strong> {{ formatTime(task.createTime) }}</p>
                  <p><strong>到期时间:</strong> 
                    <span :class="{ 'overdue': isOverdue(task.dueDate) }">
                      {{ formatTime(task.dueDate) }}
                    </span>
                  </p>
                </div>
                <div class="card-actions">
                  <el-button-group>
                    <el-button 
                      v-if="taskType === 'todo'"
                      size="small" 
                      type="primary" 
                      @click="openCompleteDialog(task)"
                    >
                      处理
                    </el-button>
                    <el-button 
                      v-if="taskType === 'todo' && !task.assignee"
                      size="small" 
                      type="warning" 
                      @click="claimTask(task)"
                    >
                      认领
                    </el-button>
                    <el-button size="small" type="info" @click="viewTaskDetail(task)">详情</el-button>
                  </el-button-group>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
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
            <el-button 
              v-if="taskType === 'todo'"
              type="success" 
              @click="handleBatchClaim"
            >
              批量认领
            </el-button>
            <el-button 
              v-if="taskType === 'todo'"
              type="primary" 
              @click="handleBatchComplete"
            >
              批量处理
            </el-button>
            <el-button @click="clearSelection">清空选择</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 任务处理对话框 -->
    <el-dialog
      v-model="completeDialogVisible"
      title="处理任务"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="completeForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="处理意见" prop="comment">
          <el-input 
            v-model="completeForm.comment" 
            type="textarea"
            :rows="4"
            placeholder="请输入处理意见"
          />
        </el-form-item>
        
        <!-- 动态表单字段 -->
        <template v-if="taskFormFields.length > 0">
          <el-divider content-position="left">任务表单</el-divider>
          
          <el-form-item 
            v-for="field in taskFormFields" 
            :key="field.id"
            :label="field.label"
            :prop="field.id"
            :required="field.required"
          >
            <!-- 文本输入 -->
            <el-input
              v-if="field.type === 'input'"
              v-model="completeForm[field.id]"
              :placeholder="field.placeholder"
            />
            
            <!-- 文本域 -->
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="completeForm[field.id]"
              type="textarea"
              :rows="3"
              :placeholder="field.placeholder"
            />
            
            <!-- 数字输入 -->
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="completeForm[field.id]"
              :min="field.min"
              :max="field.max"
              :precision="field.precision"
              style="width: 100%"
            />
            
            <!-- 下拉选择 -->
            <el-select
              v-else-if="field.type === 'select'"
              v-model="completeForm[field.id]"
              :placeholder="field.placeholder"
              style="width: 100%"
            >
              <el-option
                v-for="option in field.options"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            
            <!-- 单选框 -->
            <el-radio-group
              v-else-if="field.type === 'radio'"
              v-model="completeForm[field.id]"
            >
              <el-radio
                v-for="option in field.options"
                :key="option.value"
                :label="option.value"
              >
                {{ option.label }}
              </el-radio>
            </el-radio-group>
            
            <!-- 复选框 -->
            <el-checkbox-group
              v-else-if="field.type === 'checkbox'"
              v-model="completeForm[field.id]"
            >
              <el-checkbox
                v-for="option in field.options"
                :key="option.value"
                :label="option.value"
              >
                {{ option.label }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </template>
      </el-form>
      
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCompleteTask" :loading="completeLoading">
          提交
        </el-button>
      </template>
    </el-dialog>

    <!-- 任务详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="任务详情"
      width="800px"
    >
      <div class="task-detail" v-if="currentTask">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务ID">
            {{ currentTask.id }}
          </el-descriptions-item>
          <el-descriptions-item label="任务名称">
            {{ currentTask.name }}
          </el-descriptions-item>
          <el-descriptions-item label="流程定义Key">
            {{ currentTask.processDefinitionKey }}
          </el-descriptions-item>
          <el-descriptions-item label="流程定义名称">
            {{ currentTask.processDefinitionName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="业务Key">
            {{ currentTask.businessKey || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="处理人">
            {{ currentTask.assignee || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(currentTask.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="到期时间">
            {{ formatTime(currentTask.dueDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityType(currentTask.priority)">
              {{ getPriorityText(currentTask.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="任务状态">
            <el-tag type="info">{{ taskType === 'todo' ? '待办' : '已办' }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- Detail Tabs -->
        <el-tabs v-model="detailTab" class="detail-tabs">
          <el-tab-pane label="流程变量" name="variables">
            <div class="process-variables" v-if="displayProcessVariables.length > 0">
              <el-divider content-position="left">流程变量</el-divider>
              <el-table :data="displayProcessVariables" border size="small">
                <el-table-column prop="name" label="变量名" width="150" />
                <el-table-column prop="type" label="类型" width="100" />
                <el-table-column prop="value" label="值" />
              </el-table>
            </div>
            <div v-else class="empty-form">暂无数据</div>
          </el-tab-pane>
          <el-tab-pane label="表单" name="form">
            <el-divider content-position="left">动态表单</el-divider>
            <div class="process-form">
              <form-create
                v-if="formViewRule.length > 0"
                v-model="formViewData"
                :rule="formViewRule"
                :option="formViewOptions"
              />
              <div v-else class="empty-form">暂无数据</div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="操作记录" name="history">
            <el-divider content-position="left">操作记录</el-divider>
            <div class="operation-history">
              <el-timeline v-if="operationHistory.length > 0">
                <el-timeline-item
                  v-for="history in operationHistory"
                  :key="history.id"
                  :timestamp="formatTime(history.time)"
                  :type="getHistoryType(history.type)"
                >
                  <el-card>
                    <div class="history-content">
                      <p><strong>{{ history.userName }}</strong> {{ history.action }}</p>
                      <p v-if="history.comment">{{ history.comment }}</p>
                      <p v-if="history.duration">耗时: {{ history.duration }}</p>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
              <div v-else class="empty-form">暂无数据</div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, Refresh, List, Grid, Clock, Check, Warning, Calendar,
  Document, User, View, Picture 
} from '@element-plus/icons-vue'
import type { FlowableTaskItem } from '@/api/flowable'
import FcDesigner from '@/components/FcDesigner'
import { 
  getTodoTasksByPage, 
  getDoneTasksByPage, 
  claimFlowableTask, 
  completeFlowableTask,
  getFlowableTaskDetail,
  getProcessVariables,
  getProcessHistory
} from '@/api/flowable'

// 任务表单字段接口
interface TaskFormField {
  id: string
  label: string
  type: 'input' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox'
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  precision?: number
  options?: { label: string; value: any }[]
}

// 响应式数据
const loading = ref(false)
const completeLoading = ref(false)
const viewMode = ref<'table' | 'card'>('table')
const taskType = ref<'todo' | 'done' | 'all'>('todo')
const searchKeyword = ref('')
const completeDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const detailTab = ref('variables')
const selectedRows = ref<FlowableTaskItem[]>([])
const currentTask = ref<FlowableTaskItem | null>(null)

// 分页参数
const pageParams = reactive({
  current: 1,
  size: 20,
  total: 0
})

// 表格数据
const tableData = ref<FlowableTaskItem[]>([])

// 统计数据
const stats = reactive({
  todo: 0,
  done: 0,
  overdue: 0,
  today: 0
})

// 完成任务表单
const completeForm = reactive<Record<string, any>>({
  comment: ''
})

// 任务表单字段
const taskFormFields = ref<TaskFormField[]>([])

// 流程变量
const processVariables = ref<any[]>([])

const formJsonValue = ref<string>('')
const formViewRule = ref<any[]>([])
const formViewOptions = ref<Record<string, any>>({})
const formViewData = ref<Record<string, any>>({})
const formCreate = (FcDesigner as any).formCreate
const displayProcessVariables = computed(() => (processVariables.value || []).filter((item) => item?.name !== 'formJson' && item?.name !== 'form_json'))

const operationHistory = ref<any[]>([])

// 表单引用
const formRef = ref()

// 表单验证规则
const formRules = computed(() => {
  const rules: Record<string, any> = {
    comment: [
      { required: true, message: '请输入处理意见', trigger: 'blur' }
    ]
  }
  
  taskFormFields.value.forEach(field => {
    if (field.required) {
      rules[field.id] = [
        { required: true, message: `请输入${field.label}`, trigger: 'blur' }
      ]
    }
  })
  
  return rules
})

// 方法
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
    console.error( error)
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
      keyword: searchKeyword.value
    }
    
    let response
    if (taskType.value === 'todo') {
      response = await getTodoTasksByPage(params)
    } else if (taskType.value === 'done') {
      response = await getDoneTasksByPage(params)
    } else {
      // 获取全部任务
      const [todoResponse, doneResponse] = await Promise.all([
        getTodoTasksByPage(params),
        getDoneTasksByPage(params)
      ])
      response = {
        records: [...todoResponse.records, ...doneResponse.records],
        total: todoResponse.total + doneResponse.total
      }
    }
    
    tableData.value = response.records
    pageParams.total = response.total
    
    // 更新统计数据
    updateStats(response.records)
    
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const updateStats = (data: FlowableTaskItem[]) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  
  stats.todo = data.filter(item => !item.endTime).length
  stats.done = data.filter(item => item.endTime).length
  stats.overdue = data.filter(item => 
    !item.endTime && item.dueDate && new Date(item.dueDate) < now
  ).length
  stats.today = data.filter(item => 
    item.dueDate && new Date(item.dueDate) >= today && new Date(item.dueDate) < tomorrow
  ).length
}

const handleSearch = () => {
  pageParams.current = 1
  loadData()
}

const refreshData = () => {
  loadData()
  ElMessage.success('数据已刷新')
}

const handleSelectionChange = (selection: FlowableTaskItem[]) => {
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

const getTaskTypeText = () => {
  switch (taskType.value) {
    case 'todo': return '待办任务'
    case 'done': return '已办任务'
    case 'all': return '全部任务'
    default: return '任务列表'
  }
}

const openCompleteDialog = (task: FlowableTaskItem) => {
  currentTask.value = task
  
  // 重置表单
  Object.assign(completeForm, {
    comment: ''
  })
  
  // 模拟任务表单字段
  taskFormFields.value = [
    {
      id: 'approvalResult',
      label: '审批结果',
      type: 'radio',
      required: true,
      options: [
        { label: '同意', value: 'approve' },
        { label: '拒绝', value: 'reject' }
      ]
    }
  ]
  
  // 初始化表单字段
  taskFormFields.value.forEach(field => {
    if (field.type === 'checkbox') {
      completeForm[field.id] = []
    } else {
      completeForm[field.id] = ''
    }
  })
  
  completeDialogVisible.value = true
}

const handleCompleteTask = async () => {
  try {
    await formRef.value.validate()
    
    if (!currentTask.value) return
    
    completeLoading.value = true
    
    // 构建任务变量
    const variables: Record<string, any> = {}
    
    // 添加表单字段变量
    taskFormFields.value.forEach(field => {
      const value = completeForm[field.id]
      if (value !== undefined && value !== null && value !== '') {
        variables[field.id] = value
      }
    })
    
    await completeFlowableTask({
      taskId: currentTask.value.id,
      comment: completeForm.comment,
      variables: Object.keys(variables).length > 0 ? variables : undefined
    })
    
    ElMessage.success('任务处理成功')
    completeDialogVisible.value = false
    loadData()
    
  } catch (error) {
    console.error('处理任务失败:', error)
  } finally {
    completeLoading.value = false
  }
}

const claimTask = async (task: FlowableTaskItem) => {
  try {
    await ElMessageBox.confirm('确定要认领此任务吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await claimFlowableTask(task.id)
    ElMessage.success('任务认领成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('认领任务失败:', error)
      ElMessage.error('认领任务失败')
    }
  }
}

const viewTaskDetail = async (task: FlowableTaskItem) => {
  try {
    detailTab.value = 'variables'
    currentTask.value = await getFlowableTaskDetail(task.id)

    processVariables.value = []
    operationHistory.value = []
    resetFormView()
    const processInstanceId =
      currentTask.value?.processInstanceId || task.processInstanceId
    if (processInstanceId) {
      applyProcessVariables(await getProcessVariables(processInstanceId))
      operationHistory.value = await getProcessHistory(processInstanceId)
    }
    
    detailDialogVisible.value = true
  } catch (error) {
    console.error('获取任务详情失败:', error)
    ElMessage.error('获取任务详情失败')
  }
}

const viewProcessDiagram = (task: FlowableTaskItem) => {
  // TODO: 显示流程图
  ElMessage.info('流程图功能开发中...')
}

const handleBatchClaim = async () => {
  try {
    await ElMessageBox.confirm(`确定要认领选中的 ${selectedRows.value.length} 个任务吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const promises = selectedRows.value.map(task => claimFlowableTask(task.id))
    await Promise.all(promises)
    
    ElMessage.success('批量认领成功')
    clearSelection()
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量认领失败:', error)
      ElMessage.error('批量认领失败')
    }
  }
}

const handleBatchComplete = async () => {
  try {
    await ElMessageBox.confirm(`确定要批量处理选中的 ${selectedRows.value.length} 个任务吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // TODO: 实现批量处理逻辑
    ElMessage.success('批量处理成功')
    clearSelection()
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量处理失败:', error)
      ElMessage.error('批量处理失败')
    }
  }
}

const clearSelection = () => {
  selectedRows.value = []
}

const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

const getPriorityType = (priority?: number) => {
  switch (priority) {
    case 1: return 'danger'
    case 2: return 'warning'
    case 3: return 'primary'
    default: return 'info'
  }
}

const getPriorityText = (priority?: number) => {
  switch (priority) {
    case 1: return '高'
    case 2: return '中'
    case 3: return '低'
    default: return '普通'
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

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.task-management {
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
      
      &.todo .stat-icon {
        color: #409eff;
      }
      
      &.done .stat-icon {
        color: #67c23a;
      }
      
      &.overdue .stat-icon {
        color: #f56c6c;
      }
      
      &.today .stat-icon {
        color: #e6a23c;
      }
    }
  }
  
  .task-list-card {
    margin-top: 20px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .task-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .overdue {
      color: #f56c6c;
      font-weight: bold;
    }
    
    .card-view {
      .task-card {
        margin-bottom: 20px;
        
        .task-title {
          font-weight: bold;
          font-size: 16px;
        }
        
        .card-content {
          .task-info {
            p {
              margin: 8px 0;
              font-size: 14px;
              
              strong {
                color: #606266;
              }
            }
          }
          
          .card-actions {
            margin-top: 15px;
            text-align: center;
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
  
  .task-detail {
    .process-variables {
      margin-top: 20px;
    }
  }
}
</style>
