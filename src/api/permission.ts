import request from './request.ts'
import { PermissionInfo } from '@/types'

/**
 * 获取权限树
 */
export function getPermissionTree(keyword?: string): Promise<PermissionInfo[]> {
  return request({
    url: '/admin/permission/tree',
    method: 'get',
    params: { keyword }
  })
}

/**
 * 根据ID获取权限详情
 */
export function getPermissionById(id: string | number): Promise<PermissionInfo> {
  return request({
    url: '/admin/permission/detail',
    method: 'get',
    params: { id }
  })
}

/**
 * 新增权限
 */
export function savePermission(data: Partial<PermissionInfo>): Promise<void> {
  return request({
    url: '/admin/permission/save',
    method: 'post',
    data
  })
}

/**
 * 更新权限
 */
export function updatePermission(data: Partial<PermissionInfo>): Promise<void> {
  return request({
    url: '/admin/permission/update',
    method: 'put',
    data
  })
}

/**
 * 删除权限
 */
export function deletePermission(id: string | number): Promise<void> {
  return request({
    url: '/admin/permission/delete',
    method: 'delete',
    data: { id }
  })
}

/**
 * 获取当前用户的权限列表
 */
export function getCurrentUserPermissions(): Promise<string[]> {
  return request({
    url: '/admin/permission/current',
    method: 'get'
  })
}

