<template>
  <div class="model-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>流程模型管理</span>
            <div class="header-actions">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索模型名称/模型Key"
                clearable
                style="width: 260px"
                @clear="handleSearch"
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
              <el-button type="success" @click="handleAdd">新增模型</el-button>
              <el-button type="warning" @click="handleBatchImport">批量导入</el-button>
            </div>
          </div>
        </template>

        <!-- 统计卡片 -->
        <div class="stats-cards">
          <el-row :gutter="20">
            <el-col :span="6">
              <el-card class="stat-card">
                <div class="stat-content">
                  <div class="stat-number">{{ stats.total }}</div>
                  <div class="stat-label">总模型数</div>
                </div>
                <el-icon class="stat-icon"><Document /></el-icon>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stat-card published">
                <div class="stat-content">
                  <div class="stat-number">{{ stats.published }}</div>
                  <div class="stat-label">已发布</div>
                </div>
                <el-icon class="stat-icon"><Check /></el-icon>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stat-card draft">
                <div class="stat-content">
                  <div class="stat-number">{{ stats.draft }}</div>
                  <div class="stat-label">草稿</div>
                </div>
                <el-icon class="stat-icon"><Edit /></el-icon>
              </el-card>
            </el-col>
            <el-col :span="6">
              <el-card class="stat-card archived">
                <div class="stat-content">
                  <div class="stat-number">{{ stats.archived }}</div>
                  <div class="stat-label">已归档</div>
                </div>
                <el-icon class="stat-icon"><FolderOpened /></el-icon>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-card>
    </div>

    <!-- 模型列表 -->
    <el-card class="model-list-card">
      <template #header>
        <div class="card-header">
          <span>模型列表</span>
          <div class="header-actions">
            <el-button-group>
              <el-button 
                :type="viewMode === 'table' ? 'primary' : ''" 
                @click="viewMode = 'table'"
              >
                <el-icon><List /></el-icon>
                列表视图
              </el-button>
              <el-button 
                :type="viewMode === 'card' ? 'primary' : ''" 
                @click="viewMode = 'card'"
              >
                <el-icon><Grid /></el-icon>
                卡片视图
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <!-- 表格视图 -->
      <el-table 
        v-if="viewMode === 'table'"
        :data="tableData" 
        border 
        style="width: 100%" 
        v-loading="loading" 
        table-layout="fixed"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="modelKey" label="模型Key" min-width="180">
          <template #default="scope">
            <el-tag type="info" size="small">{{ scope.row.modelKey }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="modelName" label="模型名称" min-width="200">
          <template #default="scope">
            <div class="model-name">
              <el-icon><Document /></el-icon>
              <span>{{ scope.row.modelName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" min-width="140">
          <template #default="scope">
            <el-tag v-if="scope.row.category" size="small">{{ scope.row.category }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80" align="center">
          <template #default="scope">
            <el-badge :value="scope.row.version" type="primary" />
          </template>
        </el-table-column>
        <el-table-column prop="modelStatus" label="状态" width="120" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.modelStatus === 0" type="info">草稿</el-tag>
            <el-tag v-else-if="scope.row.modelStatus === 1" type="success">已发布</el-tag>
            <el-tag v-else-if="scope.row.modelStatus === 2" type="warning">已归档</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" min-width="180">
          <template #default="scope">
            <span>{{ formatTime(scope.row.updateTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right" align="center">
          <template #default="scope">
            <el-button-group>
              <el-button size="small" type="primary" @click="handleEdit(scope.row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="warning" @click="handlePublish(scope.row)">
                <el-icon><Upload /></el-icon>
                发布
              </el-button>
              <el-button size="small" type="success" @click="openStartDialog(scope.row)">
                <el-icon><VideoPlay /></el-icon>
                启动
              </el-button>
              <el-dropdown @command="(command) => handleMoreAction(command, scope.row)">
                <el-button size="small">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="copy">
                      <el-icon><CopyDocument /></el-icon>
                      复制
                    </el-dropdown-item>
                    <el-dropdown-item command="export">
                      <el-icon><Download /></el-icon>
                      导出
                    </el-dropdown-item>
                    <el-dropdown-item command="history">
                      <el-icon><Clock /></el-icon>
                      版本历史
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 卡片视图 -->
      <div v-else class="card-view">
        <el-row :gutter="20">
          <el-col :span="6" v-for="item in tableData" :key="item.id">
            <el-card class="model-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span class="model-title">{{ item.modelName }}</span>
                  <el-tag :type="getStatusType(item.modelStatus)" size="small">
                    {{ getStatusText(item.modelStatus) }}
                  </el-tag>
                </div>
              </template>
              <div class="card-content">
                <div class="model-info">
                  <p><strong>模型Key:</strong> {{ item.modelKey }}</p>
                  <p><strong>分类:</strong> {{ item.category || '-' }}</p>
                  <p><strong>版本:</strong> v{{ item.version }}</p>
                  <p><strong>更新时间:</strong> {{ formatTime(item.updateTime) }}</p>
                </div>
                <div class="card-actions">
                  <el-button-group>
                    <el-button size="small" type="primary" @click="handleEdit(item)">编辑</el-button>
                    <el-button size="small" type="warning" @click="handlePublish(item)">发布</el-button>
                    <el-button size="small" type="success" @click="openStartDialog(item)">启动</el-button>
                  </el-button-group>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pageParams.current"
          v-model:page-size="pageParams.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pageParams.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑模型对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="模型Key" prop="modelKey">
          <el-input 
            v-model="formData.modelKey" 
            placeholder="请输入模型Key"
            :disabled="!!formData.id"
          />
        </el-form-item>
        <el-form-item label="模型名称" prop="modelName">
          <el-input v-model="formData.modelName" placeholder="请输入模型名称" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="formData.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="请假流程" value="leave" />
            <el-option label="报销流程" value="expense" />
            <el-option label="审批流程" value="approval" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="remark">
          <el-input 
            v-model="formData.remark" 
            type="textarea" 
            :rows="3"
            placeholder="请输入模型描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saveLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 启动流程对话框 -->
    <el-dialog
      v-model="startDialogVisible"
      title="启动流程"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="startFormRef"
        :model="startFormData"
        :rules="startFormRules"
        label-width="100px"
      >
        <el-form-item label="业务Key" prop="businessKey">
          <el-input v-model="startFormData.businessKey" placeholder="请输入业务Key（可选）" />
        </el-form-item>
        <el-form-item label="流程变量">
          <el-button type="primary" @click="addVariable">添加变量</el-button>
          <div class="variables-list">
            <div v-for="(variable, index) in startFormData.variables" :key="index" class="variable-item">
              <el-input v-model="variable.key" placeholder="变量名" style="width: 40%" />
              <el-input v-model="variable.value" placeholder="变量值" style="width: 40%; margin: 0 10px" />
              <el-button type="danger" @click="removeVariable(index)">删除</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="startDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleStartProcess" :loading="startLoading">启动</el-button>
      </template>
    </el-dialog>

    <!-- 批量操作栏 -->
    <div v-if="selectedRows.length > 0" class="batch-actions">
      <el-card>
        <div class="batch-content">
          <span>已选择 {{ selectedRows.length }} 项</span>
          <div class="batch-buttons">
            <el-button type="warning" @click="handleBatchPublish">批量发布</el-button>
            <el-button type="danger" @click="handleBatchDelete">批量删除</el-button>
            <el-button @click="clearSelection">清空选择</el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, Document, Check, Edit, FolderOpened, List, Grid, Upload, 
  VideoPlay, ArrowDown, CopyDocument, Download, Clock, Delete 
} from '@element-plus/icons-vue'
import type { FlowableModelListItem, FlowableModelDetail } from '@/api/model'
import {
  getModelList,
  saveModel,
  deleteModel,
  publishModel,
  getBpmnXml
} from '@/api/model'
import { startFlowableProcess } from '@/api/flowable'

// 响应式数据
const loading = ref(false)
const saveLoading = ref(false)
const startLoading = ref(false)
const dialogVisible = ref(false)
const startDialogVisible = ref(false)
const viewMode = ref<'table' | 'card'>('table')
const searchKeyword = ref('')
const selectedRows = ref<FlowableModelListItem[]>([])

// 分页参数
const pageParams = reactive({
  current: 1,
  size: 20,
  total: 0
})

// 表格数据
const modelList = ref<FlowableModelListItem[]>([])
const tableData = ref<FlowableModelListItem[]>([])

// 统计数据
const stats = reactive({
  total: 0,
  published: 0,
  draft: 0,
  archived: 0
})

// 表单数据
const formData = reactive<Partial<FlowableModelDetail>>({
  modelKey: '',
  modelName: '',
  category: '',
  remark: ''
})

// 启动流程表单
const startFormData = reactive({
  processDefinitionKey: '',
  businessKey: '',
  variables: [] as { key: string; value: any }[]
})

// 表单引用
const formRef = ref()
const startFormRef = ref()

// 表单验证规则
const formRules = {
  modelKey: [
    { required: true, message: '请输入模型Key', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '模型Key必须以字母开头，只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  modelName: [
    { required: true, message: '请输入模型名称', trigger: 'blur' }
  ]
}

const startFormRules = {
  businessKey: [
    { pattern: /^[a-zA-Z0-9_-]*$/, message: '业务Key只能包含字母、数字、下划线和连字符', trigger: 'blur' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return formData.id ? '编辑模型' : '新增模型'
})

// 方法
const loadData = async () => {
  try {
    loading.value = true
    const response = await getModelList({
      current: pageParams.current,
      size: pageParams.size
    })
    console.log('API响应数据:', response) // 调试日志
    modelList.value = response.records || []
    tableData.value = response.records || [] // 赋值给tableData
    console.log('表格数据:', tableData.value) // 调试日志
    pageParams.total = response.total || 0
    updateStats(modelList.value)
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
    modelList.value = []
    tableData.value = []
    pageParams.total = 0
  } finally {
    loading.value = false
  }
}

const updateStats = (data: FlowableModelListItem[]) => {
  stats.total = data.length
  stats.published = data.filter(item => item.modelStatus === 1).length
  stats.draft = data.filter(item => item.modelStatus === 0).length
  stats.archived = data.filter(item => item.modelStatus === 2).length
}

const handleSearch = () => {
  pageParams.current = 1
  loadData()
}

const handleAdd = () => {
  Object.assign(formData, {
    id: undefined,
    modelKey: '',
    modelName: '',
    category: '',
    remark: ''
  })
  dialogVisible.value = true
}

const handleEdit = (row: FlowableModelListItem) => {
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleSave = async () => {
  try {
    await formRef.value.validate()
    saveLoading.value = true
    
    await saveModel(formData as any)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handlePublish = async (row: FlowableModelListItem) => {
  try {
    await ElMessageBox.confirm('确定要发布此模型吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await publishModel({ id: row.id! })
    ElMessage.success('发布成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('发布失败:', error)
      ElMessage.error('发布失败')
    }
  }
}

const handleDelete = async (row: FlowableModelListItem) => {
  try {
    await ElMessageBox.confirm('确定要删除此模型吗？删除后不可恢复！', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteModel(row.id!)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const openStartDialog = (row: FlowableModelListItem) => {
  startFormData.processDefinitionKey = row.modelKey
  startFormData.businessKey = ''
  startFormData.variables = []
  startDialogVisible.value = true
}

const handleStartProcess = async () => {
  try {
    await startFormRef.value.validate()
    startLoading.value = true
    
    const variables: Record<string, any> = {}
    startFormData.variables.forEach(variable => {
      if (variable.key && variable.value) {
        variables[variable.key] = variable.value
      }
    })
    
    await startFlowableProcess({
      processDefinitionKey: startFormData.processDefinitionKey,
      businessKey: startFormData.businessKey || undefined,
      variables: Object.keys(variables).length > 0 ? variables : undefined
    })
    
    ElMessage.success('流程启动成功')
    startDialogVisible.value = false
  } catch (error) {
    console.error('启动流程失败:', error)
    ElMessage.error('启动流程失败')
  } finally {
    startLoading.value = false
  }
}

const addVariable = () => {
  startFormData.variables.push({ key: '', value: '' })
}

const removeVariable = (index: number) => {
  startFormData.variables.splice(index, 1)
}

const handleMoreAction = async (command: string, row: FlowableModelListItem) => {
  switch (command) {
    case 'copy':
      await handleCopy(row)
      break
    case 'export':
      await handleExport(row)
      break
    case 'history':
      await handleHistory(row)
      break
    case 'delete':
      await handleDelete(row)
      break
  }
}

const handleCopy = async (row: FlowableModelListItem) => {
  try {
    // TODO: 实现复制功能
    ElMessage.info('复制功能开发中...')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

const handleExport = (row: FlowableModelListItem) => {
  // TODO: 实现导出功能
  ElMessage.info('导出功能开发中...')
}

const handleHistory = (row: FlowableModelListItem) => {
  // TODO: 实现版本历史功能
  ElMessage.info('版本历史功能开发中...')
}

const handleBatchImport = () => {
  // TODO: 实现批量导入功能
  ElMessage.info('批量导入功能开发中...')
}

const handleSelectionChange = (selection: FlowableModelListItem[]) => {
  selectedRows.value = selection
}

const handleBatchPublish = async () => {
  try {
    await ElMessageBox.confirm(`确定要发布选中的 ${selectedRows.value.length} 个模型吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const promises = selectedRows.value.map(row => publishModel({ id: row.id! }))
    await Promise.all(promises)
    
    ElMessage.success('批量发布成功')
    clearSelection()
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量发布失败:', error)
      ElMessage.error('批量发布失败')
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 个模型吗？删除后不可恢复！`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const promises = selectedRows.value.map(row => deleteModel(row.id!))
    await Promise.all(promises)
    
    ElMessage.success('批量删除成功')
    clearSelection()
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const clearSelection = () => {
  selectedRows.value = []
}

const handleSizeChange = (size: number) => {
  pageParams.size = size
  pageParams.current = 1
  loadData()
}

const handleCurrentChange = (current: number) => {
  pageParams.current = current
  loadData()
}

const getStatusType = (status: number) => {
  switch (status) {
    case 0: return 'info'
    case 1: return 'success'
    case 2: return 'warning'
    default: return ''
  }
}

const getStatusText = (status: number) => {
  switch (status) {
    case 0: return '草稿'
    case 1: return '已发布'
    case 2: return '已归档'
    default: return '-'
  }
}

const formatTime = (time?: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString()
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.model-management {
  .page-header {
    margin-bottom: 20px;
    
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
    
    .stats-cards {
      margin-top: 20px;
      
      .stat-card {
        position: relative;
        overflow: hidden;
        
        .stat-content {
          position: relative;
          z-index: 1;
          
          .stat-number {
            font-size: 28px;
            font-weight: bold;
            color: #303133;
            margin-bottom: 5px;
          }
          
          .stat-label {
            color: #909399;
            font-size: 14px;
          }
        }
        
        .stat-icon {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 40px;
          opacity: 0.1;
        }
        
        &.published .stat-icon {
          color: #67c23a;
        }
        
        &.draft .stat-icon {
          color: #909399;
        }
        
        &.archived .stat-icon {
          color: #e6a23c;
        }
      }
    }
  }
  
  .model-list-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .model-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .card-view {
      .model-card {
        margin-bottom: 20px;
        
        .model-title {
          font-weight: bold;
          font-size: 16px;
        }
        
        .card-content {
          .model-info {
            p {
              margin: 8px 0;
              font-size: 14px;
              
              strong {
                color: #606266;
              }
            }
          }
          
          .card-actions {
            margin-top: 15px;
            text-align: center;
          }
        }
      }
    }
    
    .pagination {
      margin-top: 20px;
      text-align: right;
    }
  }
  
  .batch-actions {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    
    .batch-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .batch-buttons {
        display: flex;
        gap: 10px;
      }
    }
  }
  
  .variables-list {
    margin-top: 10px;
    
    .variable-item {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
  }
}
</style>
