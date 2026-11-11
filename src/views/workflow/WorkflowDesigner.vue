<template>
  <div class="workflow-designer-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span v-if="!embedded">流程设计器</span>
          <div class="card-actions" :style="embedded ? 'margin-left: auto' : ''">
            <el-button @click="goBack"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
            <template v-if="readonly">
              <el-button type="primary" @click="handleSaveAsNew">
                <el-icon><Check /></el-icon> 另存为新版本
              </el-button>
            </template>
            <template v-else>
              <el-button type="primary" @click="handleSave"><el-icon><Check /></el-icon> 保存</el-button>
              <el-button type="success" @click="handlePublish"><el-icon><Upload /></el-icon> 发布</el-button>
            </template>
          </div>
        </div>
      </template>

      <el-alert
        v-if="readonly"
        class="readonly-banner"
        type="warning"
        :closable="false"
        show-icon
        title="历史 / 已发布版本为只读快照"
        description="不可直接修改；点「另存为新版本」生成草稿继续编辑，或在版本列表对历史版本「恢复」"
      />

      <!-- 三栏布局 -->
      <div class="designer-layout">
        <!-- 左侧：节点工具箱 -->
        <div class="designer-left">
          <div class="panel-title">节点</div>
          <div class="node-palette">
            <div
              v-for="item in nodeTypes"
              :key="item.type"
              class="palette-item"
              :class="{ 'palette-active': dragType === item.type }"
              draggable="true"
              @dragstart="onDragStart(item.type, $event)"
              @dragend="dragType = ''"
            >
              <span class="palette-icon">{{ item.icon }}</span>
              <span class="palette-label">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <!-- 中间：画布 -->
        <div class="designer-center">
          <FlowCanvas
            ref="canvasRef"
            :nodes="nodes"
            :edges="edges"
            :readonly="readonly"
            @node-click="onNodeClick"
            @edge-click="onEdgeClick"
            @node-move="onNodeMove"
            @nodes-move="onNodesMove"
            @edge-add="onEdgeAdd"
            @node-add="onNodeAdd"
            @node-copy="onNodeCopy"
            @canvas-click="selectedNode = null; selectedEdge = null"
          />
        </div>

        <!-- 右侧：节点属性 -->
        <div class="designer-right">
          <template v-if="selectedNode">
            <div class="panel-title">
              节点属性
              <el-button type="danger" size="small" link style="float: right" @click="removeNode">
                <el-icon><Delete /></el-icon> 删除节点
              </el-button>
            </div>
            <NodeConfig :node="selectedNode" @update="onNodeUpdate" />
          </template>
          <template v-else-if="selectedEdge">
            <div class="panel-title">连线属性</div>
            <el-form label-width="70px" size="small">
              <el-form-item label="连线ID">
                <el-input :model-value="selectedEdge.edgeId" disabled />
              </el-form-item>
              <el-form-item label="连线名称">
                <el-input v-model="selectedEdge.edgeName" placeholder="连线名称" />
              </el-form-item>
              <el-form-item label="条件表达式">
                <el-input v-model="selectedEdge.edgeCondition" type="textarea" :rows="3"
                  placeholder="如: amount > 1000 或 leaveType == 'sick'" />
              </el-form-item>
              <el-form-item>
                <el-button type="danger" size="small" @click="removeEdge">删除连线</el-button>
              </el-form-item>
            </el-form>
          </template>
          <template v-else>
            <!-- 未选中节点/连线 = 流程属性检查器 -->
            <div class="panel-title">流程属性</div>
            <el-form :model="defForm" label-width="70px" size="small">
              <el-form-item label="标识">
                <el-input v-model="defForm.defKey" placeholder="唯一标识" />
              </el-form-item>
              <el-form-item label="名称">
                <el-input v-model="defForm.defName" placeholder="流程名称" />
              </el-form-item>
              <el-form-item label="分类">
                <DictSelect v-model="defForm.category" type="workflow_def_category" placeholder="选择分类" />
              </el-form-item>
              <el-form-item label="关联表单">
                <el-select v-model="defForm.formId" placeholder="选择表单" clearable style="width: 100%">
                  <el-option v-for="f in formList" :key="f.id" :label="f.formName" :value="f.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="到期时间">
                <el-date-picker v-model="defForm.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
              </el-form-item>
            </el-form>
            <div class="inspector-hint">点击节点或连线可切换属性面板</div>
          </template>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Check, Upload, Delete } from '@element-plus/icons-vue'
