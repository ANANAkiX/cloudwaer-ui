<template>
  <div class="flow-canvas" ref="canvasRef">
    <!-- 工具栏 -->
    <div class="canvas-toolbar">
      <div class="toolbar-left">
        <el-tooltip content="缩小">
          <el-button circle size="small" @click="zoomOut"><el-icon><Minus /></el-icon></el-button>
        </el-tooltip>
        <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
        <el-tooltip content="放大">
          <el-button circle size="small" @click="zoomIn"><el-icon><Plus /></el-icon></el-button>
        </el-tooltip>
        <el-tooltip content="适应画布">
          <el-button circle size="small" @click="fitView"><el-icon><FullScreen /></el-icon></el-button>
        </el-tooltip>
      </div>
      <div class="toolbar-hint">Ctrl+拖拽=复制节点 · 拖拽空白=平移画布</div>
      <slot name="toolbar" />
    </div>

    <!-- 画布区域 -->
    <div
      class="canvas-body"
      ref="bodyRef"
      :class="{ 'is-panning': isPanning }"
      @mousedown="onCanvasMouseDown"
      @mousemove="onCanvasMouseMove"
      @mouseup="onCanvasMouseUp"
      @mouseleave="onCanvasMouseUp"
      @wheel.prevent="onWheel"
      @dragover.prevent="onDragOver"
      @drop.prevent="onDrop"
    >
      <svg
        class="canvas-svg"
        :width="canvasWidth"
        :height="canvasHeight"
        :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }"
      >
        <!-- 连线层 -->
        <g class="edge-layer">
          <path
            v-for="edge in edges"
            :key="edge.edgeId"
            :d="getEdgePath(edge)"
            class="edge-path"
            :class="{ 'edge-selected': selectedEdge?.edgeId === edge.edgeId }"
            @click.stop="onEdgeClick(edge)"
          />
          <text
            v-for="edge in edges.filter(e => e.edgeName || e.edgeCondition)"
            :key="edge.edgeId + '-label'"
            :x="getEdgeLabelPos(edge).x"
            :y="getEdgeLabelPos(edge).y"
            class="edge-label"
            text-anchor="middle"
            @click.stop="onEdgeClick(edge)"
          >
            {{ edge.edgeName || edge.edgeCondition }}
          </text>
        </g>

        <!-- 节点层 -->
        <g class="node-layer">
          <g
            v-for="node in nodes"
            :key="node.nodeId"
            :transform="`translate(${node.x || 0}, ${node.y || 0})`"
            class="flow-node"
            :class="{
              'node-selected': isNodeSelected(node), 'node-done': (node as any)._state === 'done', 'node-active': (node as any)._state === 'active', 'node-pending': (node as any)._state === 'pending',
              ['node-' + node.nodeType]: true
            }"
            @mousedown.stop="onNodeMouseDown(node, $event)"
          >
            <template v-if="node.nodeType === 'start'">
              <circle r="24" class="node-shape" @click.stop="onNodeClick(node, $event)" />
            </template>
            <template v-else-if="node.nodeType === 'end'">
              <circle r="24" class="node-shape node-end-shape" @click.stop="onNodeClick(node, $event)" />
            </template>
            <template v-else>
              <rect x="-60" y="-24" width="120" height="48" rx="8" class="node-shape" @click.stop="onNodeClick(node, $event)" />
            </template>

            <text class="node-icon" y="5" text-anchor="middle">{{ getNodeIcon(node.nodeType) }}</text>
            <text class="node-label" :y="node.nodeType === 'start' || node.nodeType === 'end' ? 42 : 40" text-anchor="middle">
              {{ node.nodeName || node.nodeId }}
            </text>

            <circle
              v-if="node.nodeType !== 'end'"
              cx="60" cy="0" r="6"
              class="node-anchor"
              @mousedown.stop="startEdgeDrag(node, $event)"
            />
          </g>
        </g>

        <!-- 拖拽中的连线 -->
        <line
          v-if="dragEdge"
          :x1="dragEdge.startX" :y1="dragEdge.startY"
          :x2="dragEdge.endX" :y2="dragEdge.endY"
          class="edge-dragging"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { WorkflowNode, WorkflowEdge } from '@/api/workflow'

