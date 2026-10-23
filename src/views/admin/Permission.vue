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

      <div class="master-detail" v-loading="loading">
        <!-- 左：菜单 / 页面树（不含操作） -->
        <aside class="left-panel">
          <div class="panel-title">
            <span>权限结构</span>
            <span class="panel-sub">菜单 / 页面</span>
          </div>
          <el-tree
            ref="treeRef"
            :data="leftTreeData"
            node-key="id"
            :props="{ label: 'permissionName', children: 'children' }"
            highlight-current
            default-expand-all
            :expand-on-click-node="false"
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <div class="tree-node">
                <el-tag
                  size="small"
                  :type="getPermissionTypeTag(data.permissionType)"
                  class="type-tag"
                >
                  {{ dictLabelByValue('permission_type', data.permissionType) }}
                </el-tag>
                <span class="node-label">{{ data.permissionName }}</span>
              </div>
            </template>
          </el-tree>
          <div v-if="!leftTreeData.length" class="empty-tip">暂无菜单/页面权限</div>
        </aside>

        <!-- 右：选中节点详情 + 子权限 -->
        <section class="right-panel">
          <template v-if="selectedNode">
            <div class="detail-header">
              <div class="detail-meta">
                <h3 class="detail-name">{{ selectedNode.permissionName }}</h3>
                <el-tag size="small" :type="getPermissionTypeTag(selectedNode.permissionType)">
                  {{ dictLabelByValue('permission_type', selectedNode.permissionType) }}
                </el-tag>
                <code class="detail-code">{{ selectedNode.permissionCode }}</code>
              </div>
              <div class="detail-actions">
                <el-button v-if="canAdd" link type="primary" @click="handleAddChild(selectedNode)">
                  <el-icon><Plus /></el-icon>
                  新增子权限
                </el-button>
                <el-button v-if="canEdit" link type="primary" @click="handleEdit(selectedNode)">
                  编辑
                </el-button>
                <el-button v-if="canDelete" link type="danger" @click="handleDelete(selectedNode)">
                  删除
                </el-button>
              </div>
            </div>

            <div class="detail-body">
              <el-descriptions :column="2" border size="small" class="detail-desc">
                <el-descriptions-item label="路由路径">
                  {{ selectedNode.routePath || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="排序">
                  {{ selectedNode.sort ?? 0 }}
                </el-descriptions-item>
                <el-descriptions-item label="描述" :span="2">
                  {{ selectedNode.description || '-' }}
                </el-descriptions-item>
              </el-descriptions>

              <div class="children-section">
                <div class="section-title">
                  <span>子权限</span>
                  <span class="section-count">{{ selectedChildren.length }}</span>
                </div>
                <el-table
                  :data="selectedChildren"
                  row-key="id"
                  border
                  size="small"
                  style="width: 100%"
                  empty-text="暂无子权限"
                >
                  <el-table-column prop="permissionName" label="名称" min-width="140" />
                  <el-table-column prop="permissionCode" label="编码" min-width="180" show-overflow-tooltip />
                  <el-table-column prop="permissionType" label="类型" width="90" align="center">
                    <template #default="scope">
                      <el-tag size="small" :type="getPermissionTypeTag(scope.row.permissionType)">
                        {{ dictLabelByValue('permission_type', scope.row.permissionType) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="sort" label="排序" width="70" align="center" />
                  <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip />
                  <el-table-column label="操作" width="200" align="center" fixed="right">
                    <template #default="scope">
                      <el-button v-if="canAdd" link type="primary" @click="handleAddChild(scope.row)">
                        新增
                      </el-button>
                      <el-button v-if="canEdit" link type="primary" @click="handleEdit(scope.row)">
                        编辑
                      </el-button>
                      <el-button v-if="canDelete" link type="danger" @click="handleDelete(scope.row)">
                        删除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </template>

          <el-empty v-else description="请从左侧选择菜单或页面权限" />
        </section>
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
            :data="leftTreeData"
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
import { ref, computed, onMounted, nextTick, watch } from 'vue'
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

/** 权限类型：1 菜单 / 2 页面 / 3 操作 */
const TYPE_MENU = 1
const TYPE_PAGE = 2
const TYPE_ACTION = 3

const loading = ref<boolean>(false)
const submitLoading = ref<boolean>(false)
const dialogVisible = ref<boolean>(false)
const dialogTitle = ref<string>('新增权限')
const formRef = ref<FormInstance | null>(null)
const tableData = ref<PermissionInfo[]>([])
const searchKeyword = ref<string>('')
const selectedId = ref<number | string | null>(null)
const nodeMap = ref<Map<string | number, PermissionInfo>>(new Map())
const treeRef = ref<any>(null)

const { dicts: permissionDicts } = useDict(['permission_type'])

const dictLabelByValue = (type: string, value: any) => {
  const list = permissionDicts.value[type] || []
  const strVal = value == null ? '' : String(value)
  const found = list.find(item => String(item.value) === strVal || String(item.code) === strVal)
  return found?.label || '-'
}

const getPermissionTypeTag = (permissionType: number) => {
  const t = Number(permissionType)
  if (t === TYPE_MENU) return 'success'
  if (t === TYPE_PAGE) return 'warning'
  if (t === TYPE_ACTION) return 'info'
  return 'info'
}

const canAdd = computed(() => checkButtonPermission('permission', 'admin:permission:add'))
const canEdit = computed(() => checkButtonPermission('permission', 'admin:permission:edit'))
const canDelete = computed(() => checkButtonPermission('permission', 'admin:permission:delete'))

/** 左侧树：去掉操作（type=3）节点，只保留菜单/页面骨架 */
const leftTreeData = computed(() => {
  const filterNodes = (nodes: PermissionInfo[]): PermissionInfo[] => {
    const result: PermissionInfo[] = []
    for (const node of nodes) {
      const t = Number((node as any).permissionType)
      if (t === TYPE_ACTION) continue
      const children = node.children ? filterNodes(node.children) : []
      result.push({ ...node, children })
    }
    return result
  }
  return filterNodes(tableData.value)
})

const selectedNode = computed(() => {
  if (selectedId.value == null) return null
  return nodeMap.value.get(selectedId.value) || null
})

/** 选中节点的直接子权限（含操作），从全量树 map 取 */
const selectedChildren = computed(() => {
  const node = selectedNode.value
  if (!node) return []
  return (node.children as PermissionInfo[]) || []
})

const formData = ref({
  id: null as any,
  permissionName: '',
  permissionCode: '',
  permissionType: 1 as number,
  parentId: null as any,
  routePath: '',
  icon: '',
  sort: 0,
  description: ''
})

const rules = computed(() => ({
  permissionName: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  permissionCode: [{ required: true, message: '请输入权限编码', trigger: 'blur' }],
  permissionType: [{ required: true, message: '请选择权限类型', trigger: 'change' }]
}))

const buildNodeMap = (nodes: PermissionInfo[], map = new Map<string | number, PermissionInfo>()) => {
  for (const node of nodes || []) {
    map.set(node.id, node)
    if (node.children?.length) {
      buildNodeMap(node.children, map)
    }
  }
  return map
}

/** 找到第一个适合作为默认选中的菜单/页面 */
const findDefaultSelected = (nodes: PermissionInfo[]): PermissionInfo | null => {
  for (const node of nodes || []) {
    const t = Number((node as any).permissionType)
    if (t === TYPE_MENU || t === TYPE_PAGE) {
      return node
    }
    if (node.children?.length) {
      const found = findDefaultSelected(node.children)
      if (found) return found
    }
  }
  return null
}

const loadPermissionTree = async () => {
  loading.value = true
  try {
    const data = await getPermissionTree(searchKeyword.value || undefined)
    tableData.value = data || []
    nodeMap.value = buildNodeMap(tableData.value)

    // 保持选中；失效则选第一个菜单/页面
    if (selectedId.value == null || !nodeMap.value.has(selectedId.value)) {
      const first = findDefaultSelected(tableData.value)
      selectedId.value = first ? first.id : null
      nextTick(() => {
        if (first) {
          // el-tree 需要节点对象在 leftTree 中存在
        }
      })
    }
  } catch (error) {
    // 错误消息已在 request.ts 中统一处理
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  loadPermissionTree()
}

const handleNodeClick = (row: PermissionInfo) => {
  selectedId.value = row.id
}

// 权限类型变化处理
const handlePermissionTypeChange = (value) => {
  if (Number(value) === TYPE_ACTION) {
    formData.value.routePath = ''
  }
}

const handleAdd = () => {
  dialogTitle.value = '新增权限'
  resetForm()
  // 若当前有选中节点，默认挂在该节点下
  if (selectedNode.value) {
    formData.value.parentId = selectedNode.value.id
  }
  dialogVisible.value = true
}

const handleAddChild = (row: PermissionInfo) => {
  dialogTitle.value = '新增权限'
  resetForm()
  formData.value.parentId = row.id
  dialogVisible.value = true
}

const handleEdit = async (row: PermissionInfo) => {
  dialogTitle.value = '编辑权限'
  resetForm()
  formData.value = {
    id: row.id,
    permissionName: row.permissionName,
    permissionCode: row.permissionCode,
    permissionType: Number((row as any).permissionType),
    parentId: row.parentId,
    routePath: row.routePath || '',
    icon: row.icon || '',
    sort: row.sort || 0,
    description: row.description || ''
  }
  dialogVisible.value = true
}

const handleDelete = async (row: PermissionInfo) => {
  try {
    await ElMessageBox.confirm('确定要删除该权限吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deletePermission(row.id)
    message.success('删除成功')
    if (selectedId.value === row.id) {
      selectedId.value = null
    }
    loadPermissionTree()
  } catch (error) {
    if (error !== 'cancel') {
      // handled globally
    }
  }
}

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

const handleDialogClose = () => {
  resetForm()
}

// 同步 el-tree 当前高亮
watch(selectedId, (val) => {
  if (val != null && treeRef.value) {
    treeRef.value.setCurrentKey(val)
  }
}, { immediate: false })

onMounted(async () => {
  await loadPermissionTree()
  if (selectedId.value != null && treeRef.value) {
    treeRef.value.setCurrentKey(selectedId.value)
  }
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

.master-detail {
  display: flex;
  gap: 16px;
  min-height: 520px;
  align-items: stretch;
}

.left-panel {
  width: 280px;
  flex-shrink: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 12px;
  background: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
}

.panel-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 10px;
  padding: 0 4px;
}

.panel-sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding-right: 8px;
}

.type-tag {
  flex-shrink: 0;
}

.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-tip {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: center;
  padding: 24px 0;
}

.right-panel {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 16px;
  background: var(--el-fill-color-blank);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}

.detail-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.detail-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 2px 8px;
  border-radius: 4px;
}

.detail-actions {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
}

.detail-desc {
  margin-bottom: 16px;
}

.children-section {
  margin-top: 4px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 10px;
}

.section-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 0 8px;
  border-radius: 10px;
}

:deep(.el-tree) {
  --el-tree-node-hover-bg-color: var(--el-fill-color-light);
}

:deep(.el-tree-node__content) {
  height: 36px;
  border-radius: 6px;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background: var(--el-color-primary-light-9);
}
</style>
