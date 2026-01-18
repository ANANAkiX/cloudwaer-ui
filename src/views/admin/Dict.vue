<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  pageDict,
  saveDict,
  updateDict,
  deleteDict,
  listDictItems,
  saveDictItem,
  updateDictItem,
  deleteDictItem,
  type Dict,
  type DictItem,
  type PageResult,
  refreshDict
} from '@/api/dict'
import { message } from '@/api/request.ts'
import DictSelect from '@/components/DictSelect.vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'

const loading = ref(false)
const itemLoading = ref(false)
const tableData = ref<Dict[]>([])
const itemData = ref<DictItem[]>([])
const total = ref(0)
const selectedDict = ref<Dict | null>(null)

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
    const pr = res as PageResult<Dict>
    tableData.value = pr.records || []
    total.value = Number(pr.total || 0)
    if (selectedDict.value) {
      const stillExists = tableData.value.find(item => String(item.id) === String(selectedDict.value?.id))
      if (!stillExists) {
        selectedDict.value = null
        itemData.value = []
      }
    }
  } finally {
    loading.value = false
  }
}

const fetchItems = async (dictId?: string | number) => {
  if (!dictId) {
    itemData.value = []
    return
  }
  itemLoading.value = true
  try {
    const list = await listDictItems(dictId)
    itemData.value = list || []
  } finally {
    itemLoading.value = false
  }
}

const onSearch = () => {
  query.current = 1
  fetchPage()
}

const onSelectDict = (row: Dict | null) => {
  selectedDict.value = row
  fetchItems(row?.id)
}

// Dict dialog
const dictDialogVisible = ref(false)
const dictDialogTitle = ref('')
const dictFormRef = ref()
const dictForm = reactive<Dict>({
  id: undefined,
  type: '',
  name: '',
  sort: 0,
  status: 1,
  description: ''
})

