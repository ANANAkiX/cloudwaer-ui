<template>
  <div class="workflow-definition-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>模型设计</span>
          <div class="card-actions">
            <el-input v-model="keyword" placeholder="搜索流程名称/标识" clearable style="width: 220px"
              @keyup.enter="loadData" @clear="loadData" />
            <el-select v-model="categoryFilter" placeholder="分类" clearable style="width: 120px" @change="loadData">
              <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
            </el-select>
            <el-button type="primary" @click="loadData">搜索</el-button>
            <el-button type="primary" @click="handleCreate">
              <el-icon><Plus /></el-icon> 设计模型
            </el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column prop="defKey" label="流程标识" min-width="120" show-overflow-tooltip />
        <el-table-column prop="defName" label="流程名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="100" align="center" />
        <el-table-column prop="version" label="版本" width="70" align="center" />
        <el-table-column prop="defStatus" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.defStatus)" size="small">{{ getStatusLabel(row.defStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="endTime" label="到期时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.endTime) }}</template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">设计</el-button>
            <el-button v-if="row.defStatus !== 1" link type="success" @click="handlePublish(row)">发布</el-button>
            <el-button v-if="row.defStatus === 1" link type="warning" @click="handleOffline(row)">下线</el-button>
            <el-button link type="info" @click="handleVersions(row)">版本</el-button>
            <el-button v-if="row.defStatus !== 1" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50]" :total="pagination.total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData" @current-change="loadData" />
      </div>
    </el-card>

    <!-- 设计器悬浮窗 -->
    <el-dialog
      v-model="designerVisible"
      :title="designerDefId ? '编辑模型' : '新建模型'"
      width="1500px"
      top="2vh"
      :close-on-click-modal="false"
      destroy-on-close
      @close="onDesignerClose"
    >
      <div class="designer-dialog-body">
        <WorkflowDesigner :def-id="designerDefId" embedded @close="onDesignerClose" />
      </div>
    </el-dialog>

    <!-- 版本历史抽屉 -->
    <el-drawer v-model="versionVisible" title="版本历史" size="500px">
      <el-table :data="versionList" border size="small">
        <el-table-column prop="version" label="版本" width="70" align="center" />
        <el-table-column prop="defStatus" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.defStatus)" size="small">{{ getStatusLabel(row.defStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="160">
          <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import WorkflowDesigner from '@/views/workflow/WorkflowDesigner.vue'
import {
  getWorkflowDefs,
  publishWorkflowDef,
  offlineWorkflowDef,
  deleteWorkflowDef,
  getWorkflowDefVersions,
  type WorkflowDef
} from '@/api/workflow'

const loading = ref(false)
const tableData = ref<WorkflowDef[]>([])
const keyword = ref('')
const categoryFilter = ref('')
const categories = ref<string[]>([])
const pagination = reactive({ current: 1, size: 10, total: 0 })

// 版本抽屉
const versionVisible = ref(false)
const versionList = ref<WorkflowDef[]>([])

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const res: any = await getWorkflowDefs({
      current: pagination.current,
      size: pagination.size,
      keyword: keyword.value || undefined,
      category: categoryFilter.value || undefined
    })
    tableData.value = res?.records || []
    pagination.total = res?.total || 0
    // 提取分类
    const cats = new Set(tableData.value.map(d => d.category).filter(Boolean))
    categories.value = Array.from(cats) as string[]
  } finally {
    loading.value = false
  }
}

function formatTime(time?: string): string {
  return time ? time.replace('T', ' ').substring(0, 16) : '-'
}

function getStatusType(status?: number): any {
  const map: Record<number, any> = { 0: 'info', 1: 'success', 2: 'warning', 3: 'danger' }
  return map[status || 0] || 'info'
}

function getStatusLabel(status?: number): string {
  const map: Record<number, string> = { 0: '草稿', 1: '已发布', 2: '已归档', 3: '已下线' }
  return map[status || 0] || '未知'
}

// 设计器弹窗
const designerVisible = ref(false)
const designerDefId = ref<string | number | null>(null)

function handleCreate() {
  designerDefId.value = null
  designerVisible.value = true
}

function handleEdit(row: WorkflowDef) {
  designerDefId.value = row.id as string | number
  designerVisible.value = true
}

function onDesignerClose(saved?: boolean) {
  designerVisible.value = false
  if (saved) {
    loadData()
  }
}

async function handlePublish(row: WorkflowDef) {
  try {
    await ElMessageBox.confirm(`确认发布「${row.defName}」？`, '发布确认', { type: 'warning' })
    await publishWorkflowDef(row.id as string | number)
    ElMessage.success('发布成功')
    loadData()
  } catch { /* ignore */ }
}

async function handleOffline(row: WorkflowDef) {
  try {
    await ElMessageBox.confirm(`确认下线「${row.defName}」？下线后不可再发起。`, '下线确认', { type: 'warning' })
    await offlineWorkflowDef(row.id as string | number)
    ElMessage.success('已下线')
    loadData()
  } catch { /* ignore */ }
}

async function handleDelete(row: WorkflowDef) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.defName}」？此操作不可撤销。`, '删除确认', { type: 'error' })
    await deleteWorkflowDef(row.id as string | number)
    ElMessage.success('删除成功')
    loadData()
  } catch { /* ignore */ }
}

async function handleVersions(row: WorkflowDef) {
  try {
    const res: any = await getWorkflowDefVersions(row.defKey)
    versionList.value = res.data || []
    versionVisible.value = true
  } catch {
    ElMessage.error('加载版本历史失败')
  }
}
</script>

<style scoped>
.workflow-definition-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.designer-dialog-body {
  height: 1050px;
  overflow: hidden;
  border-radius: 8px;
}

.designer-dialog-body :deep(.workflow-designer-page) {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.designer-dialog-body :deep(.el-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none;
  box-shadow: none;
}

.designer-dialog-body :deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  padding: 12px;
}

.designer-dialog-body :deep(.designer-layout) {
  height: calc(100vh - 300px);
  min-height: 800px;
}
</style>
