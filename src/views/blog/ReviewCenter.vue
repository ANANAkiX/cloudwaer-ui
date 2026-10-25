<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  pageComments,
  auditComment,
  deleteComment,
  type BlogComment
} from '@/api/blog'
import { message } from '@/api/request.ts'
import { ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { checkButtonPermission } from '@/utils/permission'

const loading = ref(false)
const tableData = ref<BlogComment[]>([])
const total = ref(0)

const can = (code: string) => checkButtonPermission('blogComment', code)

const query = reactive({
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

const fetchPage = async () => {
  loading.value = true
  try {
    const res = await pageComments({
      current: query.current,
      size: query.size,
      keyword: query.keyword || undefined,
      auditStatus: query.auditStatus
    })
    tableData.value = res.records || []
    total.value = Number(res.total || 0)
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  query.current = 1
  fetchPage()
}

const onReset = () => {
  query.keyword = ''
  query.auditStatus = undefined
  onSearch()
}

const onAudit = async (row: BlogComment, auditStatus: number) => {
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
  await fetchPage()
}

const onDelete = async (row: BlogComment) => {
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
  await fetchPage()
}

onMounted(fetchPage)
</script>

<template>
  <div class="blog-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>审核中心 · 评论</span>
          <div class="card-actions">
            <el-input
              v-model="query.keyword"
              placeholder="搜索内容/文章"
              clearable
              style="width: 200px"
              @keyup.enter="onSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="query.auditStatus" placeholder="状态" clearable style="width: 120px">
              <el-option label="待审核" :value="0" />
              <el-option label="已通过" :value="1" />
              <el-option label="已拒绝" :value="2" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
            <el-button :icon="Refresh" @click="onReset">重置</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
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
              <el-button link type="success" @click="onAudit(row, 1)">
                通过
              </el-button>
              <el-button link type="warning" @click="onAudit(row, 2)">
                拒绝
              </el-button>
            </template>
            <el-button link type="danger" @click="onDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[20, 50]"
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
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
