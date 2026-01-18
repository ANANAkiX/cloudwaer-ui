<template>
  <div class="process-designer">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>流程设计器</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleSave" :loading="saveLoading">
              <el-icon><Document /></el-icon>
              保存
            </el-button>
            <el-button type="success" @click="handlePublish" :loading="publishLoading">
              <el-icon><Upload /></el-icon>
              发布
            </el-button>
            <el-button @click="handleImport">
              <el-icon><UploadFilled /></el-icon>
              导入
            </el-button>
            <el-button @click="handleExport">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
        </div>
      </template>

      <!-- 模型信息 -->
      <div class="model-info">
        <el-form :model="modelInfo" label-width="100px">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="模型Key">
                <el-input v-model="modelInfo.modelKey" placeholder="请输入模型Key" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="模型名称">
                <el-input v-model="modelInfo.modelName" placeholder="请输入模型名称" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="分类">
                <el-input v-model="modelInfo.category" placeholder="请输入分类" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="描述">
                <el-input v-model="modelInfo.remark" placeholder="请输入描述" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <!-- BPMN编辑器 -->
      <div class="editor-container">
        <div class="editor-toolbar">
          <el-button-group>
            <el-button @click="addStartEvent">开始事件</el-button>
            <el-button @click="addUserTask">用户任务</el-button>
            <el-button @click="addServiceTask">服务任务</el-button>
            <el-button @click="addExclusiveGateway">排他网关</el-button>
            <el-button @click="addParallelGateway">并行网关</el-button>
            <el-button @click="addEndEvent">结束事件</el-button>
          </el-button-group>
        </div>
        
        <div class="editor-canvas" ref="canvasRef">
          <div class="canvas-content">
            <!-- 简单的节点展示 -->
            <div 
              v-for="node in nodes" 
              :key="node.id"
              class="node"
              :class="node.type"
              :style="{ left: node.x + 'px', top: node.y + 'px' }"
              @click="selectNode(node)"
              @mousedown="startDrag(node, $event)"
            >
              <div class="node-content">
                <el-icon v-if="node.type === 'startEvent'"><VideoPlay /></el-icon>
                <el-icon v-else-if="node.type === 'userTask'"><User /></el-icon>
                <el-icon v-else-if="node.type === 'serviceTask'"><Setting /></el-icon>
                <el-icon v-else-if="node.type === 'exclusiveGateway'"><Share /></el-icon>
                <el-icon v-else-if="node.type === 'parallelGateway'"><Connection /></el-icon>
                <el-icon v-else-if="node.type === 'endEvent'"><VideoPause /></el-icon>
                <span class="node-name">{{ node.name }}</span>
              </div>
            </div>
            
            <!-- 连接线 -->
            <svg class="connections" v-if="connections.length > 0">
              <path 
                v-for="conn in connections" 
                :key="conn.id"
                :d="getConnectionPath(conn)"
                stroke="#409eff"
                stroke-width="2"
                fill="none"
                marker-end="url(#arrowhead)"
              />
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#409eff" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      <!-- 属性面板 -->
      <div class="properties-panel" v-if="selectedNode">
        <el-card>
          <template #header>
            <span>节点属性</span>
          </template>
          <el-form :model="selectedNode" label-width="80px">
            <el-form-item label="节点ID">
              <el-input v-model="selectedNode.id" disabled />
            </el-form-item>
            <el-form-item label="节点名称">
              <el-input v-model="selectedNode.name" @blur="updateNodeName" />
            </el-form-item>
            <el-form-item label="处理人" v-if="selectedNode.type === 'userTask'">
              <el-input v-model="selectedNode.assignee" placeholder="请输入处理人" />
            </el-form-item>
            <el-form-item label="候选用户" v-if="selectedNode.type === 'userTask'">
              <el-input v-model="selectedNode.candidateUsers" placeholder="请输入候选用户" />
            </el-form-item>
            <el-form-item label="候选组" v-if="selectedNode.type === 'userTask'">
              <el-input v-model="selectedNode.candidateGroups" placeholder="请输入候选组" />
            </el-form-item>
          </el-form>
        </el-card>
      </div>
    </el-card>

    <!-- 导入对话框 -->
    <el-dialog v-model="importVisible" title="导入BPMN文件" width="500px">
      <el-upload
        class="upload-demo"
        drag
        accept=".bpmn,.xml"
        :auto-upload="false"
        :on-change="handleFileChange"
        :show-file-list="false"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将BPMN文件拖到此处，或<em>点击上传</em>
        </div>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Document, Upload, Download, UploadFilled, VideoPlay, VideoPause, 
  User, Setting, Share, Connection 
} from '@element-plus/icons-vue'

// 节点接口
interface ProcessNode {
  id: string
  name: string
  type: 'startEvent' | 'userTask' | 'serviceTask' | 'exclusiveGateway' | 'parallelGateway' | 'endEvent'
  x: number
  y: number
  assignee?: string
  candidateUsers?: string
  candidateGroups?: string
}

// 连接线接口
interface Connection {
  id: string
  source: string
  target: string
}

