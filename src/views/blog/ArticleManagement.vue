<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import {
  pageArticles,
  getArticleDetail,
  saveArticle,
  updateArticle,
  deleteArticle,
  listCategories,
  listTags,
  uploadImage,
  importArticleFile,
  type BlogArticle,
  type BlogCategory,
  type BlogTag
} from '@/api/blog'
import { message } from '@/api/request.ts'
import { ElMessageBox } from 'element-plus'
import { Search, Refresh, View, Edit, Delete, Upload, DocumentAdd, UploadFilled } from '@element-plus/icons-vue'
import { checkButtonPermission } from '@/utils/permission'
import TagSelect from '@/components/blog/TagSelect.vue'
import MdEditor from '@/components/blog/MdEditor.vue'

const formatDate = (val?: string | null) => {
  if (!val) return '-'
  return String(val).replace('T', ' ').slice(0, 16)
}

const loading = ref(false)
const list = ref<BlogArticle[]>([])
const total = ref(0)
const categories = ref<BlogCategory[]>([])
const tags = ref<BlogTag[]>([])

const can = (code: string) => checkButtonPermission('blogArticle', code)

const query = reactive({
  current: 1,
  size: 12,
  keyword: '',
  publishStatus: undefined as number | undefined,
  categoryId: undefined as string | undefined,
  tagId: undefined as string | undefined
})

const route = useRoute()
const router = useRouter()

// 支持从标签/分类管理跳入 ?tagId= / ?categoryId=
onMounted(() => {
  if (route.query.tagId) query.tagId = String(route.query.tagId)
  if (route.query.categoryId) query.categoryId = String(route.query.categoryId)
})

const statusMap: Record<number, string> = { 0: '草稿', 1: '已发布', 2: '已下线' }
const statusType = (s: number): 'info' | 'success' | 'warning' =>
  s === 1 ? 'success' : s === 2 ? 'warning' : 'info'

const pages = computed(() => Math.max(1, Math.ceil(total.value / query.size)))

const categoryName = (id?: string | number | null) =>
  categories.value.find(c => String(c.id) === String(id))?.name || '-'

const fetchPage = async () => {
  loading.value = true
  try {
    const res = await pageArticles({
      current: query.current,
      size: query.size,
      keyword: query.keyword || undefined,
      publishStatus: query.publishStatus,
      categoryId: query.categoryId || undefined,
      tagId: query.tagId || undefined
    })
    list.value = res.records || []
    total.value = Number(res.total || 0)
  } finally {
    loading.value = false
  }
}

const fetchMeta = async () => {
  try {
    const [cats, ts] = await Promise.all([listCategories(), listTags()])
    categories.value = cats || []
    tags.value = ts || []
  } catch {
    categories.value = []
    tags.value = []
  }
}

const onSearch = () => {
  query.current = 1
  fetchPage()
}

const onReset = () => {
  query.keyword = ''
  query.publishStatus = undefined
  query.categoryId = undefined
  query.tagId = undefined
  router.replace({ path: '/blog/articlemanagement' })
  onSearch()
}

const goPage = (p: number) => {
  query.current = Math.min(Math.max(1, p), pages.value)
  fetchPage()
}

// ===== 预览 =====
const previewVisible = ref(false)
const previewTitle = ref('')
const previewHtml = ref('')
const previewMeta = ref('')

const onPreview = async (row: BlogArticle) => {
  try {
    const detail = await getArticleDetail(String(row.id))
    previewTitle.value = detail.title
    previewHtml.value = marked.parse(detail.content || '') as string
    previewMeta.value = `${detail.authorName} · ${formatDate(detail.publishTime || detail.createTime)} · ${detail.viewCount ?? 0} 阅读`
    previewVisible.value = true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '预览失败')
  }
}

const onPreviewPublic = (row: BlogArticle) => {
  // 打开博客前台公开详情（需 blog-ui 服务）
  const base = import.meta.env.VITE_BLOG_UI_ORIGIN || 'http://localhost:4100'
  window.open(`${base.replace(/\/$/, '')}/article/${row.id}`, '_blank')
}

// ===== 新建 / 编辑 =====
const dialogVisible = ref(false)
const dialogTitle = ref('编辑文章')
const submitting = ref(false)
const importing = ref(false)
const form = reactive<BlogArticle>({
  id: undefined,
  title: '',
  summary: '',
  content: '',
  coverUrl: '',
  categoryId: null,
  publishStatus: 0,
  isTop: 0,
  isRecommend: 0,
  tagIds: []
})

function resetForm() {
  Object.assign(form, {
    id: undefined,
    title: '',
    summary: '',
    content: '',
    coverUrl: '',
    categoryId: null,
    publishStatus: 0,
    isTop: 0,
    isRecommend: 0,
    tagIds: []
  })
}

const onAdd = () => {
  resetForm()
  dialogTitle.value = '新建文章'
  dialogVisible.value = true
}

