<!--suppress ALL, TypeScriptValidateTypes -->
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { message } from '@/api/request.ts'
import { Plus, Search, Download } from '@element-plus/icons-vue'
import { checkButtonPermission } from '@/utils/permission'
import {
  pageFiles,
  uploadFile,
  deleteFile,
  downloadFile,
  batchDownloadFiles,
  listOssConfig,
  saveOssConfig,
  type SysFileInfo,
  type SysOssConfigInfo
} from '@/api/file'

const loading = ref(false)
const tableData = ref<SysFileInfo[]>([])
const total = ref(0)
const selected = ref<SysFileInfo[]>([])
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const ossList = ref<SysOssConfigInfo[]>([])
const ossDialog = ref(false)
const ossForm = ref<SysOssConfigInfo>({ configName: '', provider: 'LOCAL', isDefault: 0, status: 1 })

const can = (code: string) => checkButtonPermission('sysFile', code)
const query = reactive({ current: 1, size: 10, keyword: '', provider: '' })

const providerOptions = [
  { label: '全部', value: '' },
  { label: '本地', value: 'LOCAL' },
  { label: '阿里云 OSS', value: 'ALIYUN_OSS' },
  { label: '腾讯云 COS', value: 'TENCENT_COS' }
]

async function fetchList() {
  loading.value = true
  try {
    const res = await pageFiles({
      current: query.current,
      size: query.size,
      keyword: query.keyword || undefined,
      provider: query.provider || undefined
    })
    tableData.value = res?.records || []
    total.value = Number(res?.total || 0)
  } finally {
    loading.value = false
  }
}

async function fetchOss() {
  try {
    ossList.value = (await listOssConfig()) || []
  } catch {
    ossList.value = []
  }
}

function onSearch() {
  query.current = 1
  fetchList()
}

function onPage(p: number) {
  query.current = p
  fetchList()
}

function onSize(s: number) {
  query.size = s
  query.current = 1
  fetchList()
}

function onSelection(rows: SysFileInfo[]) {
  selected.value = rows
}

function onUploadClick() {
  fileInput.value?.click()
}

async function onUploadChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    await uploadFile(file)
    message.success('上传成功')
    await fetchList()
  } catch (err) {
    message.error(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function downloadOne(row: SysFileInfo) {
  try {
    await downloadFile({ id: row.id!, fileName: row.fileName })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '下载失败')
  }
}

async function batchDownload() {
  const ids = selected.value.map(r => r.id)
  if (!ids.length) {
    message.warning('请选择文件')
    return
  }
  try {
    await batchDownloadFiles(ids)
    message.success('已开始下载');
  } catch (e) {
    message.error(e instanceof Error ? e.message : '批量下载失败')
  }
}

async function onDelete(row: SysFileInfo) {
  try {
    await ElMessageBox.confirm(`删除「${row.fileName}」？将同步删除云端对象。`, '提示', {
      type: 'warning'
    })
    await deleteFile(String(row.id))
    message.success('已删除')
    await fetchList()
  } catch {
    /* cancel */
  }
}

function openOss() {
  ossForm.value = { configName: '', provider: 'ALIYUN_OSS', isDefault: 0, status: 1 }
  ossDialog.value = true
}

function editOss(row: SysOssConfigInfo) {
  ossForm.value = { ...row }
  ossDialog.value = true
}

async function saveOss() {
  if (!ossForm.value.configName?.trim() || !ossForm.value.provider) {
    message.warning('请填写名称与供应商')
    return
  }
  await saveOssConfig(ossForm.value)
  message.success('已保存')
  ossDialog.value = false
  await fetchOss()
}

function formatSize(n?: number) {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

onMounted(() => {
  fetchList()
  fetchOss()
})
</script>

<template>
  <div class="file-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>文件管理</span>
          <div class="card-actions">
            <el-input
              v-model="query.keyword"
              placeholder="搜索文件名"
              clearable
              style="width: 180px"
              @keyup.enter="onSearch"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="query.provider" style="width: 140px" @change="onSearch">
              <el-option v-for="o in providerOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
            <el-button
              v-if="can('sys:file:upload')"
              type="primary"
              :icon="Plus"
              :loading="uploading"
              @click="onUploadClick"
            >
              上传
            </el-button>
            <el-button :icon="Download" :disabled="!selected.length" @click="batchDownload">
              批量下载
            </el-button>
            <el-button v-if="can('sys:oss:config')" @click="openOss">OSS 配置</el-button>
            <input ref="fileInput" type="file" class="hidden-input" @change="onUploadChange" />
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        style="width: 100%"
        @selection-change="onSelection"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="fileName" label="文件名" min-width="180" show-overflow-tooltip />
        <el-table-column prop="provider" label="存储" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.provider === 'LOCAL' ? 'info' : 'primary'">
              {{ row.provider }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="90" align="center">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column prop="bizType" label="业务" width="90" align="center">
          <template #default="{ row }">{{ row.bizType || '—' }}</template>
        </el-table-column>
        <el-table-column prop="createTime" label="上传时间" width="170" align="center" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="downloadOne(row)">下载</el-button>
            <el-button v-if="can('sys:file:delete')" link type="danger" @click="onDelete(row)">
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

    <el-card style="margin-top: 16px">
      <template #header>
        <div class="card-header">
          <span>OSS 供应商</span>
          <el-button v-if="can('sys:oss:config')" size="small" type="primary" plain @click="openOss">
            新增配置
          </el-button>
        </div>
      </template>
      <el-table :data="ossList" border>
        <el-table-column prop="configName" label="名称" min-width="120" />
        <el-table-column prop="provider" label="供应商" width="130" />
        <el-table-column prop="bucket" label="Bucket" min-width="120" />
        <el-table-column prop="endpoint" label="Endpoint" min-width="160" show-overflow-tooltip />
        <el-table-column label="默认" width="80" align="center">
          <template #default="{ row }">{{ row.isDefault === 1 ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button v-if="can('sys:oss:config')" link type="primary" @click="editOss(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="ossDialog" title="OSS 配置" width="520px">
      <el-form label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="ossForm.configName" maxlength="64" />
        </el-form-item>
        <el-form-item label="供应商" required>
          <el-select v-model="ossForm.provider" style="width: 200px">
            <el-option label="本地磁盘" value="LOCAL" />
            <el-option label="阿里云 OSS" value="ALIYUN_OSS" />
            <el-option label="腾讯云 COS" value="TENCENT_COS" />
          </el-select>
        </el-form-item>
        <el-form-item label="Endpoint">
          <el-input v-model="ossForm.endpoint" placeholder="oss-cn-hangzhou.aliyuncs.com" />
        </el-form-item>
        <el-form-item label="Bucket">
          <el-input v-model="ossForm.bucket" />
        </el-form-item>
        <el-form-item label="AccessKey">
          <el-input v-model="ossForm.accessKey" show-password />
        </el-form-item>
        <el-form-item label="SecretKey">
          <el-input v-model="ossForm.secretKey" show-password />
        </el-form-item>
        <el-form-item label="CDN 域名">
          <el-input v-model="ossForm.cdnDomain" placeholder="可选 https://cdn.example.com" />
        </el-form-item>
        <el-form-item label="路径前缀">
          <el-input v-model="ossForm.basePath" placeholder="uploads" />
        </el-form-item>
        <el-form-item label="默认">
          <el-switch v-model="ossForm.isDefault" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ossDialog = false">取消</el-button>
        <el-button type="primary" @click="saveOss">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.file-page {
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
.hidden-input {
  display: none;
}
</style>
