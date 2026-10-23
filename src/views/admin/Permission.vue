<template>
  <div class="permission-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>权限管理</span>
          <div style="display: flex; gap: 10px; align-items: center">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索权限名称、权限代码、权限描述"
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
              新增权限
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :default-expand-all="!!searchKeyword"
        ref="tableRef"
        :data="tableData"
        row-key="id"
        :tree-props="{ children: 'children' }"
        border
        style="width: 100%"
        v-loading="loading"
        @row-click="handleRowClick"
      >
        <el-table-column prop="permissionName" label="权限名称" width="200" align="center" />
        <el-table-column prop="permissionCode" label="权限编码" width="200" align="center" />
         <el-table-column prop="permissionType" label="权限类型" width="120" align="center">
           <template #default="scope">
             <el-tag :type="getPermissionTypeTag(scope.row.permissionType)">
               {{ dictLabelByValue('permission_type', scope.row.permissionType) }}
             </el-tag>
           </template>
         </el-table-column>

        <el-table-column prop="routePath" label="路由路径" width="200" align="center" />

        <el-table-column prop="icon" label="图标" width="120" align="center">
          <template #default="scope">
            <el-icon v-if="scope.row.icon" :size="20">
              <component :is="getIconComponent(scope.row.icon)" />
            </el-icon>
            <span v-else style="color: #909399">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column prop="description" label="描述" align="center" />
        <el-table-column label="操作" width="250" fixed="right" align="center">
          <template #default="scope">
            <el-button v-if="canAdd" link type="primary" @click="handleAddChild(scope.row)">
              <el-icon><Plus /></el-icon>
              新增
            </el-button>
            <el-button v-if="canEdit" link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button v-if="canDelete" link type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
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
        <el-form-item label="权限名称" prop="permissionName">
          <el-input v-model="formData.permissionName" placeholder="请输入权限名称" />
        </el-form-item>
        <el-form-item label="权限编码" prop="permissionCode">
          <el-input v-model="formData.permissionCode" placeholder="请输入权限编码" />
        </el-form-item>
         <el-form-item label="权限类型" prop="permissionType">
           <DictSelect
             v-model="formData.permissionType"
             type="permission_type"
             value-field="value"
             label-field="label"
             placeholder="请选择权限类型"
             style="width: 100%"
             @change="handlePermissionTypeChange"
           />
         </el-form-item>

        <el-form-item label="父权限" prop="parentId">
          <el-tree-select
            v-model="formData.parentId"
            :data="tableData"
            :props="{ label: 'permissionName', value: 'id', children: 'children' }"
            placeholder="请选择父权限（可选）"
            clearable
            check-strictly
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item 
          v-if="Number(formData.permissionType) === 1 || Number(formData.permissionType) === 2"
          label="路由路径" 
          prop="routePath"
        >
          <el-input v-model="formData.routePath" placeholder="请输入路由路径（菜单/页面权限需要）" />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <IconSelector v-model="formData.icon" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="formData.sort" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入权限描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessageBox, FormInstance } from 'element-plus'
import { message } from '@/api/request.ts'
import { Plus, Search } from '@element-plus/icons-vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { getPermissionTree, savePermission, updatePermission, deletePermission } from '@/api/permission.ts'
import IconSelector from '@/components/IconSelector.vue'
import DictSelect from '@/components/DictSelect.vue'
import { useDict } from '@/utils/dict'

import { checkButtonPermission } from '@/utils/permission'
import { PermissionInfo } from '@/types'

const loading = ref<boolean>(false)
const submitLoading = ref<boolean>(false)
const dialogVisible = ref<boolean>(false)
const dialogTitle = ref<string>('新增权限')
const formRef = ref<FormInstance | null>(null)
const tableData = ref<PermissionInfo[]>([])
const flatTreeOptions = ref<any[]>([])
const searchKeyword = ref<string>('')
const tableRef = ref<any>(null)

const { dicts: permissionDicts } = useDict(['permission_type'])

const dictLabelByValue = (type: string, value: any) => {
  const list = permissionDicts.value[type] || []
  const strVal = value == null ? '' : String(value)
  const found = list.find(item => String(item.value) === strVal || String(item.code) === strVal)
  return found?.label || '-'
}

const getPermissionTypeTag = (permissionType: number) => {
  if (permissionType === 1) return 'success'
  if (permissionType === 2) return 'warning'
  if (permissionType === 3) return 'info'
  return 'info'
}

// 权限检查
const canAdd = computed(() => checkButtonPermission('permission', 'admin:permission:add'))
const canEdit = computed(() => checkButtonPermission('permission', 'admin:permission:edit'))
const canDelete = computed(() => checkButtonPermission('permission', 'admin:permission:delete'))

const formData = ref({
  id: null,
  permissionName: '',
  permissionCode: '',
  permissionType: 1,
  parentId: null,
  routePath: '',
  icon: '',
  sort: 0,
  description: ''
})

