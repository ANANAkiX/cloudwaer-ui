<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  pageComments,
  auditComment,
  deleteComment,
  pageArticles,
  auditArticle,
  pageAuthorApplies,
  handleAuthorApply,
  type BlogComment,
  type BlogArticle,
  type AuthorApply
} from '@/api/blog'
import { getUserById, assignRoles } from '@/api/user'
import { getRoleList } from '@/api/role'
import { message } from '@/api/request.ts'
import { ElMessageBox } from 'element-plus'
import { Search, Refresh, Check, Close } from '@element-plus/icons-vue'
import { checkButtonPermission } from '@/utils/permission'

const can = (code: string) => checkButtonPermission('blogComment', code)

/** 待办类型：文章发布 / 评论 / 博客主申请 */
const tab = ref<'article' | 'comment' | 'author'>('article')

// ===== 文章审核 =====
const articleLoading = ref(false)
const articles = ref<BlogArticle[]>([])
const articleTotal = ref(0)
const articleQuery = reactive({
  current: 1,
  size: 20,
  keyword: '',
  publishStatus: 3 as number | undefined
})

const publishStatusMap: Record<number, string> = {
  0: '草稿',
  1: '已发布',
  2: '已下线',
  3: '待审核'
}
const publishStatusType = (
  s: number
): 'warning' | 'success' | 'info' | 'danger' =>
  s === 3 ? 'warning' : s === 1 ? 'success' : s === 0 ? 'info' : 'info'

const fetchArticles = async () => {
  articleLoading.value = true
  try {
    const res = await pageArticles({
      current: articleQuery.current,
      size: articleQuery.size,
      keyword: articleQuery.keyword || undefined,
      publishStatus: articleQuery.publishStatus
    })
    articles.value = res.records || []
    articleTotal.value = Number(res.total || 0)
  } finally {
    articleLoading.value = false
  }
}

const onArticleSearch = () => {
  articleQuery.current = 1
  fetchArticles()
}

const onArticleReset = () => {
  articleQuery.keyword = ''
  articleQuery.publishStatus = 3
  onArticleSearch()
}

