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
 * @param roleId 角色筛选（可空；如 4=BLOGGER，只列博客主）
 */
export function getUserPage(
  current: number,
  size: number,
  keyword?: string,
  roleId?: string | number
): Promise<PageResult<UserInfo>> {
  return request({
    url: '/admin/user/page',
    method: 'get',
    params: { current, size, keyword, roleId } as PageParams
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

/** 当前用户个人信息 */
export interface UserProfile {
  id: string | number
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
}

/** 修改密码请求 */
export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

/** 头像上传结果 */
export interface AvatarUploadResult {
  id: string | number
  fileName: string
  accessUrl: string
}

/**
 * 获取当前用户个人信息
 */
export function getMyProfile(): Promise<UserProfile> {
  return request({
    url: '/admin/user/profile',
    method: 'get'
  })
}

/**
 * 修改当前用户个人信息（只传需变更字段）
 */
export function updateMyProfile(
  data: Partial<Pick<UserProfile, 'nickname' | 'email' | 'phone' | 'avatar'>>
): Promise<boolean> {
  return request({
    url: '/admin/user/profile',
    method: 'put',
    data
  })
}

/**
 * 修改当前用户密码
 */
export function changeMyPassword(data: ChangePasswordPayload): Promise<boolean> {
  return request({
    url: '/admin/user/profile/password',
    method: 'put',
    data
  })
}

/**
 * 上传当前用户头像
 */
export function uploadMyAvatar(file: File): Promise<AvatarUploadResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('bizType', 'avatar')
  return request({
    url: '/admin/file/my/upload',
    method: 'post',
    data: form
  })
}

