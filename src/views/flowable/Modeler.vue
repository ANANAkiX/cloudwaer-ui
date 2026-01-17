<template>
  <div class="flowable-modeler" :class="{ embedded: props.embedded }">
    <el-card class="modeler-card">
      <template #header>
        <div class="header">
          <span>BPMN Modeler</span>
          <div class="actions">
            <el-button type="primary" @click="handleNewDiagram">New</el-button>
            <el-button @click="handleFitViewport">Fit</el-button>
            <el-button @click="openXmlDialog">XML</el-button>
            <el-button @click="triggerImport">Import</el-button>
            <el-button type="success" @click="handleExport">导出</el-button>
          </div>
        </div>
      </template>
      <div class="modeler-body">
        <div class="modeler-content">
          <div ref="canvasRef" class="modeler-canvas"></div>
          <div v-if="props.embedded" class="node-action-panel">
            <div class="panel-header">节点动作配置</div>
            <el-form label-width="90px" class="panel-form">
              <el-form-item label="节点">
                <el-select v-model="selectedTaskId" placeholder="选择用户任务" @change="handleTaskSelect">
                  <el-option v-for="task in userTasks" :key="task.id" :label="task.name" :value="task.id" />
                </el-select>
              </el-form-item>
            </el-form>
            
            <!-- 集成节点动作配置组件 -->
            <NodeActionConfig 
              v-if="selectedTaskId"
              :node-id="selectedTaskId"
              :model-id="modelId"
              @save="handleSaveNodeActions"
              @change="handleNodeActionsChange"
            />
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="xmlDialogVisible" title="BPMN XML" width="860px">
      <el-input v-model="xmlText" type="textarea" :rows="20" />
      <template #footer>
        <el-button @click="xmlDialogVisible = false">Close</el-button>
        <el-button type="primary" @click="applyXml">Apply</el-button>
      </template>
    </el-dialog>

    <input ref="fileInputRef" type="file" accept=".bpmn,.xml" class="hidden-input" @change="handleFileChange" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import customTranslateModule from './bpmn/translate'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import NodeActionConfig from '@/components/flowable/NodeActionConfig.vue'

const props = defineProps<{
  embedded?: boolean
  initialXml?: string
  modelKey?: string
  modelId?: number
  initialNodeActionsText?: string
}>()

const emit = defineEmits<{
  (event: 'export', payload: { xml: string; nodeActionsText: string }): void
}>()

const canvasRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const route = useRoute()

const xmlDialogVisible = ref(false)
const xmlText = ref('')
const userTasks = ref<{ id: string; name: string }[]>([])
const selectedTaskId = ref('')
const actionDrafts = ref<Record<string, { actionCode: string; actionParamsText: string }>>({})
const nodeActions = ref<any[]>([])

let modeler: BpmnModeler | null = null
let eventBus: any = null
const storageKey = 'flowable:bpmnXmlDraft'

const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" name="New Process" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="120" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`