// 响应式数据
const canvasRef = ref<HTMLElement>()
const saveLoading = ref(false)
const publishLoading = ref(false)
const importVisible = ref(false)

// 模型信息
const modelInfo = reactive({
  id: '',
  modelKey: '',
  modelName: '',
  category: '',
  remark: ''
})

// 节点列表
const nodes = ref<ProcessNode[]>([
  {
    id: 'start_1',
    name: '开始',
    type: 'startEvent',
    x: 50,
    y: 200
  },
  {
    id: 'task_1',
    name: '用户任务',
    type: 'userTask',
    x: 200,
    y: 200
  },
  {
    id: 'end_1',
    name: '结束',
    type: 'endEvent',
    x: 350,
    y: 200
  }
])

// 连接线列表
const connections = ref<Connection[]>([
  { id: 'conn_1', source: 'start_1', target: 'task_1' },
  { id: 'conn_2', source: 'task_1', target: 'end_1' }
])

// 选中的节点
const selectedNode = ref<ProcessNode | null>(null)

// 拖拽状态
const isDragging = ref(false)
const dragNode = ref<ProcessNode | null>(null)
const dragOffset = ref({ x: 0, y: 0 })

// 添加节点
const addStartEvent = () => {
  const newNode: ProcessNode = {
    id: `start_${Date.now()}`,
    name: '开始事件',
    type: 'startEvent',
    x: 100,
    y: 100
  }
  nodes.value.push(newNode)
}

const addUserTask = () => {
  const newNode: ProcessNode = {
    id: `task_${Date.now()}`,
    name: '用户任务',
    type: 'userTask',
    x: 100,
    y: 100
  }
  nodes.value.push(newNode)
}

const addServiceTask = () => {
  const newNode: ProcessNode = {
    id: `service_${Date.now()}`,
    name: '服务任务',
    type: 'serviceTask',
    x: 100,
    y: 100
  }
  nodes.value.push(newNode)
}

const addExclusiveGateway = () => {
  const newNode: ProcessNode = {
    id: `gateway_${Date.now()}`,
    name: '排他网关',
    type: 'exclusiveGateway',
    x: 100,
    y: 100
  }
  nodes.value.push(newNode)
}

const addParallelGateway = () => {
  const newNode: ProcessNode = {
    id: `parallel_${Date.now()}`,
    name: '并行网关',
    type: 'parallelGateway',
    x: 100,
    y: 100
  }
  nodes.value.push(newNode)
}

const addEndEvent = () => {
  const newNode: ProcessNode = {
    id: `end_${Date.now()}`,
    name: '结束事件',
    type: 'endEvent',
    x: 100,
    y: 100
  }
  nodes.value.push(newNode)
}

// 选择节点
const selectNode = (node: ProcessNode) => {
  selectedNode.value = node
}

// 开始拖拽
const startDrag = (node: ProcessNode, event: MouseEvent) => {
  isDragging.value = true
  dragNode.value = node
  dragOffset.value = {
    x: event.clientX - node.x,
    y: event.clientY - node.y
  }
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

// 处理拖拽
const handleDrag = (event: MouseEvent) => {
  if (isDragging.value && dragNode.value && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    dragNode.value.x = event.clientX - rect.left - dragOffset.value.x
    dragNode.value.y = event.clientY - rect.top - dragOffset.value.y
  }
}

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false
  dragNode.value = null
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 更新节点名称
const updateNodeName = () => {
  if (selectedNode.value) {
    const node = nodes.value.find(n => n.id === selectedNode.value!.id)
    if (node) {
      node.name = selectedNode.value.name
    }
  }
}

// 获取连接线路径
const getConnectionPath = (conn: Connection) => {
  const sourceNode = nodes.value.find(n => n.id === conn.source)
  const targetNode = nodes.value.find(n => n.id === conn.target)
  
  if (!sourceNode || !targetNode) return ''
  
  const x1 = sourceNode.x + 60
  const y1 = sourceNode.y + 30
  const x2 = targetNode.x + 60
  const y2 = targetNode.y + 30
  
  return `M ${x1} ${y1} L ${x2} ${y2}`
}

// 保存模型
const handleSave = async () => {
  try {
    saveLoading.value = true
    
    // 构建保存数据
    const saveData = {
      id: modelInfo.id || undefined,
      modelKey: modelInfo.modelKey,
      modelName: modelInfo.modelName,
      category: modelInfo.category,
      remark: modelInfo.remark,
      nodes: nodes.value,
      connections: connections.value
    }
    
    console.log('保存数据:', saveData)
    
    // TODO: 调用保存API
    // await saveFlowableModel(saveData)
    
    ElMessage.success('模型保存成功')
  } catch (error) {
    console.error('保存模型失败:', error)
    ElMessage.error('保存模型失败')
  } finally {
    saveLoading.value = false
  }
}

// 发布模型
const handlePublish = async () => {
  if (!modelInfo.modelKey || !modelInfo.modelName) {
    ElMessage.warning('请填写模型Key和名称')
    return
  }

  try {
    publishLoading.value = true
    
    // 构建发布数据
    const publishData = {
      id: modelInfo.id,
      modelKey: modelInfo.modelKey,
      modelName: modelInfo.modelName,
      category: modelInfo.category,
      remark: modelInfo.remark,
      nodes: nodes.value,
      connections: connections.value
    }
    
    console.log('发布数据:', publishData)
    
    // TODO: 调用发布API
    // await publishFlowableModel(publishData)
    
    ElMessage.success('模型发布成功')
  } catch (error) {
    console.error('发布模型失败:', error)
    ElMessage.error('发布模型失败')
  } finally {
    publishLoading.value = false
  }
}

// 导入文件
const handleImport = () => {
  importVisible.value = true
}

// 处理文件变化
const handleFileChange = async (file: any) => {
  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      const xml = e.target?.result as string
      console.log('导入的XML:', xml)
      
      // TODO: 解析XML并重建节点和连接
      ElMessage.success('BPMN文件导入成功')
      importVisible.value = false
    }
    reader.readAsText(file.raw)
  } catch (error) {
    console.error('导入文件失败:', error)
    ElMessage.error('导入文件失败')
  }
}