import FlowCanvas from '@/components/workflow/FlowCanvas.vue'
import NodeConfig from '@/components/workflow/NodeConfig.vue'
import DictSelect from '@/components/DictSelect.vue'
import {
  getWorkflowDefDetail,
  saveWorkflowDef,
  publishWorkflowDef,
  getWorkflowForms,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowDef
} from '@/api/workflow'

const props = defineProps<{
  /** 模型 ID（对话框模式传入，为空则从 route.query 读取） */
  defId?: string | number | null
  /** 嵌入弹窗模式：隐藏自身标题（弹窗已有标题，避免双层壳） */
  embedded?: boolean
}>()

const emit = defineEmits<{
  (e: 'close', saved?: boolean): void
}>()

const route = useRoute()
const router = useRouter()

// 流程定义表单
const defForm = reactive<WorkflowDef>({
  defKey: '',
  defName: '',
  category: '',
  formId: undefined,
  endTime: ''
})

// 节点和连线
const nodes = ref<WorkflowNode[]>([])
const edges = ref<WorkflowEdge[]>([])

// 选中项
const selectedNode = ref<WorkflowNode | null>(null)
const selectedEdge = ref<WorkflowEdge | null>(null)

// 拖拽类型
const dragType = ref('')

// 只读模式：历史/已发布版本只读快照
const readonly = ref(false)

// 表单列表
const formList = ref<{ id: string | number; formName: string }[]>([])

// 画布引用（自动适配用）
const canvasRef = ref<InstanceType<typeof FlowCanvas> | null>(null)

function autoFit() {
  // 弹窗/路由渲染完成后按内容边界适配视图
  setTimeout(() => canvasRef.value?.fitContent?.(), 220)
}

// 节点类型面板
const nodeTypes = [
  { type: 'start', label: '开始节点', icon: '▶' },
  { type: 'end', label: '结束节点', icon: '■' },
  { type: 'user_task', label: '用户任务', icon: '👤' },
  { type: 'cc', label: '抄送', icon: '📋' },
  { type: 'condition', label: '条件分支', icon: '◇' },
  { type: 'parallel', label: '并行分支', icon: '⊕' },
  { type: 'timer', label: '延时器', icon: '⏱' },
  { type: 'trigger', label: '触发器', icon: '⚡' },
  { type: 'service', label: '服务任务', icon: '⚙' },
  { type: 'sub_process', label: '子流程', icon: '▦' }
]

// ===== 初始化 =====
onMounted(async () => {
  await loadForms()
  const id = props.defId || route.query.id
  if (id) {
    await loadDef(id as string)
  } else {
    nodes.value.push({
      nodeId: 'start_1',
      nodeName: '开始',
      nodeType: 'start',
      x: 120,
      y: 300
    })
  }
  autoFit()
  window.addEventListener('keydown', onKeyDown)
})

// 监听 defId 变化（对话框内切换编辑目标）
watch(() => props.defId, async (newId) => {
  if (newId) {
    await loadDef(newId as string)
  } else {
    // 新建：重置为默认开始节点
    defForm.id = undefined
    defForm.defKey = ''
    defForm.defName = ''
    defForm.category = ''
    defForm.formId = undefined
    defForm.endTime = ''
    nodes.value = [{ nodeId: 'start_1', nodeName: '开始', nodeType: 'start', x: 120, y: 300 }]
    edges.value = []
    selectedNode.value = null
    selectedEdge.value = null
    readonly.value = false
  }
  autoFit()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // 焦点在输入框中时不触发
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (selectedNode.value) {
      removeNode()
      e.preventDefault()
    } else if (selectedEdge.value) {
      removeEdge()
      e.preventDefault()
    }
  }
}

