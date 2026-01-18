<template>
  <div class="node-action-config">
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>节点动作配置</span>
          <el-button type="primary" @click="addAction">添加动作</el-button>
        </div>
      </template>
      
      <div class="action-list">
        <div v-for="(action, index) in actions" :key="index" class="action-item">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="事件类型">
                <el-select v-model="action.eventType" placeholder="选择事件类型">
                  <el-option label="创建" value="task_create" />
                  <el-option label="完成" value="task_complete" />
                  <el-option label="分配" value="assignment" />
                  <el-option label="删除" value="delete" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="动作类型">
                <el-select v-model="action.actionType" placeholder="选择动作类型" @change="onActionTypeChange(action)">
                  <el-option label="审批" value="approval" />
                  <el-option label="通知" value="notification" />
                  <el-option label="服务调用" value="service" />
                  <el-option label="脚本执行" value="script" />
                  <el-option label="HTTP请求" value="http" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item label="动作名称">
                <el-input v-model="action.actionName" placeholder="输入动作名称" />
              </el-form-item>
            </el-col>
            <el-col :span="2">
              <el-button type="danger" @click="removeAction(index)" circle>
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-col>
          </el-row>
          
          <!-- 动作参数配置 -->
          <div class="action-params" v-if="action.actionType">
            <el-divider content-position="left">动作参数</el-divider>
            
            <!-- 审批动作参数 -->
            <template v-if="action.actionType === 'approval'">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="审批类型">
                    <el-select v-model="action.params.approvalType">
                      <el-option label="自动审批" value="auto" />
                      <el-option label="手动审批" value="manual" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="默认结果">
                    <el-select v-model="action.params.defaultResult">
                      <el-option label="通过" value="approved" />
                      <el-option label="驳回" value="rejected" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
            </template>
            
            <!-- 通知动作参数 -->
            <template v-if="action.actionType === 'notification'">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="通知类型">
                    <el-select v-model="action.params.notificationType">
                      <el-option label="邮件" value="email" />
                      <el-option label="短信" value="sms" />
                      <el-option label="钉钉" value="dingtalk" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="收件人">
                    <el-input v-model="action.params.recipient" placeholder="输入收件人" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="消息内容">
                <el-input 
                  v-model="action.params.message" 
                  type="textarea" 
                  :rows="3"
                  placeholder="输入消息内容"
                />
              </el-form-item>
            </template>
            
            <!-- 服务调用参数 -->
            <template v-if="action.actionType === 'service'">
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-form-item label="服务名称">
                    <el-input v-model="action.params.serviceName" placeholder="输入服务名称" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="方法名称">
                    <el-input v-model="action.params.methodName" placeholder="输入方法名称" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="超时时间">
                    <el-input-number v-model="action.params.timeout" :min="1000" :max="30000" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="方法参数">
                <el-input 
                  v-model="action.params.methodParams" 
                  type="textarea" 
                  :rows="3"
                  placeholder='输入JSON格式参数，例如：{"param1": "value1"}'
                />
              </el-form-item>
            </template>
            
            <!-- 脚本执行参数 -->
            <template v-if="action.actionType === 'script'">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="脚本类型">
                    <el-select v-model="action.params.scriptType">
                      <el-option label="JavaScript" value="javascript" />
                      <el-option label="Groovy" value="groovy" />
                      <el-option label="Python" value="python" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="执行超时">
                    <el-input-number v-model="action.params.scriptTimeout" :min="1000" :max="60000" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="脚本内容">
                <el-input 
                  v-model="action.params.scriptContent" 
                  type="textarea" 
                  :rows="5"
                  placeholder="输入脚本内容"
                />
              </el-form-item>
            </template>
            
            <!-- HTTP请求参数 -->
            <template v-if="action.actionType === 'http'">
              <el-row :gutter="20">
                <el-col :span="8">
                  <el-form-item label="请求URL">
                    <el-input v-model="action.params.url" placeholder="输入请求URL" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="请求方法">
                    <el-select v-model="action.params.method">
                      <el-option label="GET" value="GET" />
                      <el-option label="POST" value="POST" />
                      <el-option label="PUT" value="PUT" />
                      <el-option label="DELETE" value="DELETE" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="超时时间">
                    <el-input-number v-model="action.params.timeout" :min="1000" :max="30000" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="请求头">
                <el-input 
                  v-model="action.params.headers" 
                  type="textarea" 
                  :rows="2"
                  placeholder='输入JSON格式请求头，例如：{"Content-Type": "application/json"}'
                />
              </el-form-item>
              <el-form-item label="请求体">
                <el-input 
                  v-model="action.params.body" 
                  type="textarea" 
                  :rows="3"
                  placeholder="输入请求体内容"
                />
              </el-form-item>
            </template>
          </div>
        </div>
      </div>
      
      <div class="action-buttons" v-if="actions.length > 0">
        <el-button type="success" @click="saveActions">保存配置</el-button>
        <el-button @click="clearActions">清空配置</el-button>
        <el-button type="info" @click="previewConfig">预览配置</el-button>
      </div>
    </el-card>
    
    <!-- 配置预览对话框 -->
    <el-dialog v-model="previewVisible" title="配置预览" width="800px">
      <el-input 
        v-model="previewContent" 
        type="textarea" 
        :rows="20"
        readonly
      />
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyConfig">复制配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'