// 动态验证规则
const rules = computed(() => {
  const baseRules = {
    permissionName: [
      { required: true, message: '请输入权限名称', trigger: 'blur' }
    ],
    permissionCode: [
      { required: true, message: '请输入权限编码', trigger: 'blur' }
    ],
    permissionType: [
      { required: true, message: '请选择权限类型', trigger: 'change' }
    ]
  }
  
  // 路由路径允许为空（不再强制要求）
  
  return baseRules
})


// 加载权限树
const loadPermissionTree = async () => {
  loading.value = true
  try {
    const data = await getPermissionTree(searchKeyword.value || undefined)
    tableData.value = data || []
    // 用于下拉选择器的数据（扁平化处理）
    flatTreeOptions.value = flattenTree(data || [])
    // 如果有搜索关键词，默认展开所有节点
    if (searchKeyword.value && tableRef.value) {
      nextTick(() => {
        // 展开所有节点
        const toggleRowExpansion = (rows) => {
          if (Array.isArray(rows)) {
            rows.forEach(row => {
              tableRef.value?.toggleRowExpansion(row, true)
              if (row.children && row.children.length > 0) {
                toggleRowExpansion(row.children)
              }
            })
          }
        }
        toggleRowExpansion(tableData.value)
      })
    }
  } catch (error) {
    // 错误消息已在 request.ts 中统一处理
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  loadPermissionTree()
}

// 点击行展开/收缩
const handleRowClick = (row, column, event) => {
  // 如果点击的是操作列或操作按钮，不触发展开/收缩
  if (event.target.closest('.el-button') || event.target.closest('.el-table__cell:last-child')) {
    return
  }
  
  // 只有有子节点的行才能展开/收缩
  if (tableRef.value && row.children && row.children.length > 0) {
    // 切换该行的展开/收缩状态
    tableRef.value.toggleRowExpansion(row)
  }
}

// 扁平化树形数据
const flattenTree = (tree) => {
  const result = []
  const flatten = (nodes) => {
    nodes.forEach(node => {
      result.push({ ...node, children: undefined })
      if (node.children && node.children.length > 0) {
        flatten(node.children)
      }
    })
  }
  flatten(tree)
  return result
}

// 权限类型变化处理
const handlePermissionTypeChange = (value) => {
  if (value === 3) {
    // 操作：清空路由路径
    formData.value.routePath = ''
  }
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增权限'
  resetForm()
  dialogVisible.value = true
}

// 新增子权限（从操作栏点击）
const handleAddChild = (row) => {
  dialogTitle.value = '新增权限'
  resetForm()
  // 自动设置当前行为父权限
  formData.value.parentId = row.id
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row) => {
  dialogTitle.value = '编辑权限'
  resetForm()
  // 复制数据，排除children
  formData.value = {
    id: row.id,
    permissionName: row.permissionName,
    permissionCode: row.permissionCode,
    permissionType: row.permissionType,
    parentId: row.parentId,
    routePath: row.routePath || '',
    icon: row.icon || '',
    sort: row.sort || 0,
    description: row.description || ''
  }
  dialogVisible.value = true
}

// 删除
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该权限吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deletePermission(row.id)
    message.success('删除成功')
    loadPermissionTree()
  } catch (error) {
    if (error !== 'cancel') {
      // 错误消息已在 request.ts 中统一处理
    }
  }
}

// 提交
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        if (formData.value.id) {
          await updatePermission(formData.value)
          message.success('更新成功')
        } else {
          await savePermission(formData.value)
          message.success('新增成功')
        }
        dialogVisible.value = false
        loadPermissionTree()
      } catch (error) {
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 重置表单
const resetForm = () => {
  formData.value = {
    id: null,
    permissionName: '',
    permissionCode: '',
    permissionType: 1,
    parentId: null,
    routePath: '',
    icon: '',
    sort: 0,
    description: ''
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 对话框关闭
const handleDialogClose = () => {
  resetForm()
}

// 获取图标组件
const getIconComponent = (iconName) => {
  if (!iconName) return null
  return ElementPlusIconsVue[iconName] || null
}

onMounted(() => {
  loadPermissionTree()
})
</script>

<style scoped>
.permission-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 表格展开/收缩动画 */
:deep(.el-table__body-wrapper) {
  transition: height 0.3s ease;
}

/* 表格行展开/收缩动画 */
:deep(.el-table__row) {
  transition: background-color 0.2s ease;
}

/* 展开图标旋转动画 */
:deep(.el-table__expand-icon) {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-block;
}

:deep(.el-table__expand-icon--expanded) {
  transform: rotate(90deg);
}

/* 子行显示/隐藏动画 - 使用CSS过渡 */
:deep(.el-table__body tr[class*="el-table__row--level"]) {
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 展开时的动画 */
@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    max-height: 1000px;
    transform: translateY(0);
  }
}

/* 收缩时的动画 */
@keyframes slideUp {
  from {
    opacity: 1;
    max-height: 1000px;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    max-height: 0;
    transform: translateY(-5px);
  }
}

/* 行点击时的视觉反馈 */
:deep(.el-table__row) {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

/* 表格单元格内容过渡 */
:deep(.el-table__cell) {
  transition: opacity 0.2s ease;
}

</style>
