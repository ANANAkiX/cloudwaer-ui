import request from './request.ts'

export interface DictItem {
  id?: string | number
  type: string
  code: string
  value: string
  label: string
  sort?: number
  status?: number
  description?: string
}

export const getDictByType = (type: string): Promise<DictItem[]> => {
  return request({
    url: `/admin/dict/list`,
    method: 'get',
    params: { type }
  })
}

export const refreshDict = (): Promise<boolean> => {
  return request({
    url: `/admin/dict/refresh`,
    method: 'post'
  })
}

export interface DictPageParams {
  current?: number
  size?: number
  keyword?: string
  type?: string
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

export const pageDict = (params: DictPageParams): Promise<PageResult<DictItem>> => {
  return request({
    url: `/admin/dict/page`,
    method: 'get',
    params
  })
}

export const getDictDetail = (id: string | number): Promise<DictItem> => {
  return request({
    url: `/admin/dict/detail`,
    method: 'get',
    params: { id }
  })
}

export const saveDict = (data: DictItem): Promise<boolean> => {
  return request({
    url: `/admin/dict/save`,
    method: 'post',
    data
  })
}

export const updateDict = (data: DictItem): Promise<boolean> => {
  return request({
    url: `/admin/dict/update`,
    method: 'put',
    data
  })
}

export const deleteDict = (id: string | number): Promise<boolean> => {
  return request({
    url: `/admin/dict/delete`,
    method: 'delete',
    params: { id }
  })
}
