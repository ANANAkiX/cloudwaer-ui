<template>
  <div class="wiki-doc-page">
    <el-card class="doc-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="card-title">
            <span>文档管理</span>
            <span v-if="spaceName" class="card-sub">{{ spaceName }}</span>
          </div>
          <div class="card-actions">
            <el-select v-model="spaceId" placeholder="选择空间" style="width: 200px" @change="onSpaceChange">
              <el-option v-for="s in spaces" :key="s.id" :label="s.name" :value="String(s.id)" />
            </el-select>
            <el-button v-if="can('wiki:doc:add') && spaceId" type="primary" :icon="Plus" @click="openCreate()">
              新建文档
            </el-button>
            <el-button v-if="can('wiki:doc:add') && spaceId" @click="importDialog = true">导入</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="!spaceId" description="请先选择知识库空间" />
      <div v-else class="doc-layout">
        <div class="tree-pane" :style="{ width: treeWidth + 'px' }">
          <div class="pane-head">
            <span class="pane-title">目录</span>
          </div>
          <el-tree
            ref="treeRef"
            v-loading="treeLoading"
            class="doc-tree"
            :data="treeData"
            node-key="id"
            highlight-current
            draggable
            :expand-on-click-node="true"
            :allow-drop="allowDrop"
            :props="{ label: 'title', children: 'children' }"
            @node-click="onSelect"
            @node-drop="onNodeDrop"
          >
            <template #default="{ data }">
              <span class="tree-node" :class="{ 'is-dir': data.summary === '目录' }">
                <span class="tree-title">{{ data.title }}</span>
                <span class="tree-actions" @click.stop>
                  <el-button
                    v-if="can('wiki:doc:add')"
                    class="act-plus"
                    circle
                    size="small"
                    title="在此添加子文档"
                    @click="openCreate(data.id)"
                  >+</el-button>
                  <el-button
                    v-if="can('wiki:doc:delete')"
                    link
                    type="danger"
                    size="small"
                    title="删除"
                    @click="handleDelete(data)"
                  >删</el-button>
                </span>
              </span>
            </template>
          </el-tree>
        </div>

        <div
          class="drag-splitter"
          title="拖动调整宽度"
          @mousedown.prevent="onSplitterDown"
        ></div>

        <div class="editor-pane" :style="{ flex: '1' }">
          <div v-if="current" class="doc-editor">
            <div class="editor-head">
              <el-input
                v-model="current.title"
                class="title-input"
                placeholder="点击输入文档标题"
                maxlength="200"
              >
                <template #prefix>
                  <el-icon><EditPen /></el-icon>
                </template>
              </el-input>
              <div class="head-actions">
                <el-select v-model="current.publicRead" placeholder="可见性" style="width: 130px">
                  <el-option label="跟随空间" :value="null" />
                  <el-option label="私有" :value="0" />
                  <el-option label="公开可读" :value="1" />
                </el-select>
                <el-radio-group v-model="editMode" size="default">
                  <el-radio-button label="preview">预览</el-radio-button>
                  <el-radio-button label="split">分栏</el-radio-button>
                  <el-radio-button label="edit">编辑</el-radio-button>
                </el-radio-group>
                <el-button v-if="can('wiki:doc:edit')" type="primary" :loading="saving" @click="handleSave">
                  保存
                </el-button>
                <el-button v-if="can('wiki:share:add')" @click="openShare">分享</el-button>
              </div>
            </div>

            <div class="editor-body" :class="`mode-${editMode}`">
              <textarea
                v-show="editMode !== 'preview'"
                v-model="current.content"
                class="md-input"
                placeholder="Markdown 正文…"
                spellcheck="false"
              />
              <div
                v-show="editMode !== 'edit'"
                class="md-preview markdown-body"
                v-html="previewHtml"
                @click="onPreviewClick"
              />
            </div>

            <div class="doc-meta">
              <span>作者：{{ current.authorName || '—' }}</span>
              <span>更新：{{ current.updateTime || '—' }}</span>
            </div>
          </div>
          <div v-else class="doc-empty">
            <el-empty description="选择左侧文档，或新建一篇开始编写" />
          </div>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="importDialog" title="导入文档" width="560px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="选择文件 / ZIP 即按文件导入；选择或拖入文件夹则按目录建树。仅 md、markdown、txt"
        style="margin-bottom: 12px"
      />
      <el-form label-width="100px">
        <el-form-item label="导入到">
          <el-tree-select
            v-model="importParentId"
            :data="parentTreeOptions"
            check-strictly
            :render-after-expand="false"
            clearable
            placeholder="根目录"
            style="width: 100%"
            :props="{ label: 'title', children: 'children' }"
            node-key="id"
          />
        </el-form-item>
      </el-form>
      <div
        class="import-drop"
        :class="{ 'is-over': dragOver }"
        @click="pickFiles"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <div class="import-drop-title">点击选择文件 / ZIP，或将文件或文件夹拖到此处</div>
        <div class="import-drop-sub">
          <span>支持多选文件；拖入文件夹会保留目录结构</span>
          <el-button link type="primary" @click.stop="pickFolder">选择文件夹</el-button>
        </div>
        <div v-if="pickSummary" class="import-drop-list">{{ pickSummary }}</div>
      </div>
      <input
        ref="zipInputRef"
        type="file"
        accept=".zip,.md,.markdown,.txt"
        multiple
        style="display: none"
        @change="onFilePick"
      />
      <input
        ref="folderInputRef"
        type="file"
        webkitdirectory
        multiple
        style="display: none"
        @change="onFolderPick"
      />
      <template #footer>
        <el-button @click="closeImport">取消</el-button>
        <el-button type="primary" :loading="importing" :disabled="!hasImportPayload" @click="handleImport">
          开始导入
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importResultVisible" title="导入完成" width="520px">
      <p>目录 {{ importResult.dirCount }} 个，文档 {{ importResult.docCount }} 篇。</p>
      <p v-if="importResult.skipped && importResult.skipped.length" class="import-skip">
        跳过：{{ importResult.skipped.join('；') }}
      </p>
      <p v-if="importResult.errors && importResult.errors.length" class="import-err">
        失败：{{ importResult.errors.join('；') }}
      </p>
      <template #footer>
        <el-button type="primary" @click="onImportDone">知道了</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="createDialog" title="新建文档" width="480px">
      <el-form label-width="90px">
        <el-form-item label="标题">
          <el-input v-model="createForm.title" maxlength="200" />
        </el-form-item>
        <el-form-item label="父文档">
          <el-tree-select
            v-model="createForm.parentId"
            :data="parentTreeOptions"
            check-strictly
            :render-after-expand="false"
            clearable
            placeholder="根目录"
            style="width: 100%"
            :props="{ label: 'title', children: 'children' }"
            node-key="id"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shareDialog" title="创建分享链接" width="520px">
      <el-form label-width="90px">
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
      </el-form>
      <template #footer>
        <el-button @click="shareDialog = false">取消</el-button>
        <el-button type="primary" :loading="shareSaving" @click="handleCreateShare">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="shareResultVisible" title="分享链接" width="520px">
      <el-input v-model="shareResultUrl" readonly />
      <template #footer>
        <el-button type="primary" @click="copyShare">复制</el-button>
        <el-button @click="shareResultVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EditPen, Plus } from '@element-plus/icons-vue'
