<template>
  <div class="process-designer" :class="{ 'no-selection': !selectedElement }">
    <el-card>
      <template #header v-if="!embedded">
        <div class="card-header">
          <span>流程设计器</span>
          <div class="header-actions">
            <el-button type="primary" @click="saveModel" :loading="saveLoading">
              <el-icon><Document /></el-icon>
              保存模型
            </el-button>
            <el-button type="success" @click="publishModel" :loading="publishLoading">
              <el-icon><Upload /></el-icon>
              发布模型
            </el-button>
            <el-button type="warning" @click="previewProcess">
              <el-icon><View /></el-icon>
              预览流程
            </el-button>
          </div>
        </div>
      </template>

      <!-- 模型信息 -->
      <div class="model-info" v-if="!embedded">
        <el-form :model="modelInfo" label-width="100px" size="small">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="模型Key">
                <el-input v-model="modelInfo.modelKey" placeholder="请输入模型Key" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="模型名称">
                <el-input v-model="modelInfo.modelName" placeholder="请输入模型名称" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否可执行">
                <el-select v-model="modelInfo.isExecutable" placeholder="请选择">
                  <el-option label="是" :value="true" />
                  <el-option label="否" :value="false" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="分类">
                <DictSelect
                  v-model="modelInfo.category"
                  type="flowable_type"
                  valueField="value"
                  labelField="label"
                  placeholder="请选择流程类型"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="16">
              <el-form-item label="描述">
                <el-input v-model="modelInfo.remark" placeholder="请输入描述" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <!-- BPMN编辑器 -->
      <div class="editor-container">
        <div class="editor-canvas" ref="canvasRef"></div>
      </div>

      <!-- 属性面板 -->
      <div class="properties-panel" :class="{ 'is-hidden': !selectedElement }">
        <el-card v-if="selectedElement">
          <template #header>
            <span>节点属性</span>
          </template>
          <el-form :model="elementProperties" label-width="80px" size="small">
            <el-form-item label="ID">
              <el-input v-model="elementProperties.id" disabled />
            </el-form-item>
            <el-form-item label="节点名称">
              <el-input v-model="elementProperties.name" @input="() => handlePropertyChange('name')" />
            </el-form-item>
            <el-form-item label="处理人" v-if="isUserTask">
              <el-select
                v-model="elementProperties.assignee"
                filterable
                remote
                clearable
                reserve-keyword
                placeholder="选择用户作为处理人"
                :remote-method="searchAssigneeUsers"
                :loading="userSelectLoading"
                style="width: 100%"
                @change="() => handlePropertyChange('assignee')"
              >
                <el-option
                  v-for="u in assigneeUserOptions"
                  :key="u.username"
                  :label="`${u.nickname || u.username}（${u.username}）`"
                  :value="u.username"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="候选用户" v-if="isUserTask">
              <el-select
                v-model="elementProperties.candidateUserList"
                multiple
                filterable
                remote
                clearable
                placeholder="选择候选用户"
                :remote-method="searchCandidateUsers"
                :loading="userSelectLoading"
                style="width: 100%"
                @change="handleCandidateUsersChange"
              >
                <el-option
                  v-for="u in candidateUserOptions"
                  :key="u.username"
                  :label="`${u.nickname || u.username}（${u.username}）`"
                  :value="u.username"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="候选组" v-if="isUserTask">
              <el-select
                v-model="elementProperties.candidateRoleList"
                multiple
                filterable
                clearable
                placeholder="选择角色（运行时展开为该角色下用户）"
                style="width: 100%"
                @change="handleCandidateRolesChange"
              >
                <el-option
                  v-for="r in roleOptions"
                  :key="String(r.id)"
                  :label="`${r.roleName}（${r.roleCode}）`"
                  :value="String(r.id)"
                />
              </el-select>
            </el-form-item>
            <el-alert
              v-if="isUserTask && elementProperties.candidateRoleList?.length"
              type="info"
              :closable="false"
              show-icon
              title="候选组存角色ID，任务创建时自动展开为角色下用户名作为候选人"
              style="margin-bottom: 10px"
            />
            <el-alert
              v-if="isParallelGateway"
              type="success"
              :closable="false"
              show-icon
              title="并行网关（与）：所有分支同时执行，全部完成后汇聚"
            />
            <el-alert
              v-if="isExclusiveGateway"
              type="warning"
              :closable="false"
              show-icon
              title="排他网关（或）：按出线条件表达式只走一条分支"
            />

            <!-- 监听器配置（支持多个） -->
            <el-divider v-if="isUserTask || isStartEvent || isEndEvent">监听器配置</el-divider>
            <template v-if="isUserTask || isStartEvent || isEndEvent">
              <div class="listener-toolbar">
                <span class="listener-count">已配置 {{ elementProperties.listeners.length }} 个</span>
                <el-button size="small" type="primary" plain @click="addListenerRow">添加监听器</el-button>
              </div>
              <el-empty
                v-if="!elementProperties.listeners.length"
                description="暂无监听器"
                :image-size="48"
              />
              <div
                v-for="(listener, index) in elementProperties.listeners"
                :key="index"
                class="listener-row"
              >
                <div class="listener-row-header">
                  <span>监听器 #{{ index + 1 }}</span>
                  <el-button size="small" type="danger" link @click="removeListenerRow(index)">删除</el-button>
                </div>
                <el-form-item label="类型">
                  <el-select v-model="listener.type" style="width: 100%" @change="() => handleListenerRowChange(index)">
                    <el-option label="任务监听器" value="task" v-if="isUserTask" />
                    <el-option label="执行监听器" value="execution" v-if="isStartEvent || isEndEvent" />
                  </el-select>
                </el-form-item>
                <el-form-item label="事件">
                  <el-select v-model="listener.event" style="width: 100%">
                    <template v-if="listener.type === 'task'">
                      <el-option label="创建" value="create" />
                      <el-option label="分配" value="assignment" />
                      <el-option label="完成" value="complete" />
                      <el-option label="删除" value="delete" />
                    </template>
                    <template v-else>
                      <el-option v-if="isStartEvent" label="开始" value="start" />
                      <el-option v-if="isEndEvent" label="结束" value="end" />
                      <el-option label="完成" value="end" />
                    </template>
                  </el-select>
                </el-form-item>
                <el-form-item label="实现">
                  <el-select v-model="listener.delegate" style="width: 100%" filterable allow-create default-first-option>
                    <el-option
                      v-for="name in listener.type === 'task' ? taskListenerOptions : executionListenerOptions"
                      :key="name"
                      :label="name"
                      :value="`\${${name}}`"
                    />
                  </el-select>
                </el-form-item>
              </div>
            </template>
          </el-form>
        </el-card>
      </div>
    </el-card>

    <!-- 预览对话框 -->
    <el-dialog v-model="previewVisible" title="流程预览" width="80%">
      <div class="preview-canvas" ref="previewCanvasRef"></div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Upload, View } from '@element-plus/icons-vue'
