<template>
  <div class="user-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <div style="display: flex; gap: 10px; align-items: center">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户名、昵称、邮箱、手机号"
              clearable
              style="width: 300px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button v-if="canAdd" type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增用户
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="tableData"
        border
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="username" label="用户名" align="center" min-width="120" />
        <el-table-column prop="nickname" label="昵称" align="center" min-width="120" />
        <el-table-column prop="email" label="邮箱" align="center" min-width="180" />
        <el-table-column prop="phone" label="手机号" align="center" min-width="130" />
        <el-table-column label="角色" align="center" min-width="200">
          <template #default="scope">
            <el-tag
              v-for="roleId in scope.row.roleIds"
              :key="roleId"
              style="margin-right: 5px"
            >
              {{ getRoleName(roleId) }}
            </el-tag>
            <span v-if="!scope.row.roleIds || scope.row.roleIds.length === 0">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="250" fixed="right">
          <template #default="scope">
            <el-button v-if="canEdit" link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button v-if="canAssignRole" link type="success" @click="handleAssignRoles(scope.row)">分配角色</el-button>
            <el-button v-if="canDelete" link type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            :disabled="!!formData.id"
          />
        </el-form-item>
        <el-form-item label="密码" :prop="formData.id ? '' : 'password'">
          <el-input
            v-model="formData.password"
            type="password"
            :placeholder="formData.id ? '留空则不修改密码' : '请输入密码'"
            show-password
          />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="formData.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分配角色对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配角色"
      width="500px"
      @close="handleAssignDialogClose"
    >
      <el-form label-width="100px">
        <el-form-item label="已分配角色">
          <div v-if="selectedRoleIds.length > 0" style="margin-bottom: 10px">
            <el-tag
              v-for="roleId in selectedRoleIds"
              :key="roleId"
              closable
              @close="removeRole(roleId)"
              style="margin-right: 8px; margin-bottom: 8px"
            >
              {{ getRoleName(roleId) }}
            </el-tag>
          </div>
          <div v-else style="color: #909399; font-size: 14px">暂无已分配角色</div>
        </el-form-item>
        <el-form-item label="选择角色">
          <el-select
            v-model="selectedRoleIds"
            multiple
            placeholder="请选择角色"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="role in roleOptions"
              :key="role.id"
              :label="role.roleName"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="assignDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAssignSubmit" :loading="assignLoading">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessageBox, FormInstance } from 'element-plus'
import { message } from '@/api/request.ts'
import { Plus, Search } from '@element-plus/icons-vue'
import { getUserPage, saveUser, updateUser, deleteUser, assignRoles } from '@/api/user.ts'
import { getRoleList } from '@/api/role.ts'
import { useUserStore } from '@/stores/user'
import { checkButtonPermission } from '@/utils/permission'
import { UserInfo, RoleInfo, PageResult } from '@/types'

const userStore = useUserStore()

const loading = ref<boolean>(false)
const submitLoading = ref<boolean>(false)
const assignLoading = ref<boolean>(false)
const dialogVisible = ref<boolean>(false)
const assignDialogVisible = ref<boolean>(false)
const dialogTitle = ref<string>('新增用户')
const formRef = ref<FormInstance | null>(null)
const tableData = ref<UserInfo[]>([])
const roleOptions = ref<RoleInfo[]>([])
const selectedRoleIds = ref<string[]>([])
const currentUserId = ref<string | null>(null)
const searchKeyword = ref<string>('')

// 分页参数
const pagination = ref({
  current: 1,
  size: 10,
  total: 0
})

const formData = ref<Partial<UserInfo>>({
  id: undefined,
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: ''
})

// 权限检查
const canAdd = computed(() => checkButtonPermission('user', 'admin:user:add'))
const canEdit = computed(() => checkButtonPermission('user', 'admin:user:edit'))
const canDelete = computed(() => checkButtonPermission('user', 'admin:user:delete'))
const canAssignRole = computed(() => checkButtonPermission('user', 'admin:user:assign-role'))

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

