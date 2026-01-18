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
              <el-input v-model="elementProperties.assignee" placeholder="请输入处理人" @input="() => handlePropertyChange('assignee')" />
            </el-form-item>
            <el-form-item label="候选用户" v-if="isUserTask">
              <el-input v-model="elementProperties.candidateUsers" placeholder="请输入候选用户" @input="() => handlePropertyChange('candidateUsers')" />
            </el-form-item>
            <el-form-item label="候选组" v-if="isUserTask">
              <el-input v-model="elementProperties.candidateGroups" placeholder="请输入候选组" @input="() => handlePropertyChange('candidateGroups')" />
            </el-form-item>
            
            <!-- 监听器配置 -->
            <el-divider v-if="isUserTask || isStartEvent || isEndEvent">监听器配置</el-divider>
            <el-form-item label="启用监听器" v-if="isUserTask || isStartEvent || isEndEvent">
              <el-switch v-model="elementProperties.enableListener" @change="handleListenerToggle" />
            </el-form-item>
            <template v-if="(isUserTask || isStartEvent || isEndEvent) && elementProperties.enableListener">
              <el-form-item label="监听器类型">
                <el-select v-model="elementProperties.listenerType" placeholder="请选择监听器类型" @change="handleListenerTypeChange">
                  <el-option label="任务监听器" value="task" v-if="isUserTask" />
                  <el-option label="执行监听器" value="execution" v-if="isStartEvent || isEndEvent" />
                </el-select>
              </el-form-item>
              <el-form-item label="监听事件">
                <el-select v-model="elementProperties.listenerEvent" placeholder="请选择监听事件" @change="handleListenerEventChange">
                  <!-- 任务监听器事件 -->
                  <template v-if="isUserTask">
                    <el-option label="创建" value="create" />
                    <el-option label="分配" value="assignment" />
                    <el-option label="完成" value="complete" />
                    <el-option label="删除" value="delete" />
                  </template>
                  <!-- 执行监听器事件 -->
                  <template v-if="isStartEvent">
                    <el-option label="开始" value="start" />
                  </template>
                  <template v-if="isEndEvent">
                    <el-option label="结束" value="end" />
                  </template>
                </el-select>
              </el-form-item>
              <el-form-item label="监听器实现">
                <el-select v-model="elementProperties.listenerDelegate" placeholder="请选择监听器实现" @change="handleListenerDelegateChange">
                  <el-option label="Flowable任务监听器" value="${flowableTaskListener}" v-if="isUserTask" />
                  <el-option label="Flowable执行监听器" value="${flowableExecutionListener}" v-if="isStartEvent || isEndEvent" />
                </el-select>
              </el-form-item>
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
  conditionExpression: '',
  // 监听器配置
  enableListener: false,
  listenerType: 'task',
  listenerEvent: 'create',
  listenerDelegate: '${flowableTaskListener}'
})

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
          // 清空属性表单
          Object.assign(elementProperties, {
            id: '',
            name: '',
            assignee: '',
            candidateUsers: '',
            candidateGroups: '',
            conditionExpression: '',
            // 监听器配置
            enableListener: false,
            listenerType: 'task',
            listenerEvent: 'create',
            listenerDelegate: '${flowableTaskListener}'
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
      // 清空属性表单
      Object.assign(elementProperties, {
        id: '',
        name: '',
        assignee: '',
        candidateUsers: '',
        candidateGroups: '',
        conditionExpression: '',
        // 监听器配置
        enableListener: false,
        listenerType: 'task',
        listenerEvent: 'create',
        listenerDelegate: '${flowableTaskListener}'
      })
      return
    }

    const element = selectedElement.value
    const businessObject = element.businessObject

    if (!businessObject) {
      console.warn('businessObject不存在')
      return
    }

    const defaultListenerSettings = getDefaultListenerSettings()
    let listenerConfig = {
      enable: false,
      ...defaultListenerSettings
    }

    // 检查元素是否已有监听器配置
    if (selectedElement.value.listenerConfig) {
      listenerConfig = {
        enable: selectedElement.value.listenerConfig.enable !== false,
        ...selectedElement.value.listenerConfig
      }
    } else {
      const parsedConfig = parseListenerConfigFromBusinessObject(
        businessObject,
        defaultListenerSettings
      )
      if (parsedConfig) {
        listenerConfig = parsedConfig
        selectedElement.value.listenerConfig = { ...parsedConfig }
      }
    }

    Object.assign(elementProperties, {
      id: element.id || '',
      name: businessObject.name || '',
      assignee: businessObject.assignee || '',
      candidateUsers: businessObject.candidateUsers || '',
      candidateGroups: businessObject.candidateGroups || '',
      conditionExpression: businessObject.conditionExpression || '',
      // 监听器配置
      enableListener: listenerConfig.enable,
      listenerType: listenerConfig.type,
      listenerEvent: listenerConfig.event,
      listenerDelegate: listenerConfig.delegate
    })
  } catch (error) {
    console.error('更新元素属性失败:', error)
    // 清空属性表单作为备用方案
    Object.assign(elementProperties, {
      id: '',
      name: '',
      assignee: '',
      candidateUsers: '',
      candidateGroups: '',
      conditionExpression: '',
      // 监听器配置
      enableListener: false,
      listenerType: 'task',
      listenerEvent: 'create',
      listenerDelegate: '${flowableTaskListener}'
    })
  }
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
        businessObject.assignee = value
        break
      case 'candidateUsers':
        businessObject.candidateUsers = value
        break
      case 'candidateGroups':
        businessObject.candidateGroups = value
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