async function loadForms() {
  try {
    const res: any = await getWorkflowForms({ current: 1, size: 100 })
    formList.value = res?.records || []
  } catch { /* ignore */ }
}

async function loadDef(id: string) {
  try {
    const res: any = await getWorkflowDefDetail(id)
    const def = res  // 拦截器已解包，res 就是定义对象
    if (def) {
      Object.assign(defForm, def)
      nodes.value = def.nodes || []
      edges.value = def.edges || []
      // 非草稿版本只读（已发布/已归档/已下线）
      readonly.value = def.defStatus !== undefined && def.defStatus !== null && def.defStatus !== 0
    }
  } catch (e: any) {
    ElMessage.error('加载流程定义失败')
  }
}

// ===== 拖拽添加节点 =====
function onDragStart(nodeType: string, e: DragEvent) {
  dragType.value = nodeType
  ;(window as any).__dragNodeType = nodeType
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/x-node-type', nodeType)
    e.dataTransfer.setData('text/plain', nodeType)
    e.dataTransfer.effectAllowed = 'copy'
  }
}

let nodeCounter = 0

function onNodeAdd(nodeType: string, x: number, y: number) {
  nodeCounter++
  const nodeId = `${nodeType}_${Date.now()}_${nodeCounter}`
  const labels: Record<string, string> = {
    user_task: '用户任务',
    cc: '抄送',
    condition: '条件分支',
    parallel: '并行分支',
    timer: '延时器',
    trigger: '触发器',
    service: '服务任务',
    sub_process: '子流程'
  }
  const newNode: WorkflowNode = {
    nodeId,
    nodeName: labels[nodeType] || nodeId,
    nodeType: nodeType as any,
    x,
    y
  }
  nodes.value.push(newNode)
  selectedNode.value = newNode
  selectedEdge.value = null
  ElMessage.success(`已添加节点: ${labels[nodeType] || nodeType}`)
}

// ===== 画布事件 =====
function onNodeClick(node: WorkflowNode) {
  selectedNode.value = node
  selectedEdge.value = null
}

function onEdgeClick(edge: WorkflowEdge) {
  selectedEdge.value = edge
  selectedNode.value = null
}

function onNodeMove(nodeId: string, x: number, y: number) {
  const node = nodes.value.find(n => n.nodeId === nodeId)
  if (node) {
    node.x = x
    node.y = y
  }
}

function onNodesMove(moves: { nodeId: string; x: number; y: number }[]) {
  for (const m of moves) {
    const node = nodes.value.find(n => n.nodeId === m.nodeId)
    if (node) {
      node.x = m.x
      node.y = m.y
    }
  }
}

function onNodeCopy(sourceNode: WorkflowNode, x: number, y: number) {
  nodeCounter++
  const nodeId = `${sourceNode.nodeType}_${Date.now()}_${nodeCounter}`
  const newNode: WorkflowNode = {
    ...sourceNode,
    id: undefined,
    nodeId,
    nodeName: `${sourceNode.nodeName || sourceNode.nodeType}_副本`,
    x,
    y
  }
  nodes.value.push(newNode)
  selectedNode.value = newNode
  ElMessage.success(`已复制节点: ${newNode.nodeName}`)
}

function onEdgeAdd(sourceId: string, targetId: string) {
  const edgeId = `edge_${Date.now()}`
  edges.value.push({
    edgeId,
    sourceId,
    targetId,
    edgeName: '',
    edgeCondition: ''
  })
}

function onNodeUpdate(updatedNode: WorkflowNode) {
  const idx = nodes.value.findIndex(n => n.nodeId === updatedNode.nodeId)
  if (idx >= 0) {
    nodes.value[idx] = { ...nodes.value[idx], ...updatedNode }
  }
}

function removeEdge() {
  if (selectedEdge.value) {
    const idx = edges.value.findIndex(e => e.edgeId === selectedEdge.value!.edgeId)
    if (idx >= 0) {
      edges.value.splice(idx, 1)
    }
    selectedEdge.value = null
    ElMessage.success('连线已删除')
  }
}