import DictSelect from '@/components/DictSelect.vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'

// 导入自定义翻译
import customTranslate from './bpmn/translate'

// 创建翻译模块
const customTranslateModule = {
  translate: ['value', customTranslate]
}
import type { FlowableModelDetail, FlowableNodeAction } from '@/api/flowable'
import { saveFlowableModel, publishFlowableModel } from '@/api/flowable'
import { getUserPage } from '@/api/user'
import { getRoleList } from '@/api/role'
import type { RoleInfo, UserInfo } from '@/types'

const props = withDefaults(defineProps<{
  embedded?: boolean
  modelInfo?: Partial<FlowableModelDetail>
  initialBpmnXml?: string
}>(), {
  embedded: false,
  modelInfo: () => ({}),
  initialBpmnXml: ''
})

// 响应式数据
const canvasRef = ref<HTMLElement>()
const previewCanvasRef = ref<HTMLElement>()
const saveLoading = ref(false)
const publishLoading = ref(false)
const previewVisible = ref(false)

let modeler: BpmnModeler | null = null
let previewModeler: BpmnModeler | null = null

// 模型信息
const modelInfo = reactive({
  id: '',
  modelKey: '',
  modelName: '',
  category: '',
  remark: '',
  isExecutable: true
})

// 选中元素属性
const selectedElement = ref<any>(null)
const elementProperties = reactive({
  id: '',
  name: '',
  assignee: '',
  candidateUsers: '',
  candidateGroups: '',
  candidateUserList: [] as string[],
  candidateRoleList: [] as string[],
  conditionExpression: '',
  // 多监听器
  listeners: [] as Array<{ type: string; event: string; delegate: string }>
})