const coverUploading = ref(false)
const onCoverUpload = async (options: { file: File }) => {
  coverUploading.value = true
  try {
    form.coverUrl = await uploadImage(options.file)
    message.success('上传成功')
  } catch (e) {
    message.error(e instanceof Error ? e.message : '上传失败')
  } finally {
    coverUploading.value = false
  }
}

const onEdit = async (row: BlogArticle) => {
  const detail = await getArticleDetail(String(row.id))
  Object.assign(form, {
    id: detail.id,
    title: detail.title,
    summary: detail.summary || '',
    content: detail.content || '',
    coverUrl: detail.coverUrl || '',
    categoryId: detail.categoryId ?? null,
    publishStatus: detail.publishStatus ?? 0,
    isTop: detail.isTop ?? 0,
    isRecommend: detail.isRecommend ?? 0,
    tagIds: (detail.tags || []).map(t => t.id)
  })
  dialogTitle.value = '编辑文章'
  dialogVisible.value = true
}

/** 导入文件 → 解析后打开新建表单（标题=文件名） */
const onImportFile = async (options: { file: File }) => {
  const raw = options.file as File
  if (!raw) return
  importing.value = true
  try {
    const result = await importArticleFile(raw)
    resetForm()
    form.title = result.title || raw.name.replace(/\.[^.]+$/, '')
    form.content = result.content || ''
    form.publishStatus = 0
    dialogTitle.value = '新建文章（已导入）'
    dialogVisible.value = true
    message.success(`已导入「${result.filename || raw.name}」，请确认后保存`)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '导入失败')
  } finally {
    importing.value = false
  }
}

/** 标签创建中：禁用保存，避免异步 ID 未写回就提交 */
const tagCreating = ref(false)
function onTagCreated(tag: BlogTag) {
  if (tag?.id != null && !tags.value.some(t => String(t.id) === String(tag.id))) {
    tags.value.push({ ...tag })
  }
}

/** 只提交数字标签 ID，避免 allow-create 把名称写进 tagIds 导致后端 Long 反序列化失败 */
function toTagIds(ids: (string | number | null | undefined)[] | undefined): string[] {
  return (ids || [])
    .map(v => String(v ?? '').trim())
    .filter(s => /^\d+$/.test(s))
}

function toCategoryId(val: string | number | null | undefined): string | null {
  const s = String(val ?? '').trim()
  return /^\d+$/.test(s) ? s : null
}

const onSubmit = async () => {
  if (!form.title.trim() || !form.content.trim()) {
    message.warning('标题与正文不能为空')
    return
  }
  if (tagCreating.value) {
    message.warning('标签创建中，请稍候再保存')
    return
  }
  const categoryId = toCategoryId(form.categoryId)
  const tagIds = toTagIds(form.tagIds)
  submitting.value = true
  try {
    const payload: BlogArticle = {
      id: form.id,
      title: form.title.trim(),
      summary: form.summary?.trim() || undefined,
      content: form.content,
      coverUrl: form.coverUrl?.trim() || undefined,
      categoryId,
      publishStatus: form.publishStatus,
      isTop: form.isTop,
      isRecommend: form.isRecommend,
      tagIds
    }
    if (form.id) {
      await updateArticle(payload)
      message.success('更新成功')
    } else {
      await saveArticle(payload)
      message.success('创建成功')
    }
    dialogVisible.value = false
    await fetchPage()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    submitting.value = false
  }
}

