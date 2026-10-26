/**
 * 通用类型定义
 * 
 * @author cloudwaer
 */

/**
 * 分页请求参数
 */
export interface PageParams {
  current: number
  size: number
  keyword?: string
  /** 角色筛选（可空；如 4=博客主） */
  roleId?: string | number
}

/**
 * 分页响应数据
 */
export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

/**
 * 通用响应结果
 */
export interface Result<T = any> {
  code: number
  message: string
  data: T
}

/**
 * 用户信息
 */
export interface UserInfo {
  id?: string
  username: string
  password?: string
  nickname?: string
  email?: string
  phone?: string
  roleIds?: string[]
}

/**
 * 角色信息
 */
export interface RoleInfo {
  id: string
  roleName: string
  roleCode: string
  description?: string
}

/**
 * 权限信息
 */
export interface PermissionInfo {
  id: string
  permissionName: string
  permissionCode: string
  permissionType: '菜单' | '页面' | '操作'
  parentId?: string
  routePath?: string
  icon?: string
  sort?: number
  description?: string
  children?: PermissionInfo[]
}

/**
 * 路由信息
 */
export interface RouteInfo {
  path: string
  name: string
  component?: string
  meta?: {
    title?: string
    icon?: string
    hidden?: boolean
  }
  children?: RouteInfo[]
}
