<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import {
  pageAuthorApplies,
  handleAuthorApply,
  type AuthorApply
} from '@/api/blog'
import { getUserById, assignRoles } from '@/api/user'
import { getRoleList } from '@/api/role'
import { message } from '@/api/request.ts'
import { ElMessageBox } from 'element-plus'
import { Search, Refresh, Check, Close } from '@element-plus/icons-vue'
import { checkButtonPermission } from '@/utils/permission'

const loading = ref(false)
const tableData = ref<AuthorApply[]>([])
const total = ref(0)
const roles = ref<{ id: string | number; roleCode?: string; roleName?: string }[]>([])

const can = (code: string) => checkButtonPermission('blogAuthor', code)

const query = reactive({
  current: 1,
  size: 10,
  keyword: '',
  applyStatus: undefined as number | undefined
})

const statusMap: Record<number, string> = {
  0: '待处理',
  1: '已通过',
  2: '已拒绝'
}

const statusType = (s: number): 'warning' | 'success' | 'danger' => {
  if (s === 1) return 'success'
  if (s === 2) return 'danger'
  return 'warning'
}

const formatDate = (val?: string | null) => {
  if (!val) return '-'
  return String(val).replace('T', ' ').slice(0, 16)
}

const bloggerRoleId = computed(() => {
  const hit = roles.value.find(
    r => r.roleCode === 'BLOGGER' || r.roleName === 'BLOGGER' || (r.roleName || '').includes('博客')
  )
  return hit ? String(hit.id) : ''
})

const fetchPage = async () => {
  loading.value = true
  try {
    const res = await pageAuthorApplies({
      current: query.current,
      size: query.size,
      keyword: query.keyword || undefined,
      applyStatus: query.applyStatus
    })
    tableData.value = res.records || []
    total.value = Number(res.total || 0)
  } finally {
    loading.value = false
  }
}

const fetchRoles = async () => {
  try {
    roles.value = ((await getRoleList()) as typeof roles.value) || []
    return true
  } catch (e) {
    roles.value = []
    message.error(e instanceof Error ? e.message : '加载角色失败（需角色管理权限）')
    return false
  }
}

const onSearch = () => {
  query.current = 1
  fetchPage()
}

const onReset = () => {
  query.keyword = ''
  query.applyStatus = undefined
  onSearch()
}

const onApprove = async (row: AuthorApply) => {
  try {
    await ElMessageBox.confirm(
      `确定通过「${row.username}」的博客主申请吗？将自动分配 BLOGGER 角色。`,
      '通过申请',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  // 仅通过时拉取角色列表（避免进页就调 /admin/role/list；无 admin:role:view 时此处才 403）
  if (!roles.value.length) {
    const ok = await fetchRoles()
    if (!ok) return
  }

  const bloggerId = bloggerRoleId.value
  if (!bloggerId) {
    message.error('未找到 BLOGGER 角色，请先在角色管理初始化')
    return
  }

  await handleAuthorApply(String(row.id), 1, '管理端通过并分配 BLOGGER')

  const user = await getUserById(String(row.userId))
  const currentRoleIds = (user.roleIds || []).map(String)
  if (!currentRoleIds.includes(bloggerId)) {
    currentRoleIds.push(bloggerId)
    await assignRoles(String(row.userId), currentRoleIds)
  }

  message.success('已通过并分配博客主角色，权限已即时刷新')
  await fetchPage()
}

const onReject = async (row: AuthorApply) => {
  let remark = ''
  try {
    const { value } = await ElMessageBox.prompt('请输入拒绝备注（可选）', '拒绝申请', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '理由说明'
    })
    remark = value || ''
  } catch {
    return
  }
  await handleAuthorApply(String(row.id), 2, remark)
  message.success('已拒绝')
  await fetchPage()
}

onMounted(fetchPage)
</script>

<template>
  <div class="blog-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>博客主申请</span>
          <div class="card-actions">
            <el-input
              v-model="query.keyword"
              placeholder="搜索用户名/昵称/理由"
              clearable
              style="width: 220px"
              @keyup.enter="onSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="query.applyStatus" placeholder="状态" clearable style="width: 130px">
              <el-option label="待处理" :value="0" />
              <el-option label="已通过" :value="1" />
              <el-option label="已拒绝" :value="2" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
            <el-button :icon="Refresh" @click="onReset">重置</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column prop="username" label="用户名" width="120" align="center" />
        <el-table-column prop="nickname" label="昵称" width="120" align="center" />
        <el-table-column prop="reason" label="申请理由" min-width="180" align="center" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.applyStatus)" size="small">
              {{ statusMap[row.applyStatus] || row.applyStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="160" align="center">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column prop="handleUser" label="处理人" width="110" align="center">
          <template #default="{ row }">{{ row.handleUser || '-' }}</template>
        </el-table-column>
        <el-table-column label="处理时间" width="160" align="center">
          <template #default="{ row }">{{ formatDate(row.handleTime) }}</template>
        </el-table-column>
        <el-table-column prop="handleRemark" label="备注" min-width="120" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.handleRemark || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <template v-if="row.applyStatus === 0">
              <el-button
                v-if="can('blog:author:handle')"
                link
                type="success"
                :icon="Check"
                @click="onApprove(row)"
              >
                通过
              </el-button>
              <el-button
                v-if="can('blog:author:handle')"
                link
                type="danger"
                :icon="Close"
                @click="onReject(row)"
              >
                拒绝
              </el-button>
            </template>
            <span v-else class="muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @change="fetchPage"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.blog-page {
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
  flex-wrap: wrap;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.muted {
  color: #9ca3af;
  font-size: 12px;
}
</style>
