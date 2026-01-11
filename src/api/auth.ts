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

/**
 * 登录
 */
export function login(username: string, password: string, loginType: string, scope: string, captcha?: CaptchaPayload): Promise<LoginResponse> {
    const headers: Record<string, string> = {}
    if (captcha?.captchaId && captcha?.captchaCode) {
        headers['X-Captcha-Id'] = captcha.captchaId
        headers['X-Captcha-Code'] = captcha.captchaCode
    }
    return request({
        url: '/auth/login',
        method: 'post',
        data: {username, password, loginType,scope},
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

