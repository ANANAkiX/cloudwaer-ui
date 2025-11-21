import request from './request.ts'
import { ServiceInfo, ApiInfo } from '@/types'

/**
 * 获取所有服务及其API列表（用于级联选择器）
 */
export function getAllServiceApis(): Promise<ServiceInfo[]> {
  return request({
    url: '/admin/service-api/services',
    method: 'get'
  })
}

/**
 * 获取指定服务的API列表
 */
export function getServiceApis(serviceName: string): Promise<ApiInfo[]> {
  return request({
    url: '/admin/service-api/apis',
    method: 'get',
    params: { serviceName }
  })
}