import { marked } from 'marked'
import {
  createWikiShare,
  deleteWikiDoc,
  getWikiDocDetail,
  getWikiDocTree,
  getWikiSpaceList,
  importWikiArchive,
  importWikiFolder,
  moveWikiDoc,
  saveWikiDoc,
  updateWikiDoc,
  type WikiDoc,
  type WikiImportResult,
  type WikiSpace
} from '@/api/wiki'
import { checkButtonPermission } from '@/utils/permission'

const can = (code: string) => checkButtonPermission('wikiDoc', code)

function fullShareUrl(pathOrToken: string) {
  const p = pathOrToken.startsWith('http')
    ? pathOrToken
    : pathOrToken.startsWith('/')
      ? pathOrToken
      : '/wiki/s/' + pathOrToken
  if (p.startsWith('http')) return p
  return window.location.origin + p
}


const route = useRoute()
const spaces = ref<WikiSpace[]>([])
const spaceId = ref('')
const spaceName = ref('')
const treeLoading = ref(false)
const treeData = ref<WikiDoc[]>([])
const current = ref<(WikiDoc & { publicRead: number | null }) | null>(null)
const saving = ref(false)
const treeRef = ref()
const editMode = ref<'edit' | 'preview' | 'split'>('preview')
const treeWidth = ref(280)
let splitDragging = false

