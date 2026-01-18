import request from './request.ts'

export interface DictItem {
  id?: string | number
  dictId?: string | number
  code: string
  value: string
  label: string
  sort?: number
  status?: number
  description?: string
}

export interface Dict {
  id?: string | number
  type: string
  name: string
  sort?: number
  status?: number
  description?: string
  items?: DictItem[]
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

export const pageDict = (params: DictPageParams): Promise<PageResult<Dict>> => {
  return request({
    url: `/admin/dict/page`,
    method: 'get',
    params
  })
}

export const getDictDetail = (id: string | number): Promise<Dict> => {
  return request({
    url: `/admin/dict/detail`,
    method: 'get',
    params: { id }
  })
}

export const saveDict = (data: Dict): Promise<boolean> => {
  return request({
    url: `/admin/dict/save`,
    method: 'post',
    data
  })
}

export const updateDict = (data: Dict): Promise<boolean> => {
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

export const listDictItems = (dictId: string | number): Promise<DictItem[]> => {
  return request({
    url: `/admin/dict/item/list`,
    method: 'get',
    params: { dictId }
  })
}

export const saveDictItem = (data: DictItem): Promise<boolean> => {
  return request({
    url: `/admin/dict/item/save`,
    method: 'post',
    data
  })
}

export const updateDictItem = (data: DictItem): Promise<boolean> => {
  return request({
    url: `/admin/dict/item/update`,
    method: 'put',
    data
  })
}

export const deleteDictItem = (id: string | number): Promise<boolean> => {
  return request({
    url: `/admin/dict/item/delete`,
    method: 'delete',
    params: { id }
  })
}