// 用户/角色选择器
const userSelectLoading = ref(false)
const assigneeUserOptions = ref<UserInfo[]>([])
const candidateUserOptions = ref<UserInfo[]>([])
const roleOptions = ref<RoleInfo[]>([])
const taskListenerOptions = ref<string[]>([
  'candidateExpandTaskListener',
  'logTaskListener',
  'notifyTaskListener',
  'flowableTaskListener'
])
const executionListenerOptions = ref<string[]>(['flowableExecutionListener'])

// 计算属性
const isUserTask = computed(() => {
  return selectedElement.value?.type === 'bpmn:UserTask'
})

const isStartEvent = computed(() => {
  return selectedElement.value?.type === 'bpmn:StartEvent'
})

const isEndEvent = computed(() => {
  return selectedElement.value?.type === 'bpmn:EndEvent'
})

const isParallelGateway = computed(() => {
  return selectedElement.value?.type === 'bpmn:ParallelGateway'
})

const isExclusiveGateway = computed(() => {
  return selectedElement.value?.type === 'bpmn:ExclusiveGateway'
})

const loadRoles = async () => {
  if (roleOptions.value.length) return
  try {
    const list: any = await getRoleList()
    roleOptions.value = Array.isArray(list) ? list : (list?.records || [])
  } catch (e) {
    console.error('加载角色失败', e)
  }
}

const searchAssigneeUsers = async (keyword: string) => {
  userSelectLoading.value = true
  try {
    const res: any = await getUserPage(1, 20, keyword || undefined)
    assigneeUserOptions.value = res?.records || []
  } finally {
    userSelectLoading.value = false
  }
}

const searchCandidateUsers = async (keyword: string) => {
  userSelectLoading.value = true
  try {
    const res: any = await getUserPage(1, 20, keyword || undefined)
    candidateUserOptions.value = res?.records || []
  } finally {
    userSelectLoading.value = false
  }
}

const handleCandidateUsersChange = (list: string[]) => {
  elementProperties.candidateUsers = (list || []).join(',')
  handlePropertyChange('candidateUsers')
}

const handleCandidateRolesChange = (list: string[]) => {
  elementProperties.candidateGroups = (list || []).join(',')
  handlePropertyChange('candidateGroups')
}

const addListenerRow = () => {
  const defaults = getDefaultListenerSettings()
  elementProperties.listeners.push({ ...defaults })
  syncListenersToElement()
}

const removeListenerRow = (index: number) => {
  elementProperties.listeners.splice(index, 1)
  syncListenersToElement()
}

const handleListenerRowChange = (_index: number) => {
  syncListenersToElement()
}

// 监听器字段变更时同步
watch(
  () => elementProperties.listeners,
  () => syncListenersToElement(),
  { deep: true }
)

const syncListenersToElement = () => {
  if (!selectedElement.value) return
  selectedElement.value.listenerConfig = {
    enable: elementProperties.listeners.length > 0,
    listeners: JSON.parse(JSON.stringify(elementProperties.listeners))
  }
}

const getDefaultListenerSettings = () => {
  if (isUserTask.value) {
    return {
      type: 'task',
      event: 'create',
      delegate: '${flowableTaskListener}'
    }
  }
  if (isEndEvent.value) {
    return {
      type: 'execution',
      event: 'end',
      delegate: '${flowableExecutionListener}'
    }
  }
  return {
    type: 'execution',
    event: 'start',
    delegate: '${flowableExecutionListener}'
  }
}


const getFlowableAttribute = (businessObject: any, name: string) => {
  if (!businessObject) return ''
  const direct = businessObject[name]
  if (direct !== undefined && direct !== null && direct !== '') return direct
  const attrs = businessObject.$attrs
  if (!attrs) return ''
  const attrName = `flowable:${name}`
  return attrs[attrName] || ''
}

const setFlowableAttribute = (businessObject: any, name: string, value: string) => {
  if (!businessObject) return
  if (!businessObject.$attrs) {
    businessObject.$attrs = {}
  }
  const attrName = `flowable:${name}`
  if (value) {
    businessObject.$attrs[attrName] = value
  } else {
    delete businessObject.$attrs[attrName]
  }
  businessObject[name] = value
}

