<template>
  <div class="wiki-space-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>知识库空间</span>
          <div class="card-actions">
            <el-input
              v-model="keyword"
              placeholder="搜索空间名称"
              clearable
              style="width: 220px"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button v-if="can('wiki:space:add')" type="primary" :icon="Plus" @click="openCreate">新增空间</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="tableData" border style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="140" align="center" show-overflow-tooltip />
        <el-table-column prop="slug" label="别名" min-width="120" align="center" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="180" align="center" show-overflow-tooltip />
        <el-table-column label="公开读" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.publicRead === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.publicRead === 1 ? '公开' : '私有' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="docCount" label="文档数" width="90" align="center" />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column prop="updateTime" label="更新时间" width="160" align="center" />
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="scope">
            <el-button v-if="can('wiki:doc:view')" link type="primary" @click="goDocs(scope.row)">文档</el-button>
            <el-button v-if="can('wiki:share:add')" link type="success" @click="openShare(scope.row)">分享</el-button>
            <el-button v-if="can('wiki:space:edit')" link type="primary" @click="openEdit(scope.row)">编辑</el-button>
            <el-button v-if="can('wiki:space:delete')" link type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑空间' : '新增空间'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="100" />
        </el-form-item>
        <el-form-item label="别名" prop="slug">
          <el-input v-model="form.slug" maxlength="100" placeholder="URL 标识，如 handbook" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" />
        </el-form-item>
        <el-form-item label="公开读">
          <el-switch v-model="form.publicRead" :active-value="1" :inactive-value="0" />
          <span class="hint">开启后无需登录可读（仍可用分享链接做细粒度）</span>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shareDialog" title="创建分享链接" width="520px">
      <el-form label-width="90px">
        <el-form-item label="目标">
          <span>{{ shareTargetLabel }}</span>
        </el-form-item>
        <el-form-item label="访问级别">
          <el-radio-group v-model="shareForm.accessLevel">
            <el-radio :label="1">只读</el-radio>
            <el-radio :label="2">可写</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="有效期">
          <el-date-picker
            v-model="shareForm.expireTime"
            clearable
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm"
            placeholder="留空表示长期有效"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="访问密码">
          <el-input v-model="shareForm.password" maxlength="32" placeholder="可选" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="shareForm.remark" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shareDialog = false">取消</el-button>
        <el-button type="primary" :loading="shareSaving" @click="handleCreateShare">生成链接</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shareResultVisible" title="分享链接已生成" width="520px">
      <el-form label-width="90px">
        <el-form-item label="链接">
          <el-input v-model="shareResultUrl" readonly />
        </el-form-item>
        <el-form-item label="令牌">
          <el-input v-model="shareResultToken" readonly />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="copyShare">复制链接</el-button>
        <el-button @click="shareResultVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import {
  createWikiShare,
  deleteWikiSpace,
  getWikiSpacePage,
  saveWikiSpace,
  updateWikiSpace,
  type WikiSpace,
  type WikiSpaceSave
} from '@/api/wiki'
import { checkButtonPermission } from '@/utils/permission'

const can = (code: string) => checkButtonPermission('wikiSpace', code)

function fullShareUrl(pathOrToken: string) {
  const p = pathOrToken.startsWith('http')
    ? pathOrToken
    : pathOrToken.startsWith('/')
      ? pathOrToken
      : '/wiki/s/' + pathOrToken
  if (p.startsWith('http')) return p
  return window.location.origin + p
}


const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const keyword = ref('')
const tableData = ref<WikiSpace[]>([])
const pagination = reactive({ current: 1, size: 10, total: 0 })

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<WikiSpaceSave>({
  id: undefined,
  name: '',
  slug: '',
  description: '',
  publicRead: 0,
  sort: 0
})
const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  slug: [{ required: true, message: '请输入别名', trigger: 'blur' }]
}

const shareDialog = ref(false)
const shareSaving = ref(false)
const shareSpace = ref<WikiSpace | null>(null)
const shareForm = reactive({
  accessLevel: 1,
  expireTime: '',
  password: '',
  remark: ''
})
const shareResultVisible = ref(false)
const shareResultUrl = ref('')
const shareResultToken = ref('')

const shareTargetLabel = ref('')

async function loadList() {
  loading.value = true
  try {
    const res = await getWikiSpacePage({
      current: pagination.current,
      size: pagination.size,
      keyword: keyword.value || undefined
    })
    tableData.value = res.records || []
    pagination.total = Number(res.total || 0)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  loadList()
}

function openCreate() {
  form.id = undefined
  form.name = ''
  form.slug = ''
  form.description = ''
  form.publicRead = 0
  form.sort = 0
  dialogVisible.value = true
}

function openEdit(row: WikiSpace) {
  form.id = row.id
  form.name = row.name
  form.slug = row.slug
  form.description = row.description || ''
  form.publicRead = row.publicRead ?? 0
  form.sort = row.sort ?? 0
  dialogVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (form.id) {
      await updateWikiSpace({ ...form })
      ElMessage.success('已更新')
    } else {
      await saveWikiSpace({ ...form })
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    loadList()
  } finally {
    saving.value = false
  }
}

function handleDelete(row: WikiSpace) {
  ElMessageBox.confirm(`确定删除空间「${row.name}」？需先清空文档。`, '提示', { type: 'warning' }).then(async () => {
    await deleteWikiSpace(row.id!)
    ElMessage.success('已删除')
    loadList()
  })
}

function goDocs(row: WikiSpace) {
  router.push({ path: '/wiki/docmanagement', query: { spaceId: row.id, spaceName: row.name } })
}

function openShare(row: WikiSpace) {
  shareSpace.value = row
  shareTargetLabel.value = `空间 · ${row.name}`
  shareForm.accessLevel = 1
  shareForm.expireTime = ''
  shareForm.password = ''
  shareForm.remark = ''
  shareDialog.value = true
}

async function handleCreateShare() {
  if (!shareSpace.value) return
  shareSaving.value = true
  try {
    const res = await createWikiShare({
      targetType: 'space',
      targetId: shareSpace.value.id!,
      accessLevel: shareForm.accessLevel,
      expireTime: shareForm.expireTime ? String(shareForm.expireTime) : undefined,
      password: shareForm.password || undefined,
      remark: shareForm.remark || undefined
    })
    shareDialog.value = false
    shareResultToken.value = res.token || ''
    shareResultUrl.value = res.shareUrl || ''
    shareResultVisible.value = true
  } finally {
    shareSaving.value = false
  }
}

async function copyShare() {
  try {
    await navigator.clipboard.writeText(shareResultUrl.value)
    ElMessage.success('已复制')
  } catch {
    ElMessage.warning('请手动复制')
  }
}

onMounted(loadList)
</script>

<style scoped>
.wiki-space-page {
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
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