// 加载用户列表（分页）
const loadUserList = async () => {
  loading.value = true
  try {
    const result = await getUserPage(pagination.value.current, pagination.value.size, searchKeyword.value || undefined)
    if (result && result.records) {
      tableData.value = result.records || []
      pagination.value.total = result.total || 0
    } else {
      tableData.value = []
      pagination.value.total = 0
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    // 错误消息已在 request.ts 中统一处理
    tableData.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.current = 1 // 重置到第一页
  loadUserList()
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.value.size = size
  pagination.value.current = 1
  loadUserList()
}

// 当前页改变
const handleCurrentChange = (current) => {
  pagination.value.current = current
  loadUserList()
}

// 加载角色列表
const loadRoleList = async () => {
  try {
    const data = await getRoleList()
    roleOptions.value = data || []
  } catch (error) {
    console.error('加载角色列表失败:', error)
    // 错误消息已在 request.ts 中统一处理
  }
}

// 获取角色名称
const getRoleName = (roleId) => {
  // 确保ID类型匹配（可能是字符串或数字）
  const role = roleOptions.value.find(r => {
    // 统一转换为字符串进行比较
    return String(r.id) === String(roleId)
  })
  return role ? role.roleName : `角色ID: ${roleId}`
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增用户'
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑用户'
  resetForm()
  formData.value = {
    id: row.id,
    username: row.username,
    password: '',
    nickname: row.nickname || '',
    email: row.email || '',
    phone: row.phone || ''
  }
  dialogVisible.value = true
}

// 分配角色
const handleAssignRoles = async (row) => {
  currentUserId.value = row.id
  // 先加载角色列表
  await loadRoleList()
  
  // 设置已选中的角色ID（确保类型匹配）
  if (row.roleIds && row.roleIds.length > 0) {
    // 统一转换为字符串进行比较和匹配
    const userRoleIds = row.roleIds.map(id => String(id))
    // 匹配角色选项中的ID（也转换为字符串）
    selectedRoleIds.value = roleOptions.value
      .filter(role => userRoleIds.includes(String(role.id)))
      .map(role => role.id) // 使用角色选项中的原始ID类型
  } else {
    selectedRoleIds.value = []
  }
  
  assignDialogVisible.value = true
}

// 移除角色（从已分配列表中移除）
const removeRole = (roleId) => {
  selectedRoleIds.value = selectedRoleIds.value.filter(id => {
    // 统一转换为字符串进行比较
    return String(id) !== String(roleId)
  })
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该用户吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteUser(row.id)
      message.success('删除成功')
      loadUserList()
    } catch (error) {
      console.error('删除失败:', error)
      // 错误消息已在 request.ts 中统一处理
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
          // 编辑时，如果密码为空，则不传密码字段
          const updateData = { ...formData.value }
          if (!updateData.password) {
            delete updateData.password
          }
          await updateUser(updateData)
          message.success('更新成功')
        } else {
          await saveUser(formData.value)
          message.success('新增成功')
        }
        dialogVisible.value = false
        loadUserList()
      } catch (error) {
        console.error('保存失败:', error)
        // 错误消息已在 request.ts 中统一处理
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 提交分配角色
const handleAssignSubmit = async () => {
  if (!currentUserId.value) return
  assignLoading.value = true
  try {
    // 将ID转换为字符串数组发送给后端（后端会处理转换）
    const roleIds = selectedRoleIds.value.map(id => String(id))
    
    // 调用分配接口（后端会先删除所有旧关联，再添加新关联）
    // 如果roleIds为空数组，则只会删除所有角色关联
    await assignRoles(currentUserId.value, roleIds)
    message.success('分配角色成功')
    assignDialogVisible.value = false
    loadUserList()
  } catch (error) {
    console.error('分配角色失败:', error)
    // 错误消息已在 request.ts 中统一处理
  } finally {
    assignLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  formData.value = {
    id: null,
    username: '',
    password: '',
    nickname: '',
    email: '',
    phone: ''
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
}

// 关闭分配角色对话框
const handleAssignDialogClose = () => {
  currentUserId.value = null
  selectedRoleIds.value = []
}

onMounted(async () => {
  // 先加载角色列表，再加载用户列表，确保角色名称能正确显示
  await loadRoleList()
  loadUserList()
})
</script>

<style scoped>
.user-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>

