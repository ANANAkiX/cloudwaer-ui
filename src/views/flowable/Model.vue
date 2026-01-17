<template>
  <div class="flowable-model">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>流程模型</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索模型名称/模型Key"
              clearable
              style="width: 260px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button type="primary" @click="handleAdd">新增</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" border style="width: 100%" v-loading="loading" table-layout="fixed">
        <el-table-column prop="modelKey" label="模型Key" min-width="180" />
        <el-table-column prop="modelName" label="模型名称" min-width="200" />
        <el-table-column prop="category" label="分类" min-width="140" />
        <el-table-column prop="version" label="版本" width="80" align="center" />
        <el-table-column prop="modelStatus" label="状态" width="120" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.modelStatus === 0" type="info">草稿</el-tag>
            <el-tag v-else-if="scope.row.modelStatus === 1" type="success">已发布</el-tag>
            <el-tag v-else-if="scope.row.modelStatus === 2" type="warning">已归档</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" min-width="180" />
        <el-table-column label="操作" width="260" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="warning" @click="handlePublish(scope.row)">发布</el-button>
            <el-button link type="success" @click="openStartDialog(scope.row)">启动流程</el-button>
            <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pageParams.current"
          v-model:page-size="pageParams.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pageResult.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="860px" @close="handleDialogClose">
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="110px">
        <el-form-item label="模型Key" prop="modelKey">
          <el-input v-model="formData.modelKey" placeholder="请输入模型Key" />
        </el-form-item>
        <el-form-item label="模型名称" prop="modelName">
          <el-input v-model="formData.modelName" placeholder="请输入模型名称" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-input v-model="formData.category" placeholder="请输入分类" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" placeholder="请输入备注" />
        </el-form-item>
        <el-form-item label="BPMN XML" prop="bpmnXml">
          <el-input
            v-model="formData.bpmnXml"
            class="clickable-textarea"
            type="textarea"
            :rows="8"
            readonly
            placeholder="点击打开BPMN设计器"
            @click="openModeler"
          />
        </el-form-item>
        <el-form-item label="节点动作JSON" prop="nodeActionsText">
          <el-input v-model="formData.nodeActionsText" type="textarea" :rows="6" placeholder="请输入节点动作 JSON 数组" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="modelerDialogVisible"
      title="BPMN 设计器"
      width="90%"
      class="modeler-dialog"
      :append-to-body="true"
      top="2vh"
    >
      <div class="modeler-wrapper">
        <Modeler
          :embedded="true"
          :initial-xml="formData.bpmnXml"
          :model-key="formData.modelKey"
          :initial-node-actions-text="formData.nodeActionsText"
          @export="handleModelerExport"
        />
      </div>
    </el-dialog>

    <el-dialog v-model="startDialogVisible" title="启动流程" width="720px" @close="handleStartDialogClose">
      <el-form ref="startFormRef" :model="startFormData" :rules="startRules" label-width="120px">
        <el-form-item label="流程定义Key" prop="processDefinitionKey">
          <el-input v-model="startFormData.processDefinitionKey" placeholder="请输入流程定义Key" />
        </el-form-item>
        <el-form-item label="流程定义名称" prop="processDefinitionName">
          <el-input v-model="startFormData.processDefinitionName" placeholder="请输入流程定义名称" />
        </el-form-item>
        <el-form-item label="业务Key" prop="businessKey">
          <el-input v-model="startFormData.businessKey" placeholder="请输入业务Key" />
        </el-form-item>
        <el-form-item label="变量JSON" prop="variablesText">
          <el-input v-model="startFormData.variablesText" type="textarea" :rows="6" placeholder="请输入变量JSON" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="startDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="startSubmitting" @click="handleStart">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessageBox, FormInstance } from 'element-plus'
import { message } from '@/api/request.ts'
import Modeler from './Modeler.vue'
import {
  deleteFlowableModel,
  getFlowableModelDetail,
  getFlowableModelsByPage,
  publishFlowableModel,
  saveFlowableModel,
  startFlowableProcess,
  type FlowableModelDetail,
  type FlowableModelListItem,
  type FlowableNodeAction
} from '@/api/flowable'