interface ActionParam {
  [key: string]: any
}

interface NodeAction {
  eventType: string
  actionType: string
  actionName: string
  params: ActionParam
}

const props = defineProps<{
  nodeId?: string
  modelId?: number
}>()

const emit = defineEmits<{
  (e: 'save', actions: NodeAction[]): void
  (e: 'change', actions: NodeAction[]): void
}>()

const actions = ref<NodeAction[]>([])
const previewVisible = ref(false)
const previewContent = ref('')

// 添加动作
const addAction = () => {
  actions.value.push({
    eventType: 'task_create',
    actionType: '',
    actionName: '',
    params: {}
  })
}

// 移除动作
const removeAction = (index: number) => {
  actions.value.splice(index, 1)
}

// 动作类型改变时初始化参数
const onActionTypeChange = (action: NodeAction) => {
  action.params = {}
  
  switch (action.actionType) {
    case 'approval':
      action.params = {
        approvalType: 'auto',
        defaultResult: 'approved'
      }
      break
    case 'notification':
      action.params = {
        notificationType: 'email',
        recipient: '',
        message: ''
      }
      break
    case 'service':
      action.params = {
        serviceName: '',
        methodName: '',
        methodParams: '',
        timeout: 5000
      }
      break
    case 'script':
      action.params = {
        scriptType: 'javascript',
        scriptContent: '',
        scriptTimeout: 10000
      }
      break
    case 'http':
      action.params = {
        url: '',
        method: 'POST',
        headers: '{"Content-Type": "application/json"}',
        body: '',
        timeout: 5000
      }
      break
  }
}

// 保存配置
const saveActions = () => {
  // 验证配置
  for (const action of actions.value) {
    if (!action.actionType) {
      ElMessage.error('请选择动作类型')
      return
    }
    if (!action.actionName) {
      ElMessage.error('请输入动作名称')
      return
    }
  }
  
  emit('save', actions.value)
  ElMessage.success('配置保存成功')
}

// 清空配置
const clearActions = () => {
  actions.value = []
}

// 预览配置
const previewConfig = () => {
  previewContent.value = JSON.stringify(actions.value, null, 2)
  previewVisible.value = true
}

// 复制配置
const copyConfig = () => {
  navigator.clipboard.writeText(previewContent.value)
  ElMessage.success('配置已复制到剪贴板')
}

// 监听动作变化
watch(actions, (newActions) => {
  emit('change', newActions)
}, { deep: true })
</script>

<style scoped>
.node-action-config {
  margin: 20px 0;
}

.config-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-list {
  max-height: 600px;
  overflow-y: auto;
}

.action-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fafafa;
}

.action-params {
  margin-top: 15px;
  padding: 15px;
  background-color: #fff;
  border-radius: 4px;
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}

.action-buttons .el-button {
  margin: 0 10px;
}
</style>
