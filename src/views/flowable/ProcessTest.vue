<template>
  <div class="process-test">
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <span>动态流程测试</span>
          <el-button type="primary" @click="runTest">运行测试</el-button>
        </div>
      </template>

      <el-steps :active="currentStep" align-center>
        <el-step title="创建流程模型" description="设计BPMN流程图" />
        <el-step title="配置节点动作" description="设置节点触发事件" />
        <el-step title="部署流程" description="部署到Flowable引擎" />
        <el-step title="启动流程实例" description="执行流程测试" />
        <el-step title="验证结果" description="检查执行结果" />
      </el-steps>

      <div class="test-content">
        <!-- 步骤1: 创建流程模型 -->
        <div v-if="currentStep === 0" class="step-content">
          <h3>步骤1: 创建流程模型</h3>
          <el-form :model="testData.model" label-width="120px">
            <el-form-item label="模型名称">
              <el-input v-model="testData.model.modelName" placeholder="输入模型名称" />
            </el-form-item>
            <el-form-item label="模型Key">
              <el-input v-model="testData.model.modelKey" placeholder="输入模型Key" />
            </el-form-item>
            <el-form-item label="分类">
              <DictSelect
                v-model="testData.model.category"
                type="flowable_type"
                valueField="value"
                labelField="label"
                placeholder="请选择流程类型"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
          
          <div class="bpmn-preview">
            <h4>BPMN流程预览</h4>
            <pre>{{ sampleBpmnXml }}</pre>
          </div>
          
          <el-button type="primary" @click="nextStep">下一步</el-button>
        </div>

        <!-- 步骤2: 配置节点动作 -->
        <div v-if="currentStep === 1" class="step-content">
          <h3>步骤2: 配置节点动作</h3>
          
          <el-tabs v-model="activeTab">
            <el-tab-pane label="开始节点动作" name="start">
              <NodeActionConfig 
                node-id="StartEvent_1"
                :model-id="testData.model.id"
                @save="handleSaveNodeActions"
              />
            </el-tab-pane>
            <el-tab-pane label="用户任务动作" name="userTask">
              <NodeActionConfig 
                node-id="UserTask_1"
                :model-id="testData.model.id"
                @save="handleSaveNodeActions"
              />
            </el-tab-pane>
            <el-tab-pane label="服务任务动作" name="serviceTask">
              <NodeActionConfig 
                node-id="ServiceTask_1"
                :model-id="testData.model.id"
                @save="handleSaveNodeActions"
              />
            </el-tab-pane>
          </el-tabs>
          
          <div class="step-buttons">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" @click="nextStep">下一步</el-button>
          </div>
        </div>

        <!-- 步骤3: 部署流程 -->
        <div v-if="currentStep === 2" class="step-content">
          <h3>步骤3: 部署流程</h3>
          
          <el-form :model="testData.deployment" label-width="120px">
            <el-form-item label="部署名称">
              <el-input v-model="testData.deployment.deploymentName" placeholder="输入部署名称" />
            </el-form-item>
            <el-form-item label="分类">
              <DictSelect
                v-model="testData.deployment.category"
                type="flowable_type"
                valueField="value"
                labelField="label"
                placeholder="请选择流程类型"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
          
          <div class="deployment-info">
            <h4>部署信息</h4>
            <p><strong>模型Key:</strong> {{ testData.model.modelKey }}</p>
            <p><strong>节点动作数量:</strong> {{ nodeActions.length }}</p>
            <p><strong>BPMN XML大小:</strong> {{ sampleBpmnXml.length }} 字符</p>
          </div>
          
          <div class="step-buttons">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" @click="deployProcess" :loading="deploying">部署流程</el-button>
          </div>
        </div>

        <!-- 步骤4: 启动流程实例 -->
        <div v-if="currentStep === 3" class="step-content">
          <h3>步骤4: 启动流程实例</h3>
          
          <el-form :model="testData.process" label-width="120px">
            <el-form-item label="业务Key">
              <el-input v-model="testData.process.businessKey" placeholder="输入业务Key" />
            </el-form-item>
            <el-form-item label="发起人">
              <el-input v-model="testData.process.startUser" placeholder="输入发起人" />
            </el-form-item>
            <el-form-item label="流程变量">
              <el-input 
                v-model="testData.process.variablesText" 
                type="textarea" 
                :rows="4"
                placeholder='输入JSON格式变量，例如：{"amount": 1000, "type": "leave"}'
              />
            </el-form-item>
          </el-form>
          
          <div class="process-info" v-if="processInstance">
            <h4>流程实例信息</h4>
            <p><strong>实例ID:</strong> {{ processInstance.id }}</p>
            <p><strong>流程定义Key:</strong> {{ processInstance.processDefinitionKey }}</p>
            <p><strong>业务Key:</strong> {{ processInstance.businessKey }}</p>
            <p><strong>开始时间:</strong> {{ processInstance.startTime }}</p>
            <p><strong>状态:</strong> {{ processInstance.status }}</p>
          </div>
          
          <div class="step-buttons">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="primary" @click="startProcess" :loading="starting">启动流程</el-button>
          </div>
        </div>

        <!-- 步骤5: 验证结果 -->
        <div v-if="currentStep === 4" class="step-content">
          <h3>步骤5: 验证结果</h3>
          
          <el-tabs v-model="resultTab">
            <el-tab-pane label="执行日志" name="logs">
              <div class="log-container">
                <div v-for="(log, index) in testResults.logs" :key="index" class="log-item">
                  <span class="log-time">{{ log.time }}</span>
                  <span class="log-level" :class="'log-' + log.level">{{ log.level }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="任务列表" name="tasks">
              <el-table :data="testResults.tasks" style="width: 100%">
                <el-table-column prop="id" label="任务ID" width="200" />
                <el-table-column prop="name" label="任务名称" width="150" />
                <el-table-column prop="assignee" label="处理人" width="120" />
                <el-table-column prop="createTime" label="创建时间" width="180" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="getStatusType(scope.row.status)">
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作">
                  <template #default="scope">
                    <el-button 
                      v-if="scope.row.status === 'active'" 
                      size="small" 
                      @click="completeTask(scope.row)"
                    >
                      完成
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="流程变量" name="variables">
              <el-descriptions :column="2" border>
                <el-descriptions-item 
                  v-for="(value, key) in testResults.variables" 
                  :key="key"
                  :label="key"
                >
                  {{ typeof value === 'object' ? JSON.stringify(value) : value }}
                </el-descriptions-item>
              </el-descriptions>
            </el-tab-pane>
          </el-tabs>
          
          <div class="step-buttons">
            <el-button @click="prevStep">上一步</el-button>
            <el-button type="success" @click="resetTest">重新测试</el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import DictSelect from '@/components/DictSelect.vue'
import NodeActionConfig from '@/components/flowable/NodeActionConfig.vue'
import { 
  deployBpmnWithActions, 
  startFlowableProcess, 
  getTodoTasksByPage,
  completeFlowableTask 
} from '@/api/flowable'

const currentStep = ref(0)
const activeTab = ref('start')
const resultTab = ref('logs')
const deploying = ref(false)
const starting = ref(false)

const testData = reactive({
  model: {
    id: 1,
    modelName: '测试请假流程',
    modelKey: 'test_leave_process',
    category: '请假流程'
  },
  deployment: {
    deploymentName: '测试请假流程部署',
    category: '请假流程'
  },
  process: {
    businessKey: 'LEAVE_001',
    startUser: 'test_user',
    variablesText: '{"amount": 1000, "type": "leave", "days": 3}'
  }
})

const nodeActions = ref([])
const processInstance = ref(null)
const testResults = reactive({
  logs: [],
  tasks: [],
  variables: {}
})

// 示例BPMN XML
const sampleBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="test_leave_process" name="测试请假流程" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="开始">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    
    <bpmn:userTask id="UserTask_1" name="请假申请">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    
    <bpmn:serviceTask id="ServiceTask_1" name="审批处理" flowable:delegateExpression="${dynamicActionDelegate}">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:serviceTask>
    
    <bpmn:endEvent id="EndEvent_1" name="结束">
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:endEvent>
    
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="ServiceTask_1" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="ServiceTask_1" targetRef="EndEvent_1" />
  </bpmn:process>
</bpmn:definitions>`

const nextStep = () => {
  if (currentStep.value < 4) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const handleSaveNodeActions = (actions: any[]) => {
  nodeActions.value = actions
  addLog('info', `保存了 ${actions.length} 个节点动作配置`)
}

const deployProcess = async () => {
  deploying.value = true
  try {
    const deployData = {
      bpmnXml: sampleBpmnXml,
      deploymentName: testData.deployment.deploymentName,
      category: testData.deployment.category,
      nodeActions: nodeActions.value
    }
    
    const result = await deployBpmnWithActions(deployData)
    addLog('success', `流程部署成功: ${result.id}`)
    nextStep()
  } catch (error) {
    addLog('error', `流程部署失败: ${error.message}`)
  } finally {
    deploying.value = false
  }
}

const startProcess = async () => {
  starting.value = true
  try {
    let variables = {}
    if (testData.process.variablesText) {
      variables = JSON.parse(testData.process.variablesText)
    }
    
    const processData = {
      processDefinitionKey: testData.model.modelKey,
      businessKey: testData.process.businessKey,
      variables
    }
    
    const instanceId = await startFlowableProcess(processData)
    processInstance.value = {
      id: instanceId,
      processDefinitionKey: testData.model.modelKey,
      businessKey: testData.process.businessKey,
      startTime: new Date().toISOString(),
      status: 'running'
    }
    
    addLog('success', `流程实例启动成功: ${instanceId}`)
    nextStep()
    
    // 加载任务列表
    await loadTasks()
  } catch (error) {
    addLog('error', `流程启动失败: ${error.message}`)
  } finally {
    starting.value = false
  }
}

const loadTasks = async () => {
  try {
    const result = await getTodoTasksByPage({ page: 1, size: 10 })
    testResults.tasks = result.records || []
    addLog('info', `加载到 ${testResults.tasks.length} 个待办任务`)
  } catch (error) {
    addLog('error', `加载任务失败: ${error.message}`)
  }
}

const completeTask = async (task: any) => {
  try {
    await completeFlowableTask({
      taskId: task.id,
      comment: '测试完成',
      variables: {}
    })
    addLog('success', `任务完成: ${task.name}`)
    await loadTasks()
  } catch (error) {
    addLog('error', `任务完成失败: ${error.message}`)
  }
}

const addLog = (level: string, message: string) => {
  testResults.logs.push({
    time: new Date().toLocaleTimeString(),
    level,
    message
  })
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'active': return 'warning'
    case 'completed': return 'success'
    case 'deleted': return 'danger'
    default: return 'info'
  }
}

const resetTest = () => {
  currentStep.value = 0
  nodeActions.value = []
  processInstance.value = null
  testResults.logs = []
  testResults.tasks = []
  testResults.variables = {}
}

const runTest = async () => {
  resetTest()
  
  // 模拟完整的测试流程
  addLog('info', '开始运行完整测试流程')
  
  // 自动执行所有步骤
  for (let i = 0; i < 5; i++) {
    currentStep.value = i
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    switch (i) {
      case 1:
        // 模拟配置节点动作
        nodeActions.value = [
          {
            nodeId: 'UserTask_1',
            eventType: 'create',
            actionType: 'notification',
            actionConfig: JSON.stringify({
              notificationType: 'email',
              recipient: 'test@example.com',
              message: '您有新的请假申请需要处理'
            })
          }
        ]
        addLog('info', '自动配置节点动作')
        break
      case 2:
        // 模拟部署流程
        addLog('success', '自动部署流程成功')
        break
      case 3:
        // 模拟启动流程
        processInstance.value = {
          id: 'test_instance_001',
          processDefinitionKey: testData.model.modelKey,
          businessKey: testData.process.businessKey,
          startTime: new Date().toISOString(),
          status: 'running'
        }
        addLog('success', '自动启动流程实例')
        break
      case 4:
        // 模拟验证结果
        testResults.tasks = [
          {
            id: 'task_001',
            name: '请假申请',
            assignee: 'manager',
            createTime: new Date().toISOString(),
            status: 'active'
          }
        ]
        testResults.variables = {
          amount: 1000,
          type: 'leave',
          days: 3,
          approvalResult: 'approved',
          notificationSent: true
        }
        addLog('success', '测试流程完成')
        break
    }
  }
}
</script>

<style scoped>
.process-test {
  padding: 20px;
}

.test-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-content {
  margin-top: 30px;
}

.step-content {
  min-height: 400px;
  padding: 20px;
}

.step-buttons {
  margin-top: 30px;
  text-align: center;
}

.step-buttons .el-button {
  margin: 0 10px;
}

.bpmn-preview {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.bpmn-preview pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.deployment-info,
.process-info {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  background-color: #1e1e1e;
  border-radius: 4px;
}

.log-item {
  font-family: monospace;
  margin-bottom: 5px;
  color: #ffffff;
}

.log-time {
  color: #888;
  margin-right: 10px;
}

.log-level {
  margin-right: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.log-info { background-color: #17a2b8; }
.log-success { background-color: #28a745; }
.log-warning { background-color: #ffc107; color: #000; }
.log-error { background-color: #dc3545; }

.log-message {
  color: #ffffff;
}
</style>