const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增模型')
const formRef = ref<FormInstance | null>(null)
const tableData = ref<FlowableModelListItem[]>([])
const searchKeyword = ref('')
const modelerDialogVisible = ref(false)
const startDialogVisible = ref(false)
const startFormRef = ref<FormInstance | null>(null)
const startSubmitting = ref(false)
const startFormData = ref({
  processDefinitionKey: '',
  processDefinitionName: '',
  businessKey: '',
  variablesText: ''
})
const startRules = {
  processDefinitionKey: [{ required: true, message: '请输入流程定义Key', trigger: 'blur' }],
  processDefinitionName: [{ required: true, message: '请输入流程定义名称', trigger: 'blur' }]
}

const pageParams = ref({
  current: 1,
  size: 10,
  keyword: ''
})

const pageResult = ref({
  records: [] as FlowableModelListItem[],
  total: 0,
  current: 1,
  size: 10,
  pages: 0
})

const formData = ref({
  id: undefined as string | number | undefined,
  modelKey: '',
  modelName: '',
  category: '',
  remark: '',
  bpmnXml: '',
  nodeActionsText: ''
})

const rules = {
  modelKey: [{ required: true, message: '请输入模型Key', trigger: 'blur' }],
  modelName: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
  bpmnXml: [{ required: true, message: '请输入 BPMN XML', trigger: 'blur' }]
}

const loadModels = async () => {
  loading.value = true
  try {
    const result = await getFlowableModelsByPage({
      current: pageParams.value.current,
      size: pageParams.value.size,
      keyword: pageParams.value.keyword || undefined
    })
    pageResult.value = result
    tableData.value = result.records || []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pageParams.value.current = 1
  pageParams.value.keyword = searchKeyword.value
  loadModels()
}

const handleSizeChange = (size: number) => {
  pageParams.value.size = size
  pageParams.value.current = 1
  loadModels()
}

const handleCurrentChange = (current: number) => {
  pageParams.value.current = current
  loadModels()
}

const handleAdd = () => {
  dialogTitle.value = '新增模型'
  resetForm()
  dialogVisible.value = true
}

const handleEdit = async (row: FlowableModelListItem) => {
  dialogTitle.value = '编辑模型'
  resetForm()
  const detail = await getFlowableModelDetail(row.id)
  formData.value = {
    id: detail.id,
    modelKey: detail.modelKey || '',
    modelName: detail.modelName || '',
    category: detail.category || '',
    remark: detail.remark || '',
    bpmnXml: detail.bpmnXml || '',
    nodeActionsText: detail.nodeActions ? JSON.stringify(detail.nodeActions, null, 2) : ''
  }
  dialogVisible.value = true
}

const handleDelete = async (row: FlowableModelListItem) => {
  try {
    await ElMessageBox.confirm('确认删除该模型？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteFlowableModel(row.id)
    message.success('删除成功')
    await loadModels()
  } catch (error) {
    if (error !== 'cancel') {
      // errors handled globally
    }
  }
}

const handlePublish = async (row: FlowableModelListItem) => {
  try {
    await ElMessageBox.confirm('确认发布该模型？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await publishFlowableModel(row.id)
    message.success('发布成功')
    loadModels()
  } catch (error) {
    if (error !== 'cancel') {
      // errors handled globally
    }
  }
}

const openStartDialog = (row: FlowableModelListItem, useApplyName: boolean = false) => {
  startFormData.value = {
    processDefinitionKey: row.modelKey || '',
    processDefinitionName: useApplyName ? (row.modelName || '') : '',
    businessKey: '',
    variablesText: ''
  }
  startDialogVisible.value = true
}

const handleStartDialogClose = () => {
  startFormData.value = {
    processDefinitionKey: '',
    processDefinitionName: '',
    businessKey: '',
    variablesText: ''
  }
  startFormRef.value?.resetFields()
}

const handleStart = async () => {
  if (!startFormRef.value) return
  await startFormRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      await ElMessageBox.confirm('确认启动流程？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch (error) {
      return
    }
    startSubmitting.value = true
    try {
      let variables: Record<string, any> | undefined
      if (startFormData.value.variablesText && startFormData.value.variablesText.trim()) {
        try {
          variables = JSON.parse(startFormData.value.variablesText)
        } catch (error) {
          message.error('变量 JSON 格式错误')
          return
        }
      }
      if (startFormData.value.processDefinitionName) {
        variables = {
          ...(variables || {}),
          processDefinitionName: startFormData.value.processDefinitionName
        }
      }
      await startFlowableProcess({
        processDefinitionKey: startFormData.value.processDefinitionKey,
        businessKey: startFormData.value.businessKey || undefined,
        variables
      })
      message.success('启动成功')
      startDialogVisible.value = false
    } finally {
      startSubmitting.value = false
    }
  })
}

const handleSubmit = async () => {
  if (!formRef.value) return
  formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      let nodeActions: FlowableNodeAction[] | undefined
      if (formData.value.nodeActionsText && formData.value.nodeActionsText.trim()) {
        try {
          const parsed = JSON.parse(formData.value.nodeActionsText)
          if (Array.isArray(parsed)) {
            nodeActions = parsed.map((item: any) => {
              if (item && (item.nodeId || item.actionType || item.actionConfig)) {
                return item
              }
              const actionParams = item?.actionParams ? JSON.stringify(item.actionParams) : ''
              return {
                nodeId: item?.taskId || '',
                nodeName: item?.nodeName || '',
                eventType: item?.eventType || 'start',
                actionType: item?.actionCode || '',
                actionConfig: actionParams
              }
            })
          } else if (parsed && Array.isArray(parsed.tasks)) {
            nodeActions = parsed.tasks.map((item: any) => ({
              nodeId: item?.taskId || '',
              nodeName: item?.nodeName || '',
              eventType: item?.eventType || 'start',
              actionType: item?.actionCode || '',
              actionConfig: item?.actionParams ? JSON.stringify(item.actionParams) : ''
            }))
          } else {
            message.error('节点动作 JSON 需要是数组或包含 tasks 数组')
            return
          }
        } catch (error) {
          message.error('节点动作 JSON 格式错误')
          return
        }
      }
      if (formData.value.modelKey && formData.value.bpmnXml) {
        formData.value.bpmnXml = syncBpmnProcessId(formData.value.bpmnXml, formData.value.modelKey)
      }
      const payload: FlowableModelDetail = {
        id: formData.value.id,
        modelKey: formData.value.modelKey,
        modelName: formData.value.modelName,
        category: formData.value.category,
        remark: formData.value.remark,
        bpmnXml: formData.value.bpmnXml,
        nodeActions
      }
      await saveFlowableModel(payload)
      message.success('保存成功')
      dialogVisible.value = false
      loadModels()
    } finally {
      submitLoading.value = false
    }
  })
}

