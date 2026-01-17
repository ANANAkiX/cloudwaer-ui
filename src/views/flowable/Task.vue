<template>
  <div class="flowable-task">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务列表</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索任务名称/定义Key"
              clearable
              style="width: 260px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="待办" name="todo" />
        <el-tab-pane label="已办" name="done" />
      </el-tabs>

      <el-table :data="tableData" border style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="任务ID" min-width="220" />
        <el-table-column prop="name" label="任务名称" width="200" />
        <el-table-column prop="taskDefinitionKey" label="任务定义Key" width="180" />
        <el-table-column prop="processInstanceId" label="流程实例ID" width="200" />
        <el-table-column prop="processDefinitionKey" label="流程定义Key" width="180" />
        <el-table-column prop="assignee" label="处理人" width="120" />
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column prop="endTime" label="结束时间" width="180" />
        <el-table-column prop="status" label="状态" width="100" align="center" />
        <el-table-column label="操作" width="260" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="handleDetail(scope.row)">详情</el-button>
            <el-button
              v-if="activeTab === 'todo'"
              link
              type="primary"
              @click="handleClaim(scope.row)"
            >认领</el-button>
            <el-button
              v-if="activeTab === 'todo'"
              link
              type="success"
              @click="openCompleteDialog(scope.row)"
            >完成</el-button>
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

    <el-dialog v-model="detailDialogVisible" title="任务详情" width="720px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务ID">{{ detailData.id }}</el-descriptions-item>
        <el-descriptions-item label="任务名称">{{ detailData.name }}</el-descriptions-item>
        <el-descriptions-item label="任务定义Key">{{ detailData.taskDefinitionKey }}</el-descriptions-item>
        <el-descriptions-item label="流程实例ID">{{ detailData.processInstanceId }}</el-descriptions-item>
        <el-descriptions-item label="流程定义Key">{{ detailData.processDefinitionKey }}</el-descriptions-item>
        <el-descriptions-item label="处理人">{{ detailData.assignee }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailData.createTime }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ detailData.endTime }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailData.status }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="completeDialogVisible" title="完成任务" width="720px" @close="handleCompleteDialogClose">
      <el-form ref="completeFormRef" :model="completeFormData" :rules="completeRules" label-width="110px">
        <el-form-item label="任务ID" prop="taskId">
          <el-input v-model="completeFormData.taskId" disabled />
        </el-form-item>
        <el-form-item label="评论" prop="comment">
          <el-input v-model="completeFormData.comment" placeholder="请输入评论" />
        </el-form-item>
        <el-form-item label="变量JSON" prop="variablesText">
          <el-input v-model="completeFormData.variablesText" type="textarea" :rows="6" placeholder="请输入变量 JSON" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="completeSubmitting" @click="handleComplete">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessageBox, FormInstance } from 'element-plus'
import { message } from '@/api/request.ts'
import {
  claimFlowableTask,
  completeFlowableTask,
  deleteFlowableTask,
  getDoneTasksByPage,
  getFlowableTaskDetail,
  getTodoTasksByPage,
  type FlowableTaskItem
} from '@/api/flowable'

const loading = ref(false)
const searchKeyword = ref('')
const activeTab = ref<'todo' | 'done'>('todo')
const tableData = ref<FlowableTaskItem[]>([])

const pageParams = ref({
  current: 1,
  size: 10,
  keyword: ''
})

const pageResult = ref({
  records: [] as FlowableTaskItem[],
  total: 0,
  current: 1,
  size: 10,
  pages: 0
})

const detailDialogVisible = ref(false)
const detailData = ref<FlowableTaskItem>({ id: '' })

const completeDialogVisible = ref(false)
const completeSubmitting = ref(false)
const completeFormRef = ref<FormInstance | null>(null)
const completeFormData = ref({
  taskId: '',
  comment: '',
  variablesText: ''
})

const completeRules = {
  taskId: [{ required: true, message: '任务ID不能为空', trigger: 'blur' }]
}

const loadTasks = async () => {
  loading.value = true
  try {
    const api = activeTab.value === 'todo' ? getTodoTasksByPage : getDoneTasksByPage
    const result = await api({
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
  loadTasks()
}

const handleSizeChange = (size: number) => {
  pageParams.value.size = size
  pageParams.value.current = 1
  loadTasks()
}

const handleCurrentChange = (current: number) => {
  pageParams.value.current = current
  loadTasks()
}

const handleTabChange = () => {
  pageParams.value.current = 1
  loadTasks()
}

const handleDetail = async (row: FlowableTaskItem) => {
  const detail = await getFlowableTaskDetail(row.id)
  detailData.value = detail
  detailDialogVisible.value = true
}

const handleClaim = async (row: FlowableTaskItem) => {
  await claimFlowableTask(row.id)
  message.success('认领成功')
  loadTasks()
}

const openCompleteDialog = (row: FlowableTaskItem) => {
  completeFormData.value = {
    taskId: row.id,
    comment: '',
    variablesText: ''
  }
  completeDialogVisible.value = true
}

const handleCompleteDialogClose = () => {
  completeFormData.value = {
    taskId: '',
    comment: '',
    variablesText: ''
  }
  completeFormRef.value?.resetFields()
}

const handleComplete = async () => {
  if (!completeFormRef.value) return
  await completeFormRef.value.validate(async (valid) => {
    if (!valid) return
    completeSubmitting.value = true
    try {
      let variables: Record<string, any> | undefined
      if (completeFormData.value.variablesText && completeFormData.value.variablesText.trim()) {
        try {
          variables = JSON.parse(completeFormData.value.variablesText)
        } catch (error) {
          message.error('变量 JSON 格式错误')
          return
        }
      }
      await completeFlowableTask({
        taskId: completeFormData.value.taskId,
        comment: completeFormData.value.comment || undefined,
        variables
      })
      message.success('完成成功')
      completeDialogVisible.value = false
      loadTasks()
    } finally {
      completeSubmitting.value = false
    }
  })
}

const handleDelete = async (row: FlowableTaskItem) => {
  try {
    await ElMessageBox.confirm('确认删除该任务？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteFlowableTask(row.id)
    message.success('删除成功')
    loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      // errors handled globally
    }
  }
}

loadTasks()
</script>

<style scoped>
.flowable-task {
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
