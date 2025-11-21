import request from './request.ts'

/**
 * 网关路由信息
 */
export interface GatewayRouteInfo {
  id?: string | number
  routeId: string
  uri: string
  predicates?: PredicateConfig[]
  filters?: FilterConfig[]
  order?: number
  description?: string
}

/**
 * 断言配置
 */
export interface PredicateConfig {
  name: string
  args: Record<string, string>
}

/**
 * 过滤器配置
 */
export interface FilterConfig {
  name: string
  args: Record<string, string>
}

/**
 * 获取所有网关路由（用于网关服务加载路由）
 */
export function getGatewayRoutes(): Promise<GatewayRouteInfo[]> {
  return request({
    url: '/admin/gateway-route/list',
    method: 'get'
  })
}

/**
 * 分页查询网关路由
 */
export function getGatewayRoutesByPage(params: {
  current: number
  size: number
  keyword?: string
}): Promise<{
  records: GatewayRouteInfo[]
  total: number
  current: number
  size: number
  pages: number
}> {
  return request({
    url: '/admin/gateway-route/page',
    method: 'get',
    params
  })
}

/**
 * 根据ID获取网关路由详情
 */
export function getGatewayRouteById(id: string | number): Promise<GatewayRouteInfo> {
  return request({
    url: '/admin/gateway-route/detail',
    method: 'get',
    params: { id }
  })
}

/**
 * 新增网关路由
 */
export function saveGatewayRoute(data: GatewayRouteInfo): Promise<void> {
  return request({
    url: '/admin/gateway-route/save',
    method: 'post',
    data
  })
}

/**
 * 更新网关路由
 */
export function updateGatewayRoute(data: GatewayRouteInfo): Promise<void> {
  return request({
    url: '/admin/gateway-route/update',
    method: 'put',
    data
  })
}

/**
 * 删除网关路由
 */
export function deleteGatewayRoute(id: string | number): Promise<void> {
  return request({
    url: '/admin/gateway-route/delete',
    method: 'delete',
    data: { id }
  })
}

/**
 * 刷新网关路由（通知网关重新加载路由）
 */
export function refreshGatewayRoutes(): Promise<void> {
  return request({
    url: '/admin/gateway-route/refresh',
    method: 'post'
  })
}

