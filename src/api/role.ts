import request from './request.ts'
import { RoleInfo, PageResult } from '@/types'


/**
 * 查询角色列表
 */
export function getRoleList() {
  return request({
    url: '/admin/role/list',
    method: 'get',
  })
}


/**
 * 分页查询角色列表
 */
export function getRolePage(current: number, size: number, keyword?: string): Promise<PageResult<RoleInfo>> {
  return request({
    url: '/admin/role/page',
    method: 'get',
    params: { current, size, keyword }
  })
}

/**
 * 根据ID获取角色详情
 */
export function getRoleById(id: string | number): Promise<RoleInfo> {
  return request({
    url: '/admin/role/detail',
    method: 'get',
    params: { id }
  })
}

/**
 * 新增角色
 */
export function saveRole(data: Partial<RoleInfo>): Promise<void> {
  return request({
    url: '/admin/role/save',
    method: 'post',
    data
  })
}

/**
 * 更新角色
 */
export function updateRole(data: Partial<RoleInfo>): Promise<void> {
  return request({
    url: '/admin/role/update',
    method: 'put',
    data
  })
}

/**
 * 删除角色
 */
export function deleteRole(id: string | number): Promise<void> {
  return request({
    url: '/admin/role/delete',
    method: 'delete',
    params: { id }
  })
}

/**
 * 分配权限给角色
 */
export function assignPermissions(roleId: string | number, permissionIds: string[]): Promise<void> {
  return request({
    url: '/admin/role/assign-permissions',
    method: 'post',
    params: { roleId },
    data: permissionIds
  })
}

