<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { pageDict, saveDict, updateDict, deleteDict, type DictItem, type PageResult, refreshDict } from '@/api/dict'
import { message } from '@/api/request.ts'
import DictSelect from '@/components/DictSelect.vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'

const loading = ref(false)
const tableData = ref<DictItem[]>([])
const total = ref(0)

const query = reactive({
  current: 1,
  size: 10,
  keyword: '',
  type: ''
})

const fetchPage = async () => {
  loading.value = true
  try {
    const res = await pageDict(query)
    const pr = res as PageResult<DictItem>
    tableData.value = pr.records || []
    total.value = Number(pr.total || 0)
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  query.current = 1
  fetchPage()
}


// 编辑/新增弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref()
const form = reactive<DictItem>({
  id: undefined,
  type: '',
  code: '',
  value: '',
  label: '',
  sort: 0,
  status: 1,
  description: ''
})

const rules = {
  type: [{ required: true, message: '请输入类型', trigger: 'blur' }],
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  label: [{ required: true, message: '请输入显示名称', trigger: 'blur' }]
}

const onAdd = () => {
  dialogTitle.value = '新增字典'
  Object.assign(form, { id: undefined, type: '', code: '', value: '', label: '', sort: 0, status: 1, description: '' })
  dialogVisible.value = true
}

const onEdit = (row: DictItem) => {
  dialogTitle.value = '编辑字典'
  Object.assign(form, row)
  dialogVisible.value = true
}

const onDelete = async (row: DictItem) => {
  try {
    await ElMessageBox.confirm('确定要删除该字典项吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteDict(String(row.id || ''))
    message.success('删除成功')
    await fetchPage()
  } catch (e) {}
}

const onSubmit = async () => {
  const el = formRef.value as any
  if (el) {
    await el.validate()
  }
  try {
    if (form.id) {
      await updateDict(form)
      message.success('更新成功')
    } else {
      await saveDict(form)
      message.success('新增成功')
    }
    dialogVisible.value = false
    await fetchPage()
  } catch (e) {}
}

const onRefreshCache = async () => {
  await refreshDict()
  message.success('缓存已刷新')
}

onMounted(fetchPage)
</script>

<template>
  <div class="dict-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>字典管理</span>
          <div style="display:flex;gap:10px;align-items:center">
            <el-input
              v-model="query.keyword"
              placeholder="搜索编码、值、显示名称"
              clearable
              style="width: 300px"
              @clear="onSearch"
              @keyup.enter="onSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-input v-model="query.type" placeholder="类型 如: status" clearable style="width: 200px" />
            <el-button type="primary" @click="onSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button type="primary" @click="onAdd">
              <el-icon><Plus /></el-icon>
              新增字典
            </el-button>
            <el-button type="warning" @click="onRefreshCache">
              <el-icon><Refresh /></el-icon>
              刷新缓存
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" border style="width:100%">
        <el-table-column prop="type" label="类型" width="160" align="center" />
        <el-table-column prop="code" label="编码" width="140" align="center" />
        <el-table-column prop="value" label="值" width="140" align="center" />
        <el-table-column prop="label" label="显示名称" align="center" />
        <el-table-column prop="sort" label="排序" width="100" align="center" />
        <el-table-column label="状态" width="200" align="center">
          <template #default="{ row }">
            <DictSelect v-model="row.status" type="status" valueField="code" labelField="label" style="width: 140px" />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="备注" min-width="200" align="center" />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="onEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[10,20,30,50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchPage"
          @current-change="fetchPage"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="类型" prop="type">
          <el-input v-model="form.type" placeholder="字典类型，如: status" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" placeholder="字典编码，如: 1/0/true/false" />
        </el-form-item>
        <el-form-item label="值">
          <el-input v-model="form.value" placeholder="可选：用于数据存储的值" />
        </el-form-item>
        <el-form-item label="显示名称" prop="label">
          <el-input v-model="form.label" placeholder="显示给用户看的名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <DictSelect v-model="form.status" type="status" valueField="code" labelField="label" style="width: 200px" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dict-container { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pager { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