const onAuditArticle = async (row: BlogArticle, auditStatus: number) => {
  if (auditStatus === 2) {
    let remark = ''
    try {
      const res = await ElMessageBox.prompt('拒绝原因（将反馈给作者，可留空）', '拒绝文章', {
        confirmButtonText: '确定拒绝',
        cancelButtonText: '取消',
        inputPlaceholder: '如：正文含广告链接，请修改后重新发布',
        inputValidator: (v: string) => (v || '').length <= 200 || '最多200字'
      })
      remark = res.value || ''
    } catch {
      return
    }
    await auditArticle(String(row.id), 2, remark || undefined)
    message.success('已拒绝，文章退回作者草稿')
  } else {
    try {
      await ElMessageBox.confirm('通过后该文章将立即对前台可见，确定通过吗？', '通过文章', {
        confirmButtonText: '确定通过',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }
    await auditArticle(String(row.id), 1)
    message.success('已通过，文章已上线')
  }
  await fetchArticles()
}

// ===== 评论审核 =====
const commentLoading = ref(false)
const comments = ref<BlogComment[]>([])
const commentTotal = ref(0)
const commentQuery = reactive({
  current: 1,
  size: 20,
  keyword: '',
  auditStatus: undefined as number | undefined
})

const statusMap: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已拒绝' }
const statusType = (s: number): 'warning' | 'success' | 'danger' =>
  s === 1 ? 'success' : s === 2 ? 'danger' : 'warning'

const formatDate = (val?: string | null) => {
  if (!val) return '-'
  return String(val).replace('T', ' ').slice(0, 16)
}

const fetchComments = async () => {
  commentLoading.value = true
  try {
    const res = await pageComments({
      current: commentQuery.current,
      size: commentQuery.size,
      keyword: commentQuery.keyword || undefined,
      auditStatus: commentQuery.auditStatus
    })
    comments.value = res.records || []
    commentTotal.value = Number(res.total || 0)
  } finally {
    commentLoading.value = false
  }
}

const onCommentSearch = () => {
  commentQuery.current = 1
  fetchComments()
}

const onCommentReset = () => {
  commentQuery.keyword = ''
  commentQuery.auditStatus = undefined
  onCommentSearch()
}

const onAuditComment = async (row: BlogComment, auditStatus: number) => {
  const action = auditStatus === 1 ? '通过' : '拒绝'
  try {
    await ElMessageBox.confirm(`确定${action}该评论吗？`, '审核', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await auditComment(String(row.id), auditStatus)
  message.success(`已${action}`)
  await fetchComments()
}

const onDeleteComment = async (row: BlogComment) => {
  try {
    await ElMessageBox.confirm('删除该评论及其楼中楼？', '删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await deleteComment(String(row.id))
  message.success('已删除')
  await fetchComments()
}

const onTabChange = (name: string | number) => {
  if (name === 'article') {
    fetchArticles()
  } else if (name === 'author') {
    fetchAuthors()
  } else {
    fetchComments()
  }
}

// ===== 博客主申请（原独立页并入） =====
const authorLoading = ref(false)
const authors = ref<AuthorApply[]>([])
const authorTotal = ref(0)
const authorRoles = ref<{ id: string | number; roleCode?: string; roleName?: string }[]>([])
const authorQuery = reactive({
  current: 1,
  size: 20,
  keyword: '',
  applyStatus: undefined as number | undefined
})

const applyStatusMap: Record<number, string> = { 0: '待处理', 1: '已通过', 2: '已拒绝' }
const applyStatusType = (s: number): 'warning' | 'success' | 'danger' =>
  s === 1 ? 'success' : s === 2 ? 'danger' : 'warning'

const fetchAuthors = async () => {
  authorLoading.value = true
  try {
    const res = await pageAuthorApplies({
      current: authorQuery.current,
      size: authorQuery.size,
      keyword: authorQuery.keyword || undefined,
      applyStatus: authorQuery.applyStatus
    })
    authors.value = res.records || []
    authorTotal.value = Number(res.total || 0)
  } finally {
    authorLoading.value = false
  }
}

const onAuthorSearch = () => {
  authorQuery.current = 1
  fetchAuthors()
}

const onAuthorReset = () => {
  authorQuery.keyword = ''
  authorQuery.applyStatus = undefined
  onAuthorSearch()
}

/** 惰性拉角色表（需 admin:role:view；仅点「通过」时才触发） */
const ensureAuthorRoles = async () => {
  if (authorRoles.value.length) return true
  try {
    authorRoles.value = ((await getRoleList()) as typeof authorRoles.value) || []
    return true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载角色失败（需角色管理权限）')
    return false
  }
}

const bloggerRoleId = () => {
  const hit = authorRoles.value.find(
    r => r.roleCode === 'BLOGGER' || r.roleName === 'BLOGGER' || (r.roleName || '').includes('博客')
  )
  return hit ? String(hit.id) : ''
}

const onApproveAuthor = async (row: AuthorApply) => {
  try {
    await ElMessageBox.confirm(
      `确定通过「${row.username}」的博客主申请吗？将自动分配 BLOGGER 角色。`,
      '通过申请',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  if (!(await ensureAuthorRoles())) return
  const bloggerId = bloggerRoleId()
  if (!bloggerId) {
    message.error('未找到 BLOGGER 角色，请先在角色管理初始化')
    return
  }
  await handleAuthorApply(String(row.id), 1, '审核中心通过并分配 BLOGGER')
  const user = await getUserById(String(row.userId))
  const roleIds = (user.roleIds || []).map(String)
  if (!roleIds.includes(bloggerId)) {
    roleIds.push(bloggerId)
    await assignRoles(String(row.userId), roleIds)
  }
  message.success('已通过并分配博客主角色，权限已即时刷新')
  await fetchAuthors()
}

const onRejectAuthor = async (row: AuthorApply) => {
  let remark = ''
  try {
    const { value } = await ElMessageBox.prompt('请输入拒绝备注（可选，将反馈给申请人）', '拒绝申请', {
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
  await fetchAuthors()
}

onMounted(() => {
  fetchArticles()
  fetchComments()
  fetchAuthors()
})
</script>

<template>
  <div class="blog-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span>审核中心</span>
            <el-radio-group v-model="tab" size="small" @change="onTabChange">
              <el-radio-button value="article">文章发布</el-radio-button>
              <el-radio-button value="comment">评论</el-radio-button>
              <el-radio-button value="author">博客主申请</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 文章工具条 -->
          <div v-if="tab === 'article'" class="card-actions">
            <el-input
              v-model="articleQuery.keyword"
              placeholder="搜索标题"
              clearable
              style="width: 200px"
              @keyup.enter="onArticleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="articleQuery.publishStatus"
              placeholder="状态"
              clearable
              style="width: 120px"
            >
              <el-option label="待审核" :value="3" />
              <el-option label="草稿" :value="0" />
              <el-option label="已发布" :value="1" />
              <el-option label="已下线" :value="2" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="onArticleSearch">查询</el-button>
            <el-button :icon="Refresh" @click="onArticleReset">重置</el-button>
          </div>

          <!-- 评论工具条 -->
          <div v-else-if="tab === 'comment'" class="card-actions">
            <el-input
              v-model="commentQuery.keyword"
              placeholder="搜索内容/文章"
              clearable
              style="width: 200px"
              @keyup.enter="onCommentSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="commentQuery.auditStatus"
              placeholder="状态"
              clearable
              style="width: 120px"
            >
              <el-option label="待审核" :value="0" />
              <el-option label="已通过" :value="1" />
              <el-option label="已拒绝" :value="2" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="onCommentSearch">查询</el-button>
            <el-button :icon="Refresh" @click="onCommentReset">重置</el-button>
          </div>

          <!-- 博客主申请工具条 -->
          <div v-else class="card-actions">
            <el-input
              v-model="authorQuery.keyword"
              placeholder="搜索用户名/昵称/理由"
              clearable
              style="width: 200px"
              @keyup.enter="onAuthorSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="authorQuery.applyStatus"
              placeholder="状态"
              clearable
              style="width: 120px"
            >
              <el-option label="待处理" :value="0" />
              <el-option label="已通过" :value="1" />
              <el-option label="已拒绝" :value="2" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="onAuthorSearch">查询</el-button>
            <el-button :icon="Refresh" @click="onAuthorReset">重置</el-button>
          </div>
        </div>
      </template>

      <!-- 文章审核表 -->
      <el-table v-if="tab === 'article'" v-loading="articleLoading" :data="articles" border style="width: 100%">
        <el-table-column prop="title" label="标题" min-width="200" align="center" show-overflow-tooltip />
        <el-table-column prop="authorName" label="作者" width="120" align="center" />
        <el-table-column prop="summary" label="摘要" min-width="160" align="center" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="publishStatusType(Number(row.publishStatus))" size="small">
              {{ publishStatusMap[row.publishStatus] || row.publishStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审核意见" min-width="150" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.auditRemark" class="remark">{{ row.auditRemark }}</span>
            <span v-else class="dim">—</span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="160" align="center">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="Number(row.publishStatus) === 3">
              <el-button link type="success" @click="onAuditArticle(row, 1)">通过</el-button>
              <el-button link type="warning" @click="onAuditArticle(row, 2)">拒绝</el-button>
            </template>
            <span v-else class="dim">—</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 评论审核表 -->
      <el-table v-else-if="tab === 'comment'" v-loading="commentLoading" :data="comments" border style="width: 100%">
        <el-table-column prop="articleTitle" label="文章" min-width="140" align="center" show-overflow-tooltip />
        <el-table-column prop="nickname" label="评论者" width="110" align="center" />
        <el-table-column prop="content" label="内容" min-width="200" align="center" show-overflow-tooltip />
        <el-table-column label="层级" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="Number(row.parentId) === 0" size="small">顶级</el-tag>
            <el-tag v-else size="small" type="info">回复</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.auditStatus)" size="small">
              {{ statusMap[row.auditStatus] || row.auditStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="150" align="center">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="row.auditStatus === 0">
              <el-button link type="success" @click="onAuditComment(row, 1)">通过</el-button>
              <el-button link type="warning" @click="onAuditComment(row, 2)">拒绝</el-button>
            </template>
            <el-button link type="danger" @click="onDeleteComment(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 博客主申请表 -->
      <el-table v-else v-loading="authorLoading" :data="authors" border style="width: 100%">
        <el-table-column prop="username" label="用户名" width="120" align="center" />
        <el-table-column prop="nickname" label="昵称" width="120" align="center" />
        <el-table-column prop="reason" label="申请理由" min-width="180" align="center" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="applyStatusType(row.applyStatus)" size="small">
              {{ applyStatusMap[row.applyStatus] || row.applyStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="160" align="center">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column prop="handleUser" label="处理人" width="110" align="center">
          <template #default="{ row }">{{ row.handleUser || '—' }}</template>
        </el-table-column>
        <el-table-column label="处理时间" width="160" align="center">
          <template #default="{ row }">{{ formatDate(row.handleTime) }}</template>
        </el-table-column>
        <el-table-column prop="handleRemark" label="备注" min-width="130" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.handleRemark || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="Number(row.applyStatus) === 0">
              <el-button link type="success" :icon="Check" @click="onApproveAuthor(row)">通过</el-button>
              <el-button link type="danger" :icon="Close" @click="onRejectAuthor(row)">拒绝</el-button>
            </template>
            <span v-else class="dim">已处理</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-if="tab === 'article'"
          v-model:current-page="articleQuery.current"
          v-model:page-size="articleQuery.size"
          :total="articleTotal"
          :page-sizes="[20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @change="fetchArticles"
        />
        <el-pagination
          v-else-if="tab === 'comment'"
          v-model:current-page="commentQuery.current"
          v-model:page-size="commentQuery.size"
          :total="commentTotal"
          :page-sizes="[20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @change="fetchComments"
        />
        <el-pagination
          v-else
          v-model:current-page="authorQuery.current"
          v-model:page-size="authorQuery.size"
          :total="authorTotal"
          :page-sizes="[20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @change="fetchAuthors"
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
  flex-wrap: wrap;
  gap: 10px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
.remark {
  color: var(--el-color-danger);
}
.dim {
  color: var(--el-text-color-placeholder);
}
</style>