const normalizeXmlWithModelKey = (xml: string, modelKey?: string) => {
  if (!modelKey) return xml
  let next = xml
  next = next.replace(/(<bpmn:process\b[^>]*\bid=")([^"]+)(")/, `$1${modelKey}$3`)
  next = next.replace(/(<process\b[^>]*\bid=")([^"]+)(")/, `$1${modelKey}$3`)
  next = next.replace(/(<bpmndi:BPMNPlane\b[^>]*\bbpmnElement=")([^"]+)(")/, `$1${modelKey}$3`)
  return next
}

const ensureNamespaces = (xml: string) => {
  if (xml.includes('xmlns:bpmndi') && xml.includes('xmlns:dc') && xml.includes('xmlns:di')) {
    return xml
  }
  const addNs = (match: string, attrs: string) => {
    let next = attrs
    if (!/xmlns:bpmndi=/.test(next)) {
      next += ' xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"'
    }
    if (!/xmlns:dc=/.test(next)) {
      next += ' xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"'
    }
    if (!/xmlns:di=/.test(next)) {
      next += ' xmlns:di="http://www.omg.org/spec/DD/20100524/DI"'
    }
    return match.replace(attrs, next)
  }
  const withPrefixed = xml.replace(/<bpmn:definitions\b([^>]*)>/, addNs)
  if (withPrefixed !== xml) return withPrefixed
  return xml.replace(/<definitions\b([^>]*)>/, addNs)
}

const ensureDiagram = (xml: string, modelKey?: string) => {
  if (xml.includes('<bpmndi:BPMNDiagram')) return xml
  const processIdMatch = xml.match(/<bpmn:process\b[^>]*\bid="([^"]+)"/) ||
    xml.match(/<process\b[^>]*\bid="([^"]+)"/)
  const processId = modelKey || processIdMatch?.[1] || 'Process_1'
  let next = xml
  if (!processIdMatch && modelKey) {
    if (/<bpmn:process\b/.test(next)) {
      next = next.replace(/<bpmn:process\b/, `<bpmn:process id="${processId}"`)
    } else {
      next = next.replace(/<process\b/, `<process id="${processId}"`)
    }
  }
  next = ensureNamespaces(next)
  const diagramXml = `
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="120" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
`
  if (next.includes('</bpmn:definitions>')) {
    next = next.replace('</bpmn:definitions>', `${diagramXml}</bpmn:definitions>`)
  } else {
    next = next.replace('</definitions>', `${diagramXml}</definitions>`)
  }
  return next
}

const getCurrentAction = () => {
  const taskId = selectedTaskId.value
  if (!taskId) {
    return { actionCode: '', actionParamsText: '' }
  }
  if (!actionDrafts.value[taskId]) {
    actionDrafts.value[taskId] = { actionCode: '', actionParamsText: '' }
  }
  return actionDrafts.value[taskId]
}

const currentAction = ref(getCurrentAction())

const syncCurrentAction = () => {
  currentAction.value = getCurrentAction()
}

const actionTaskTypes = new Set([
  'bpmn:UserTask',
  'bpmn:ServiceTask',
  'bpmn:ScriptTask',
  'bpmn:BusinessRuleTask',
  'bpmn:Task'
])

const updateUserTasks = () => {
  if (!modeler) return
  const registry = modeler.get('elementRegistry') as any
  const tasks = registry.filter((el: any) => actionTaskTypes.has(el.type))
  userTasks.value = tasks.map((task: any) => ({
    id: task.id,
    name: task.businessObject?.name ? `${task.businessObject.name} (${task.id})` : task.id
  }))
  if (!selectedTaskId.value && userTasks.value.length > 0) {
    selectedTaskId.value = userTasks.value[0].id
    syncCurrentAction()
  }
}

const handleTaskSelect = () => {
  syncCurrentAction()
}

const saveCurrentAction = () => {
  if (!selectedTaskId.value) {
    ElMessage.warning('请先选择节点')
    return
  }
  const action = getCurrentAction()
  actionDrafts.value[selectedTaskId.value] = {
    actionCode: action.actionCode || '',
    actionParamsText: action.actionParamsText || ''
  }
  ElMessage.success('动作已保存')
}

// 处理节点动作保存
const handleSaveNodeActions = (actions: any[]) => {
  nodeActions.value = actions
  ElMessage.success('节点动作配置已保存')
}

// 处理节点动作变化
const handleNodeActionsChange = (actions: any[]) => {
  nodeActions.value = actions
}

const loadXml = async (xml: string) => {
  if (!modeler) return
  try {
    const normalized = ensureDiagram(normalizeXmlWithModelKey(xml, props.modelKey), props.modelKey)
    await modeler.importXML(normalized)
    const canvas = modeler.get('canvas') as any
    canvas.zoom('fit-viewport')
    updateUserTasks()
  } catch (error) {
    console.error('Failed to import BPMN XML:', error)
    ElMessage.error('Failed to import BPMN XML')
  }
}

const handleNewDiagram = async () => {
  await loadXml(defaultXml)
}

const handleFitViewport = () => {
  if (!modeler) return
  const canvas = modeler.get('canvas') as any
  canvas.zoom('fit-viewport')
}

const openXmlDialog = async () => {
  if (!modeler) return
  try {
    const result = await modeler.saveXML({ format: true })
    xmlText.value = result.xml || ''
    xmlDialogVisible.value = true
  } catch (error) {
    console.error('Failed to export BPMN XML:', error)
    ElMessage.error('Failed to export BPMN XML')
  }
}

const applyXml = async () => {
  if (!xmlText.value.trim()) {
    ElMessage.warning('XML is empty')
    return
  }
  await loadXml(xmlText.value)
  xmlDialogVisible.value = false
}

const triggerImport = () => {
  fileInputRef.value?.click()
}

const handleExport = async () => {
  if (!modeler) return
  try {
    const result = await modeler.saveXML({ format: true })
    const xml = normalizeXmlWithModelKey(result.xml || '', props.modelKey)
    if (props.embedded) {
      const tasks: Array<{ taskId: string; nodeName?: string; actionCode: string; actionParams?: Record<string, any> }> = []
      for (const [taskId, value] of Object.entries(actionDrafts.value)) {
        if (!value.actionCode && !value.actionParamsText) continue
        const taskInfo = userTasks.value.find((task) => task.id === taskId)
        let actionParams: Record<string, any> | undefined
        if (value.actionParamsText && value.actionParamsText.trim()) {
          try {
            actionParams = JSON.parse(value.actionParamsText)
          } catch (error) {
            ElMessage.error(`节点 ${taskId} 的动作参数 JSON 格式错误`)
            return
          }
        }
        tasks.push({
          taskId,
          nodeName: taskInfo?.name,
          actionCode: value.actionCode || '',
          actionParams
        })
      }
      const nodeActionsText = JSON.stringify(tasks, null, 2)
      emit('export', { xml, nodeActionsText })
      return
    }
    localStorage.setItem(storageKey, xml)
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'FLOWABLE_BPMN_XML', xml }, window.location.origin)
      window.close()
      return
    }
    ElMessage.success('已导出 BPMN XML')
  } catch (error) {
    console.error('Failed to export BPMN XML:', error)
    ElMessage.error('Failed to export BPMN XML')
  }
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const content = await file.text()
    await loadXml(content)
  } catch (error) {
    console.error('Failed to read file:', error)
    ElMessage.error('Failed to read file')
  } finally {
    input.value = ''
  }
}