function removeNode() {
  if (!selectedNode.value) return
  const nodeId = selectedNode.value.nodeId
  const nodeName = selectedNode.value.nodeName || nodeId

  ElMessageBox.confirm(`确认删除节点「${nodeName}」？关联的连线也会被删除。`, '删除节点', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(() => {
    // 删除节点
    const nIdx = nodes.value.findIndex(n => n.nodeId === nodeId)
    if (nIdx >= 0) {
      nodes.value.splice(nIdx, 1)
    }
    // 删除关联连线
    const before = edges.value.length
    edges.value = edges.value.filter(e => e.sourceId !== nodeId && e.targetId !== nodeId)
    const removedEdges = before - edges.value.length

    selectedNode.value = null
    ElMessage.success(`节点已删除${removedEdges > 0 ? `，连带删除 ${removedEdges} 条连线` : ''}`)
  }).catch(() => {})
}

// ===== 保存 / 发布 =====
function validateDef(): boolean {
  // 校验：必须有开始节点和结束节点
  const hasStart = nodes.value.some(n => n.nodeType === 'start')
  const hasEnd = nodes.value.some(n => n.nodeType === 'end')
  if (!hasStart) {
    ElMessage.warning('流程必须有开始节点')
    return false
  }
  if (!hasEnd) {
    ElMessage.warning('流程必须有结束节点才能保存')
    return false
  }
  if (!defForm.defKey?.trim()) {
    ElMessage.warning('请输入流程标识')
    return false
  }
  if (!defForm.defName?.trim()) {
    ElMessage.warning('请输入流程名称')
    return false
  }
  return true
}

async function handleSave() {
  if (!validateDef()) return

  try {
    const data: WorkflowDef = {
      ...defForm,
      nodes: nodes.value,
      edges: edges.value
    }
    await saveWorkflowDef(data)
    ElMessage.success('保存成功')
    emit('close', true)
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  }
}

async function handleSaveAsNew() {
  if (!validateDef()) return

  try {
    // 清空 id → 以当前画布内容生成新草稿版本（历史版本不动）
    const data: WorkflowDef = {
      ...defForm,
      id: undefined,
      nodes: nodes.value,
      edges: edges.value
    }
    await saveWorkflowDef(data)
    ElMessage.success('已另存为新的草稿版本')
    emit('close', true)
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  }
}

async function handlePublish() {
  if (!defForm.id) {
    ElMessage.warning('请先保存后再发布')
    return
  }
  try {
    await ElMessageBox.confirm('确认发布该流程定义？', '发布确认', { type: 'warning' })
    await publishWorkflowDef(defForm.id as string | number)
    ElMessage.success('发布成功')
  } catch { /* ignore */ }
}

function goBack() {
  emit('close')
}
</script>

<style scoped>
.workflow-designer-page {
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

.designer-layout {
  display: flex;
  height: calc(100vh - 200px);
  gap: 12px;
}

.designer-left {
  width: 240px;
  overflow-y: auto;
  border-right: 1px solid var(--cw-border);
  padding-right: 12px;
}

.designer-center {
  flex: 1;
  overflow: hidden;
}

.designer-right {
  width: 300px;
  overflow-y: auto;
  border-left: 1px solid var(--cw-border);
  padding-left: 12px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cw-text);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--cw-border);
}

.node-palette {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border: 1px solid var(--cw-border);
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s;
  background: var(--cw-surface);
  min-width: 0;
}

.palette-item:hover {
  border-color: var(--cw-accent);
  background: color-mix(in srgb, var(--cw-accent) 8%, var(--cw-surface));
}

.palette-active {
  border-color: var(--cw-accent);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--cw-accent) 30%, transparent);
}

.palette-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.palette-label {
  font-size: 11px;
  color: var(--cw-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-hint {
  margin-top: 10px;
  font-size: 11px;
  color: var(--cw-control-text);
}

.readonly-banner {
  margin-bottom: 10px;
}
</style>
