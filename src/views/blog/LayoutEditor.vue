<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BlogLayoutModule } from '@/api/blog'

/** 模块元数据 */
interface ModuleMeta {
  key: string
  label: string
  description?: string
  zones: Array<'left' | 'main' | 'right' | 'hidden'>
  hideable: boolean
}

const HOME_META: ModuleMeta[] = [
  { key: 'siteProfile', label: '站点信息', description: '头像、简介、统计', zones: ['left'], hideable: true },
  { key: 'nav', label: '导航', zones: ['left'], hideable: true },
  { key: 'quickLinks', label: '快速入口', zones: ['left'], hideable: true },
  { key: 'featured', label: '精选大卡', zones: ['main'], hideable: true },
  { key: 'articleList', label: '文章列表', zones: ['main'], hideable: false },
  { key: 'categoryList', label: '分类', zones: ['right'], hideable: true },
  { key: 'tagCloud', label: '标签云', zones: ['right'], hideable: true },
  { key: 'hotArticles', label: '热门文章', zones: ['right'], hideable: true },
  { key: 'about', label: '关于', zones: ['right'], hideable: true }
]

const ARTICLE_META: ModuleMeta[] = [
  { key: 'author', label: '作者卡片', zones: ['left'], hideable: true },
  { key: 'readingInfo', label: '阅读信息', zones: ['left'], hideable: true },
  { key: 'actions', label: '操作', zones: ['left'], hideable: true },
  { key: 'related', label: '相关阅读/合集', zones: ['left', 'right'], hideable: true },
  { key: 'toc', label: '目录', zones: ['right'], hideable: true },
  { key: 'tags', label: '标签', zones: ['right'], hideable: true }
]

const props = defineProps<{
  page: 'home' | 'article'
  modelValue: BlogLayoutModule[]
}>()

const emit = defineEmits<{ 'update:modelValue': [v: BlogLayoutModule[]] }>()

const metaList = computed(() => (props.page === 'home' ? HOME_META : ARTICLE_META))
const metaMap = new Map(metaList.value.map(m => [m.key, m]))