const props = defineProps<{
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'node-click', node: WorkflowNode): void
  (e: 'edge-click', edge: WorkflowEdge): void
  (e: 'node-move', nodeId: string, x: number, y: number): void
  (e: 'nodes-move', moves: { nodeId: string; x: number; y: number }[]): void
  (e: 'edge-add', sourceId: string, targetId: string): void
  (e: 'node-add', nodeType: string, x: number, y: number): void
  (e: 'node-copy', node: WorkflowNode, x: number, y: number): void
  (e: 'nodes-selected', nodeIds: string[]): void
  (e: 'canvas-click'): void
}>()

const canvasRef = ref<HTMLElement>()
const bodyRef = ref<HTMLElement>()
const zoom = ref(1)
const canvasWidth = 3000
const canvasHeight = 2000

// ===== 平移状态 =====
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const panStart = reactive({ x: 0, y: 0, panX: 0, panY: 0 })

// ===== 选中状态 =====
const selectedNode = ref<WorkflowNode | null>(null)
const selectedNodeIds = ref<Set<string>>(new Set())
const selectedEdge = ref<WorkflowEdge | null>(null)

// ===== 拖拽状态 =====
const draggingNode = ref<WorkflowNode | null>(null)
const dragOffset = reactive({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStartPos = reactive({ x: 0, y: 0 })

// ===== 复制拖拽 =====
const isCopyDragging = ref(false)

// ===== 连线拖拽 =====
const dragEdge = ref<{ startX: number; startY: number; endX: number; endY: number; sourceNode: WorkflowNode } | null>(null)

// ===== 缩放 =====
function zoomIn() {
  zoom.value = Math.min(zoom.value * 1.2, 3)
}
function zoomOut() {
  zoom.value = Math.max(zoom.value / 1.2, 0.3)
}
function fitView() {
  // 真正的「适应画布」：按内容边界缩放并居中（空画布则复位）
  if (!props.nodes.length) {
    zoom.value = 1
    panX.value = 0
    panY.value = 0
    return
  }
  fitContent()
}
function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoom.value = Math.max(0.3, Math.min(3, zoom.value * delta))
}

// ===== 选中判定 =====
function isNodeSelected(node: WorkflowNode): boolean {
  return selectedNodeIds.value.has(node.nodeId)
}

function clearSelection() {
  selectedNodeIds.value.clear()
  selectedNode.value = null
  selectedEdge.value = null
}

function selectSingleNode(node: WorkflowNode) {
  selectedNodeIds.value.clear()
  selectedNodeIds.value.add(node.nodeId)
  selectedNode.value = node
  emit('node-click', node)
  emit('nodes-selected', [node.nodeId])
}

function toggleSelectNode(node: WorkflowNode) {
  if (selectedNodeIds.value.has(node.nodeId)) {
    selectedNodeIds.value.delete(node.nodeId)
    if (selectedNode.value?.nodeId === node.nodeId) {
      selectedNode.value = null
    }
  } else {
    selectedNodeIds.value.add(node.nodeId)
    selectedNode.value = node
    emit('node-click', node)
  }
  emit('nodes-selected', Array.from(selectedNodeIds.value))
}

// ===== 节点鼠标按下 =====
function onNodeMouseDown(node: WorkflowNode, e: MouseEvent) {
  if (e.ctrlKey) {
    isCopyDragging.value = true
    draggingNode.value = node
    const svgRect = getSvgRect()
    if (svgRect) {
      dragOffset.x = e.clientX - svgRect.left - (node.x || 0) * zoom.value
      dragOffset.y = e.clientY - svgRect.top - (node.y || 0) * zoom.value
    }
    return
  }

  if (e.shiftKey) {
    toggleSelectNode(node)
    return
  }

  if (!isNodeSelected(node)) {
    selectSingleNode(node)
  } else {
    selectedNode.value = node
  }

  draggingNode.value = node
  isDragging.value = false
  dragStartPos.x = e.clientX
  dragStartPos.y = e.clientY
  const svgRect = getSvgRect()
  if (svgRect) {
    dragOffset.x = e.clientX - svgRect.left - (node.x || 0) * zoom.value
    dragOffset.y = e.clientY - svgRect.top - (node.y || 0) * zoom.value
  }
}

// ===== 画布鼠标移动 =====
function onCanvasMouseMove(e: MouseEvent) {
  // 节点拖拽 / 复制拖拽
  if (draggingNode.value) {
    const svgRect = getSvgRect()
    if (!svgRect) return

    if (!isDragging.value) {
      const dx = Math.abs(e.clientX - dragStartPos.x)
      const dy = Math.abs(e.clientY - dragStartPos.y)
      if (dx > 3 || dy > 3) {
        isDragging.value = true
      }
    }
    if (!isDragging.value) return

    const x = (e.clientX - svgRect.left - dragOffset.x) / zoom.value
    const y = (e.clientY - svgRect.top - dragOffset.y) / zoom.value

    if (isCopyDragging.value) {
      const p = clampPos(x, y)
      draggingNode.value.x = p.x
      draggingNode.value.y = p.y
    } else {
      const oldX = draggingNode.value.x || 0
      const oldY = draggingNode.value.y || 0
      const newX = Math.round(x)
      const newY = Math.round(y)
      const dx = newX - oldX
      const dy = newY - oldY

      if (selectedNodeIds.value.has(draggingNode.value.nodeId) && selectedNodeIds.value.size > 1) {
        for (const node of props.nodes) {
          if (selectedNodeIds.value.has(node.nodeId)) {
            const p = clampPos((node.x || 0) + dx, (node.y || 0) + dy)
            node.x = p.x
            node.y = p.y
          }
        }
      } else {
        const p = clampPos(newX, newY)
        draggingNode.value.x = p.x
        draggingNode.value.y = p.y
      }
    }
    return
  }

  // 画布平移
  if (isPanning.value) {
    panX.value = panStart.panX + (e.clientX - panStart.x)
    panY.value = panStart.panY + (e.clientY - panStart.y)
    return
  }

  // 连线拖拽
  if (dragEdge.value) {
    const svgRect = getSvgRect()
    if (svgRect) {
      dragEdge.value.endX = (e.clientX - svgRect.left) / zoom.value
      dragEdge.value.endY = (e.clientY - svgRect.top) / zoom.value
    }
  }
}

// ===== 画布鼠标释放 =====
function onCanvasMouseUp(e: MouseEvent) {
  // 复制拖拽
  if (draggingNode.value && isCopyDragging.value && isDragging.value) {
    const svgRect = getSvgRect()
    if (svgRect) {
      const x = (e.clientX - svgRect.left - dragOffset.x) / zoom.value
      const y = (e.clientY - svgRect.top - dragOffset.y) / zoom.value
      const p = clampPos(x, y)
      emit('node-copy', draggingNode.value, p.x, p.y)
    }
    draggingNode.value = null
    isCopyDragging.value = false
    isDragging.value = false
    return
  }

  // 节点拖拽结束
  if (draggingNode.value) {
    if (isDragging.value) {
      if (selectedNodeIds.value.size > 1) {
        const moves = props.nodes
          .filter(n => selectedNodeIds.value.has(n.nodeId))
          .map(n => ({ nodeId: n.nodeId, x: n.x || 0, y: n.y || 0 }))
        emit('nodes-move', moves)
      } else {
        emit('node-move', draggingNode.value.nodeId, draggingNode.value.x || 0, draggingNode.value.y || 0)
      }
    }
    draggingNode.value = null
    isDragging.value = false
    return
  }

  // 平移结束
  if (isPanning.value) {
    isPanning.value = false
    return
  }

  // 连线拖拽
  if (dragEdge.value) {
    const target = findNodeAtPosition(e)
    if (target && target.nodeId !== dragEdge.value.sourceNode.nodeId) {
      emit('edge-add', dragEdge.value.sourceNode.nodeId, target.nodeId)
    }
    dragEdge.value = null
  }
}

// ===== 画布按下（空白区域 = 平移） =====
function onCanvasMouseDown(e: MouseEvent) {
  clearSelection()
  emit('canvas-click')

  // 开始平移
  isPanning.value = true
  panStart.x = e.clientX
  panStart.y = e.clientY
  panStart.panX = panX.value
  panStart.panY = panY.value
}

// ===== 节点点击 =====
function onNodeClick(node: WorkflowNode, e: MouseEvent) {
  console.log('[FlowCanvas] onNodeClick', node.nodeId, node.nodeName)
  if (e.shiftKey) return
  selectSingleNode(node)
}

// ===== 连线 =====
function startEdgeDrag(node: WorkflowNode, e: MouseEvent) {
  dragEdge.value = {
    startX: (node.x || 0) + 60,
    startY: node.y || 0,
    endX: (node.x || 0) + 60,
    endY: node.y || 0,
    sourceNode: node
  }
}

function onEdgeClick(edge: WorkflowEdge) {
  selectedEdge.value = edge
  selectedNodeIds.value.clear()
  selectedNode.value = null
  emit('edge-click', edge)
}

// ===== 拖放添加 =====
function onDragOver(e: DragEvent) {
  e.dataTransfer!.dropEffect = 'copy'
}

// 节点坐标钳制在画布内容区内，避免贴边被 SVG 视口裁切
function clampPos(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(Math.min(Math.max(x, 80), canvasWidth - 80)),
    y: Math.round(Math.min(Math.max(y, 50), canvasHeight - 70))
  }
}

