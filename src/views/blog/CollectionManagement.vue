<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from '@/api/request.ts'
import { ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { checkButtonPermission } from '@/utils/permission'
import {
  pageCollections,
  saveCollection,
  updateCollection,
  deleteCollection,
  type BlogCollection
} from '@/api/blog'

const loading = ref(false)
const tableData = ref<BlogCollection[]>([])
const total = ref(0)

const can = (code: string) => checkButtonPermission('blogCollection', code)

const query = reactive({ keyword: '', current: 1, size: 10 })

const filtered = computed(() => tableData.value)

const fetchList = async () => {
  loading.value = true
  try {
    const res = await pageCollections({
      current: query.current,
      size: query.size,
      keyword: query.keyword || undefined
    })
    tableData.value = res?.records || []
    total.value = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  query.current = 1
  fetchList()
}

const onPage = (p: number) => {
  query.current = p
  fetchList()
}

const onSize = (s: number) => {
  query.size = s
  query.current = 1
  fetchList()
}

const dialogVisible = ref(false)
const dialogTitle = ref('')
const form = reactive<BlogCollection>({
  id: undefined,
  name: '',
  description: '',
  coverUrl: '',
  sort: 0,
  isFeatured: 0,
  visibility: 1
})

const resetForm = () => {
  Object.assign(form, {
    id: undefined,
    name: '',
    description: '',
    coverUrl: '',
    sort: 0,
    isFeatured: 0,
    visibility: 1
  })
}

const onAdd = () => {
  dialogTitle.value = '新增合集'
  resetForm()
  dialogVisible.value = true
}

const onEdit = (row: BlogCollection) => {
  dialogTitle.value = '编辑合集'
  Object.assign(form, {
    id: row.id,
    name: row.name,
    description: row.description || '',
    coverUrl: row.coverUrl || '',
    sort: row.sort ?? 0,
    isFeatured: row.isFeatured ?? 0,
    visibility: row.visibility ?? 1
  })
  dialogVisible.value = true
}

const onSubmit = async () => {
  if (!form.name.trim()) {
    message.warning('请输入合集名称')
    return
  }
  const payload: BlogCollection = {
    id: form.id,
    name: form.name.trim(),
    description: form.description?.trim() || undefined,
    coverUrl: form.coverUrl?.trim() || undefined,
    sort: form.sort ?? 0,
    isFeatured: form.isFeatured ?? 0,
    visibility: form.visibility ?? 1
  }
  if (form.id) {
    await updateCollection(payload)
    message.success('更新成功')
  } else {
    await saveCollection(payload)
    message.success('新增成功')
  }
  dialogVisible.value = false
  await fetchList()
}

const onDelete = async (row: BlogCollection) => {
  try {
    await ElMessageBox.confirm(
      `确定删除合集「${row.name}」吗？旗下文章将解除绑定，不会删除文章。`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await deleteCollection(String(row.id || ''))
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
          <span>合集管理</span>
          <div class="card-actions">
            <el-input
              v-model="query.keyword"
              placeholder="搜索合集名称"
              clearable
              style="width: 220px"
              @keyup.enter="onSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button v-if="can('blog:collection:add')" type="primary" :icon="Plus" @click="onAdd">
              新增合集
            </el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="filtered" border style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="140" align="center" show-overflow-tooltip />
        <el-table-column prop="description" label="简介" min-width="200" align="center" show-overflow-tooltip />
        <el-table-column prop="authorName" label="作者" width="120" align="center" />
        <el-table-column prop="articleCount" label="文章数" width="90" align="center">
          <template #default="{ row }">{{ row.articleCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="可见性" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.visibility === 0" type="info" size="small">私密</el-tag>
            <el-tag v-else type="success" size="small">公开</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="can('blog:collection:edit')" link type="primary" @click="onEdit(row)">
              编辑
            </el-button>
            <el-button v-if="can('blog:collection:delete')" link type="danger" @click="onDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="query.current"
          :page-size="query.size"
          @current-change="onPage"
          @size-change="onSize"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px">
      <el-form label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="100" placeholder="合集名称" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="500" />
        </el-form-item>
        <el-form-item label="封面">
          <el-input v-model="form.coverUrl" maxlength="500" placeholder="封面 URL，可选" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="可见性">
          <el-radio-group v-model="form.visibility">
            <el-radio :value="1">公开</el-radio>
            <el-radio :value="0">私密</el-radio>
          </el-radio-group>
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
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