const parseListenerConfigFromBusinessObject = (
  businessObject: any,
  defaultSettings: { type: string; event: string; delegate: string }
) => {
  const extensionElements = businessObject?.extensionElements
  const values = extensionElements?.values
  if (!Array.isArray(values)) return null

  const listenerType = defaultSettings.type === 'task' ? 'tasklistener' : 'executionlistener'
  const listener = values.find((item: any) => {
    const type = (item?.$type || item?.type || '').toString().toLowerCase()
    return type.includes(listenerType)
  })

  if (!listener) return null

  const delegate =
    listener.delegateExpression ||
    listener.class ||
    listener.expression ||
    defaultSettings.delegate

  return {
    enable: true,
    type: defaultSettings.type,
    event: listener.event || defaultSettings.event,
    delegate
  }
}

const applyIncomingModelInfo = (incoming?: Partial<FlowableModelDetail>) => {
  if (!incoming) return
  Object.assign(modelInfo, {
    id: incoming.id ?? modelInfo.id,
    modelKey: incoming.modelKey ?? modelInfo.modelKey,
    modelName: incoming.modelName ?? modelInfo.modelName,
    category: incoming.category ?? modelInfo.category,
    remark: incoming.remark ?? modelInfo.remark,
    isExecutable: incoming.isExecutable ?? modelInfo.isExecutable
  })
}

const loadDiagram = async (xml?: string) => {
  if (!modeler) return
  if (xml && xml.trim()) {
    await modeler.importXML(xml)
  } else {
    await modeler.createDiagram()
  }
}

// 方法
const initModeler = async () => {
  console.log('开始初始化流程设计器...')
  if (!canvasRef.value) {
    console.error('canvasRef 不存在')
    return
  }

  try {
    console.log('创建 BpmnModeler 实例...')
    modeler = new BpmnModeler({
      container: canvasRef.value,
      keyboard: {
        bindTo: window
      },
      additionalModules: [
        customTranslateModule
      ]
    })

    console.log('BpmnModeler 实例创建成功')

    await loadDiagram(props.initialBpmnXml)
    console.log('画布加载完成')

    // 监听选择事件
    modeler.on('selection.changed', (event: any) => {
      try {
        const { newSelection } = event
        if (newSelection && newSelection.length > 0) {
          selectedElement.value = newSelection[0]
          updateElementProperties()
        } else {
          selectedElement.value = null
          Object.assign(elementProperties, {
            id: '',
            name: '',
            assignee: '',
            candidateUsers: '',
            candidateGroups: '',
            candidateUserList: [],
            candidateRoleList: [],
            conditionExpression: '',
            listeners: []
          })
        }
      } catch (error) {
        console.error('选择事件处理失败:', error)
      }
    })

    // 监听元素变更事件
    modeler.on('element.changed', (event: any) => {
      try {
        if (selectedElement.value && event.element && event.element.id === selectedElement.value.id) {
          updateElementProperties()
        }
      } catch (error) {
        console.error('元素变更事件处理失败:', error)
      }
    })

    console.log('流程设计器事件监听器设置完成')

  } catch (error) {
    console.error('初始化设计器失败:', error)
    ElMessage.error('初始化设计器失败')
  }
}

const updateElementProperties = () => {
  try {
    if (!selectedElement.value) {
      Object.assign(elementProperties, {
        id: '',
        name: '',
        assignee: '',
        candidateUsers: '',
        candidateGroups: '',
        candidateUserList: [],
        candidateRoleList: [],
        conditionExpression: '',
        listeners: []
      })
      return
    }

    const element = selectedElement.value
    const businessObject = element.businessObject

    if (!businessObject) {
      console.warn('businessObject不存在')
      return
    }

    const candidateUsers = getFlowableAttribute(businessObject, 'candidateUsers')
    const candidateGroups = getFlowableAttribute(businessObject, 'candidateGroups')
    const listeners = loadListenersFromElement(element, businessObject)

    Object.assign(elementProperties, {
      id: element.id || '',
      name: businessObject.name || '',
      assignee: getFlowableAttribute(businessObject, 'assignee'),
      candidateUsers,
      candidateGroups,
      candidateUserList: candidateUsers ? candidateUsers.split(',').filter(Boolean) : [],
      candidateRoleList: candidateGroups ? candidateGroups.split(',').filter(Boolean) : [],
      conditionExpression: businessObject.conditionExpression || '',
      listeners
    })
  } catch (error) {
    console.error('更新元素属性失败:', error)
    Object.assign(elementProperties, {
      id: '',
      name: '',
      assignee: '',
      candidateUsers: '',
      candidateGroups: '',
      candidateUserList: [],
      candidateRoleList: [],
      conditionExpression: '',
      listeners: []
    })
  }
}