const onDelete = async (row: BlogArticle) => {
  try {
    await ElMessageBox.confirm(`确定删除文章「${row.title}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  await deleteArticle(String(row.id || ''))
  message.success('删除成功')
  await fetchPage()
}

onMounted(async () => {
  await Promise.all([fetchPage(), fetchMeta()])
})
</script>

<template>
  <div class="blog-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>文章管理</span>
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
            <el-select v-model="query.publishStatus" placeholder="状态" clearable style="width: 120px">
              <el-option label="草稿" :value="0" />
              <el-option label="已发布" :value="1" />
              <el-option label="已下线" :value="2" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
            <el-button :icon="Refresh" @click="onReset">重置</el-button>
            <el-button
              v-if="can('blog:article:add')"
              type="primary"
              :icon="DocumentAdd"
              @click="onAdd"
            >
              新建
            </el-button>
            <el-upload
              v-if="can('blog:article:import') || can('blog:article:add')"
              :show-file-list="false"
              :http-request="onImportFile"
              accept=".md,.markdown,.txt,.pdf,.docx"
              class="import-upload"
            >
              <el-button type="primary" plain :icon="UploadFilled" :loading="importing">
                导入
              </el-button>
            </el-upload>
          </div>
        </div>
      </template>

      <div v-loading="loading" class="card-grid">
        <article v-for="item in list" :key="item.id" class="art-card">
          <div class="cover" :class="statusType(item.publishStatus)">
            <img v-if="item.coverUrl" :src="item.coverUrl.startsWith('/') ? '/api' + item.coverUrl : item.coverUrl" alt="" />
            <span v-else class="cover-mark">{{ (item.title || '文').charAt(0) }}</span>
            <div class="badges">
              <el-tag :type="statusType(item.publishStatus)" size="small" effect="dark">
                {{ statusMap[item.publishStatus] || item.publishStatus }}
              </el-tag>
              <el-tag v-if="item.isTop === 1" type="danger" size="small" effect="dark">置顶</el-tag>
              <el-tag v-if="item.isRecommend === 1" type="warning" size="small" effect="dark">推荐</el-tag>
            </div>
          </div>
          <div class="body">
            <h3 class="title" :title="item.title">{{ item.title }}</h3>
            <p class="summary">{{ item.summary || '暂无摘要' }}</p>
            <div class="tags" v-if="item.tags?.length">
              <el-tag v-for="t in item.tags" :key="t.id" size="small" type="info">{{ t.name }}</el-tag>
            </div>
            <div class="meta">
              <span>{{ item.authorName }}</span>
              <span>{{ categoryName(item.categoryId) }}</span>
              <span>{{ formatDate(item.publishTime || item.createTime) }}</span>
            </div>
            <div class="stats">
              <span>阅读 {{ item.viewCount ?? 0 }}</span>
              <span>评论 {{ item.commentCount ?? 0 }}</span>
            </div>
            <div class="ops">
              <el-button link type="primary" :icon="View" @click="onPreview(item)">预览</el-button>
              <el-button link @click="onPreviewPublic(item)">前台</el-button>
              <el-button v-if="can('blog:article:edit')" link type="primary" :icon="Edit" @click="onEdit(item)">
                编辑
              </el-button>
              <el-button v-if="can('blog:article:delete')" link type="danger" :icon="Delete" @click="onDelete(item)">
                删除
              </el-button>
            </div>
          </div>
        </article>
        <div v-if="!list.length && !loading" class="empty">暂无文章</div>
      </div>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[12, 24, 48]"
          layout="total, sizes, prev, pager, next"
          @change="fetchPage"
        />
      </div>
    </el-card>

    <!-- Markdown 预览 -->
    <el-dialog v-model="previewVisible" :title="previewTitle" width="820px" top="6vh">
      <p class="preview-meta">{{ previewMeta }}</p>
      <div class="preview-body markdown-body" v-html="previewHtml"></div>
    </el-dialog>

    <!-- 新建 / 编辑（导入后填入本表单） -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="860px" top="5vh">
      <el-form label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="200" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="form.summary" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="封面">
          <div class="cover-row">
            <el-input v-model="form.coverUrl" placeholder="路径或上传" />
            <el-upload :show-file-list="false" :http-request="onCoverUpload as any" accept="image/*">
              <el-button :loading="coverUploading" :icon="Upload">上传</el-button>
            </el-upload>
          </div>
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="form.categoryId"
            clearable
            placeholder="选择分类"
            style="width: 100%"
            @change="val => (form.categoryId = val == null || val === '' ? null : String(val))"
          >
            <el-option v-for="c in categories" :key="String(c.id)" :label="c.name" :value="String(c.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <TagSelect
            v-model="form.tagIds"
            :tags="tags"
            @created="onTagCreated"
            @creating="tagCreating = $event"
          />
        </el-form-item>
        <el-form-item label="正文" required>
          <MdEditor v-model="form.content" :height="320" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.publishStatus">
            <el-radio :value="0">草稿</el-radio>
            <el-radio :value="1">发布</el-radio>
            <el-radio :value="2">下线</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="标记">
          <el-checkbox v-model="form.isTop" :true-value="1" :false-value="0">置顶</el-checkbox>
          <el-checkbox v-model="form.isRecommend" :true-value="1" :false-value="0" style="margin-left: 16px">
            推荐
          </el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting || tagCreating" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
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
.import-upload {
  display: inline-flex;
}
.import-upload :deep(.el-upload) {
  display: inline-flex;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  min-height: 120px;
}
.art-card {
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 10px;
  overflow: hidden;
  background: var(--el-bg-color, #fff);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s ease;
}
.art-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.cover {
  height: 100px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}
.cover.success {
  background: #e6f7ef;
}
.cover.info {
  background: #f0f2f5;
}
.cover.warning {
  background: #fff7e6;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-mark {
  font-size: 36px;
  font-weight: 700;
  color: var(--el-color-primary, #409eff);
  opacity: 0.55;
}
.badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 4px;
}
.body {
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.summary {
  margin: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.meta,
.stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #909399;
}
.ops {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}
.empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #909399;
  padding: 48px 0;
}
.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
.preview-meta {
  margin: 0 0 12px;
  color: #909399;
  font-size: 13px;
}
.preview-body {
  max-height: 60vh;
  overflow: auto;
  line-height: 1.75;
  font-size: 14px;
}
.preview-body :deep(pre) {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}
.cover-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.cover-row .el-input {
  flex: 1;
}
</style>
