<template>
  <div class="wiki-share-page">
    <div class="share-shell">
      <header class="share-head">
        <div class="brand">Cloudwaer Wiki</div>
        <div class="meta">
          <el-tag v-if="accessLevel === 1" size="small" type="info">只读</el-tag>
          <el-tag v-else-if="accessLevel === 2" size="small" type="warning">可写</el-tag>
          <template v-if="canEdit">
            <el-radio-group v-model="mode" size="small" class="mode-switch">
              <el-radio-button label="preview">预览</el-radio-button>
              <el-radio-button label="edit">编辑</el-radio-button>
              <el-radio-button label="split">分栏</el-radio-button>
            </el-radio-group>
            <el-button
              type="primary"
              size="small"
              :loading="saving"
              :disabled="!dirty"
              @click="save"
            >
              保存
            </el-button>
          </template>
        </div>
      </header>

      <div v-if="needPassword" class="pwd-card">
        <h2>此分享需要访问密码</h2>
        <el-input
          v-model="password"
          type="password"
          show-password
          placeholder="请输入密码"
          style="max-width: 320px; margin: 16px 0"
          @keyup.enter="submitPassword"
        />
        <div>
          <el-button type="primary" :loading="loading" @click="submitPassword">查看</el-button>
        </div>
      </div>

      <div v-else-if="loading" class="loading-box">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="errorMsg" class="err-box">
        <el-result icon="error" :title="errorMsg">
          <template #extra>
            <el-button type="primary" @click="load">重试</el-button>
          </template>
        </el-result>
      </div>

      <article v-else class="share-body">
        <h1 v-if="!canEdit || mode === 'preview'" class="doc-title">{{ title }}</h1>
        <el-input
          v-else
          v-model="title"
          class="title-edit"
          placeholder="文档标题"
          maxlength="200"
          @input="markDirty"
        />

        <div class="body-area" :class="`mode-${mode}`">
          <textarea
            v-show="canEdit && mode !== 'preview'"
            v-model="content"
            class="md-input"
            placeholder="Markdown 正文…"
            spellcheck="false"
            @input="markDirty"
          />
          <div
            v-show="!canEdit || mode !== 'edit'"
            class="markdown-body"
            v-html="html"
          />
        </div>

        <div v-if="!content && data?.docs?.length" class="doc-list">
          <h2>目录</h2>
          <ul>
            <li v-for="d in data.docs" :key="d.id">{{ d.title }}</li>
          </ul>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import { accessWikiShare, updateWikiViaShare, type WikiShareAccess } from '@/api/wiki'

const route = useRoute()
const token = String(route.params.token || '')
const loading = ref(false)
const saving = ref(false)
const needPassword = ref(false)
const password = ref('')
const errorMsg = ref('')
const data = ref<WikiShareAccess | null>(null)
const title = ref('')
const content = ref('')
const dirty = ref(false)
const originTitle = ref('')
const originContent = ref('')
const mode = ref<'preview' | 'edit' | 'split'>('preview')

const accessLevel = computed(() => data.value?.accessLevel || 0)
const canEdit = computed(() => accessLevel.value === 2)

const html = computed(() => {
  try {
    return marked.parse(content.value || '') as string
  } catch {
    return ''
  }
})

function applyData(res: WikiShareAccess) {
  data.value = res
  title.value = res.title || ''
  content.value = res.content || ''
  originTitle.value = title.value
  originContent.value = content.value
  dirty.value = false
  if (canEdit.value && mode.value === 'preview') {
    mode.value = 'split'
  }
}

function markDirty() {
  dirty.value = title.value !== originTitle.value || content.value !== originContent.value
}

function submitPassword() {
  if (!password.value) {
    ElMessage.warning('请输入访问密码')
    return
  }
  load()
}

async function load() {
  if (!token) {
    errorMsg.value = '链接无效'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    // 未输入密码时不带 password 字段，后端返回 needPassword=true，不抛错
    const res = await accessWikiShare(token, password.value ? password.value : undefined)
    if (res.needPassword) {
      needPassword.value = true
      data.value = null
      return
    }
    needPassword.value = false
    applyData(res)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const raw = (msg || '').trim()
    if (raw.includes('密码')) {
      needPassword.value = true
      errorMsg.value = ''
      // 仅在已提交过密码时才提示错误（避免首屏 toast）
      if (password.value) {
        ElMessage.error('访问密码错误')
      }
      return
    }
    if (raw.includes('过期')) {
      errorMsg.value = raw.includes('有效期至') ? raw : '分享已过期，请联系分享者重新生成'
    } else if (raw.includes('不存在') || raw.includes('失效')) {
      errorMsg.value = '分享不存在或已被吊销'
    } else {
      errorMsg.value = raw || '暂时无法打开该分享'
    }
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!canEdit.value) return
  saving.value = true
  try {
    const res = await updateWikiViaShare(token, content.value, title.value, password.value || undefined)
    applyData(res)
    ElMessage.success('已保存')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    ElMessage.error(msg || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.wiki-share-page {
  min-height: 100vh;
  background: var(--el-fill-color-lighter, #f5f7fa);
  padding: 24px 16px 48px;
}
.share-shell {
  max-width: 980px;
  margin: 0 auto;
  background: var(--el-bg-color, #fff);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.share-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  flex-wrap: wrap;
}
.brand {
  font-weight: 600;
}
.meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.mode-switch {
  margin-left: 4px;
}
.pwd-card,
.loading-box,
.err-box {
  padding: 48px 24px;
  text-align: center;
}
.share-body {
  padding: 24px 28px 36px;
}
.doc-title {
  margin: 0 0 16px;
  font-size: 28px;
  line-height: 1.35;
}
.title-edit {
  margin-bottom: 12px;
  width: 100%;
}
.title-edit :deep(.el-input__inner) {
  font-size: 18px;
  font-weight: 600;
}
.body-area {
  width: 100%;
  box-sizing: border-box;
}
.body-area.mode-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: stretch;
}
.body-area.mode-split .md-input,
.body-area.mode-split .markdown-body {
  height: 72vh;
  min-height: 560px;
}
.body-area.mode-edit .md-input {
  display: block;
  width: 100%;
  height: 78vh;
  min-height: 640px;
}
.body-area.mode-preview .markdown-body {
  min-height: 480px;
}
.md-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 8px;
  padding: 16px 18px;
  resize: both;
  min-height: 64vh;
  height: 72vh;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.75;
  outline: none;
  background: var(--el-fill-color-blank, #fff);
  color: var(--el-text-color-primary, #303133);
}
.md-input:focus {
  border-color: var(--el-color-primary, #409eff);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-9, rgba(64, 158, 255, 0.2));
}
.markdown-body {
  font-size: 15px;
  line-height: 1.8;
  min-height: 320px;
  max-height: 72vh;
  overflow: auto;
  box-sizing: border-box;
}
.share-body {
  padding: 20px 24px 28px;
}
.doc-list {
  margin-top: 20px;
}
@media (max-width: 900px) {
  .body-area.mode-split {
    grid-template-columns: 1fr;
  }
}
</style>