// 监听器相关方法
const handleListenerToggle = () => {
  try {
    console.log('=== 监听器开关切换 ===')
    console.log('selectedElement:', selectedElement.value)
    console.log('modeler:', modeler)
    console.log('enableListener:', elementProperties.enableListener)
    console.log('isUserTask:', isUserTask.value)
    console.log('isStartEvent:', isStartEvent.value)
    console.log('isEndEvent:', isEndEvent.value)
    
    if (!selectedElement.value || !modeler) {
      console.warn('缺少必要组件: selectedElement或modeler')
      return
    }
    
    // 直接保存监听器配置到元素属性中
    if (elementProperties.enableListener) {
      console.log('启用监听器')
      selectedElement.value.listenerConfig = {
        enable: true,
        type: isUserTask.value ? 'task' : 'execution',
        event: elementProperties.listenerEvent,
        delegate: elementProperties.listenerDelegate
      }
    } else {
      console.log('禁用监听器')
      selectedElement.value.listenerConfig = {
        enable: false,
        type: elementProperties.listenerType,
        event: elementProperties.listenerEvent,
        delegate: elementProperties.listenerDelegate
      }
    }
    
    console.log('监听器配置已保存到元素属性')
    console.log('=== 监听器开关切换完成 ===')
    
  } catch (error: any) {
    console.error('监听器开关切换失败:', error)
    console.error('错误堆栈:', error.stack)
  }
}

const handleListenerTypeChange = () => {
  // 根据节点类型设置默认值
  const defaults = getDefaultListenerSettings()
  elementProperties.listenerType = defaults.type
  elementProperties.listenerEvent = defaults.event
  elementProperties.listenerDelegate = defaults.delegate

  if (!selectedElement.value || !elementProperties.enableListener) return

  if (!selectedElement.value.listenerConfig) {
    selectedElement.value.listenerConfig = { enable: true, ...defaults }
  } else {
    selectedElement.value.listenerConfig.type = defaults.type
    selectedElement.value.listenerConfig.event = defaults.event
    selectedElement.value.listenerConfig.delegate = defaults.delegate
    selectedElement.value.listenerConfig.enable = true
  }
}

const handleListenerEventChange = () => {
  if (!selectedElement.value || !modeler || !elementProperties.enableListener) return
  
  // 更新元素中的监听器配置
  if (selectedElement.value.listenerConfig) {
    selectedElement.value.listenerConfig.event = elementProperties.listenerEvent
  }
}

const handleListenerDelegateChange = () => {
  if (!selectedElement.value || !modeler || !elementProperties.enableListener) return
  
  // 更新元素中的监听器配置
  if (selectedElement.value.listenerConfig) {
    selectedElement.value.listenerConfig.delegate = elementProperties.listenerDelegate
  }
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
          console.log('找到XML元素:', targetElement.tagName)

          const extensionElements = ensureExtensionElements(xmlDoc, targetElement)
          
          // 根据监听器类型创建对应的监听器
          const listenerConfig = element.listenerConfig
          if (!listenerConfig || !listenerConfig.type) return

          removeExistingListeners(extensionElements, listenerConfig.type)
          if (listenerConfig.enable === false) return

          let listenerElement
          if (listenerConfig.type === 'task') {
            listenerElement = xmlDoc.createElement('flowable:taskListener')
            listenerElement.setAttribute('event', listenerConfig.event)
            listenerElement.setAttribute('delegateExpression', listenerConfig.delegate)
          } else if (listenerConfig.type === 'execution') {
            listenerElement = xmlDoc.createElement('flowable:executionListener')
            listenerElement.setAttribute('event', listenerConfig.event)
            listenerElement.setAttribute('delegateExpression', listenerConfig.delegate)
          }
          
          if (listenerElement) {
            extensionElements.appendChild(listenerElement)
            console.log('监听器配置已添加到XML:', listenerElement.tagName)
            
            // 输出当前XML片段用于调试
            const serializer = new XMLSerializer()
            const xmlFragment = serializer.serializeToString(extensionElements)
            console.log('生成的XML片段:', xmlFragment)
          }
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
  if (businessObject.assignee) {
    config.assignee = businessObject.assignee
  }
  if (businessObject.candidateUsers) {
    config.candidateUsers = businessObject.candidateUsers
  }
  if (businessObject.candidateGroups) {
    config.candidateGroups = businessObject.candidateGroups
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

    await saveFlowableModel(modelData)
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
    await publishFlowableModel(savedId)

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