const dictRules = {
  type: [{ required: true, message: '请输入类型', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
}

const onAddDict = () => {
  dictDialogTitle.value = '新增字典'
  Object.assign(dictForm, { id: undefined, type: '', name: '', sort: 0, status: 1, description: '' })
  dictDialogVisible.value = true
}

const onEditDict = (row: Dict) => {
  dictDialogTitle.value = '编辑字典'
  Object.assign(dictForm, row)
  dictDialogVisible.value = true
}

const onDeleteDict = async (row: Dict) => {
  try {
    await ElMessageBox.confirm('确定删除该字典及其字典项吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteDict(String(row.id || ''))
    message.success('删除成功')
    await fetchPage()
    if (selectedDict.value?.id === row.id) {
      selectedDict.value = null
      itemData.value = []
    }
  } catch (e) {}
}

const onSubmitDict = async () => {
  const el = dictFormRef.value as any
  if (el) {
    await el.validate()
  }
  try {
    if (dictForm.id) {
      await updateDict(dictForm)
      message.success('更新成功')
    } else {
      await saveDict(dictForm)
      message.success('新增成功')
    }
    dictDialogVisible.value = false
    await fetchPage()
  } catch (e) {}
}

// Item dialog
const itemDialogVisible = ref(false)
const itemDialogTitle = ref('')
const itemFormRef = ref()
const itemForm = reactive<DictItem>({
  id: undefined,
  dictId: undefined,
  code: '',
  value: '',
  label: '',
  sort: 0,
  status: 1,
  description: ''
})

const itemRules = {
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  label: [{ required: true, message: '请输入显示名称', trigger: 'blur' }]
}

const onAddItem = () => {
  if (!selectedDict.value?.id) {
    message.warning('请先选择字典')
    return
  }
  itemDialogTitle.value = '新增字典项'
  Object.assign(itemForm, {
    id: undefined,
    dictId: selectedDict.value.id,
    code: '',
    value: '',
    label: '',
    sort: 0,
    status: 1,
    description: ''
  })
  itemDialogVisible.value = true
}

const onEditItem = (row: DictItem) => {
  itemDialogTitle.value = '编辑字典项'
  Object.assign(itemForm, row)
  itemDialogVisible.value = true
}

const onDeleteItem = async (row: DictItem) => {
  try {
    await ElMessageBox.confirm('确定删除该字典项吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteDictItem(String(row.id || ''))
    message.success('删除成功')
    await fetchItems(selectedDict.value?.id)
  } catch (e) {}
}

const onSubmitItem = async () => {
  const el = itemFormRef.value as any
  if (el) {
    await el.validate()
  }
  try {
    if (itemForm.id) {
      await updateDictItem(itemForm)
      message.success('更新成功')
    } else {
      await saveDictItem(itemForm)
      message.success('新增成功')
    }
    itemDialogVisible.value = false
    await fetchItems(selectedDict.value?.id)
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
          <div class="card-actions">
            <el-input
              v-model="query.keyword"
              placeholder="搜索类型或名称"
              clearable
              style="width: 260px"
              @clear="onSearch"
              @keyup.enter="onSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-input v-model="query.type" placeholder="类型筛选" clearable style="width: 180px" />
            <el-button type="primary" @click="onSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button type="primary" @click="onAddDict">
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

      <el-table
        :data="tableData"
        v-loading="loading"
        border
        highlight-current-row
        row-key="id"
        @current-change="onSelectDict"
        style="width:100%"
      >
        <el-table-column prop="type" label="类型" width="160" align="center" />
        <el-table-column prop="name" label="名称" width="200" align="center" />
        <el-table-column prop="sort" label="排序" width="100" align="center" />
        <el-table-column label="状态" width="200" align="center">
          <template #default="{ row }">
            <DictSelect v-model="row.status" type="status" valueField="code" labelField="label" style="width: 140px" />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="备注" min-width="220" align="center" />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="onEditDict(row)">编辑</el-button>
            <el-button link type="danger" @click="onDeleteDict(row)">删除</el-button>
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

    <el-card class="items-card">
      <template #header>
        <div class="card-header">
          <span>字典项</span>
          <div class="card-actions">
            <span v-if="selectedDict" class="selected-label">
              已选择：{{ selectedDict?.name }}（{{ selectedDict?.type }}）
            </span>
            <el-button type="primary" :disabled="!selectedDict" @click="onAddItem">
              <el-icon><Plus /></el-icon>
              新增字典项
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="itemData" v-loading="itemLoading" border style="width:100%">
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
            <el-button link type="primary" @click="onEditItem(row)">编辑</el-button>
            <el-button link type="danger" @click="onDeleteItem(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dictDialogVisible" :title="dictDialogTitle" width="600px">
      <el-form ref="dictFormRef" :model="dictForm" :rules="dictRules" label-width="120px">
        <el-form-item label="类型" prop="type">
          <el-input v-model="dictForm.type" placeholder="字典类型（如：status）" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="dictForm.name" placeholder="字典名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dictForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <DictSelect v-model="dictForm.status" type="status" valueField="code" labelField="label" style="width: 200px" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="dictForm.description" type="textarea" :rows="3" placeholder="备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dictDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="onSubmitDict">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="itemDialogVisible" :title="itemDialogTitle" width="600px">
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="120px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="itemForm.code" placeholder="字典项编码" />
        </el-form-item>
        <el-form-item label="值">
          <el-input v-model="itemForm.value" placeholder="字典值" />
        </el-form-item>
        <el-form-item label="显示名称" prop="label">
          <el-input v-model="itemForm.label" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="itemForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <DictSelect v-model="itemForm.status" type="status" valueField="code" labelField="label" style="width: 200px" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="itemForm.description" type="textarea" :rows="3" placeholder="备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="onSubmitItem">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dict-container { padding: 0; display: flex; flex-direction: column; gap: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-actions { display: flex; gap: 10px; align-items: center; }
.pager { margin-top: 12px; display: flex; justify-content: flex-end; }
.items-card { margin-top: 0; }
.selected-label { color: #606266; }
</style>
