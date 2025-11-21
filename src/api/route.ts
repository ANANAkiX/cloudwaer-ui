import request from './request.ts'
import { RouteInfo } from '@/types'

/**
 * 获取路由列表
 */
export function getRoutes(userId: string | number): Promise<RouteInfo[]> {
  return request({
    url: '/admin/route/user',
    method: 'get',
    params: { userId }
  })
}

/**
 * 获取当前用户的路由列表
 */
export function getCurrentUserRoutes(): Promise<RouteInfo[]> {
  return request({
    url: '/admin/route/current',
    method: 'get'
  })
}