onMounted(async () => {
  if (!canvasRef.value) return
  modeler = new BpmnModeler({
    container: canvasRef.value,
    additionalModules: [
      customTranslateModule
    ]
  })
  eventBus = modeler.get('eventBus')
  eventBus.on('commandStack.changed', () => {
    updateUserTasks()
  })
  eventBus.on('selection.changed', (event: any) => {
    const selected = event?.newSelection?.[0]
    if (selected && actionTaskTypes.has(selected.type)) {
      selectedTaskId.value = selected.id
      syncCurrentAction()
    }
  })
  const isEmbedded = props.embedded
  const initialXml = props.initialXml?.trim() || ''
  if (isEmbedded) {
    await loadXml(initialXml || defaultXml)
    if (props.initialNodeActionsText) {
      try {
        const parsed = JSON.parse(props.initialNodeActionsText)
        if (parsed?.tasks && Array.isArray(parsed.tasks)) {
          parsed.tasks.forEach((task: any) => {
            if (!task?.taskId) return
            actionDrafts.value[task.taskId] = {
              actionCode: task.actionCode || '',
              actionParamsText: task.actionParams ? JSON.stringify(task.actionParams, null, 2) : ''
            }
          })
          syncCurrentAction()
        }
      } catch (error) {
        // ignore invalid initial json
      }
    }
    return
  }
  const isFromModel = route.query.source === 'model'
  const draftXml = isFromModel ? localStorage.getItem(storageKey) : ''
  if (draftXml && draftXml.trim()) {
    await loadXml(draftXml)
  } else {
    await loadXml(defaultXml)
  }
})

onBeforeUnmount(() => {
  modeler?.destroy()
  modeler = null
  eventBus = null
})
</script>

<style scoped>
.flowable-modeler {
  padding: 0;
}

.modeler-card {
  width: 100%;
}

.flowable-modeler.embedded {
  height: 100%;
}

.flowable-modeler.embedded .modeler-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.flowable-modeler.embedded :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
}

.flowable-modeler.embedded .modeler-body {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.flowable-modeler.embedded .modeler-canvas {
  height: 100%;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.modeler-body {
  height: calc(100vh - 240px);
  min-height: 560px;
}

.modeler-content {
  display: flex;
  gap: 12px;
  height: 100%;
}

.modeler-canvas {
  flex: 1;
  width: 100%;
  height: 100%;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.node-action-panel {
  width: 320px;
  border-left: 1px solid #ebeef5;
  padding-left: 12px;
  overflow: auto;
}

.panel-header {
  font-weight: 600;
  margin-bottom: 12px;
}

.panel-form {
  width: 100%;
}

.hidden-input {
  display: none;
}
</style>
