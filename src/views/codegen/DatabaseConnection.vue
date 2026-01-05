<template>
  <div class="database-connection-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据库连接管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增连接
          </el-button>
        </div>
      </template>

      <el-table
        :data="tableData"
        border
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="name" label="连接名称" align="center" width="150" />
        <el-table-column prop="dbType" label="数据库类型" align="center" width="120" />
        <el-table-column prop="host" label="主机" align="center" width="150" />
        <el-table-column prop="port" label="端口" align="center" width="80" />
        <el-table-column prop="database" label="数据库名" align="center" width="150" />
        <el-table-column prop="username" label="用户名" align="center" width="120" />
        <el-table-column label="状态" align="center" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.enabled ? 'success' : 'info'">
              {{ scope.row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="scope">
            <el-button link type="primary" @click="handleTest(scope.row)">测试</el-button>
            <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" style="margin-top: 20px; text-align: right">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadConnectionList"
          @current-change="loadConnectionList"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="formDialogVisible"
      :title="formDialogTitle"
      width="600px"
      @close="handleFormClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="连接名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入连接名称" />
        </el-form-item>
        <el-form-item label="数据库类型" prop="dbType">
          <el-select v-model="formData.dbType" placeholder="请选择数据库类型" style="width: 100%">
            <el-option label="MySQL" value="MySQL" />
            <el-option label="PostgreSQL" value="PostgreSQL" />
            <el-option label="Oracle" value="Oracle" />
            <el-option label="SQL Server" value="SQL Server" />
          </el-select>
        </el-form-item>
        <el-form-item label="主机" prop="host">
          <el-input v-model="formData.host" placeholder="请输入主机地址" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number v-model="formData.port" :min="1" :max="65535" style="width: 100%" />
        </el-form-item>
        <el-form-item label="数据库名" prop="database">
          <el-input v-model="formData.database" placeholder="请输入数据库名" />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码（编辑时留空则不修改）"
            show-password
          />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="formData.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox, FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { message } from '@/api/request.ts'
import {
  getDatabaseConnectionPage,
  testDatabaseConnection,
  saveDatabaseConnection,
  updateDatabaseConnection,
  deleteDatabaseConnection,
  type DatabaseConnectionInfo
} from '@/api/codegen'
import { createDefaultDbConnectionForm } from '@/config/app'

const loading = ref(false)
const submitLoading = ref(false)
const formDialogVisible = ref(false)
const formDialogTitle = ref('新增数据库连接')
const formRef = ref<FormInstance | null>(null)

const tableData = ref<DatabaseConnectionInfo[]>([])
const pagination = ref({
  current: 1,
  size: 10,
  total: 0
})

const formData = ref<Partial<DatabaseConnectionInfo>>(createDefaultDbConnectionForm())

const rules = {
  name: [{ required: true, message: '请输入连接名称', trigger: 'blur' }],
  dbType: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口', trigger: 'blur' }],
  database: [{ required: true, message: '请输入数据库名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
  // 编辑时密码可以不填
}

// 加载连接列表
const loadConnectionList = async () => {
  loading.value = true
  try {
    const result = await getDatabaseConnectionPage({
      current: pagination.value.current,
      size: pagination.value.size
    })
    if (result && result.records) {
      tableData.value = result.records || []
      pagination.value.total = result.total || 0
    }
  } catch (error) {
    console.error('加载数据库连接列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 新增
const handleAdd = () => {
  formDialogTitle.value = '新增数据库连接'
  resetForm()
  formDialogVisible.value = true
}

// 编辑
const handleEdit = (row: DatabaseConnectionInfo) => {
  formDialogTitle.value = '编辑数据库连接'
  formData.value = { ...row }
  formData.value.password = '' // 密码不显示，留空则不修改
  formDialogVisible.value = true
}

// 测试连接
const handleTest = async (row: DatabaseConnectionInfo) => {
  try {
    await testDatabaseConnection(row)
    message.success('连接测试成功')
  } catch (error) {
    console.error('连接测试失败:', error)
    // 错误消息已在 request.ts 中统一处理
  }
}

// 删除
const handleDelete = (row: DatabaseConnectionInfo) => {
  if (!row.id) return
  ElMessageBox.confirm('确定要删除这条数据库连接配置吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteDatabaseConnection(row.id!)
      message.success('删除成功')
      loadConnectionList()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }).catch(() => {})
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        if (formData.value.id) {
          await updateDatabaseConnection(formData.value as DatabaseConnectionInfo)
          message.success('更新成功')
        } else {
          // 新增时密码必填
          if (!formData.value.password) {
            message.warning('新增时密码不能为空')
            return
          }
          await saveDatabaseConnection(formData.value as DatabaseConnectionInfo)
          message.success('新增成功')
        }
        formDialogVisible.value = false
        loadConnectionList()
      } catch (error) {
        console.error('保存失败:', error)
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 重置表单
const resetForm = () => {
  formData.value = createDefaultDbConnectionForm()
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 关闭表单对话框
const handleFormClose = () => {
  resetForm()
}

onMounted(() => {
  loadConnectionList()
})
</script>

<style scoped>
.database-connection-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