const loadListenersFromElement = (element: any, businessObject: any) => {
  if (element?.listenerConfig?.listeners?.length) {
    return JSON.parse(JSON.stringify(element.listenerConfig.listeners))
  }
  const defaults = getDefaultListenerSettings()
  const values = businessObject?.extensionElements?.values
  if (!Array.isArray(values)) return []
  const out: Array<{ type: string; event: string; delegate: string }> = []
  values.forEach((item: any) => {
    const type = (item?.$type || '').toString().toLowerCase()
    if (type.includes('tasklistener')) {
      out.push({
        type: 'task',
        event: item.event || 'create',
        delegate: item.delegateExpression || item.class || defaults.delegate
      })
    } else if (type.includes('executionlistener')) {
      out.push({
        type: 'execution',
        event: item.event || defaults.event,
        delegate: item.delegateExpression || item.class || '${flowableExecutionListener}'
      })
    }
  })
  if (out.length) {
    element.listenerConfig = { enable: true, listeners: out }
  }
  return out
}

// 更新元素属性
const updateElementProperty = (property: string, value: string) => {
  if (!selectedElement.value) return

  try {
    const businessObject = selectedElement.value.businessObject
    if (!businessObject) {
      console.warn('businessObject不存在，无法更新属性')
      return
    }

    // 直接操作 businessObject，这是最可靠的方法
    switch (property) {
      case 'name':
        businessObject.name = value
        // 更新显示标签
        if (selectedElement.value.label) {
          selectedElement.value.label.text = value
        }
        break
      case 'assignee':
        setFlowableAttribute(businessObject, 'assignee', value)
        break
      case 'candidateUsers':
        setFlowableAttribute(businessObject, 'candidateUsers', value)
        break
      case 'candidateGroups':
        setFlowableAttribute(businessObject, 'candidateGroups', value)
        break
      case 'conditionExpression':
        businessObject.conditionExpression = value
        break
    }

    console.log(`属性更新成功: ${property} = ${value}`)
  } catch (error) {
    console.error('更新元素属性失败:', error)
  }
}

// 监听属性表单变化
const handlePropertyChange = (property: string) => {
  // 使用nextTick确保DOM更新完成后再处理属性更新
  nextTick(() => {
    updateElementProperty(property, (elementProperties as any)[property])
  })
}

const ensureFlowableNamespace = (xmlDoc: Document) => {
  const definitions =
    xmlDoc.getElementsByTagName('bpmn:definitions')[0] ||
    xmlDoc.getElementsByTagName('definitions')[0]

  if (!definitions) {
    console.warn('definitions不存在，无法设置flowable命名空间')
    return
  }

  if (!definitions.getAttribute('xmlns:flowable')) {
    definitions.setAttribute('xmlns:flowable', 'http://flowable.org/bpmn')
  }
}



const findXmlElementById = (xmlDoc: Document, element: any) => {
  const possibleTagNames = [
    element.type,
    element.type.replace('bpmn:', ''),
    'bpmn:' + element.type.replace('bpmn:', '')
  ]

  for (const tagName of possibleTagNames) {
    const xmlElements = xmlDoc.getElementsByTagName(tagName)
    for (let i = 0; i < xmlElements.length; i++) {
      const xmlElement = xmlElements[i] as Element
      if (xmlElement.getAttribute('id') == element.id) {
        return xmlElement
      }
    }
  }

  const allElements = xmlDoc.getElementsByTagName('*')
  for (let i = 0; i < allElements.length; i++) {
    const xmlElement = allElements[i] as Element
    if (xmlElement.getAttribute('id') === element.id) {
      return xmlElement
    }
  }

  return null
}

const setOrRemoveAttribute = (targetElement: Element, attrName: string, value: string) => {
  if (value) {
    targetElement.setAttribute(attrName, value)
  } else {
    targetElement.removeAttribute(attrName)
  }
}

const addAssignmentConfigToXml = (xmlDoc: Document) => {
  try {
    ensureFlowableNamespace(xmlDoc)

    const elementRegistry = modeler?.get('elementRegistry')
    if (!elementRegistry) return

    const elements = elementRegistry.getAll()
    elements.forEach((element: any) => {
      if (element.type !== 'bpmn:UserTask') return

      const businessObject = element.businessObject
      const assignee = getFlowableAttribute(businessObject, 'assignee')
      const candidateUsers = getFlowableAttribute(businessObject, 'candidateUsers')
      const candidateGroups = getFlowableAttribute(businessObject, 'candidateGroups')

      const targetElement = findXmlElementById(xmlDoc, element)
      if (!targetElement) return

      setOrRemoveAttribute(targetElement, 'flowable:assignee', assignee)
      setOrRemoveAttribute(targetElement, 'flowable:candidateUsers', candidateUsers)
      setOrRemoveAttribute(targetElement, 'flowable:candidateGroups', candidateGroups)
    })
  } catch (error) {
    console.error('add assignment attributes failed:', error)
  }
}

