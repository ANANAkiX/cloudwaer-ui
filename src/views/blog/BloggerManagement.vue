<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import {
  suspendBlogger,
  releaseBlogger,
  getBloggerStatuses,
  type BloggerStatus
} from '@/api/blog'
import { getUserPage, getUserById, assignRoles } from '@/api/user'
import { getRoleList } from '@/api/role'
import { message } from '@/api/request.ts'
import { ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { checkButtonPermission } from '@/utils/permission'
import type { UserInfo } from '@/types'

const can = (code: string) => checkButtonPermission('blogBlogger', code)

/** ADMIN 角色ID：不可被处置 */
const ADMIN_ROLE_ID = '1'
/** BLOGGER 角色ID 兜底值（以角色表匹配结果为准） */
const FALLBACK_BLOGGER_ROLE_ID = '4'

const loading = ref(false)
const tableData = ref<UserInfo[]>([])
const total = ref(0)
const bloggerRoleId = ref(FALLBACK_BLOGGER_ROLE_ID)
const statusMap = ref<Record<string, BloggerStatus>>({})

const query = reactive({ current: 1, size: 10, keyword: '' })

/** 列表只列博客主：命中 BLOGGER 角色的用户 */
async function resolveBloggerRoleId(): Promise<string> {
  try {
    const roles = (await getRoleList()) as { id: string | number; roleCode?: string; roleName?: string }[]
    const hit = (roles || []).find(
      r => r.roleCode === 'BLOGGER' || r.roleName === 'BLOGGER' || (r.roleName || '').includes('博客')
    )
    if (hit) return String(hit.id)
  } catch {
    /* 无角色管理权限时退回种子值 */
  }
  return FALLBACK_BLOGGER_ROLE_ID
}

async function fetchPage() {
  loading.value = true
  try {
    const res = await getUserPage(query.current, query.size, query.keyword || undefined, bloggerRoleId.value)
    const records = res.records || []
    tableData.value = records
    total.value = Number(res.total || 0)

    // 回填暂停状态（只查本页里非 ADMIN 的博客主）
    const ids = records
      .filter(u => !isAdminRow(u))
      .map(u => u.id)
      .filter((id): id is string => !!id)
    const next: Record<string, BloggerStatus> = {}
    if (ids.length) {
      try {
        const statuses = await getBloggerStatuses(ids)
        for (const s of statuses || []) next[String(s.userId)] = s
      } catch {
        /* 状态接口无权限时留空，列表仍可用 */
      }
    }
    statusMap.value = next
  } finally {
    loading.value = false
  }
}

function isAdminRow(row: UserInfo): boolean {
  return (row.roleIds || []).map(String).includes(ADMIN_ROLE_ID)
}

function statusOf(row: UserInfo): BloggerStatus | undefined {
  return statusMap.value[String(row.id)]
}

const isSuspended = (row: UserInfo) => !!statusOf(row)?.suspended

function formatDate(val?: string | null) {
  if (!val) return '—'
  return String(val).replace('T', ' ').slice(0, 16)
}

const untilText = (row: UserInfo) => {
  const s = statusOf(row)
  if (!s?.suspended) return '—'
  return s.suspendUntil ? formatDate(s.suspendUntil) : '永久'
}

function onSearch() {
  query.current = 1
  fetchPage()
}

function onReset() {
  query.keyword = ''
  onSearch()
}

// ===== 暂停 =====
const suspendVisible = ref(false)
const suspendSaving = ref(false)
const suspendForm = reactive({
  userId: '' as string,
  username: '',
  until: '',
  reason: ''
})

function openSuspend(row: UserInfo) {
  const s = statusOf(row)
  suspendForm.userId = String(row.id)
  suspendForm.username = row.username
  // 编辑已有暂停时回填
  suspendForm.until = s?.suspended && s.suspendUntil ? String(s.suspendUntil).slice(0, 16) : ''
  suspendForm.reason = s?.suspendReason || ''
  suspendVisible.value = true
}

async function confirmSuspend() {
  if (!suspendForm.userId) return
  if (suspendForm.reason && suspendForm.reason.length > 200) {
    message.warning('原因最长 200 字')
    return
  }
  suspendSaving.value = true
  try {
    await suspendBlogger({
      userId: suspendForm.userId,
      suspendUntil: suspendForm.until ? suspendForm.until : null,
      reason: suspendForm.reason || undefined
    })
    message.success(suspendForm.until ? '已暂停至指定时间' : '已永久暂停，发布将被拦截')
    suspendVisible.value = false
    await fetchPage()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败')
  } finally {
    suspendSaving.value = false
  }
}

async function onRelease(row: UserInfo) {
  try {
    await ElMessageBox.confirm(
      `解除「${row.username}」的暂停？解除后可立即重新发布文章。`,
      '解除暂停',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await releaseBlogger(String(row.id))
    message.success('已解除暂停')
    await fetchPage()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败')
  }
}

// ===== 取消博客主 =====
async function onRevoke(row: UserInfo) {
  try {
    await ElMessageBox.confirm(
      `取消「${row.username}」的博客主权限？其将无法再管理/发布文章（已发布内容保留）。`,
      '取消博客主',
      { confirmButtonText: '确定取消', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    const user = await getUserById(String(row.id))
    const roleIds = (user.roleIds || []).map(String)
    const kept = roleIds.filter(id => id !== bloggerRoleId.value)
    if (kept.length === roleIds.length) {
      message.warning('该用户未持有博客主角色')
      return
    }
    await assignRoles(String(row.id), kept)
    message.success('已取消博客主权限，Token 权限已即时刷新')
    await fetchPage()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '操作失败')
  }
}

onMounted(async () => {
  bloggerRoleId.value = await resolveBloggerRoleId()
  await fetchPage()
})
</script>

<template>
  <div class="blogger-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>博客主管理</span>
          <div class="card-actions">
            <el-input
              v-model="query.keyword"
              placeholder="搜索用户名/昵称/邮箱"
              clearable
              style="width: 220px"
              @keyup.enter="onSearch"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
            <el-button :icon="Refresh" @click="onReset">重置</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column prop="username" label="用户名" width="130" align="center" />
        <el-table-column prop="nickname" label="昵称" width="130" align="center" />
        <el-table-column prop="email" label="邮箱" min-width="160" align="center" show-overflow-tooltip />
        <el-table-column label="角色" width="110" align="center">
          <template #default>
            <el-tag size="small" type="success">BLOGGER</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="暂停状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="isSuspended(row)" size="small" type="danger">已暂停</el-tag>
            <el-tag v-else size="small" type="info">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="暂停至" width="150" align="center">
          <template #default="{ row }">{{ isSuspended(row) ? untilText(row) : '—' }}</template>
        </el-table-column>
        <el-table-column label="暂停原因" min-width="140" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ statusOf(row)?.suspendReason || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="!isAdminRow(row)">
              <el-button
                v-if="can('blog:blogger:suspend') && !isSuspended(row)"
                link
                type="danger"
                @click="openSuspend(row)"
              >
                暂停
              </el-button>
              <el-button
                v-if="can('blog:blogger:suspend') && isSuspended(row)"
                link
                type="success"
                @click="onRelease(row)"
              >
                解封
              </el-button>
              <el-button v-if="can('blog:blogger:revoke')" link type="warning" @click="onRevoke(row)">
                取消博客主
              </el-button>
              <span v-if="!can('blog:blogger:suspend') && !can('blog:blogger:revoke')" class="dim">—</span>
            </template>
            <span v-else class="dim">管理员账号不可处置</span>
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

    <el-dialog v-model="suspendVisible" :title="`暂停博客主 · ${suspendForm.username}`" width="520px">
      <el-form label-width="90px">
        <el-form-item label="暂停至">
          <el-date-picker
            v-model="suspendForm.until"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm"
            placeholder="留空表示永久暂停"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="原因">
          <el-input
            v-model="suspendForm.reason"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="将提示给本人，如：违规内容整改"
          />
        </el-form-item>
      </el-form>
      <p class="dialog-tip">暂停期间该用户无法发布/重新上线文章；到期后自动恢复，无需手动解封。已发布内容不受影响。</p>
      <template #footer>
        <el-button @click="suspendVisible = false">取消</el-button>
        <el-button type="primary" :loading="suspendSaving" @click="confirmSuspend">确定暂停</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.blogger-page {
  padding: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
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
.dialog-tip {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}
.dim {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
</style>
