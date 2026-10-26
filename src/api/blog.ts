import request from './request.ts'

/** 博客分类 */
export interface BlogCategory {
  id?: string | number
  name: string
  slug?: string
  description?: string
  sort?: number
  articleCount?: number
}

/** 博客标签 */
export interface BlogTag {
  id?: string | number
  name: string
  slug?: string
  useCount?: number
}

/** 博客评论 */
export interface BlogComment {
  id: string | number
  articleId: string | number
  articleTitle?: string | null
  parentId: number
  rootId: number
  userId?: string | number | null
  nickname: string
  avatar?: string | null
  content: string
  likeCount: number
  auditStatus: number
  ip?: string | null
  createTime?: string | null
  replies?: BlogComment[]
}

export interface CommentPageParams {
  current?: number
  size?: number
  articleId?: string | number
  auditStatus?: number
  keyword?: string
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

/** 博客文章（管理端） */
export interface BlogArticle {
  id?: string | number
  title: string
  summary?: string
  content: string
  coverUrl?: string
  categoryId?: string | number | null
  authorId?: string | number
  authorName?: string
  publishStatus: number
  /** 审核意见（拒绝原因） */
  auditRemark?: string | null
  isTop: number
  isRecommend: number
  viewCount?: number
  likeCount?: number
  commentCount?: number
  publishTime?: string | null
  createTime?: string | null
  tags?: { id: string | number; name: string }[]
  tagIds?: (string | number)[]
}

export interface ArticlePageParams {
  current?: number
  size?: number
  keyword?: string
  publishStatus?: number
  authorId?: string | number
  categoryId?: string | number
  tagId?: string | number
}

/** ===== 分类 ===== */
export const listCategories = (): Promise<BlogCategory[]> =>
  request({ url: '/blog/category/list', method: 'get' })

export const saveCategory = (data: BlogCategory): Promise<boolean> =>
  request({ url: '/blog/category/save', method: 'post', data })

export const updateCategory = (data: BlogCategory): Promise<boolean> =>
  request({ url: '/blog/category/update', method: 'put', data })

export const deleteCategory = (id: string | number): Promise<boolean> =>
  request({ url: '/blog/category/delete', method: 'delete', params: { id } })

/** ===== 标签 ===== */
export const listTags = (): Promise<BlogTag[]> =>
  request({ url: '/blog/tag/list', method: 'get' })

/** 保存标签（新增/更新），返回标签 ID */
export const saveTag = (data: BlogTag): Promise<string | number> =>
  request({ url: '/blog/tag/save', method: 'post', data })

export const updateTag = (data: BlogTag): Promise<string | number> =>
  request({ url: '/blog/tag/update', method: 'put', data })

export const deleteTag = (id: string | number): Promise<boolean> =>
  request({ url: '/blog/tag/delete', method: 'delete', params: { id } })

/** ===== 评论 ===== */
export const pageComments = (params: CommentPageParams): Promise<PageResult<BlogComment>> =>
  request({ url: '/blog/comment/page', method: 'get', params })

export const auditComment = (id: string | number, auditStatus: number): Promise<boolean> =>
  request({ url: '/blog/comment/audit', method: 'post', data: { id, auditStatus } })

export const deleteComment = (id: string | number): Promise<boolean> =>
  request({ url: '/blog/comment/delete', method: 'delete', params: { id } })

/** ===== 文章（管理端） ===== */
export const pageArticles = (params: ArticlePageParams): Promise<PageResult<BlogArticle>> =>
  request({ url: '/blog/article/page', method: 'get', params })

export const getArticleDetail = (id: string | number): Promise<BlogArticle> =>
  request({ url: '/blog/article/detail', method: 'get', params: { id } })

export const saveArticle = (data: BlogArticle): Promise<number> =>
  request({ url: '/blog/article/save', method: 'post', data })

export const updateArticle = (data: BlogArticle): Promise<number> =>
  request({ url: '/blog/article/update', method: 'put', data })

export const deleteArticle = (id: string | number): Promise<boolean> =>
  request({ url: '/blog/article/delete', method: 'delete', params: { id } })

/** 文章审核：1-通过（上线），2-拒绝（回草稿）；仅 ADMIN */
export const auditArticle = (
  id: string | number,
  auditStatus: number,
  remark?: string
): Promise<boolean> =>
  request({ url: '/blog/article/audit', method: 'post', data: { id, auditStatus, remark } })

/** 文章导入解析结果 */
export interface ArticleImportResult {
  title: string
  content: string
  filename?: string
  textLength?: number
}

/** 导入 MD/TXT/PDF/DOCX，解析为标题+Markdown（不落库） */
export const importArticleFile = (file: File): Promise<ArticleImportResult> => {
  const form = new FormData()
  form.append('file', file)
  return request({ url: '/blog/article/import', method: 'post', data: form })
}

/** ===== 博客主申请 ===== */
export interface AuthorApply {
  id: string | number
  userId: string | number
  username: string
  nickname?: string | null
  reason?: string | null
  applyStatus: number
  handleUser?: string | null
  handleTime?: string | null
  handleRemark?: string | null
  createTime?: string | null
}

export interface AuthorApplyPageParams {
  current?: number
  size?: number
  applyStatus?: number
  keyword?: string
}

export const pageAuthorApplies = (params: AuthorApplyPageParams): Promise<PageResult<AuthorApply>> =>
  request({ url: '/blog/author/page', method: 'get', params })

export const handleAuthorApply = (
  id: string | number,
  applyStatus: number,
  remark?: string
): Promise<boolean> =>
  request({
    url: '/blog/author/handle',
    method: 'post',
    params: { id, applyStatus, remark: remark || undefined }
  })

export const applyAuthor = (reason?: string): Promise<string | number> =>
  request({ url: '/blog/author/apply', method: 'post', params: { reason: reason || undefined } })

export const getMyAuthorApply = (): Promise<AuthorApply | null> =>
  request({ url: '/blog/author/my', method: 'get' })

/** 上传图片，返回 /blog/uploads/** 路径；展示时经 /api 前缀 */
export function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  return request({ url: '/blog/upload/image', method: 'post', data: form })
}