const removeExistingListeners = (extensionElements: Element, listenerType: 'task' | 'execution') => {
  const tagNames = listenerType === 'task'
    ? ['flowable:taskListener', 'taskListener']
    : ['flowable:executionListener', 'executionListener']

  Array.from(extensionElements.childNodes).forEach((child) => {
    if (child.nodeType !== 1) return
    const element = child as Element
    if (tagNames.includes(element.tagName)) {
      extensionElements.removeChild(element)
    }
  })
}

const ensureExtensionElements = (xmlDoc: Document, targetElement: Element) => {
  let extensionElements = null
  const childNodes = targetElement.childNodes

  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i] as Element
    if (child.tagName === 'bpmn:extensionElements' || child.tagName === 'extensionElements') {
      extensionElements = child
      break
    }
  }

  if (!extensionElements) {
    extensionElements = xmlDoc.createElement('bpmn:extensionElements')
  }

  const firstElementChild = targetElement.firstElementChild
  if (firstElementChild && firstElementChild !== extensionElements) {
    targetElement.insertBefore(extensionElements, firstElementChild)
  } else if (!firstElementChild) {
    targetElement.appendChild(extensionElements)
  }

  return extensionElements
}

// 添加监听器配置到XML
const addListenerConfigToXml = (xmlDoc: Document) => {
  try {
    console.log('=== 添加监听器配置到XML ===')

    ensureFlowableNamespace(xmlDoc)
    
    // 获取所有元素
    const elementRegistry = modeler?.get('elementRegistry')
    if (!elementRegistry) {
      console.warn('elementRegistry不存在')
      return
    }
    
    const elements = elementRegistry.getAll()
    console.log('找到元素数量:', elements.length)
    
    elements.forEach((element: any) => {
      // 检查元素是否有监听器配置
      if (element.listenerConfig) {
        console.log('处理元素:', element.id, element.listenerConfig)
        
        // 查找XML中的对应元素 - 使用更通用的查找方式
        let targetElement = null
        
        // 尝试多种可能的标签名
        const possibleTagNames = [
          element.type,
          element.type.replace('bpmn:', ''),
          'bpmn:' + element.type.replace('bpmn:', '')
        ]
        
        for (const tagName of possibleTagNames) {
          const xmlElements = xmlDoc.getElementsByTagName(tagName)
          for (let i = 0; i < xmlElements.length; i++) {
            const xmlElement = xmlElements[i] as Element
            if (xmlElement.getAttribute('id') === element.id) {
              targetElement = xmlElement
              console.log('找到XML元素:', tagName, xmlElement.getAttribute('id'))
              break
            }
          }
          if (targetElement) break
        }
        
        // 如果还没找到，尝试通过id属性查找所有元素
        if (!targetElement) {
          const allElements = xmlDoc.getElementsByTagName('*')
          for (let i = 0; i < allElements.length; i++) {
            const xmlElement = allElements[i] as Element
            if (xmlElement.getAttribute('id') === element.id) {
              targetElement = xmlElement
              console.log('通过id找到XML元素:', xmlElement.tagName)
              break
            }
          }
        }
        
        if (targetElement) {
          const extensionElements = ensureExtensionElements(xmlDoc, targetElement)
          const listenerConfig = element.listenerConfig
          if (!listenerConfig) return

          const listeners: Array<{ type: string; event: string; delegate: string }> =
            Array.isArray(listenerConfig.listeners) && listenerConfig.listeners.length
              ? listenerConfig.listeners
              : listenerConfig.type
                ? [{
                    type: listenerConfig.type,
                    event: listenerConfig.event,
                    delegate: listenerConfig.delegate
                  }]
                : []

          // 先清掉旧的 task/execution listener，再写入多条
          removeExistingListeners(extensionElements, 'task')
          removeExistingListeners(extensionElements, 'execution')
          if (listenerConfig.enable === false || !listeners.length) return

          listeners.forEach((cfg) => {
            if (!cfg?.type || !cfg?.delegate) return
            let listenerElement
            if (cfg.type === 'task') {
              listenerElement = xmlDoc.createElement('flowable:taskListener')
            } else if (cfg.type === 'execution') {
              listenerElement = xmlDoc.createElement('flowable:executionListener')
            }
            if (!listenerElement) return
            listenerElement.setAttribute('event', cfg.event || 'create')
            listenerElement.setAttribute('delegateExpression', cfg.delegate)
            extensionElements.appendChild(listenerElement)
          })
        } else {
          console.warn('未找到对应的XML元素:', element.id, element.type)
        }
      }
    })
    
    console.log('=== 监听器配置添加完成 ===')
    
  } catch (error: any) {
    console.error('添加监听器配置到XML失败:', error)
  }
}
const getNodeActions = () => {
  if (!modeler) return []

  const nodeActions: any[] = []
  const elementRegistry = modeler.get('elementRegistry')
  
  // 获取所有元素
  const elements = elementRegistry.getAll()
  
  // 过滤出需要处理的节点（排除连线、标签等）
  elements.forEach((element: any) => {
    if (element.type && (
      element.type.includes('Task') || 
      element.type.includes('Event') || 
      element.type.includes('Gateway')
    )) {
      const businessObject = element.businessObject
      
      // 创建节点动作数据
      const nodeAction = {
        nodeId: element.id,
        nodeName: businessObject.name || element.id,
        eventType: getEventType(element.type),
        actionType: getActionType(element.type),
        actionConfig: getActionConfig(element)
      }
      
      nodeActions.push(nodeAction)
    }
  })
  
  return nodeActions
}

