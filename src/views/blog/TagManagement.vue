<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  listTags,
  saveTag,
  updateTag,
  deleteTag,
  type BlogTag
} from '@/api/blog'

const router = useRouter()
import { message } from '@/api/request.ts'
import { ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { checkButtonPermission } from '@/utils/permission'

const loading = ref(false)
const tableData = ref<BlogTag[]>([])

const can = (code: string) => checkButtonPermission('blogTag', code)

const query = reactive({ keyword: '' })

const filtered = computed(() => {
  const kw = query.keyword.trim()
  if (!kw) return tableData.value
  return tableData.value.filter(
    item => item.name.includes(kw) || (item.slug || '').includes(kw)
  )
})

const fetchList = async () => {
  loading.value = true
  try {
    tableData.value = (await listTags()) || []
  } finally {
    loading.value = false
  }
}

const dialogVisible = ref(false)
const dialogTitle = ref('')
const form = reactive<BlogTag>({
  id: undefined,
  name: '',
  slug: ''
})

const resetForm = () => {
  Object.assign(form, { id: undefined, name: '', slug: '' })
}

const onAdd = () => {
  dialogTitle.value = '新增标签'
  resetForm()
  dialogVisible.value = true
}

const onEdit = (row: BlogTag) => {
  dialogTitle.value = '编辑标签'
  Object.assign(form, { id: row.id, name: row.name, slug: row.slug || '' })
  dialogVisible.value = true
}

const onSubmit = async () => {
  if (!form.name.trim()) {
    message.warning('请输入标签名')
    return
  }
  const payload: BlogTag = {
    id: form.id,
    name: form.name.trim(),
    slug: form.slug?.trim() || undefined
  }
  if (form.id) {
    await updateTag(payload)
    message.success('更新成功')
  } else {
    await saveTag(payload)
    message.success('新增成功')
  }
  dialogVisible.value = false
  await fetchList()
}

const onDelete = async (row: BlogTag) => {
  try {
    await ElMessageBox.confirm(`确定删除标签「${row.name}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteTag(String(row.id || ''))
    message.success('删除成功')
    await fetchList()
  } catch {
    /* cancel */
  }
}

onMounted(fetchList)
</script>

<template>
  <div class="blog-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>标签管理</span>
          <div class="card-actions">
            <el-input v-model="query.keyword" placeholder="搜索名称/别名" clearable style="width: 220px">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button v-if="can('blog:tag:add')" type="primary" :icon="Plus" @click="onAdd">
              新增标签
            </el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="filtered" border style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="120" align="center" />
        <el-table-column prop="slug" label="别名" min-width="100" align="center" />
        <el-table-column prop="useCount" label="引用数" width="90" align="center">
          <template #default="{ row }">{{ row.useCount ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="can('blog:tag:edit')" link type="primary" @click="onEdit(row)">
              编辑
            </el-button>
            <el-button v-if="can('blog:tag:delete')" link type="danger" @click="onDelete(row)">
              删除
            </el-button>
            <el-button link type="primary" @click="router.push({ path: '/blog/articlemanagement', query: { tagId: row.id } })">
              文章
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px">
      <el-form label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="64" placeholder="标签名" />
        </el-form-item>
        <el-form-item label="别名">
          <el-input v-model="form.slug" maxlength="64" placeholder="slug，可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">确定</el-button>
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
}
.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