/** 后端路径 → 前台可访问 URL */
export function toPublicUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/api/')) return path
  return path.startsWith('/') ? `/api${path}` : `/api/${path}`
}

/** ===== 站点设置 ===== */
/** 导航菜单项（blog_site_setting.nav JSON） */
export interface BlogNavItem {
  key: string
  label: string
  path: string
  visible?: boolean
  order?: number
}

/** 独立页面文案（blog_site_setting.pages JSON 值） */
export interface BlogPageContent {
  title?: string
  content?: string
}

/** 文章详情布局（blog_site_setting.articleLayout JSON） */
export interface BlogArticleLayout {
  /** left | right | off（已固定 right，字段保留兼容） */
  tocPosition?: string
  modules?: BlogLayoutModule[]
}

/** 首页布局（blog_site_setting.homeLayout JSON） */
export interface BlogHomeLayout {
  showFeatured?: boolean
  showTagCloud?: boolean
  showHot?: boolean
  modules?: BlogLayoutModule[]
}

export interface BlogSiteSetting {
  siteTitle?: string
  siteDescription?: string
  favicon?: string
  /** 0-关闭，1-开启 */
  enableSearch?: number
  /** 非管理员发布文章是否需审核：0-免审，1-需审核（缺省1） */
  requireArticleAudit?: number
  /** default / compact / magazine */
  layout?: string
  footerText?: string
  nav?: BlogNavItem[]
  pages?: Record<string, BlogPageContent>
  articleLayout?: BlogArticleLayout
  homeLayout?: BlogHomeLayout
}

/** 页面模块编排项 */
export interface BlogLayoutModule {
  key: string
  zone: 'left' | 'main' | 'right' | 'hidden'
  order: number
  visible: boolean
  title?: string
  extra?: Record<string, unknown>
}

/** 管理端读取站点设置 */
export const getSiteSetting = (): Promise<BlogSiteSetting> =>
  request({ url: '/blog/setting', method: 'get' })

/** 管理端保存站点设置 */
export const saveSiteSetting = (data: BlogSiteSetting): Promise<boolean> =>
  request({ url: '/blog/setting/save', method: 'post', data })

/** 公开读站点设置（匿名） */
export const getOpenSiteSetting = (): Promise<BlogSiteSetting> =>
  request({ url: '/blog/open/setting', method: 'get' })

/** ===== 合集（管理端，ADMIN 全站） ===== */
export interface BlogCollection {
  id?: string | number
  name: string
  description?: string | null
  coverUrl?: string | null
  authorId?: string | number
  authorName?: string
  articleCount?: number
  sort?: number
  isFeatured?: number
  visibility?: number
  createTime?: string | null
  updateTime?: string | null
}

export interface CollectionPageParams {
  current?: number
  size?: number
  keyword?: string
  authorId?: string | number
}

export const pageCollections = (params: CollectionPageParams): Promise<PageResult<BlogCollection>> =>
  request({ url: '/blog/collection/page', method: 'get', params })

export const saveCollection = (data: BlogCollection): Promise<boolean> =>
  request({ url: '/blog/collection/save', method: 'post', data })

export const updateCollection = (data: BlogCollection): Promise<boolean> =>
  request({ url: '/blog/collection/update', method: 'put', data })

export const deleteCollection = (id: string | number): Promise<boolean> =>
  request({ url: '/blog/collection/delete', method: 'delete', params: { id } })