const local = computed<BlogLayoutModule[]>({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const zones = [
  { key: 'left' as const, label: props.page === 'home' ? '首页左栏' : '详情左栏' },
  { key: 'main' as const, label: '主内容区' },
  { key: 'right' as const, label: props.page === 'home' ? '首页右栏' : '详情右栏' },
  { key: 'hidden' as const, label: '停用（不展示）' }
]

function modulesIn(zone: BlogLayoutModule['zone']) {
  return local.value
    .filter(m => m.zone === zone)
    .sort((a, b) => a.order - b.order)
}

function labelOf(key: string) {
  return metaMap.get(key)?.label || key
}

function descOf(key: string) {
  return metaMap.get(key)?.description || ''
}

function canHide(key: string) {
  return metaMap.get(key)?.hideable !== false
}

/** 拖拽状态 */
const dragKey = ref('')
const dropZone = ref<BlogLayoutModule['zone'] | ''>('')

function onDragStart(key: string) {
  dragKey.value = key
}

function onDrop(zone: BlogLayoutModule['zone']) {
  const key = dragKey.value
  if (!key) return
  const meta = metaMap.get(key)
  if (meta && !meta.zones.includes(zone) && zone !== 'hidden') return

  const next = local.value.map(m => ({ ...m }))
  const idx = next.findIndex(m => m.key === key)
  if (idx < 0) return
  next[idx].zone = zone
  next[idx].visible = zone !== 'hidden'
  // 重排目标 zone
  const zoneItems = next
    .filter(m => m.zone === zone)
    .sort((a, b) => a.order - b.order)
  zoneItems.forEach((m, i) => {
    m.order = i + 1
  })
  local.value = next
  dragKey.value = ''
  dropZone.value = ''
}

function moveInZone(key: string, zone: BlogLayoutModule['zone'], delta: number) {
  const items = modulesIn(zone)
  const i = items.findIndex(m => m.key === key)
  if (i < 0) return
  const j = i + delta
  if (j < 0 || j >= items.length) return
  const next = local.value.map(m => ({ ...m }))
  const get = (k: string) => next.find(m => m.key === k)!
  const a = get(items[i].key)
  const b = get(items[j].key)
  const tmp = a.order
  a.order = b.order
  b.order = tmp
  local.value = next
}

function toggleVisible(key: string) {
  const next = local.value.map(m => ({ ...m }))
  const m = next.find(x => x.key === key)
  if (!m || !canHide(key)) return
  m.visible = !m.visible
  local.value = next
}

function resetDefaults() {
  const defaults: BlogLayoutModule[] =
    props.page === 'home'
      ? [
          { key: 'siteProfile', zone: 'left', order: 1, visible: true },
          { key: 'nav', zone: 'left', order: 2, visible: true },
          { key: 'quickLinks', zone: 'left', order: 3, visible: true },
          { key: 'featured', zone: 'main', order: 1, visible: true },
          { key: 'articleList', zone: 'main', order: 2, visible: true },
          { key: 'categoryList', zone: 'right', order: 1, visible: true },
          { key: 'tagCloud', zone: 'right', order: 2, visible: true },
          { key: 'hotArticles', zone: 'right', order: 3, visible: true },
          { key: 'about', zone: 'right', order: 4, visible: true }
        ]
      : [
          { key: 'author', zone: 'left', order: 1, visible: true },
          { key: 'readingInfo', zone: 'left', order: 2, visible: true },
          { key: 'actions', zone: 'left', order: 3, visible: true },
          { key: 'related', zone: 'left', order: 4, visible: true },
          { key: 'toc', zone: 'right', order: 1, visible: true },
          { key: 'tags', zone: 'right', order: 2, visible: true }
        ]
  local.value = defaults
}
</script>

<template>
  <div class="layout-editor">
    <div class="editor-toolbar">
      <el-button size="small" @click="resetDefaults">恢复默认布局</el-button>
      <span class="tip">拖拽卡片到分区；↑↓ 调整分区内顺序；开关控制是否展示</span>
    </div>

    <div class="zone-grid">
      <div
        v-for="z in zones"
        :key="z.key"
        class="zone-col"
        :class="{ dragover: dropZone === z.key }"
        @dragover.prevent="dropZone = z.key"
        @dragleave="dropZone = ''"
        @drop.prevent="onDrop(z.key)"
      >
        <div class="zone-title">{{ z.label }}</div>
        <div
          v-for="(m, idx) in modulesIn(z.key)"
          :key="m.key"
          class="module-card"
          :class="{ drag: dragKey === m.key }"
          draggable="true"
          @dragstart="onDragStart(m.key)"
          @dragend="dragKey = ''; dropZone = ''"
        >
          <div class="module-head">
            <strong>{{ labelOf(m.key) }}</strong>
            <el-switch
              v-if="canHide(m.key) && z.key !== 'hidden'"
              :model-value="m.visible"
              size="small"
              @change="toggleVisible(m.key)"
            />
            <el-tag v-else-if="z.key === 'hidden'" size="small" type="info">停用</el-tag>
            <el-tag v-else size="small" type="success">必选</el-tag>
          </div>
          <p v-if="descOf(m.key)" class="module-desc">{{ descOf(m.key) }}</p>
          <div class="module-actions" v-if="z.key !== 'hidden'">
            <el-button size="small" :disabled="idx === 0" @click="moveInZone(m.key, z.key, -1)">↑</el-button>
            <el-button size="small" :disabled="idx === modulesIn(z.key).length - 1" @click="moveInZone(m.key, z.key, 1)">↓</el-button>
            <el-button
              v-if="canHide(m.key) && m.visible"
              size="small"
              type="warning"
              plain
              @click="onDrop('hidden'); /* noop */"
              @mousedown="dragKey = m.key"
            >
              拖到停用区
            </el-button>
          </div>
          <div class="module-actions" v-else>
            <el-button
              size="small"
              type="primary"
              plain
              @click="() => {
                const meta = metaMap.get(m.key)
                const target = meta?.zones[0] || 'left'
                const next = local.map(x => ({ ...x }))
                const item = next.find(x => x.key === m.key)
                if (item) {
                  item.zone = target
                  item.visible = true
                  const zoneItems = next.filter(x => x.zone === target).sort((a, b) => a.order - b.order)
                  zoneItems.forEach((x, i) => { x.order = i + 1 })
                  local = next
                }
              }"
            >
              恢复展示
            </el-button>
          </div>
        </div>
        <div v-if="!modulesIn(z.key).length" class="zone-empty">拖拽模块到此</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-editor {
  width: 100%;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.zone-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}
.zone-col {
  min-height: 220px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  padding: 10px;
  background: var(--el-fill-color-blank);
}
.zone-col.dragover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.zone-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--el-text-color-primary);
}
.module-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  background: var(--el-bg-color);
  cursor: grab;
}
.module-card.drag {
  opacity: 0.5;
}
.module-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.module-desc {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.module-actions {
  margin-top: 8px;
  display: flex;
  gap: 4px;
}
.zone-empty {
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  padding: 24px 8px;
}
@media (max-width: 1200px) {
  .zone-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
