<template>
  <div class="flowable-process">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>流程实例</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索流程定义Key/业务Key"
              clearable
              style="width: 260px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" border style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="实例ID" min-width="220" />
        <el-table-column prop="processDefinitionKey" label="流程定义Key" width="180" />
        <el-table-column prop="processDefinitionName" label="流程定义名称" width="200" />
        <el-table-column prop="businessKey" label="业务Key" width="160" />
        <el-table-column prop="startTime" label="开始时间" width="180" />
        <el-table-column prop="endTime" label="结束时间" width="180" />
        <el-table-column prop="status" label="状态" width="120" align="center" />
        <el-table-column label="操作" width="360" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="handleDetail(scope.row)">详情</el-button>
            <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
            <el-button
              link
              type="primary"
              @click="openStartDialogFromInstance(scope.row)"
            >
              申请{{ scope.row.processDefinitionName || scope.row.processDefinitionKey }}
            </el-button>
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

    <el-dialog v-model="detailDialogVisible" title="流程详情" width="720px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="实例ID">{{ detailData.id }}</el-descriptions-item>
        <el-descriptions-item label="流程定义Key">{{ detailData.processDefinitionKey }}</el-descriptions-item>
        <el-descriptions-item label="流程定义名称">{{ detailData.processDefinitionName }}</el-descriptions-item>
        <el-descriptions-item label="业务Key">{{ detailData.businessKey }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ detailData.startTime }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ detailData.endTime }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailData.status }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
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
import {
  deleteFlowableProcess,
  getFlowableProcessDetail,
  getStartedProcessByPage,
  startFlowableProcess,
  type FlowableProcessInstance
} from '@/api/flowable'

const loading = ref(false)
const searchKeyword = ref('')
const tableData = ref<FlowableProcessInstance[]>([])
const startSubmitting = ref(false)
const startDialogVisible = ref(false)
const startFormRef = ref<FormInstance | null>(null)
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
  records: [] as FlowableProcessInstance[],
  total: 0,
  current: 1,
  size: 10,
  pages: 0
})

const detailDialogVisible = ref(false)
const detailData = ref<FlowableProcessInstance>({
  id: '',
  processDefinitionKey: ''
})

const loadProcesses = async () => {
  loading.value = true
  try {
    const result = await getStartedProcessByPage({
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
  loadProcesses()
}

const handleSizeChange = (size: number) => {
  pageParams.value.size = size
  pageParams.value.current = 1
  loadProcesses()
}

const handleCurrentChange = (current: number) => {
  pageParams.value.current = current
  loadProcesses()
}

const openStartDialogFromInstance = (row: FlowableProcessInstance) => {
  startFormData.value = {
    processDefinitionKey: row.processDefinitionKey || '',
    processDefinitionName: row.processDefinitionName || '',
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
      variables = {
        ...(variables || {}),
        processDefinitionName: startFormData.value.processDefinitionName
      }
      await startFlowableProcess({
        processDefinitionKey: startFormData.value.processDefinitionKey,
        businessKey: startFormData.value.businessKey || undefined,
        variables
      })
      message.success('启动成功')
      startDialogVisible.value = false
      loadProcesses()
    } finally {
      startSubmitting.value = false
    }
  })
}

const handleDetail = async (row: FlowableProcessInstance) => {
  const detail = await getFlowableProcessDetail(row.id)
  detailData.value = detail
  detailDialogVisible.value = true
}

const handleDelete = async (row: FlowableProcessInstance) => {
  try {
    await ElMessageBox.confirm('确认删除该流程实例？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteFlowableProcess(row.id)
    message.success('删除成功')
    loadProcesses()
  } catch (error) {
    if (error !== 'cancel') {
      // errors handled globally
    }
  }
}

loadProcesses()
</script>

<style scoped>
.flowable-process {
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

</style>
