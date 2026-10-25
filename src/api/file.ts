import request, { type PageResult } from './request'
import {Ref, UnwrapRef} from "vue";

/** 平台文件元数据 */
export interface SysFileInfo {
  id?: string | number
  fileName: string
  accessUrl: string
  provider: string
  ossConfigId?: string | number
  objectKey?: string
  bucket?: string
  contentType?: string
  fileSize?: number
  md5?: string
  bizType?: string
  bizId?: string
  createTime?: string
  updateTime?: string
}

/** OSS 供应商配置 */
export interface SysOssConfigInfo {
  id?: string | number
  configName: string
  provider: string
  endpoint?: string
  bucket?: string
  accessKey?: string
  secretKey?: string
  cdnDomain?: string
  basePath?: string
  isDefault?: number
  status?: number
  remark?: string
}

export interface FilePageParams {
  current?: number
  size?: number
  keyword?: string
  provider?: string
}

export function pageFiles(params: FilePageParams): Promise<PageResult<SysFileInfo>> {
  return request({ url: '/admin/file/page', method: 'get', params })
}

export function uploadFile(file: File, bizType?: string): Promise<SysFileInfo> {
  const form = new FormData()
  form.append('file', file)
  if (bizType) form.append('bizType', bizType)
  return request({ url: '/admin/file/upload', method: 'post', data: form })
}

export function deleteFile(id: string | number): Promise<boolean> {
  return request({ url: '/admin/file/delete', method: 'delete', params: { id } })
}

/** 单文件下载（带 Token） */
export async function downloadFile(row: {
  id: string | number
  fileName?: string
}): Promise<void> {
  const blob = await request({
    url: '/admin/file/download',
    method: 'get',
    params: { id: row.id },
    responseType: 'blob'
  })
  triggerBlobDownload(blob as Blob, row.fileName || 'download')
}

/** 批量下载 zip，返回 Blob 并触发保存 */
export async function batchDownloadFiles(ids: (string extends (Builtin | Ref | RefUnwrapBailTypes[keyof RefUnwrapBailTypes] | {
    [RawSymbol]?: true
}) ? string : (string extends Map<infer K, infer V> ? (Map<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<string, keyof Map<any, any>>>) : (string extends WeakMap<infer K, infer V> ? (WeakMap<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<string, keyof WeakMap<any, any>>>) : (string extends Set<infer V> ? (Set<UnwrapRefSimple<V>> & UnwrapRef<Omit<string, keyof Set<any>>>) : (string extends WeakSet<infer V> ? (WeakSet<UnwrapRefSimple<V>> & UnwrapRef<Omit<string, keyof WeakSet<any>>>) : (string extends ReadonlyArray<any> ? { [K in keyof string]: UnwrapRefSimple<string[K]> } : (string extends (object & {
    [ShallowReactiveMarker]?: never
}) ? { [P in keyof string]: P extends symbol ? string[P] : UnwrapRef<string[P]> } : string)))))) | number extends (Builtin | Ref | RefUnwrapBailTypes[keyof RefUnwrapBailTypes] | {
    [RawSymbol]?: true
}) ? number : (number extends Map<infer K, infer V> ? (Map<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<number, keyof Map<any, any>>>) : (number extends WeakMap<infer K, infer V> ? (WeakMap<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<number, keyof WeakMap<any, any>>>) : (number extends Set<infer V> ? (Set<UnwrapRefSimple<V>> & UnwrapRef<Omit<number, keyof Set<any>>>) : (number extends WeakSet<infer V> ? (WeakSet<UnwrapRefSimple<V>> & UnwrapRef<Omit<number, keyof WeakSet<any>>>) : (number extends ReadonlyArray<any> ? { [K in keyof number]: UnwrapRefSimple<number[K]> } : (number extends (object & {
    [ShallowReactiveMarker]?: never
}) ? { [P in keyof number]: P extends symbol ? number[P] : UnwrapRef<number[P]> } : number)))))) | undefined extends (Builtin | Ref | RefUnwrapBailTypes[keyof RefUnwrapBailTypes] | {
    [RawSymbol]?: true
}) ? undefined : (undefined extends Map<infer K, infer V> ? (Map<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<undefined, keyof Map<any, any>>>) : (undefined extends WeakMap<infer K, infer V> ? (WeakMap<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<undefined, keyof WeakMap<any, any>>>) : (undefined extends Set<infer V> ? (Set<UnwrapRefSimple<V>> & UnwrapRef<Omit<undefined, keyof Set<any>>>) : (undefined extends WeakSet<infer V> ? (WeakSet<UnwrapRefSimple<V>> & UnwrapRef<Omit<undefined, keyof WeakSet<any>>>) : (undefined extends ReadonlyArray<any> ? { [K in keyof undefined]: UnwrapRefSimple<undefined[K]> } : (undefined extends (object & {
    [ShallowReactiveMarker]?: never
}) ? { [P in keyof undefined]: P extends symbol ? undefined[P] : UnwrapRef<undefined[P]> } : undefined)))))) | undefined)[]): Promise<void> {
  const blob = await request({
    url: '/admin/file/batch-download',
    method: 'post',
    data: ids,
    responseType: 'blob'
  })
  triggerBlobDownload(blob as Blob, 'files.zip')
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function listOssConfig(): Promise<SysOssConfigInfo[]> {
  return request({ url: '/admin/file/oss/list', method: 'get' })
}

export function saveOssConfig(data: SysOssConfigInfo): Promise<boolean> {
  return request({ url: '/admin/file/oss/save', method: 'post', data })
}
