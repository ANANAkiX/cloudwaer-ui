<template>
  <div class="role-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>角色管理</span>
          <div style="display: flex; gap: 10px; align-items: center">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索角色名称、角色代码"
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
              新增角色
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
        <el-table-column prop="roleName" label="角色名称" align="center" min-width="150" />
        <el-table-column prop="roleCode" label="角色编码" align="center" min-width="150" />
        <el-table-column prop="description" label="角色描述" align="center" />
        <el-table-column label="操作" align="center" width="300" fixed="right">
          <template #default="scope">
            <el-button v-if="canEdit" link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button v-if="canAssignPermission" link type="success" @click="handleAssignPermissions(scope.row)">分配权限</el-button>
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
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="formData.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model="formData.roleCode" placeholder="请输入角色编码" />
        </el-form-item>
        <el-form-item label="角色描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分配权限对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配权限"
      width="1080px"
      @close="handleAssignDialogClose"
    >
      <div class="permission-assign-container">
        <!-- 左右两个树形面板 -->
        <div class="permission-trees">
          <!-- 未分配权限 -->
          <div class="permission-tree-panel">
            <div class="tree-header">
              <span>未分配权限</span>
              <el-input
                v-model="unassignedFilterText"
                placeholder="搜索权限"
                size="small"
                clearable
                style="width: 200px; margin-left: 10px"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            <el-tree
              ref="unassignedTreeRef"
              :data="unassignedPermissionTree"
              :props="{ label: 'permissionName', children: 'children' }"
              :filter-node-method="filterNode"
              show-checkbox
              node-key="id"
              default-expand-all
              :default-checked-keys="[]"
              @check="handleUnassignedCheck"
              class="permission-tree"
            />
          </div>

          <!-- 中间按钮区域 -->
          <div class="transfer-buttons">
            <el-button
              type="primary"
              :icon="ArrowRight"
              @click="moveToAssigned"
              :disabled="unassignedCheckedKeys.length === 0"
            >
              分配
            </el-button>
            <el-button
              type="danger"
              :icon="ArrowLeft"
              @click="moveToUnassigned"
              :disabled="assignedCheckedKeys.length === 0"
            >
              取消
            </el-button>
          </div>

          <!-- 已分配权限 -->
          <div class="permission-tree-panel">
            <div class="tree-header">
              <span>已分配权限</span>
              <el-input
                v-model="assignedFilterText"
                placeholder="搜索权限"
                size="small"
                clearable
                style="width: 200px; margin-left: 10px"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            <el-tree
              ref="assignedTreeRef"
              :data="assignedPermissionTree"
              :props="{ label: 'permissionName', children: 'children' }"
              :filter-node-method="filterNode"
              show-checkbox
              node-key="id"
              default-expand-all
              :default-checked-keys="[]"
              @check="handleAssignedCheck"
              class="permission-tree"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer-center">
          <el-button @click="assignDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleAssignSubmit" :loading="assignLoading">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { ElMessageBox, FormInstance } from 'element-plus'
import { message } from '@/api/request.ts'
import { Plus, ArrowRight, ArrowLeft, Search } from '@element-plus/icons-vue'
import { getRolePage, saveRole, updateRole, deleteRole, assignPermissions } from '@/api/role.ts'
import { getPermissionTree } from '@/api/permission'
import { useUserStore } from '@/stores/user'
import { reloadRoutes } from '@/router'
import { checkButtonPermission } from '@/utils/permission'
import { RoleInfo, PermissionInfo, PageResult } from '@/types'

const userStore = useUserStore()

const loading = ref<boolean>(false)
const submitLoading = ref<boolean>(false)
const assignLoading = ref<boolean>(false)
const dialogVisible = ref<boolean>(false)
const assignDialogVisible = ref<boolean>(false)
const dialogTitle = ref<string>('新增角色')
const formRef = ref<FormInstance | null>(null)
const tableData = ref<RoleInfo[]>([])
const currentRoleId = ref<string | null>(null)
const searchKeyword = ref<string>('')

// 权限检查
const canAdd = computed(() => checkButtonPermission('role', 'admin:role:add'))
const canEdit = computed(() => checkButtonPermission('role', 'admin:role:edit'))
const canDelete = computed(() => checkButtonPermission('role', 'admin:role:delete'))
const canAssignPermission = computed(() => checkButtonPermission('role', 'admin:role:assign-permission'))

// 权限树相关
const allPermissionTree = ref<PermissionInfo[]>([]) // 所有权限树
const unassignedPermissionTree = ref<PermissionInfo[]>([]) // 未分配权限树
const assignedPermissionTree = ref<PermissionInfo[]>([]) // 已分配权限树
const selectedPermissionIds = ref<string[]>([]) // 已选中的权限ID列表
const unassignedTreeRef = ref<any>(null)
const assignedTreeRef = ref<any>(null)
const unassignedCheckedKeys = ref<string[]>([]) // 未分配树中选中的节点
const assignedCheckedKeys = ref<string[]>([]) // 已分配树中选中的节点
const unassignedFilterText = ref<string>('')
const assignedFilterText = ref<string>('')

