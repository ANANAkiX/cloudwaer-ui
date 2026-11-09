<template>
  <div class="node-config">
    <el-form :model="form" label-width="90px" size="small">
      <!-- 基础信息 -->
      <el-divider content-position="left">基础信息</el-divider>
      <el-form-item label="节点ID">
        <el-input v-model="form.nodeId" disabled />
      </el-form-item>
      <el-form-item label="节点名称">
        <el-input v-model="form.nodeName" placeholder="请输入节点名称" />
      </el-form-item>
      <el-form-item label="节点类型">
        <el-tag :type="nodeTypeTagType">{{ nodeTypeLabel }}</el-tag>
      </el-form-item>

      <!-- 处理人配置（用户任务/抄送） -->
      <template v-if="['user_task', 'cc'].includes(form.nodeType)">
        <el-divider content-position="left">处理人配置</el-divider>
        <el-form-item label="处理人类型">
          <el-select v-model="form.assigneeType" placeholder="选择类型" @change="onAssigneeTypeChange">
            <el-option label="指定用户" value="user" />
            <el-option label="角色" value="role" />
            <el-option label="流程变量" value="variable" />
            <el-option label="发起人" value="initiator" />
            <el-option label="部门（暂未支持）" value="dept" disabled />
            <el-option label="上级领导（暂未支持）" value="leader" disabled />
          </el-select>
        </el-form-item>
        <el-form-item v-if="showAssigneeVal" label="处理人值">
          <!-- 用户：多选下拉 -->
          <el-select
            v-if="form.assigneeType === 'user'"
            v-model="userValues"
            multiple
            filterable
            placeholder="选择用户"
            style="width: 100%"
            @change="onUserChange"
          >
            <el-option
              v-for="u in userList"
              :key="u.id"
              :label="u.nickname || u.username"
              :value="u.username"
            />
          </el-select>
          <!-- 角色：多选下拉 -->
          <el-select
            v-else-if="form.assigneeType === 'role'"
            v-model="roleValues"
            multiple
            filterable
            placeholder="选择角色"
            style="width: 100%"
            @change="onRoleChange"
          >
            <el-option
              v-for="r in roleList"
              :key="r.id"
              :label="r.roleName"
              :value="String(r.id)"
            />
          </el-select>
          <!-- 变量/部门：文本输入 -->
          <el-input
            v-else
            v-model="form.assigneeVal"
            :placeholder="assigneePlaceholder"
          />
        </el-form-item>
      </template>

      <!-- 审批配置（用户任务） -->
      <template v-if="form.nodeType === 'user_task'">
        <el-divider content-position="left">审批配置</el-divider>
        <el-form-item label="关联表单">
          <el-select v-model="nodeFormId" placeholder="使用流程默认表单" clearable style="width: 100%">
            <el-option label="使用流程默认表单" :value="''" />
            <el-option v-for="f in formList" :key="f.id" :label="f.formName" :value="f.id" />
          </el-select>
          <div class="field-tip">选了节点表单则审批时展示此表单，不选则用流程级默认表单</div>
        </el-form-item>
        <el-form-item label="多人审批">
          <el-radio-group v-model="form.multiType">
            <el-radio value="any">任一通过</el-radio>
            <el-radio value="countersign">会签</el-radio>
            <el-radio value="or_sign">或签</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.multiType === 'countersign'" label="通过人数">
          <el-input-number v-model="form.multiCount" :min="1" />
        </el-form-item>
        <el-form-item label="超时(小时)">
          <el-input-number v-model="form.dueHours" :min="0" :max="720" />
        </el-form-item>
      </template>

      <!-- 延时配置（延时器） -->
      <template v-if="form.nodeType === 'timer'">
        <el-divider content-position="left">延时配置</el-divider>
        <el-form-item label="延时类型">
          <el-select v-model="timerConfig.delayType">
            <el-option label="固定时长" value="fixed" />
            <el-option label="Cron 表达式（暂未支持）" value="cron" disabled />
          </el-select>
        </el-form-item>
        <el-form-item v-if="timerConfig.delayType === 'fixed'" label="延时时长">
          <el-input-number v-model="timerConfig.delayValue" :min="1" />
          <el-select v-model="timerConfig.delayUnit" style="margin-left: 8px; width: 100px">
            <el-option label="秒" value="seconds" />
            <el-option label="分钟" value="minutes" />
            <el-option label="小时" value="hours" />
            <el-option label="天" value="days" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="timerConfig.delayType === 'cron'" label="Cron">
          <el-input v-model="timerConfig.cron" placeholder="0 0 9 * * ?" disabled />
          <div class="field-tip">暂未支持：目前仅固定时长延时可用</div>
        </el-form-item>
      </template>

      <!-- 触发器配置 -->
      <template v-if="form.nodeType === 'trigger'">
        <el-divider content-position="left">触发器配置</el-divider>
        <el-form-item label="触发类型">
          <el-select v-model="triggerConfig.triggerType">
            <el-option label="信号触发" value="signal" />
            <el-option label="消息触发" value="message" />
            <el-option label="Webhook（暂未支持）" value="webhook" disabled />
          </el-select>
          <div class="field-tip">通过触发接口 /workflow/trigger/fire 唤醒流程</div>
        </el-form-item>
        <el-form-item label="触发标识">
          <el-input v-model="triggerConfig.triggerName" placeholder="信号/消息名称" />
        </el-form-item>
      </template>

      <!-- 条件分支配置 -->
      <template v-if="form.nodeType === 'condition'">
        <el-divider content-position="left">条件配置</el-divider>
        <el-alert type="info" :closable="false" show-icon>
          <p>条件表达式配置在连线上，点击连线编辑条件。</p>
          <p>支持格式: <code>variable == 'value'</code></p>
        </el-alert>
      </template>

      <!-- 服务任务配置 -->
      <template v-if="form.nodeType === 'service'">
        <el-divider content-position="left">服务配置</el-divider>
        <el-form-item label="服务类型">
          <el-select v-model="serviceConfig.serviceType">
            <el-option label="HTTP 调用" value="http" />
            <el-option label="MQ 消息" value="mq" />
            <el-option label="脚本" value="script" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="serviceConfig.serviceType === 'http'" label="请求地址">
          <el-input v-model="serviceConfig.url" placeholder="https://..." />
        </el-form-item>
        <el-form-item v-if="serviceConfig.serviceType === 'http'" label="请求方式">
          <el-select v-model="serviceConfig.method" style="width: 120px">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 子流程配置 -->
      <template v-if="form.nodeType === 'sub_process'">
        <el-divider content-position="left">子流程配置</el-divider>
        <el-form-item label="子流程">
          <el-select v-model="subProcessConfig.subDefKey" placeholder="选择子流程" clearable style="width: 100%">
            <el-option v-for="d in defList" :key="d.defKey" :label="d.defName" :value="d.defKey" />
          </el-select>
        </el-form-item>
        <el-form-item label="传递变量">
          <el-switch v-model="subProcessConfig.passVariables" />
        </el-form-item>
        <el-form-item label="等待完成">
          <el-switch v-model="subProcessConfig.waitComplete" disabled />
          <div class="field-tip">暂未支持：子流程启动后主流程立即继续</div>
        </el-form-item>
      </template>

      <!-- 节点动作 -->
      <el-divider content-position="left">节点动作</el-divider>
      <div class="action-list">
        <div v-for="(action, idx) in actions" :key="idx" class="action-item">
          <el-select v-model="action.actionType" size="small" style="width: 100px">
            <el-option label="通知" value="notify" />
            <el-option label="HTTP" value="http" />
            <el-option label="日志" value="log" />
            <el-option label="MQ" value="mq" />
          </el-select>
          <el-select v-model="action.eventType" size="small" style="width: 110px">
            <el-option label="节点进入" value="node:enter" />
            <el-option label="节点离开" value="node:exit" />
            <el-option label="任务创建" value="task:create" />
            <el-option label="任务完成" value="task:complete" />
          </el-select>
          <el-button link type="danger" size="small" @click="removeAction(idx)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <el-button size="small" type="primary" link @click="addAction">
          <el-icon><Plus /></el-icon> 添加动作
        </el-button>
      </div>

      <!-- 监听器 -->
      <el-divider content-position="left">监听器</el-divider>
      <div class="listener-list">
        <div v-for="(listener, idx) in listeners" :key="idx" class="listener-item">
          <el-select v-model="listener.eventType" size="small" style="width: 110px">
            <el-option label="节点进入" value="node:enter" />
            <el-option label="节点离开" value="node:exit" />
            <el-option label="任务创建" value="task:create" />
            <el-option label="任务完成" value="task:complete" />
            <el-option label="流程开始" value="process:start" />
            <el-option label="流程结束" value="process:end" />
          </el-select>
          <el-select v-model="listener.className" size="small" placeholder="选择监听器" style="width: 160px">
            <el-option v-for="(label, key) in listenerOptions" :key="key" :label="label" :value="key" />
          </el-select>
          <el-button link type="danger" size="small" @click="removeListener(idx)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
        <el-button size="small" type="primary" link @click="addListener">
          <el-icon><Plus /></el-icon> 添加监听器
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import type { WorkflowNode } from '@/api/workflow'
import { getWorkflowForms, getWorkflowDefs, getListenerCatalog } from '@/api/workflow'
import { getUserList } from '@/api/user'
import { getRoleList } from '@/api/role'
import type { UserInfo, RoleInfo } from '@/types'

