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
    passwordTransport: { enabled: boolean; publicKey?: string }
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

/**
 * 第三方登录授权地址（含防伪 state）
 */
export interface OauthAuthorizeUrlInfo {
    url: string
    state: string
}

/**
 * 获取第三方登录授权地址
 */
export function getOauthAuthorizeUrl(
    providerType: string,
    clientId: string,
    returnTo: string
): Promise<OauthAuthorizeUrlInfo> {
    return request({
        url: '/auth/oauth/authorize-url',
        method: 'get',
        params: {providerType, clientId, returnTo}
    })
}

/**
 * 第三方登录（回调页凭 code+state 换 token）
 */
export interface OauthLoginRequestDTO {
    providerType: string
    code: string
    state: string
    clientId: string
}

/**
 * 第三方登录响应：已绑定系统账号直接 OK 拿 token；未绑定 NEED_REGISTER 拿注册票据
 */
export interface OauthProfile {
    nickname?: string
    email?: string
    avatar?: string
}

export interface OauthLoginResult {
    status: 'OK' | 'NEED_REGISTER'
    token?: string
    username?: string
    registerTicket?: string
    profile?: OauthProfile
}

export function oauthLogin(payload: OauthLoginRequestDTO): Promise<OauthLoginResult> {
    return request({
        url: '/auth/oauth/login',
        method: 'post',
        data: payload
    })
}

/**
 * 直接注册（不绑定第三方）
 */
export interface RegisterRequestDTO {
    username: string
    password: string
    nickname?: string
    email?: string
}

/**
 * 直接注册系统账号（受注册总开关约束；成功返回 true）
 */
export function register(payload: RegisterRequestDTO): Promise<boolean> {
    return request({
        url: '/auth/register',
        method: 'post',
        data: payload
    })
}

/**
 * 第三方登录引导注册：注册系统账号 + 绑定刚授权的第三方账号 + 自动登录
 */
export interface OauthRegisterRequestDTO {
    registerTicket: string
    username: string
    password: string
    nickname?: string
    email?: string
}

export interface OauthRegisterResult {
    status: 'OK'
    token: string
    username?: string
}

export function oauthRegister(payload: OauthRegisterRequestDTO): Promise<OauthRegisterResult> {
    return request({
        url: '/auth/oauth/register',
        method: 'post',
        data: payload
    })
}

/**
 * 第三方绑定授权地址（需已登录）
 */
export function getOauthBindUrl(
    providerType: string,
    clientId: string,
    returnTo: string
): Promise<OauthAuthorizeUrlInfo> {
    return request({
        url: '/auth/oauth/bind-url',
        method: 'get',
        params: {providerType, clientId, returnTo}
    })
}

/**
 * 用授权码绑定第三方账号到当前用户（需已登录）
 */
export function oauthBind(payload: OauthLoginRequestDTO): Promise<boolean> {
    return request({
        url: '/auth/oauth/bind',
        method: 'post',
        data: payload
    })
}

/**
 * 解绑第三方账号（需已登录）
 */
export function unbindOauth(providerType: string): Promise<boolean> {
    return request({
        url: '/auth/oauth/unbind',
        method: 'post',
        params: {providerType}
    })
}

/**
 * 我的第三方绑定列表
 */
export interface OauthBindingInfo {
    providerType: string
    providerUsername?: string
    avatarUrl?: string
}

export function getOauthBindings(): Promise<OauthBindingInfo[]> {
    return request({
        url: '/auth/oauth/bindings',
        method: 'get'
    })
}