// 获取事件类型
const getEventType = (elementType: string) => {
  if (elementType.includes('StartEvent')) return 'process_start'
  if (elementType.includes('EndEvent')) return 'process_end'
  return 'task_create'
}

// 获取动作类型
const getActionType = (elementType: string) => {
  if (elementType.includes('UserTask')) return 'user_task'
  if (elementType.includes('ServiceTask')) return 'service_task'
  if (elementType.includes('ScriptTask')) return 'script_task'
  if (elementType.includes('ReceiveTask')) return 'receive_task'
  if (elementType.includes('SendTask')) return 'send_task'
  if (elementType.includes('ManualTask')) return 'manual_task'
  if (elementType.includes('BusinessRuleTask')) return 'business_rule_task'
  return 'default'
}

// 获取动作配置
const getActionConfig = (element: any) => {
  const businessObject = element.businessObject
  const config: any = {}
  
  // 添加配置信息
  const assignee = getFlowableAttribute(businessObject, 'assignee')
  if (assignee) {
    config.assignee = assignee
  }
  const candidateUsers = getFlowableAttribute(businessObject, 'candidateUsers')
  if (candidateUsers) {
    config.candidateUsers = candidateUsers
  }
  const candidateGroups = getFlowableAttribute(businessObject, 'candidateGroups')
  if (candidateGroups) {
    config.candidateGroups = candidateGroups
  }
  if (businessObject.conditionExpression) {
    config.conditionExpression = businessObject.conditionExpression
  }
  
  return JSON.stringify(config)
}

const buildBpmnXml = async () => {
  if (!modeler) return ''

  const { xml } = await modeler.saveXML({ format: true })

  let updatedXml = xml
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xml, 'text/xml')

    const processElements = xmlDoc.getElementsByTagName('bpmn:process')
    if (processElements.length > 0) {
      const processElement = processElements[0] as Element
      if (modelInfo.modelKey) {
        processElement.setAttribute('id', modelInfo.modelKey)
      }
      if (modelInfo.modelName) {
        processElement.setAttribute('name', modelInfo.modelName)
      }
      processElement.setAttribute('isExecutable', modelInfo.isExecutable.toString())
    }

    addListenerConfigToXml(xmlDoc)

    addAssignmentConfigToXml(xmlDoc)

    const serializer = new XMLSerializer()
    updatedXml = serializer.serializeToString(xmlDoc)
  } catch (xmlError) {
    console.warn('修改XML失败，使用原始XML:', xmlError)
  }

  return updatedXml
}