const props = defineProps<{
  node: WorkflowNode | null
}>()

const emit = defineEmits<{
  (e: 'update', node: WorkflowNode): void
}>()

const form = reactive<WorkflowNode>({
  nodeId: '',
  nodeName: '',
  nodeType: 'user_task',
  assigneeType: 'user',
  assigneeVal: '',
  multiType: 'any',
  multiCount: 1,
  dueHours: 24
})

// 延时器配置
const timerConfig = reactive({
  delayType: 'fixed',
  delayValue: 30,
  delayUnit: 'minutes',
  cron: ''
})

// 触发器配置
const triggerConfig = reactive({
  triggerType: 'signal',
  triggerName: ''
})

// 服务任务配置
const serviceConfig = reactive({
  serviceType: 'http',
  method: 'GET',
  url: ''
})

// 节点级表单
const nodeFormId = ref<string | number | undefined>()
const formList = ref<{ id: string | number; formName: string }[]>([])

// 子流程配置
const subProcessConfig = reactive({ subDefKey: '', waitComplete: false, passVariables: true })
const defList = ref<{ defKey: string; defName: string }[]>([])

async function loadDefs() {
  try {
    const res: any = await getWorkflowDefs({ current: 1, size: 200 })
    defList.value = (res?.records || []).map((d: any) => ({ defKey: d.defKey, defName: d.defName || d.defKey }))
  } catch { /* ignore */ }
}