function onDrop(e: DragEvent) {
    const nodeType = (window as any).__dragNodeType || e.dataTransfer?.getData('application/x-node-type') || e.dataTransfer?.getData('text/plain')
    ;(window as any).__dragNodeType = null
    if (!nodeType) return
    const svgRect = getSvgRect()
    if (!svgRect) return
    const pos = clampPos(
      (e.clientX - svgRect.left) / zoom.value,
      (e.clientY - svgRect.top) / zoom.value
    )
    emit('node-add', nodeType, pos.x, pos.y)
  }

// ===== 工具函数 =====
function getSvgRect() {
  return bodyRef.value?.querySelector('.canvas-svg')?.getBoundingClientRect()
}

function findNodeAtPosition(e: MouseEvent): WorkflowNode | null {
  const svgRect = getSvgRect()
  if (!svgRect) return null
  const x = (e.clientX - svgRect.left) / zoom.value
  const y = (e.clientY - svgRect.top) / zoom.value
  return props.nodes.find(n => {
    const nx = n.x || 0
    const ny = n.y || 0
    return Math.abs(x - nx) < 70 && Math.abs(y - ny) < 35
  }) || null
}

function getEdgePath(edge: WorkflowEdge): string {
  const source = props.nodes.find(n => n.nodeId === edge.sourceId)
  const target = props.nodes.find(n => n.nodeId === edge.targetId)
  if (!source || !target) return ''
  const sx = (source.x || 0) + 60
  const sy = source.y || 0
  const tx = (target.x || 0) - 60
  const ty = target.y || 0
  const cx = (sx + tx) / 2
  return `M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ty}, ${tx} ${ty}`
}

