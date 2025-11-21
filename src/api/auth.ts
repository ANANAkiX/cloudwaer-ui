import request from './request.ts'
import { Result } from '@/types'

/**
 * 登录响应
 */
export interface LoginResponse {
  token: string
}

/**
 * 登录
 */
export function login(username: string, password: string): Promise<LoginResponse> {
  return request({
    url: '/auth/login',
    method: 'post',
    data: { username, password }
  })
}

/**
 * 登出
 */
export function logout(): Promise<void> {
  return request({
    url: '/auth/logout',
    method: 'post'
  })
}

