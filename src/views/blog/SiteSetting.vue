<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import {
  getSiteSetting,
  saveSiteSetting,
  toPublicUrl,
  type BlogSiteSetting,
  type BlogNavItem
} from '@/api/blog'
import { message } from '@/api/request.ts'
import { checkButtonPermission } from '@/utils/permission'
import LayoutEditor from './LayoutEditor.vue'
import type { BlogLayoutModule } from '@/api/blog'

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('site')

const can = (code: string) => checkButtonPermission('blogSetting', code)

const form = reactive<BlogSiteSetting>({
  siteTitle: '',
  siteDescription: '',
  favicon: '',
  enableSearch: 1,
  layout: 'default',
  footerText: '',
  nav: [],
  pages: { about: { title: '', content: '' } },
  articleLayout: { tocPosition: 'right', modules: [] },
  homeLayout: { showFeatured: true, showTagCloud: true, showHot: true, modules: [] }
})

const homeModules = ref<BlogLayoutModule[]>([])
const articleModules = ref<BlogLayoutModule[]>([])

const defaultHomeModules = (): BlogLayoutModule[] => [
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

const defaultArticleModules = (): BlogLayoutModule[] => [
  { key: 'author', zone: 'left', order: 1, visible: true },
  { key: 'readingInfo', zone: 'left', order: 2, visible: true },
  { key: 'actions', zone: 'left', order: 3, visible: true },
  { key: 'related', zone: 'left', order: 4, visible: true },
  { key: 'toc', zone: 'right', order: 1, visible: true },
  { key: 'tags', zone: 'right', order: 2, visible: true }
]

const faviconPreview = computed(() => toPublicUrl(form.favicon))

const layoutOptions = [
  { label: '默认（default）', value: 'default' },
  { label: '紧凑（compact）', value: 'compact' },
  { label: '杂志（magazine）', value: 'magazine' }
]

const defaultNav = (): BlogNavItem[] => [
  { key: 'home', label: '首页', path: '/', visible: true, order: 1 },
  { key: 'forum', label: '微论坛', path: '/forum', visible: true, order: 2 },
  { key: 'archive', label: '归档', path: '/archive', visible: true, order: 3 },
  { key: 'about', label: '关于', path: '/about', visible: true, order: 4 },
  { key: 'write', label: '写文章', path: '/write', visible: true, order: 5 }
]

const navList = computed(() => form.nav || [])

const fetchSetting = async () => {
  loading.value = true
  try {
    const data = (await getSiteSetting()) || {}
    Object.assign(form, {
      siteTitle: data.siteTitle ?? '',
      siteDescription: data.siteDescription ?? '',
      favicon: data.favicon ?? '',
      enableSearch: data.enableSearch ?? 1,
      layout: data.layout || 'default',
      footerText: data.footerText ?? '',
      nav: (data.nav && data.nav.length ? data.nav : defaultNav()).map((n, i) => ({
        key: n.key || `item${i + 1}`,
        label: n.label ?? '',
        path: n.path ?? '',
        visible: n.visible !== false,
        order: n.order ?? i + 1
      })),
      pages: {
        about: {
          title: data.pages?.about?.title ?? '',
          content: data.pages?.about?.content ?? ''
        }
      },
      articleLayout: {
        tocPosition: 'right',
        modules:
          (data.articleLayout?.modules && data.articleLayout.modules.length
            ? data.articleLayout.modules
            : defaultArticleModules()
          ).map((m, i) => ({
            key: m.key,
            zone: m.zone || 'left',
            order: m.order ?? i + 1,
            visible: m.visible !== false,
            title: m.title,
            extra: m.extra
          }))
      },
      homeLayout: {
        showFeatured: data.homeLayout?.showFeatured !== false,
        showTagCloud: data.homeLayout?.showTagCloud !== false,
        showHot: data.homeLayout?.showHot !== false,
        modules:
          (data.homeLayout?.modules && data.homeLayout.modules.length
            ? data.homeLayout.modules
            : defaultHomeModules()
          ).map((m, i) => ({
            key: m.key,
            zone: m.zone || 'left',
            order: m.order ?? i + 1,
            visible: m.visible !== false,
            title: m.title,
            extra: m.extra
          }))
      }
    })
    homeModules.value = form.homeLayout?.modules || []
    articleModules.value = form.articleLayout?.modules || []
  } finally {
    loading.value = false
  }
}

const onAddNav = () => {
  const list = form.nav || []
  list.push({
    key: `custom${list.length + 1}`,
    label: '',
    path: '/',
    visible: true,
    order: list.length + 1
  })
  form.nav = list
}

const onRemoveNav = (index: number) => {
  const list = [...(form.nav || [])]
  list.splice(index, 1)
  form.nav = list.map((n, i) => ({ ...n, order: i + 1 }))
}

const onMoveNav = (index: number, delta: number) => {
  const list = [...(form.nav || [])]
  const target = index + delta
  if (target < 0 || target >= list.length) return
  const tmp = list[index]
  list[index] = list[target]
  list[target] = tmp
  form.nav = list.map((n, i) => ({ ...n, order: i + 1 }))
}

const onSave = async () => {
  if (!form.siteTitle?.trim()) {
    message.warning('请输入站点标题')
    activeTab.value = 'site'
    return
  }
  const nav = (form.nav || []).map((n, i) => ({
    key: n.key || `item${i + 1}`,
    label: n.label?.trim() || n.key || `导航${i + 1}`,
    path: n.path?.trim() || '/',
    visible: n.visible !== false,
    order: i + 1
  }))
  saving.value = true
  try {
    const payload: BlogSiteSetting = {
      siteTitle: form.siteTitle.trim(),
      siteDescription: form.siteDescription ?? '',
      favicon: form.favicon ?? '',
      enableSearch: form.enableSearch ? 1 : 0,
      layout: form.layout || 'default',
      footerText: form.footerText ?? '',
      nav,
      pages: {
        about: {
          title: form.pages?.about?.title ?? '',
          content: form.pages?.about?.content ?? ''
        }
      },
      articleLayout: {
        tocPosition: 'right',
        modules: articleModules.value
      },
      homeLayout: {
        showFeatured:
          homeModules.value.find(m => m.key === 'featured')?.visible !== false,
        showTagCloud:
          homeModules.value.find(m => m.key === 'tagCloud')?.visible !== false,
        showHot:
          homeModules.value.find(m => m.key === 'hotArticles')?.visible !== false,
        modules: homeModules.value
      }
    }
    await saveSiteSetting(payload)
    message.success('保存成功')
    await fetchSetting()
  } finally {
    saving.value = false
  }
}

onMounted(fetchSetting)
</script>

<template>
  <div class="blog-page">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>网站设置</span>
          <div class="card-actions">
            <el-button
              v-if="can('blog:setting:edit')"
              type="primary"
              :loading="saving"
              @click="onSave"
            >
              保存
            </el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 站点 -->
        <el-tab-pane label="站点" name="site">
          <el-form :model="form" label-width="120px" style="max-width: 640px">
            <el-form-item label="站点标题" required>
              <el-input
                v-model="form.siteTitle"
                maxlength="64"
                placeholder="网站标题"
                clearable
              />
            </el-form-item>

            <el-form-item label="站点描述">
              <el-input
                v-model="form.siteDescription"
                type="textarea"
                :rows="2"
                maxlength="255"
                placeholder="副标题 / 简短描述，可选"
              />
            </el-form-item>

            <el-form-item label="站点图标">
              <div class="favicon-wrap">
                <el-input
                  v-model="form.favicon"
                  maxlength="512"
                  placeholder="favicon / icon URL，可选"
                  clearable
                />
                <div v-if="faviconPreview" class="favicon-preview">
                  <el-image
                    :src="faviconPreview"
                    fit="contain"
                    class="favicon-img"
                    :preview-src-list="[faviconPreview]"
                    preview-teleported
                  />
                  <span class="favicon-tip">图标预览</span>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="开启搜索">
              <el-switch
                v-model="form.enableSearch"
                :active-value="1"
                :inactive-value="0"
                active-text="开"
                inactive-text="关"
              />
              <span class="field-tip">控制前台是否显示搜索入口</span>
            </el-form-item>

            <el-form-item label="页脚文案">
              <el-input
                v-model="form.footerText"
                type="textarea"
                :rows="2"
                maxlength="255"
                placeholder="页脚展示文案，可选"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 导航 -->
        <el-tab-pane label="导航" name="nav">
          <div class="nav-toolbar">
            <el-button type="primary" plain @click="onAddNav">添加导航项</el-button>
            <span class="field-tip">可调整顺序、文案与链接；隐藏的项不会在前台显示</span>
          </div>
          <el-table :data="navList" border style="width: 100%">
            <el-table-column label="排序" width="140" align="center">
              <template #default="{ $index }">
                <div class="order-btns">
                  <el-button
                    size="small"
                    :disabled="$index === 0"
                    @click="onMoveNav($index, -1)"
                  >
                    ↑
                  </el-button>
                  <el-button
                    size="small"
                    :disabled="$index === navList.length - 1"
                    @click="onMoveNav($index, 1)"
                  >
                    ↓
                  </el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="文案" min-width="160">
              <template #default="{ row }">
                <el-input v-model="row.label" maxlength="32" placeholder="显示文案" />
              </template>
            </el-table-column>
            <el-table-column label="路径" min-width="180">
              <template #default="{ row }">
                <el-input v-model="row.path" maxlength="128" placeholder="/xxx" />
              </template>
            </el-table-column>
            <el-table-column label="显示" width="90" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.visible" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90" align="center">
              <template #default="{ $index }">
                <el-button type="danger" link @click="onRemoveNav($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <p v-if="!navList.length" class="empty-tip">暂无导航项，点击「添加导航项」开始配置</p>
        </el-tab-pane>

        <!-- 页面 -->
        <el-tab-pane label="页面" name="pages">
          <el-form :model="form.pages" label-width="120px" style="max-width: 720px">
            <el-divider content-position="left">关于页</el-divider>
            <el-form-item label="页面标题">
              <el-input
                v-model="form.pages!.about!.title"
                maxlength="64"
                placeholder="关于页标题"
              />
            </el-form-item>
            <el-form-item label="页面正文">
              <el-input
                v-model="form.pages!.about!.content"
                type="textarea"
                :rows="10"
                maxlength="5000"
                placeholder="关于页正文（纯文本 / Markdown）"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 布局 -->
        <el-tab-pane label="布局" name="layout">
          <el-form :model="form" label-width="140px" style="max-width: 640px">
            <el-form-item label="网站布局">
              <el-radio-group v-model="form.layout">
                <el-radio
                  v-for="opt in layoutOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="详情页目录">
              <el-tag type="info">固定右侧（70vh 内滚）</el-tag>
              <span class="field-tip">目录左右切换已移除；模块位置在下方编排</span>
            </el-form-item>
          </el-form>

          <el-divider content-position="left">首页模块编排</el-divider>
          <LayoutEditor v-model="homeModules" page="home" />

          <el-divider content-position="left">文章详情模块编排</el-divider>
          <LayoutEditor v-model="articleModules" page="article" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
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
.favicon-wrap {
  width: 100%;
}
.favicon-preview {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.favicon-img {
  width: 48px;
  height: 48px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 4px;
  background: var(--el-fill-color-light);
}
.favicon-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.field-tip {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.nav-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.order-btns {
  display: flex;
  gap: 4px;
  justify-content: center;
}
.empty-tip {
  margin: 16px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
</style>