const saveModel = async () => {
  if (!modeler) return

  try {
    if (!modelInfo.modelKey) {
      ElMessage.warning('请输入模型Key')
      return
    }
    if (!modelInfo.modelName) {
      ElMessage.warning('请输入模型名称')
      return
    }

    saveLoading.value = true

    const updatedXml = await buildBpmnXml()

    // 获取节点数据
    const nodeActions = getNodeActions()

    const modelData: FlowableModelDetail = {
      ...modelInfo,
      bpmnXml: updatedXml,
      nodeActions: nodeActions
    }

    const savedId = await saveFlowableModel(modelData)
    if (savedId) {
      modelInfo.id = savedId as any
    }
    ElMessage.success('模型保存成功')

  } catch (error) {
    console.error('保存模型失败:', error)
    ElMessage.error('保存模型失败')
  } finally {
    saveLoading.value = false
  }
}

const publishModel = async () => {
  if (!modeler) return

  try {
    if (!modelInfo.modelKey) {
      ElMessage.warning('请输入模型Key')
      return
    }
    if (!modelInfo.modelName) {
      ElMessage.warning('请输入模型名称')
      return
    }

    publishLoading.value = true

    const xml = await buildBpmnXml()

    const modelData: FlowableModelDetail = {
      ...modelInfo,
      bpmnXml: xml
    }

    const savedId = await saveFlowableModel(modelData)
    if (savedId) {
      modelInfo.id = savedId as any
      await publishFlowableModel(savedId as any)
    }

    ElMessage.success('模型发布成功')

  } catch (error) {
    console.error('发布模型失败:', error)
    ElMessage.error('发布模型失败')
  } finally {
    publishLoading.value = false
  }
}

const getModelPayload = async (): Promise<{ bpmnXml: string; nodeActions: FlowableNodeAction[] }> => {
  const bpmnXml = await buildBpmnXml()
  const nodeActions = getNodeActions()
  return { bpmnXml, nodeActions }
}

defineExpose({ getModelPayload })

const previewProcess = async () => {
  if (!modeler) return

  try {
    const { xml } = await modeler.saveXML({ format: true })

    previewVisible.value = true

    await nextTick()

    if (!previewCanvasRef.value) return

    // 创建预览建模器
    if (!previewModeler) {
      previewModeler = new BpmnModeler({
        container: previewCanvasRef.value,
        additionalModules: [
          customTranslateModule
        ]
      })
    }

    await previewModeler.importXML(xml)

    // 适配视图
    const canvas = previewModeler.get('canvas')
    canvas.zoom('fit-viewport')

  } catch (error) {
    console.error('预览失败:', error)
    ElMessage.error('预览失败')
  }
}

// 生命周期
onMounted(async () => {
  console.log('ProcessDesigner 组件已挂载')
  
  await nextTick()
  
  console.log('DOM渲染完成，检查 canvasRef:', canvasRef.value)
  
  if (!canvasRef.value) {
    console.error('canvasRef 未找到，DOM元素可能未正确渲染')
    ElMessage.error('设计器容器未找到')
    return
  }
  
  try {
    applyIncomingModelInfo(props.modelInfo)
    await loadRoles()
    await initModeler()
    console.log('流程设计器初始化成功')
  } catch (error) {
    console.error('流程设计器初始化失败:', error)
    ElMessage.error('流程设计器初始化失败')
  }
})

watch(() => props.modelInfo, (value) => {
  applyIncomingModelInfo(value)
}, { deep: true })

watch(() => props.initialBpmnXml, async (value) => {
  if (!modeler) return
  await loadDiagram(value)
})

onUnmounted(() => {
  if (modeler) {
    modeler.destroy()
  }
  if (previewModeler) {
    previewModeler.destroy()
  }
})
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
    
    .editor-canvas {
      height: 500px;
      background: #fff;
      
      :deep(.bjs-container) {
        height: 100%;
      }
    }
  }
  
  .properties-panel {
    margin-top: 20px;
    min-height: 220px;

    .listener-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .listener-count {
        font-size: 12px;
        color: #909399;
      }
    }

    .listener-row {
      border: 1px solid #ebeef5;
      border-radius: 6px;
      padding: 8px 10px 0;
      margin-bottom: 10px;
      background: #fafafa;

      .listener-row-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #606266;
      }
    }

    .el-card {
      max-width: 400px;
    }
  }

  .properties-panel.is-hidden {
    visibility: hidden;
    pointer-events: none;
  }
  
  .preview-canvas {
    height: 400px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    
    :deep(.bjs-container) {
      height: 100%;
    }
  }
}
</style>