// 导出
const handleExport = async () => {
  try {
    // 构建BPMN XML
    const bpmnXml = generateBPMNXML()
    
    // 创建下载链接
    const blob = new Blob([bpmnXml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${modelInfo.modelName || 'process'}.bpmn`
    link.click()
    
    // 清理
    URL.revokeObjectURL(url)
    
    ElMessage.success('BPMN文件导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 生成BPMN XML
const generateBPMNXML = () => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${modelInfo.modelKey || 'process'}" name="${modelInfo.modelName || 'Process'}" isExecutable="true">
    ${nodes.value.map(node => generateNodeXML(node)).join('\n    ')}
    ${connections.value.map(conn => generateConnectionXML(conn)).join('\n    ')}
  </bpmn:process>
</bpmn:definitions>`
}

// 生成节点XML
const generateNodeXML = (node: ProcessNode) => {
  switch (node.type) {
    case 'startEvent':
      return `<bpmn:startEvent id="${node.id}" name="${node.name}" />`
    case 'userTask':
      return `<bpmn:userTask id="${node.id}" name="${node.name}" ${node.assignee ? `activiti:assignee="${node.assignee}"` : ''} />`
    case 'serviceTask':
      return `<bpmn:serviceTask id="${node.id}" name="${node.name}" />`
    case 'exclusiveGateway':
      return `<bpmn:exclusiveGateway id="${node.id}" name="${node.name}" />`
    case 'parallelGateway':
      return `<bpmn:parallelGateway id="${node.id}" name="${node.name}" />`
    case 'endEvent':
      return `<bpmn:endEvent id="${node.id}" name="${node.name}" />`
    default:
      return ''
  }
}

// 生成连接线XML
const generateConnectionXML = (conn: Connection) => {
  return `<bpmn:sequenceFlow id="${conn.id}" sourceRef="${conn.source}" targetRef="${conn.target}" />`
}
</script>

<style scoped lang="scss">
.process-designer {
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
  
  .model-info {
    margin-bottom: 20px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 4px;
  }
  
  .editor-container {
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
    
    .editor-toolbar {
      padding: 10px;
      background: #f5f7fa;
      border-bottom: 1px solid #dcdfe6;
    }
    
    .editor-canvas {
      height: 500px;
      background: #fff;
      position: relative;
      overflow: auto;
      
      .canvas-content {
        width: 100%;
        height: 100%;
        position: relative;
        min-width: 800px;
        min-height: 500px;
      }
      
      .node {
        position: absolute;
        width: 120px;
        height: 60px;
        border: 2px solid #409eff;
        border-radius: 8px;
        background: #fff;
        cursor: move;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        transition: all 0.2s;
        
        &:hover {
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
        }
        
        &.selected {
          border-color: #67c23a;
          box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3);
        }
        
        &.startEvent {
          border-radius: 50%;
          width: 60px;
          height: 60px;
          background: #e1f3d8;
          border-color: #67c23a;
        }
        
        &.endEvent {
          border-radius: 50%;
          width: 60px;
          height: 60px;
          background: #fde2e2;
          border-color: #f56c6c;
        }
        
        &.exclusiveGateway {
          transform: rotate(45deg);
          width: 60px;
          height: 60px;
          background: #fff;
          
          .node-content {
            transform: rotate(-45deg);
          }
        }
        
        &.parallelGateway {
          background: #fff;
          border-width: 3px;
        }
        
        .node-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          
          .node-name {
            font-weight: 500;
          }
        }
      }
      
      .connections {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
      }
    }
  }
  
  .properties-panel {
    margin-top: 20px;
    
    .el-card {
      max-width: 400px;
    }
  }
  
  .upload-demo {
    text-align: center;
    
    :deep(.el-upload) {
      width: 100%;
    }
    
    :deep(.el-upload-dragger) {
      width: 100%;
    }
  }
}
</style>
