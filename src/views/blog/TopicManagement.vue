<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import request from '@/api/request.ts'
import { message } from '@/api/request.ts'
import { ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { checkButtonPermission } from '@/utils/permission'

interface TopicRow {
  id: string | number
  title: string
  nickname: string
  viewCount: number
  likeCount: number
  replyCount: number
  isTop: number
  isEssence: number
  createTime?: string | null
}

interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

const loading = ref(false)
const tableData = ref<TopicRow[]>([])
const total = ref(0)

const can = (code: string) => checkButtonPermission('blogTopic', code)

const query = reactive({
  current: 1,
  size: 10,
  keyword: '',
  isTop: undefined as number | undefined,
  isEssence: undefined as number | undefined
})

const formatDate = (val?: string | null) => {
  if (!val) return '-'
  return String(val).replace('T', ' ').slice(0, 16)
}

const fetchPage = async () => {
  loading.value = true
  try {
    const res = (await request({
      url: '/blog/topic/admin/page',
      method: 'get',
      params: {
        current: query.current,
        size: query.size,
        keyword: query.keyword || undefined,
        isTop: query.isTop,
        isEssence: query.isEssence
      }
    })) as unknown as PageResult<TopicRow>
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
  query.isTop = undefined
  query.isEssence = undefined
  onSearch()
}

const setFlag = async (row: TopicRow, field: 'isTop' | 'isEssence', value: 0 | 1) => {
  await request({
    url: '/blog/topic/admin/flags',
    method: 'put',
    params: { id: row.id, [field]: value }
  })
  message.success(value === 1 ? '已设置' : '已取消')
  await fetchPage()
}

const onDelete = async (row: TopicRow) => {
  try {
    await ElMessageBox.confirm(`确定删除话题「${row.title}」及其全部回复吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await request({ url: '/blog/topic/admin/delete', method: 'delete', params: { id: row.id } })
  message.success('删除成功')
  await fetchPage()
}

onMounted(fetchPage)
</script>

<template>
  <div class="blog-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>论坛管理</span>
          <div class="card-actions">
            <el-input
              v-model="query.keyword"
              placeholder="搜索标题"
              clearable
              style="width: 200px"
              @keyup.enter="onSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select v-model="query.isTop" placeholder="置顶" clearable style="width: 110px">
              <el-option label="置顶" :value="1" />
              <el-option label="未置顶" :value="0" />
            </el-select>
            <el-select v-model="query.isEssence" placeholder="加精" clearable style="width: 110px">
              <el-option label="精华" :value="1" />
              <el-option label="普通" :value="0" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
            <el-button :icon="Refresh" @click="onReset">重置</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column prop="title" label="标题" min-width="220" align="center" show-overflow-tooltip />
        <el-table-column prop="nickname" label="作者" width="110" align="center" />
        <el-table-column prop="viewCount" label="浏览" width="70" align="center" />
        <el-table-column prop="likeCount" label="点赞" width="70" align="center" />
        <el-table-column prop="replyCount" label="回复" width="70" align="center" />
        <el-table-column label="标记" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isTop === 1" type="danger" size="small" style="margin-right: 4px">置顶</el-tag>
            <el-tag v-if="row.isEssence === 1" type="warning" size="small">精华</el-tag>
            <span v-if="row.isTop !== 1 && row.isEssence !== 1">-</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160" align="center">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <template v-if="can('blog:topic:manage')">
              <el-button
                v-if="row.isTop !== 1"
                link
                type="primary"
                @click="setFlag(row, 'isTop', 1)"
              >
                置顶
              </el-button>
              <el-button v-else link @click="setFlag(row, 'isTop', 0)">取消置顶</el-button>
              <el-button
                v-if="row.isEssence !== 1"
                link
                type="warning"
                @click="setFlag(row, 'isEssence', 1)"
              >
                加精
              </el-button>
              <el-button v-else link @click="setFlag(row, 'isEssence', 0)">取消加精</el-button>
              <el-button link type="danger" @click="onDelete(row)">删除</el-button>
            </template>
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
</style>
