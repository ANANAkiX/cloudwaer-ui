import request from './request.ts'
import { UserInfo, PageResult, PageParams } from '@/types'

/**
 * 获取所有用户列表
 */
export function getUserList(): Promise<UserInfo[]> {
  return request({
    url: '/admin/user/list',
    method: 'get'
  })
}

/**
 * 分页查询用户列表
 */
export function getUserPage(current: number, size: number, keyword?: string): Promise<PageResult<UserInfo>> {
  return request({
    url: '/admin/user/page',
    method: 'get',
    params: { current, size, keyword } as PageParams
  })
}

/**
 * 根据ID获取用户详情
 */
export function getUserById(id: string | number): Promise<UserInfo> {
  return request({
    url: '/admin/user/detail',
    method: 'get',
    params: { id }
  })
}

/**
 * 新增用户
 */
export function saveUser(data: Partial<UserInfo>): Promise<void> {
  return request({
    url: '/admin/user/save',
    method: 'post',
    data
  })
}

/**
 * 更新用户
 */
export function updateUser(data: Partial<UserInfo>): Promise<void> {
  return request({
    url: '/admin/user/update',
    method: 'put',
    data
  })
}

/**
 * 删除用户
 */
export function deleteUser(id: string | number): Promise<void> {
  return request({
    url: '/admin/user/delete',
    method: 'delete',
    params: { id }
  })
}

/**
 * 分配角色给用户
 */
export function assignRoles(userId: string | number, roleIds: string[]): Promise<void> {
  return request({
    url: '/admin/user/assign-roles',
    method: 'post',
    params: { userId },
    data: roleIds
  })
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser(): Promise<UserInfo> {
  return request({
    url: '/admin/user/current',
    method: 'get'
  })
}