function onSplitterDown() {
  splitDragging = true
  const move = (e: MouseEvent) => {
    if (!splitDragging) return
    const container = document.querySelector('.doc-layout') as HTMLElement | null
    if (!container) return
    const rect = container.getBoundingClientRect()
    const w = e.clientX - rect.left
    treeWidth.value = Math.min(Math.max(w, 180), rect.width * 0.45)
  }
  const up = () => {
    splitDragging = false
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

const parentTreeOptions = computed(() => [
  {
    id: '0',
    title: '根目录',
    children: treeData.value
  }
])

function allowDrop(dragging: any, drop: any, type: 'prev' | 'inner' | 'next') {
  // 目录节点可 inner；文件也可当父级（与现有 parent 语义一致）
  return type === 'inner' || type === 'prev' || type === 'next'
}

async function onNodeDrop(
  dragging: any,
  drop: any,
  type: 'prev' | 'inner' | 'next',
  ev: DragEvent
) {
  ev?.preventDefault?.()
  // Element Plus 传入的是 Node，业务数据在 .data
  const dragData = dragging?.data
  const dropData = drop?.data
  const dragId = dragData?.id
  if (dragId == null) {
    await loadTree()
    return
  }
  let parentId: string | number = 0
  let sort = 0
  if (type === 'inner') {
    parentId = dropData?.id ?? 0
    const childNodes = drop?.childNodes || []
    const idx = childNodes.findIndex((n: any) => String(n.data?.id) === String(dragId))
    sort = idx >= 0 ? idx : childNodes.length
  } else {
    // 上级 id：drop 节点的 parent（Node.parent）
    const parentData = drop?.parent?.data
    parentId = parentData?.id ?? 0
    const siblings = (drop?.parent?.childNodes as any[]) || findSiblings(parentId)
    const idx = siblings.findIndex((n: any) => String((n.data ?? n).id) === String(dropData?.id))
    const base = idx < 0 ? siblings.length : idx
    sort = type === 'prev' ? base : base + 1
  }
  try {
    await moveWikiDoc(String(dragId), parentId == null ? 0 : parentId, sort)
    await loadTree()
  } catch (e: any) {
    console.error(e)
    ElMessage.error(e?.message || '排序保存失败')
    await loadTree()
  }
}

function findSiblings(parentId: string | number | null | undefined): WikiDoc[] {
  const pid = parentId == null ? '0' : String(parentId)
  if (pid === '0') return treeData.value
  const hit = findById(treeData.value, pid)
  return hit?.children || []
}

function findById(nodes: WikiDoc[], id: string): WikiDoc | null {
  for (const n of nodes) {
    if (String(n.id) === id) return n
    if (n.children?.length) {
      const f = findById(n.children, id)
      if (f) return f
    }
  }
  return null
}

const previewHtml = computed(() => {
  try {
    return marked.parse(current.value?.content || '') as string
  } catch {
    return ''
  }
})

/** 路径索引：blog/overview → 节点 */
const pathIndex = ref<Record<string, WikiDoc>>({})

function titleToKey(title: string) {
  return (title || '')
    .trim()
    .replace(/\.md$/i, '')
    .replace(/\.markdown$/i, '')
    .replace(/\.txt$/i, '')
}

function rebuildPathIndex() {
  const map: Record<string, WikiDoc> = {}
  const walk = (nodes: WikiDoc[], prefix: string) => {
    nodes.forEach(n => {
      const key = titleToKey(n.title)
      const full = prefix ? `${prefix}/${key}` : key
      map[full.toLowerCase()] = n
      map[key.toLowerCase()] = n // 根路径兜底（后写覆盖，仅用于歧义时优先全路径）
      if (n.children && n.children.length) walk(n.children, full)
    })
  }
  walk(treeData.value, '')
  // 再走一遍，全路径优先于短名
  const walk2 = (nodes: WikiDoc[], prefix: string) => {
    nodes.forEach(n => {
      const key = titleToKey(n.title)
      const full = prefix ? `${prefix}/${key}` : key
      map[full.toLowerCase()] = n
      if (n.children && n.children.length) walk2(n.children, full)
    })
  }
  walk2(treeData.value, '')
  pathIndex.value = map
}

function currentDirPrefix(): string {
  if (!current.value) return ''
  const pid = current.value.parentId == null ? '0' : String(current.value.parentId)
  if (pid === '0') return ''
  // 向上拼路径
  const chain: string[] = []
  const byId: Record<string, WikiDoc> = {}
  const walk = (nodes: WikiDoc[]) => {
    nodes.forEach(n => {
      byId[String(n.id)] = n
      if (n.children && n.children.length) walk(n.children)
    })
  }
  walk(treeData.value)
  let cur = byId[pid]
  while (cur) {
    chain.unshift(titleToKey(cur.title))
    const pp = cur.parentId == null ? '0' : String(cur.parentId)
    if (pp === '0') break
    cur = byId[pp]
  }
  return chain.join('/')
}

function resolveDocByHref(href: string): WikiDoc | null {
  if (!href) return null
  // 去掉锚点/查询
  let raw = href.split('#')[0].split('?')[0].trim()
  if (!raw) return null
  // 外链不处理
  if (/^(https?:|mailto:|javascript:)/i.test(raw)) return null
  raw = decodeURIComponent(raw)
  raw = raw.replace(/^\.\//, '')
  const key = titleToKey(raw).toLowerCase()
  const full = key.replace(/^\//, '')
  const map = pathIndex.value
  // 1) 相对当前目录
  const dir = currentDirPrefix()
  if (dir) {
    const rel = `${dir}/${full}`.toLowerCase()
    if (map[rel]) return map[rel]
  }
  // 2) 从根的完整路径
  if (map[full]) return map[full]
  // 3) 文件名匹配（唯一时）
  const base = full.split('/').pop() || full
  const hits = Object.keys(map).filter(k => k === base || k.endsWith(`/${base}`))
  if (hits.length === 1) return map[hits[0]]
  // 4) 同目录下仅按文件名
  if (dir) {
    const relHits = Object.keys(map).filter(k => k === `${dir}/${base}`.toLowerCase())
    if (relHits.length >= 1) return map[relHits[0]]
  }
  return hits.length ? map[hits[0]] : null
}

async function onPreviewClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  const a = target.closest('a') as HTMLAnchorElement | null
  if (!a) return
  const href = a.getAttribute('href') || ''
  if (/^(https?:|mailto:)/i.test(href)) return
  e.preventDefault()
  const doc = resolveDocByHref(href)
  if (!doc) {
    ElMessage.info('未找到对应文档：' + href)
    return
  }
  await onSelect(doc)
  await nextTick()
  treeRef.value?.setCurrentKey?.(doc.id)
}

const createDialog = ref(false)
const createForm = reactive({ title: '', parentId: '0' })

const shareDialog = ref(false)
const shareSaving = ref(false)
const shareForm = reactive({ accessLevel: 1, expireTime: '', password: '' })
const shareResultVisible = ref(false)
const shareResultUrl = ref('')

const importDialog = ref(false)
const importing = ref(false)
const importParentId = ref('0')
const zipInputRef = ref<HTMLInputElement>()
const folderInputRef = ref<HTMLInputElement>()
const dragOver = ref(false)
const importZipFile = ref<File | null>(null)
const importFiles = ref<File[]>([])
const importPaths = ref<string[]>([])
const importResultVisible = ref(false)
const importResult = reactive<WikiImportResult>({ dirCount: 0, docCount: 0, skipped: [], errors: [] })

const hasImportPayload = computed(() => !!importZipFile.value || importFiles.value.length > 0)

const pickSummary = computed(() => {
  if (importZipFile.value && importFiles.value.length === 0) {
    return `ZIP：${importZipFile.value.name}`
  }
  if (importFiles.value.length > 0) {
    const n = importFiles.value.length
    const sample = importPaths.value.slice(0, 3).join('、')
    return `已选 ${n} 个文件${importZipFile.value ? '（另含 ZIP）' : ''}：${sample}${n > 3 ? '…' : ''}`
  }
  return ''
})

const flatDocs = computed(() => {
  const out: WikiDoc[] = []
  const walk = (list: WikiDoc[]) => {
    list.forEach(d => {
      out.push(d)
      if (d.children && d.children.length) walk(d.children)
    })
  }
  walk(treeData.value)
  return out
})

function isReadme(d: WikiDoc) {
  return /^(readme|readme\.md)$/i.test((d.title || '').trim())
}

function isRootReadme(d: WikiDoc) {
  const pid = d.parentId == null ? '0' : String(d.parentId)
  return pid === '0' && isReadme(d)
}

function findRootReadme(list: WikiDoc[]): WikiDoc | null {
  return list.find(d => isRootReadme(d)) || null
}

/** 目录节点下若存在 README，则返回之 */
function findChildReadme(d: WikiDoc): WikiDoc | null {
  if (!d.children || d.children.length === 0) return null
  return d.children.find(c => isReadme(c)) || null
}

/** 点选文件夹时优先打开其下 README */
function resolveOpenTarget(data: WikiDoc): WikiDoc {
  if (isReadme(data)) return data
  return findChildReadme(data) || data
}

async function loadSpaces() {
  try {
    spaces.value = (await getWikiSpaceList()) || []
  } catch (e) {
    console.error('加载空间列表失败', e)
    spaces.value = []
    ElMessage.warning('空间列表加载失败')
    return
  }
  const q = route.query.spaceId as string
  if (q && spaces.value.some(s => String(s.id) === q)) {
    spaceId.value = q
  } else if (spaces.value.length && !spaceId.value) {
    spaceId.value = String(spaces.value[0].id)
  }
  syncSpaceName()
  if (spaceId.value) await loadTree({ autoReadme: true })
}

function syncSpaceName() {
  const hit = spaces.value.find(s => String(s.id) === spaceId.value)
  spaceName.value = hit?.name || ''
}

async function onSpaceChange() {
  syncSpaceName()
  current.value = null
  await loadTree({ autoReadme: true })
}

async function loadTree(opts?: { autoReadme?: boolean }) {
  if (!spaceId.value) return
  const prev = current.value
  const prevId = prev?.id != null ? String(prev.id) : null
  treeLoading.value = true
  try {
    treeData.value = (await getWikiDocTree(spaceId.value)) || []
    rebuildPathIndex()
    // 刷新树时保留当前正在阅读/编辑的文档，避免拖拽排序后被清空
    const stillThere = prevId ? findById(treeData.value, prevId) : null
    if (prev && stillThere) {
      current.value = prev
      await nextTick()
      treeRef.value?.setCurrentKey?.(prev.id)
      return
    }
    current.value = null
    if (opts?.autoReadme) {
      const readme = findRootReadme(treeData.value)
      if (readme) {
        await onSelect(readme)
        await nextTick()
        treeRef.value?.setCurrentKey?.(readme.id)
      }
    }
  } finally {
    treeLoading.value = false
  }
}

async function onSelect(data: WikiDoc) {
  const target = resolveOpenTarget(data)
  // 展开被点的文件夹，便于看到 README
  if (data.children && data.children.length && data.id != null) {
    const node = treeRef.value?.store?.nodesMap?.[String(data.id)]
    node?.expand?.()
  }
  if (target.id !== data.id && target.id != null) {
    await nextTick()
    treeRef.value?.setCurrentKey?.(target.id)
  }
  const detail = await getWikiDocDetail(target.id!)
  current.value = { ...detail, children: [], publicRead: detail.publicRead ?? null }
}

function openCreate(parentId?: string | number) {
  createForm.title = ''
  createForm.parentId = parentId != null ? String(parentId) : '0'
  createDialog.value = true
}

async function handleCreate() {
  if (!createForm.title) {
    ElMessage.warning('请填写标题')
    return
  }
  await saveWikiDoc({
    spaceId: spaceId.value,
    parentId: createForm.parentId && createForm.parentId !== '0' ? createForm.parentId : 0,
    title: createForm.title
  })
  ElMessage.success('已创建')
  createDialog.value = false
  await loadTree()
}

async function handleSave() {
  if (!current.value) return
  saving.value = true
  try {
    await updateWikiDoc({
      id: current.value.id,
      spaceId: spaceId.value,
      parentId: current.value.parentId ?? 0,
      title: current.value.title,
      content: current.value.content,
      summary: current.value.summary,
      sort: current.value.sort,
      publicRead: current.value.publicRead
    })
    ElMessage.success('已保存')
    await loadTree()
  } finally {
    saving.value = false
  }
}

function handleDelete(data: WikiDoc) {
  ElMessageBox.confirm(`确定删除「${data.title}」？`, '提示', { type: 'warning' }).then(async () => {
    await deleteWikiDoc(data.id!)
    ElMessage.success('已删除')
    await loadTree()
  })
}

function openShare() {
  if (!current.value) return
  shareForm.accessLevel = 1
  shareForm.expireTime = ''
  shareForm.password = ''
  shareDialog.value = true
}

async function handleCreateShare() {
  if (!current.value) return
  shareSaving.value = true
  try {
    const res = await createWikiShare({
      targetType: 'doc',
      targetId: current.value.id!,
      accessLevel: shareForm.accessLevel,
      expireTime: shareForm.expireTime ? String(shareForm.expireTime) : undefined,
      password: shareForm.password || undefined
    })
    shareDialog.value = false
    shareResultUrl.value = fullShareUrl(res.shareUrl || res.token || '')
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

function resetImportPayload() {
  importZipFile.value = null
  importFiles.value = []
  importPaths.value = []
  if (zipInputRef.value) zipInputRef.value.value = ''
  if (folderInputRef.value) folderInputRef.value.value = ''
}

function pickFiles() {
  zipInputRef.value?.click()
}

function pickFolder() {
  folderInputRef.value?.click()
}

function closeImport() {
  importDialog.value = false
  resetImportPayload()
}

function addFile(file: File, relPath?: string) {
  const name = file.name || ''
  const rel = (relPath || (file as File & { webkitRelativePath?: string }).webkitRelativePath || name).replace(
    /\\/g,
    '/'
  )
  if (name.toLowerCase().endsWith('.zip')) {
    importZipFile.value = file
    return
  }
  if (!/\.(md|markdown|txt)$/i.test(name)) return
  importFiles.value.push(file)
  importPaths.value.push(rel)
}

function onFilePick(e: Event) {
  const input = e.target as HTMLInputElement
  resetImportPayload()
  Array.from(input.files || []).forEach(f => addFile(f))
}

function onFolderPick(e: Event) {
  const input = e.target as HTMLInputElement
  resetImportPayload()
  Array.from(input.files || []).forEach(f => addFile(f))
}

async function walkEntry(
  entry: FileSystemEntry,
  prefix: string,
  out: { file: File; path: string }[]
): Promise<void> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name
  if (entry.isFile) {
    const file = await new Promise<File | null>(resolve => {
      ;(entry as FileSystemFileEntry).file(resolve, () => resolve(null))
    })
    if (file) out.push({ file, path })
    return
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const children = await new Promise<FileSystemEntry[]>(resolve => {
      reader.readEntries(all => resolve(Array.from(all)), () => resolve([]))
    })
    for (const child of children) {
      await walkEntry(child, path, out)
    }
  }
}

async function onDrop(e: DragEvent) {
  dragOver.value = false
  resetImportPayload()
  const items = e.dataTransfer?.items
  const files = e.dataTransfer?.files
  if (items && items.length > 0 && (items[0] as DataTransferItem).webkitGetAsEntry) {
    const entries: FileSystemEntry[] = []
    for (let i = 0; i < items.length; i++) {
      const entry = (items[i] as DataTransferItem).webkitGetAsEntry()
      if (entry) entries.push(entry)
    }
    const collected: { file: File; path: string }[] = []
    for (const entry of entries) {
      await walkEntry(entry, '', collected)
    }
    if (collected.length === 1 && /\.zip$/i.test(collected[0].file.name) && collected[0].path.indexOf('/') < 0) {
      importZipFile.value = collected[0].file
    } else {
      collected.forEach(({ file, path }) => addFile(file, path || file.name))
    }
    return
  }
  Array.from(files || []).forEach(f => addFile(f))
}

async function handleImport() {
  if (!spaceId.value) return
  if (!hasImportPayload.value) {
    ElMessage.warning('请先选择文件或文件夹')
    return
  }
  importing.value = true
  try {
    let result: WikiImportResult
    if (importZipFile.value && importFiles.value.length === 0) {
      result = await importWikiArchive(spaceId.value, importZipFile.value, importParentId.value)
    } else if (importFiles.value.length > 0) {
      result = await importWikiFolder(
        spaceId.value,
        importFiles.value,
        importPaths.value,
        importParentId.value
      )
    } else {
      result = await importWikiArchive(spaceId.value, importZipFile.value!, importParentId.value)
    }
    importResult.dirCount = result.dirCount || 0
    importResult.docCount = result.docCount || 0
    importResult.skipped = result.skipped || []
    importResult.errors = result.errors || []
    importDialog.value = false
    resetImportPayload()
    importResultVisible.value = true
  } finally {
    importing.value = false
  }
}

function onImportDone() {
  importResultVisible.value = false
  resetImportPayload()
  loadTree({ autoReadme: true })
}

onMounted(loadSpaces)
</script>

<style scoped>
.wiki-doc-page {
  padding: 0;
}
.doc-card {
  min-height: 70vh;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-weight: 600;
}
.card-sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}
.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.doc-layout {
  display: flex;
  align-items: stretch;
  min-height: 62vh;
}
.drag-splitter {
  width: 6px;
  margin: 0 4px;
  cursor: col-resize;
  border-radius: 3px;
  background: var(--el-border-color-lighter);
  align-self: stretch;
  transition: background 0.15s;
}
.drag-splitter:hover {
  background: var(--el-color-primary);
}
.tree-pane {
  flex-shrink: 0;
  overflow: auto;
}
.editor-pane {
  min-width: 0;
  flex: 1;
}
.act-plus {
  opacity: 0.35;
}
.tree-node:hover .act-plus {
  opacity: 1;
}
.tree-node:hover .tree-actions {
  opacity: 1;
}
.old-doc-layout {
  min-height: 62vh;
}
.tree-pane {
  border-right: 1px solid var(--el-border-color-lighter);
  padding-right: 12px;
  max-height: 62vh;
  display: flex;
  flex-direction: column;
}
.pane-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}
.pane-title {
  font-size: 13px;
  font-weight: 600;
}
.pane-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.doc-tree {
  overflow: auto;
  background: transparent;
}
.tree-node {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;
}
.tree-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-node.is-dir .tree-title {
  font-weight: 600;
}
.tree-actions {
  opacity: 0;
  margin-left: 8px;
}
.tree-node:hover .tree-actions {
  opacity: 1;
}
.doc-editor {
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  overflow: hidden;
  background: var(--el-bg-color);
}
.editor-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}
.title-input {
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 520px;
}
/* actions pinned right */
.title-input :deep(.el-input__wrapper) {
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 4px 12px;
  box-shadow: 0 0 0 1px transparent inset;
  transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
  cursor: text;
}
.title-input :deep(.el-input__wrapper:hover) {
  border-color: var(--el-color-primary-light-5);
}
.title-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-9) inset;
}
.title-input :deep(.el-input__inner) {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.title-input :deep(.el-input__inner::placeholder) {
  color: var(--el-text-color-placeholder);
  font-weight: 400;
}
.title-input :deep(.el-input__prefix) {
  color: var(--el-color-primary);
  font-size: 16px;
  margin-right: 2px;
}
.title-hint {
  margin-left: 4px;
  font-size: 12px;
  color: var(--el-color-primary);
  white-space: nowrap;
}
.head-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.editor-body {
  display: grid;
  min-height: 420px;
}
.editor-body.mode-split {
  grid-template-columns: 1fr 1fr;
}
.editor-body.mode-edit,
.editor-body.mode-preview {
  grid-template-columns: 1fr;
}
.md-input {
  border: none;
  border-right: 1px solid var(--el-border-color-lighter);
  padding: 16px 18px;
  resize: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
  outline: none;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  min-height: 420px;
  box-sizing: border-box;
}
.editor-body.mode-edit .md-input {
  border-right: none;
}
.editor-body.mode-preview .md-input {
  display: none;
}
.md-preview {
  padding: 18px 22px;
  overflow: auto;
  max-height: 56vh;
  background: var(--el-fill-color-blank);
  font-size: 14px;
  line-height: 1.75;
}
.md-preview :deep(a) {
  color: var(--el-color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.md-preview :deep(a:hover) {
  color: var(--el-color-primary-light-3);
}
.doc-meta {
  display: flex;
  gap: 16px;
  padding: 10px 14px;
  border-top: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
}
.doc-empty {
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  padding: 60px 0;
}
.import-drop {
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 28px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.import-drop.is-over {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.import-drop-title {
  font-size: 14px;
  color: var(--el-text-color-primary);
}
.import-drop-sub {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}
.import-drop-list {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-color-success);
  word-break: break-all;
}
.import-skip {
  color: var(--el-color-warning);
  font-size: 12px;
}
.import-err {
  color: var(--el-color-danger);
  font-size: 12px;
}
@media (max-width: 1100px) {
  .editor-body.mode-split {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
}
</style>
