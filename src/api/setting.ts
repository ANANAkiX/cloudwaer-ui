import request from './request.ts'

/**
 * 全局设置列表项
 */
export interface SettingItem {
    settingKey: string
    groupKey: string
    valueType: string
    remark?: string
    dbValue?: string | null
    effectiveValue?: string | null
    source: 'DB' | 'YML' | 'DEFAULT'
    pendingPublish: boolean
    /** false = 暂未完成（禁用开关，不生效） */
    implemented?: boolean
}

export interface SettingSaveItem {
    settingKey: string
    settingValue?: string | null
}

export interface PublishResult {
    success: boolean
    keyCount: number
    publishTime?: string
    warnings?: string[]
}

/**
 * 第三方登录供应商
 */
export interface OauthProvider {
    id?: string
    providerType: string
    providerName: string
    clientId: string
    clientSecret?: string
    authUrl?: string
    tokenUrl?: string
    userInfoUrl?: string
    scope?: string
    redirectUri?: string
    icon?: string
    sort?: number
    enabled?: number
    remark?: string
}

/**
 * 查询全局设置（含生效值、来源、待发布标记）
 */
export function getSettings(): Promise<SettingItem[]> {
    return request({
        url: '/admin/setting/list',
        method: 'get'
    })
}

/**
 * 保存设置（只写库不生效，需发布）
 */
export function saveSettings(items: SettingSaveItem[]): Promise<boolean> {
    return request({
        url: '/admin/setting/save',
        method: 'put',
        data: items
    })
}

/**
 * 恢复默认（清空已保存值，回到 yml/代码兜底）
 */
export function resetSettings(keys: string[]): Promise<boolean> {
    return request({
        url: '/admin/setting/reset',
        method: 'put',
        data: keys
    })
}

/**
 * 发布设置：广播各实例立即生效
 */
export function publishSettings(): Promise<PublishResult> {
    return request({
        url: '/admin/setting/publish',
        method: 'post'
    })
}

/**
 * 生成登录密码加密的 RSA 密钥对（写入草稿，发布后生效）
 */
export function generatePasswordTransportKeys(): Promise<{ publicKey: string; hint: string }> {
    return request({
        url: '/admin/setting/password-transport/generate-keys',
        method: 'post'
    })
}

/**
 * 第三方登录供应商列表（Secret 脱敏）
 */
export function getOauthProviders(): Promise<OauthProvider[]> {
    return request({
        url: '/admin/oauth-provider/list',
        method: 'get'
    })
}

/**
 * 保存第三方登录供应商（Secret 留空保持原值）
 */
export function saveOauthProvider(provider: OauthProvider): Promise<boolean> {
    return request({
        url: '/admin/oauth-provider/save',
        method: 'post',
        data: provider
    })
}

/**
 * 删除第三方登录供应商
 */
export function deleteOauthProvider(id: string): Promise<boolean> {
    return request({
        url: `/admin/oauth-provider/${id}`,
        method: 'delete'
    })
}