const syncBpmnProcessId = (xml: string, modelKey: string) => {
  let next = xml
  next = next.replace(/(<bpmn:process\b[^>]*\bid=")([^"]+)(")/, `$1${modelKey}$3`)
  next = next.replace(/(<process\b[^>]*\bid=")([^"]+)(")/, `$1${modelKey}$3`)
  next = next.replace(/(<bpmndi:BPMNPlane\b[^>]*\bbpmnElement=")([^"]+)(")/, `$1${modelKey}$3`)
  return next
}

const openModeler = () => {
  modelerDialogVisible.value = true
}

const handleModelerExport = (payload: { xml: string; nodeActionsText: string }) => {
  formData.value.bpmnXml = payload.xml || ''
  formData.value.nodeActionsText = payload.nodeActionsText || ''
  modelerDialogVisible.value = false
}

const resetForm = () => {
  formData.value = {
    id: undefined,
    modelKey: '',
    modelName: '',
    category: '',
    remark: '',
    bpmnXml: '',
    nodeActionsText: ''
  }
  formRef.value?.resetFields()
}

const handleDialogClose = () => {
  resetForm()
}

loadModels()
</script>

<style scoped>
.flowable-model {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.clickable-textarea :deep(textarea) {
  cursor: pointer;
}

:global(.modeler-dialog .el-dialog__body) {
  padding: 12px;
}

:global(.modeler-dialog .modeler-wrapper) {
  height: 85vh;
  display: flex;
}

:global(.modeler-dialog .modeler-wrapper > .flowable-modeler) {
  flex: 1;
  height: 100%;
}

:global(.modeler-dialog .el-dialog) {
  margin-top: 0;
}
</style>