// 节点动作
interface NodeAction {
  actionType: string
  eventType: string
  config?: string
}
const actions = ref<NodeAction[]>([])

// 监听器
interface NodeListener {
  eventType: string
  className: string
}
const listeners = ref<NodeListener[]>([])

// ===== 用户/角色数据 =====
const userList = ref<UserInfo[]>([])
const roleList = ref<RoleInfo[]>([])
const userValues = ref<string[]>([])
const roleValues = ref<string[]>([])

async function loadUsers() {
  try {
    userList.value = await getUserList() || []
  } catch { /* ignore */ }
}

async function loadRoles() {
  try {
    const res: any = await getRoleList()
    roleList.value = res.data || res || []
  } catch { /* ignore */ }
}

function onUserChange() {
  form.assigneeVal = userValues.value.join(',')
}

function onRoleChange() {
  form.assigneeVal = roleValues.value.join(',')
}

onMounted(() => {
  loadUsers()
  loadRoles()
  loadForms()
  loadDefs()
  loadListenerCatalog()
})

// 监听器目录（key → 显示名）
const listenerOptions = ref<Record<string, string>>({})

async function loadListenerCatalog() {
  try {
    const res: any = await getListenerCatalog()
    listenerOptions.value = res || {}
  } catch { /* 拉取失败时下拉为空，不阻塞配置 */ }
}

async function loadForms() {
  try {
    const res: any = await getWorkflowForms({ current: 1, size: 100 })
    // 过滤掉无 id 的脏数据，避免 el-option value 传 null/undefined 触发 Prop 警告
    formList.value = (res?.records || []).filter((f: any) => f.id !== undefined && f.id !== null)
  } catch { /* ignore */ }
}

// ===== 计算属性 =====
const nodeTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    start: '开始节点',
    end: '结束节点',
    user_task: '用户任务',
    cc: '抄送',
    condition: '条件分支',
    parallel: '并行分支',
    timer: '延时器',
    trigger: '触发器',
    service: '服务任务',
    sub_process: '子流程'
  }
  return labels[form.nodeType] || form.nodeType
})

const nodeTypeTagType = computed(() => {
  const types: Record<string, string> = {
    start: 'success',
    end: 'danger',
    user_task: 'primary',
    cc: 'warning',
    condition: 'warning',
    parallel: 'primary',
    timer: 'warning',
    trigger: 'success',
    service: 'info',
    sub_process: 'info'
  }
  return (types[form.nodeType] || 'info') as any
})

const showAssigneeVal = computed(() => form.assigneeType !== 'initiator' && form.assigneeType !== 'leader')

const assigneePlaceholder = computed(() => {
  switch (form.assigneeType) {
    case 'user': return '选择用户'
    case 'role': return '选择角色'
    case 'dept': return '部门ID，多个用逗号分隔'
    case 'variable': return '流程变量名'
    default: return ''
  }
})

// ===== 监听 =====
// 切换节点时的程序化同步标记：期间抑制自动 emit，避免残留/中间态写回画布
let syncing = false