// 分页参数
const pagination = ref({
  current: 1,
  size: 10,
  total: 0
})

const formData = ref({
  id: null,
  roleName: '',
  roleCode: '',
  description: ''
})

const rules = {
  roleName: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  roleCode: [
    { required: true, message: '请输入角色编码', trigger: 'blur' }
  ]
}

// 加载角色列表（分页）
const loadRoleList = async () => {
  loading.value = true
  try {
    const result = await getRolePage(pagination.value.current, pagination.value.size, searchKeyword.value || undefined)
    if (result && result.records) {
      tableData.value = result.records || []
      pagination.value.total = result.total || 0
    } else {
      tableData.value = []
      pagination.value.total = 0
    }
  } catch (error) {
    console.error('加载角色列表失败:', error)
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
  loadRoleList()
}

// 分页大小改变
const handleSizeChange = (size: number): void => {
  pagination.value.size = size
  pagination.value.current = 1
  loadRoleList()
}

// 当前页改变
const handleCurrentChange = (current: number): void => {
  pagination.value.current = current
  loadRoleList()
}

// 加载权限树
const loadPermissionTree = async () => {
  try {
    const data = await getPermissionTree()
    allPermissionTree.value = data || []
    updatePermissionTrees()
  } catch (error) {
    console.error('加载权限列表失败:', error)
    // 错误消息已在 request.ts 中统一处理
  }
}

// 更新已分配和未分配权限树
const updatePermissionTrees = () => {
  const allIds = new Set(selectedPermissionIds.value.map(id => String(id)))
  
  // 深拷贝树并分离已分配和未分配
  const cloneTree = (nodes) => {
    return nodes.map(node => ({
      ...node,
      id: String(node.id), // 统一转换为字符串
      children: node.children ? cloneTree(node.children) : []
    }))
  }
  
  const filterTree = (nodes, isAssigned) => {
    const result = []
    for (const node of nodes) {
      const nodeId = String(node.id)
      const hasAssigned = allIds.has(nodeId)
      
      // 递归处理子节点
      const filteredChildren = node.children && node.children.length > 0 
        ? filterTree(node.children, isAssigned) 
        : []
      
      // 如果当前节点符合条件，或者有符合条件的子节点，则包含该节点
      if (isAssigned === hasAssigned) {
        const newNode = {
          ...node,
          id: nodeId,
          children: filteredChildren
        }
        result.push(newNode)
      } else if (filteredChildren.length > 0) {
        // 如果当前节点不符合条件，但子节点符合，也包含该节点（保持树结构）
        result.push({
          ...node,
          id: nodeId,
          children: filteredChildren
        })
      }
    }
    return result
  }
  
  const clonedTree = cloneTree(allPermissionTree.value)
  unassignedPermissionTree.value = filterTree(clonedTree, false)
  assignedPermissionTree.value = filterTree(clonedTree, true)
  
  // 重置选中状态
  nextTick(() => {
    if (unassignedTreeRef.value) {
      unassignedTreeRef.value.setCheckedKeys([])
    }
    if (assignedTreeRef.value) {
      assignedTreeRef.value.setCheckedKeys([])
    }
    unassignedCheckedKeys.value = []
    assignedCheckedKeys.value = []
  })
}

// 树节点过滤
const filterNode = (value, data) => {
  if (!value) return true
  return data.permissionName.toLowerCase().includes(value.toLowerCase())
}

// 监听过滤文本
watch(unassignedFilterText, (val) => {
  if (unassignedTreeRef.value) {
    unassignedTreeRef.value.filter(val)
  }
})

watch(assignedFilterText, (val) => {
  if (assignedTreeRef.value) {
    assignedTreeRef.value.filter(val)
  }
})

// 未分配树选中事件
const handleUnassignedCheck = (data, checked) => {
  // 只获取实际选中的节点，Element Plus树组件会自动处理父子关联
  const checkedKeys = unassignedTreeRef.value.getCheckedKeys()
  unassignedCheckedKeys.value = checkedKeys.map(id => String(id))
}

// 已分配树选中事件
const handleAssignedCheck = (data, checked) => {
  // 只获取实际选中的节点，Element Plus树组件会自动处理父子关联
  const checkedKeys = assignedTreeRef.value.getCheckedKeys()
  assignedCheckedKeys.value = checkedKeys.map(id => String(id))
}

// 移动到已分配
const moveToAssigned = () => {
  if (unassignedCheckedKeys.value.length === 0) {
    message.warning('请选择要分配的权限')
    return
  }
  
  // Element Plus树组件已经自动处理了父子关联，直接使用选中的节点ID
  // 添加到已分配列表（去重）
  const newIds = unassignedCheckedKeys.value.filter(id => !selectedPermissionIds.value.includes(id))
  selectedPermissionIds.value = [...selectedPermissionIds.value, ...newIds]
  
  // 清空选中状态
  unassignedCheckedKeys.value = []
  if (unassignedTreeRef.value) {
    unassignedTreeRef.value.setCheckedKeys([])
  }
  
  // 更新树
  updatePermissionTrees()
  message.success(`已分配 ${newIds.length} 个权限`)
}

// 移动到未分配
const moveToUnassigned = () => {
  if (assignedCheckedKeys.value.length === 0) {
    message.warning('请选择要取消的权限')
    return
  }
  
  // Element Plus树组件已经自动处理了父子关联，直接使用选中的节点ID
  // 从已分配列表中移除
  const removedCount = assignedCheckedKeys.value.length
  selectedPermissionIds.value = selectedPermissionIds.value.filter(id => !assignedCheckedKeys.value.includes(id))
  
  // 清空选中状态
  assignedCheckedKeys.value = []
  if (assignedTreeRef.value) {
    assignedTreeRef.value.setCheckedKeys([])
  }
  
  // 更新树
  updatePermissionTrees()
  message.success(`已取消 ${removedCount} 个权限`)
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增角色'
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑角色'
  resetForm()
  formData.value = {
    id: row.id,
    roleName: row.roleName,
    roleCode: row.roleCode,
    description: row.description || ''
  }
  dialogVisible.value = true
}

// 分配权限
const handleAssignPermissions = async (row) => {
  currentRoleId.value = row.id
  // 将权限ID转换为字符串
  selectedPermissionIds.value = row.permissionIds
    ? row.permissionIds.map(id => String(id))
    : []
  await loadPermissionTree()
  assignDialogVisible.value = true
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该角色吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteRole(row.id)
      message.success('删除成功')
      loadRoleList()
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
          await updateRole(formData.value)
          message.success('更新成功')
        } else {
          await saveRole(formData.value)
          message.success('新增成功')
        }
        dialogVisible.value = false
        loadRoleList()
      } catch (error) {
        console.error('保存失败:', error)
        // 错误消息已在 request.ts 中统一处理
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 提交分配权限
const handleAssignSubmit = async () => {
  if (!currentRoleId.value) return
  assignLoading.value = true
  try {
    // 直接使用字符串ID数组发送给后端，后端会处理转换
    // 允许空权限（空数组）
    const permissionIds = selectedPermissionIds.value.map(id => String(id))
    
    console.log('提交权限ID（字符串，避免精度丢失）:', permissionIds)
    await assignPermissions(currentRoleId.value, permissionIds)
    message.success('分配权限成功')
    assignDialogVisible.value = false
    loadRoleList()
    
    // 检查当前用户是否拥有被分配权限的角色
    const currentUserRoleIds = userStore.userInfo?.roleIds || []
    const currentRoleIdStr = String(currentRoleId.value)
    const hasRole = currentUserRoleIds.some(roleId => String(roleId) === currentRoleIdStr)
    
    // 如果当前用户拥有该角色，重新获取权限代码集合和路由信息
    if (hasRole) {
      try {
        // 重新获取权限代码集合
        await userStore.loadUserPermissions()
        // 重新获取路由信息
        await userStore.loadUserRoutes()
        // 重新加载路由到 router 中
        await reloadRoutes()
        message.success('权限已更新')
      } catch (error) {
        console.error('更新权限和路由失败:', error)
        // 不显示错误，因为分配权限已经成功
      }
    }
  } catch (error) {
    console.error('分配权限失败:', error)
    // 错误消息已在 request.ts 中统一处理
  } finally {
    assignLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  formData.value = {
    id: null,
    roleName: '',
    roleCode: '',
    description: ''
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
}

// 关闭分配权限对话框
const handleAssignDialogClose = () => {
  currentRoleId.value = null
  selectedPermissionIds.value = []
  unassignedCheckedKeys.value = []
  assignedCheckedKeys.value = []
  unassignedFilterText.value = ''
  assignedFilterText.value = ''
}

onMounted(() => {
  loadRoleList()
})
</script>

<style scoped>
.role-container {
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

/* 分配权限对话框样式 */
.permission-assign-container {
  padding: 20px 0;
}

.permission-trees {
  display: flex;
  gap: 20px;
  align-items: stretch;
  height: 500px; /* 固定高度 */
}

.permission-tree-panel {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  height: 100%; /* 确保高度一致 */
  min-height: 0; /* 允许flex子元素收缩 */
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0; /* 头部不收缩 */
}

.permission-tree {
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* 允许滚动 */
}

.transfer-buttons {
  display: flex;
  flex-direction: row; /* 改为左右布局 */
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  flex-shrink: 0; /* 按钮区域不收缩 */
}

.transfer-buttons .el-button {
  width: 80px;
}

.dialog-footer-center {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>

