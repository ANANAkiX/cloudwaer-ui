import request from './request.ts'

/**
 * 登录响应
 */
export interface LoginResponse {
    token: string
}

export interface CaptchaPayload {
    captchaId?: string
    captchaCode?: string
}

export interface LoginRequestDTO {
    username?: string
    email?: string
    phone?: string
    password: string
    loginType: string
    scope: string
    clientId: string
}

/**
 * 登录
 */
export function login(payload: LoginRequestDTO, captcha?: CaptchaPayload): Promise<LoginResponse> {
    const headers: Record<string, string> = {}
    if (captcha?.captchaId && captcha?.captchaCode) {
        headers['X-Captcha-Id'] = captcha.captchaId
        headers['X-Captcha-Code'] = captcha.captchaCode
    }
    return request({
        url: '/auth/login',
        method: 'post',
        data: payload,
        headers: Object.keys(headers).length ? headers : undefined
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

/**
 * 匿名公开设置（登录页用）
 */
export interface PublicSettings {
    captchaEnabled: boolean
    captchaExpireSeconds: number
    registerEnabled: boolean
    oauthProviders: { type: string; name: string; icon?: string }[]
}

/**
 * 获取公开设置（验证码开关、注册开关、第三方登录入口）
 */
export function getPublicSettings(): Promise<PublicSettings> {
    return request({
        url: '/auth/public-settings',
        method: 'get'
    })
}