function getEdgeLabelPos(edge: WorkflowEdge): { x: number; y: number } {
  const source = props.nodes.find(n => n.nodeId === edge.sourceId)
  const target = props.nodes.find(n => n.nodeId === edge.targetId)
  if (!source || !target) return { x: 0, y: 0 }
  return {
    x: ((source.x || 0) + (target.x || 0)) / 2,
    y: ((source.y || 0) + (target.y || 0)) / 2 - 10
  }
}

function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    start: '▶', end: '■', user_task: '👤', cc: '📋', condition: '◇',
    parallel: '⊕', timer: '⏱', trigger: '⚡', service: '⚙', sub_process: '▦'
  }
  return icons[type] || '●'
}

onMounted(() => {
  if (props.readonly) {
    setTimeout(() => fitContent(), 200)
  }
})

function fitContent() {
  const ns = props.nodes
  if (!ns.length || !bodyRef.value) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of ns) {
    minX = Math.min(minX, (n.x||0) - 80)
    minY = Math.min(minY, (n.y||0) - 50)
    maxX = Math.max(maxX, (n.x||0) + 80)
    maxY = Math.max(maxY, (n.y||0) + 50)
  }
  const cw = maxX - minX, ch = maxY - minY
  const bw = bodyRef.value.clientWidth, bh = bodyRef.value.clientHeight
  const s = Math.min((bw - 60) / cw, (bh - 60) / ch, 2)
  zoom.value = Math.max(s, 0.2)
  panX.value = (bw - cw * zoom.value) / 2 - minX * zoom.value
  panY.value = (bh - ch * zoom.value) / 2 - minY * zoom.value
}