watch(() => props.node, (node) => {
  if (!node) return
  syncing = true
  // 先整体重置到默认值，避免上一节点的残留属性串到新节点
  Object.assign(form, {
    nodeId: '',
    nodeName: '',
    nodeType: 'user_task',
    assigneeType: 'user',
    assigneeVal: '',
    multiType: 'any',
    multiCount: 1,
    dueHours: 24
  })
  nodeFormId.value = undefined
  Object.assign(timerConfig, { delayType: 'fixed', delayValue: 30, delayUnit: 'minutes', cron: '' })
  Object.assign(triggerConfig, { triggerType: 'signal', triggerName: '' })
  Object.assign(serviceConfig, { serviceType: 'http', method: 'GET', url: '' })
  Object.assign(subProcessConfig, { subDefKey: '', waitComplete: false, passVariables: true })
  actions.value = []
  listeners.value = []
  userValues.value = []
  roleValues.value = []
  // 再套用节点自身字段
  Object.assign(form, node)
  // 同步用户/角色多选值
  if (form.assigneeType === 'user') {
    userValues.value = form.assigneeVal ? form.assigneeVal.split(',').map(s => s.trim()).filter(Boolean) : []
    roleValues.value = []
  } else if (form.assigneeType === 'role') {
    roleValues.value = form.assigneeVal ? form.assigneeVal.split(',').map(s => s.trim()).filter(Boolean) : []
    userValues.value = []
  } else {
    userValues.value = []
    roleValues.value = []
  }
  // 解析 configJson
  if (node.configJson) {
    try {
      const cfg = JSON.parse(node.configJson)
      nodeFormId.value = cfg.formId || undefined
      if (form.nodeType === 'timer') Object.assign(timerConfig, cfg)
      if (form.nodeType === 'trigger') Object.assign(triggerConfig, cfg)
      if (form.nodeType === 'service') Object.assign(serviceConfig, cfg)
      if (form.nodeType === 'sub_process') Object.assign(subProcessConfig, cfg)
    } catch { /* ignore */ }
  }
  // 解析 actionJson
  if (node.actionJson) {
    try { actions.value = JSON.parse(node.actionJson) } catch { actions.value = [] }
  }
  // 解析 listenerJson
  if (node.listenerJson) {
    try { listeners.value = JSON.parse(node.listenerJson) } catch { listeners.value = [] }
  }
  nextTick(() => { syncing = false })
}, { immediate: true })

// ===== 事件 =====
function onAssigneeTypeChange() {
  form.assigneeVal = ''
  userValues.value = []
  roleValues.value = []
}

function addAction() {
  actions.value.push({ actionType: 'log', eventType: 'node:enter' })
}
function removeAction(idx: number) {
  actions.value.splice(idx, 1)
}
function addListener() {
  listeners.value.push({ eventType: 'node:enter', className: '' })
}
function removeListener(idx: number) {
  listeners.value.splice(idx, 1)
}

// ===== 提交更新 =====
function buildUpdatedNode(): WorkflowNode {
  const node = { ...form }
  // 继承旧配置中的非受管字段，只覆盖本面板管理的键
  const config: Record<string, any> = {}
  try {
    if (form.configJson) Object.assign(config, JSON.parse(form.configJson))
  } catch { /* ignore */ }
  if (nodeFormId.value) config.formId = nodeFormId.value
  else delete config.formId
  if (form.nodeType === 'timer') Object.assign(config, timerConfig)
  if (form.nodeType === 'trigger') Object.assign(config, triggerConfig)
  if (form.nodeType === 'service') Object.assign(config, serviceConfig)
  if (form.nodeType === 'sub_process') Object.assign(config, subProcessConfig)
  node.configJson = Object.keys(config).length > 0 ? JSON.stringify(config) : undefined
  node.actionJson = actions.value.length > 0 ? JSON.stringify(actions.value) : undefined
  node.listenerJson = listeners.value.length > 0 ? JSON.stringify(listeners.value) : undefined
  return node
}

// 自动提交
watch(() => form, () => {
  if (syncing || !props.node) return
  emit('update', buildUpdatedNode())
}, { deep: true })

watch(nodeFormId, () => {
  if (syncing || !props.node) return
  emit('update', buildUpdatedNode())
})
</script>

<style scoped>
.node-config {
  padding: 12px;
  height: 100%;
  overflow-y: auto;
}

.action-list,
.listener-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item,
.listener-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

:deep(.el-form-item__label) {
  font-size: 12px;
}

:deep(.el-divider__text) {
  font-size: 12px;
  color: var(--muted, #666);
}
</style>
