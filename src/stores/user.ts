import {defineStore} from 'pinia'
import {login as apiLogin, logout, type CaptchaPayload} from '@/api/auth.ts'
import {UserInfo, RouteInfo} from '@/types'

interface UserState {
    token: string
    userInfo: UserInfo
    menuRoutes: RouteInfo[]
    permissionCodes: string[]
}

export const useUserStore = defineStore('user', {
    state: (): UserState => ({
        token: localStorage.getItem('token') || '',
        userInfo: JSON.parse(localStorage.getItem('userInfo') || '{}'),
        menuRoutes: JSON.parse(localStorage.getItem('menuRoutes') || '[]'), // 存储菜单路由数据
        permissionCodes: JSON.parse(localStorage.getItem('permissionCodes') || '[]') // 存储权限代码
    }),
    actions: {
        async login(username: string, password: string, captcha?: CaptchaPayload): Promise<{
            success: boolean;
            message?: string
        }> {
            try {
                //TODO 暂时固定账号密码登录 固定范围为 DEFAULT
                const res = await apiLogin(username, password, "ACCESS_PASSWORD", "DEFAULT", captcha)
                // 后端只返回 token
                if (res && res.token) {
                    this.token = res.token
                    localStorage.setItem('token', this.token)
                    return {success: true}
                } else {
                    return {success: false, message: '登录失败，返回数据格式错误'}
                }
            } catch (error: any) {
                console.error('登录失败:', error)
                return {
                    success: false,
                    message: error.message || '登录失败，请检查用户名和密码'
                }
            }
        },
        async loadUserInfo(): Promise<{ success: boolean; error?: any }> {
            try {
                const {getCurrentUser} = await import('@/api/user.ts')
                const result = await getCurrentUser()
                // request.ts 已经处理了响应，直接返回 data
                if (result) {
                    this.userInfo = result
                    localStorage.setItem('userInfo', JSON.stringify(this.userInfo))
                    return {success: true}
                }
                return {success: false}
            } catch (error) {
                console.error('加载用户信息失败:', error)
                return {success: false, error}
            }
        },
        async loadUserRoutes(): Promise<{ success: boolean; error?: any }> {
            try {
                const {getCurrentUserRoutes} = await import('@/api/route.ts')
                const result = await getCurrentUserRoutes()
                // request.ts 已经处理了响应，直接返回 data
                if (result && Array.isArray(result)) {
                    this.menuRoutes = result
                    localStorage.setItem('menuRoutes', JSON.stringify(this.menuRoutes))
                    return {success: true}
                }
                return {success: false}
            } catch (error) {
                console.error('加载路由信息失败:', error)
                return {success: false, error}
            }
        },
        async loadUserPermissions(): Promise<{ success: boolean; error?: any }> {
            try {
                const {getCurrentUserPermissions} = await import('@/api/permission.ts')
                const result = await getCurrentUserPermissions()
                // request.ts 已经处理了响应，直接返回 data
                if (result && Array.isArray(result)) {
                    this.permissionCodes = result
                    localStorage.setItem('permissionCodes', JSON.stringify(this.permissionCodes))
                    return {success: true}
                }
                return {success: false}
            } catch (error) {
                console.error('加载权限信息失败:', error)
                return {success: false, error}
            }
        },
        async logout(): Promise<void> {
            try {
                await logout()
            } catch (error) {
                console.error('登出失败:', error)
            } finally {
                this.token = ''
                this.userInfo = {} as UserInfo
                this.menuRoutes = []
                this.permissionCodes = []
                localStorage.removeItem('token')
                localStorage.removeItem('userInfo')
                localStorage.removeItem('menuRoutes')
                localStorage.removeItem('permissionCodes')
                // 清除路由加载状态
                sessionStorage.removeItem('routesLoaded')
            }
        },
        setMenuRoutes(routes: RouteInfo[]): void {
            this.menuRoutes = routes || []
        }
    }
})

