import request from './request.ts'

export interface WikiSpace {
  id?: string | number
  name: string
  slug: string
  description?: string
  publicRead?: number
  sort?: number
  docCount?: number
  createTime?: string
  updateTime?: string
}

export interface WikiSpaceSave {
  id?: string | number
  name: string
  slug: string
  description?: string
  publicRead?: number
  sort?: number
}

export interface WikiDoc {
  id?: string | number
  spaceId: string | number
  parentId?: string | number
  title: string
  content?: string
  summary?: string
  sort?: number
  publicRead?: number | null
  authorId?: string | number
  authorName?: string
  createTime?: string
  updateTime?: string
  children?: WikiDoc[]
}

export interface WikiDocSave {
  id?: string | number
  spaceId: string | number
  parentId?: string | number
  title: string
  content?: string
  summary?: string
  sort?: number
  publicRead?: number | null
}

export interface WikiShare {
  id?: string | number
  targetType: 'space' | 'doc'
  targetId: string | number
  token?: string
  accessLevel: number
  expireTime?: string | null
  hasPassword?: boolean
  remark?: string
  shareUrl?: string
  createTime?: string
  expired?: boolean
  revoked?: boolean
}

export interface WikiShareSave {
  targetType: 'space' | 'doc'
  targetId: string | number
  accessLevel?: number
  expireTime?: string
  password?: string
  remark?: string
}

export interface WikiShareAccess {
  token: string
  targetType: string
  targetId: string | number
  accessLevel: number
  title?: string
  content?: string
  docs?: WikiDoc[]
  needPassword?: boolean
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages?: number
}

export const getWikiSpacePage = (params: {
  current?: number
  size?: number
  keyword?: string
}): Promise<PageResult<WikiSpace>> =>
  request({ url: '/wiki/space/page', method: 'get', params })

export const getWikiSpaceList = (): Promise<WikiSpace[]> =>
  request({ url: '/wiki/space/list', method: 'get' })

export const saveWikiSpace = (data: WikiSpaceSave): Promise<boolean> =>
  request({ url: '/wiki/space/save', method: 'post', data })

export const updateWikiSpace = (data: WikiSpaceSave): Promise<boolean> =>
  request({ url: '/wiki/space/update', method: 'put', data })

export const deleteWikiSpace = (id: string | number): Promise<boolean> =>
  request({ url: '/wiki/space/delete', method: 'delete', params: { id } })

export const getWikiDocTree = (spaceId: string | number): Promise<WikiDoc[]> =>
  request({ url: '/wiki/doc/tree', method: 'get', params: { spaceId } })

export const getWikiDocDetail = (id: string | number): Promise<WikiDoc> =>
  request({ url: '/wiki/doc/detail', method: 'get', params: { id } })

export const saveWikiDoc = (data: WikiDocSave): Promise<boolean> =>
  request({ url: '/wiki/doc/save', method: 'post', data })

export const updateWikiDoc = (data: WikiDocSave): Promise<boolean> =>
  request({ url: '/wiki/doc/update', method: 'put', data })

export const moveWikiDoc = (id: string | number, parentId?: string | number, sort?: number): Promise<boolean> =>
  request({ url: '/wiki/doc/move', method: 'put', params: { id, parentId, sort } })

export const deleteWikiDoc = (id: string | number): Promise<boolean> =>
  request({ url: '/wiki/doc/delete', method: 'delete', params: { id } })

export const getWikiSharePage = (params: {
  current?: number
  size?: number
  targetType?: string
  targetId?: string | number
}): Promise<PageResult<WikiShare>> =>
  request({ url: '/wiki/share/page', method: 'get', params })

export const createWikiShare = (data: WikiShareSave): Promise<WikiShare> =>
  request({ url: '/wiki/share/save', method: 'post', data })

export const revokeWikiShare = (id: string | number): Promise<boolean> =>
  request({ url: '/wiki/share/revoke', method: 'delete', params: { id } })

export const accessWikiShare = (token: string, password?: string): Promise<WikiShareAccess> =>
  request({ url: '/wiki/open/share', method: 'get', params: { token, password } })

/** 导入结果 */
export interface WikiImportResult {
  dirCount: number
  docCount: number
  skipped?: string[]
  errors?: string[]
}

/** zip / 单文件导入 */
export const importWikiArchive = (spaceId: string | number, file: File, parentId?: string | number): Promise<WikiImportResult> => {
  const form = new FormData()
  form.append('spaceId', String(spaceId))
  if (parentId != null && parentId !== '' && parentId !== 0 && parentId !== '0') {
    form.append('parentId', String(parentId))
  }
  form.append('file', file)
  return request({ url: '/wiki/doc/import', method: 'post', data: form })
}

/** 文件夹导入（webkitRelativePath） */
export const importWikiFolder = (
  spaceId: string | number,
  files: File[],
  paths: string[],
  parentId?: string | number
): Promise<WikiImportResult> => {
  const form = new FormData()
  form.append('spaceId', String(spaceId))
  if (parentId != null && parentId !== '' && parentId !== 0 && parentId !== '0') {
    form.append('parentId', String(parentId))
  }
  files.forEach(f => form.append('files', f))
  paths.forEach(p => form.append('paths', p))
  return request({ url: '/wiki/doc/import-folder', method: 'post', data: form })
}

/** 分享链接写入（仅可写分享） */
export const updateWikiViaShare = (
  token: string,
  content: string,
  title?: string,
  password?: string
): Promise<WikiShareAccess> => {
  const form = new FormData()
  form.append('token', token)
  form.append('content', content)
  if (title) form.append('title', title)
  if (password) form.append('password', password)
  return request({ url: '/wiki/open/share/update', method: 'post', data: form })
}