defineExpose({ fitView, fitContent, zoomIn, zoomOut })

</script>

<style scoped>
.flow-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg, #f7f8fa);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}

.canvas-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  background: var(--card, #fff);
  position: relative;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-hint {
  font-size: 11px;
  color: var(--muted, #999);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.zoom-label {
  font-size: 12px;
  color: var(--muted, #666);
  min-width: 40px;
  text-align: center;
}

.canvas-body {
  flex: 1;
  overflow: hidden;
  cursor: grab;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
}
.canvas-body.is-panning {
  cursor: grabbing;
}

.canvas-svg {
  display: block;
  transform-origin: 0 0;
}

/* 连线 */
.edge-path {
  fill: none;
  stroke: #94a3b8;
  stroke-width: 2;
  cursor: pointer;
  transition: stroke 0.2s;
}
.edge-path:hover { stroke: #3b82f6; }
.edge-selected { stroke: #3b82f6; stroke-width: 3; }
.edge-label { font-size: 11px; fill: var(--muted, #666); cursor: pointer; }
.edge-dragging {
  stroke: #3b82f6;
  stroke-width: 2;
  stroke-dasharray: 6 3;
  fill: none;
}

/* 节点 */
.flow-node { cursor: pointer; }
.node-shape {
  fill: var(--card, #fff);
  stroke: #94a3b8;
  stroke-width: 2;
  transition: all 0.2s;
}
.flow-node:hover .node-shape { stroke: #3b82f6; }
.node-done .node-shape {
  stroke: #22c55e;
  stroke-width: 2.5;
}
.node-active .node-shape {
  stroke: #3b82f6;
  stroke-width: 3;
  filter: drop-shadow(0 0 8px rgba(59,130,246,0.4));
}
.node-pending .node-shape {
  stroke: #d0d4dd;
  stroke-dasharray: 4 2;
}
.node-selected .node-shape {
  stroke: #3b82f6;
  stroke-width: 3;
  filter: drop-shadow(0 2px 8px rgba(59, 130, 246, 0.3));
}

.node-start .node-shape { fill: #dcfce7; stroke: #22c55e; }
.node-end .node-shape { fill: #fee2e2; stroke: #ef4444; }
.node-user_task .node-shape { fill: #dbeafe; stroke: #3b82f6; }
.node-cc .node-shape { fill: #fef9c3; stroke: #eab308; }
.node-condition .node-shape { fill: #fce7f3; stroke: #ec4899; }
.node-parallel .node-shape { fill: #e0e7ff; stroke: #6366f1; }
.node-timer .node-shape { fill: #fff7ed; stroke: #f97316; }
.node-trigger .node-shape { fill: #f0fdf4; stroke: #10b981; }
.node-service .node-shape { fill: #f5f3ff; stroke: #8b5cf6; }
.node-sub_process .node-shape { fill: #f1f5f9; stroke: #64748b; }

.node-icon { font-size: 16px; }
.node-label { font-size: 11px; fill: var(--ink, #333); pointer-events: none; }

.node-anchor {
  fill: #3b82f6;
  stroke: #fff;
  stroke-width: 2;
  cursor: crosshair;
  opacity: 0;
  transition: opacity 0.2s;
}
.flow-node:hover .node-anchor { opacity: 1; }
</style>
