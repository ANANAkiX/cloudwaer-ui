import axios, {InternalAxiosRequestConfig, AxiosResponse, AxiosError} from 'axios'
import {useUserStore} from '@/stores/user'
import {ElMessage} from 'element-plus'
import router from '@/router'
import {Result} from '@/types'

const request = axios.create({
    baseURL: '/api',
    timeout: 10000
})

// 用于防止重复显示错误消息
const errorMessageCache = new Map<string, number>() // 使用Map存储错误消息和时间戳
const ERROR_DEBOUNCE_TIME = 2000 // 2秒内的相同错误只显示一次

// 显示错误消息（带去重）
const showErrorMessage = (message: string): void => {
    if (!message) {
        return
    }
    const now = Date.now()
    const lastTime = errorMessageCache.get(message) || 0
    // 如果是相同的错误消息且在去重时间范围内，不显示
    if ((now - lastTime) < ERROR_DEBOUNCE_TIME) {
        return
    }
    // 更新缓存
    errorMessageCache.set(message, now)
    // 清理过期的缓存（超过5秒的）
    for (const [msg, time] of errorMessageCache.entries()) {
        if ((now - time) > 5000) {
            errorMessageCache.delete(msg)
        }
    }
    ElMessage.error(message)
}

// ========== Token 有效性定时校验 ==========
// 注意：请根据后端实际接口调整 TOKEN_CHECK_PATH。
const TOKEN_CHECK_PATH = '/auth/token/valid'
const TOKEN_CHECK_INTERVAL = 60000
let tokenWatchTimer: number | null = null

const tokenTick = async () => {
    try {
        const userStore = useUserStore()
        if (!userStore.token) return
        // 期望响应：Result.data=true/false 或直接 true/false
        const resp: any = await request.get(TOKEN_CHECK_PATH)
        const valid = (resp === true) || (resp && (resp.valid === true || resp.data === true)) || (resp === 'true')
        if (!valid) {
            await userStore.logout()
            await toLogin()
        }
    } catch (_e) {
        // 忽略异常，401 会在拦截器里统一处理
    }
}

export const startTokenWatcher = () => {
    if (tokenWatchTimer !== null) return
    // noinspection JSIgnoredPromiseFromCall
    tokenTick()
    tokenWatchTimer = window.setInterval(tokenTick, TOKEN_CHECK_INTERVAL)
}

// 模块加载后自动启动监听器（在 main.ts 中也会再次调用，因有防重无需担心重复）


// 统一跳转登录（防抖、避免重复导航、iframe 场景兜底）
let redirectingToLogin = false
const toLogin = async () => {
    if (redirectingToLogin) return
    redirectingToLogin = true
    try {
        const current = router.currentRoute?.value
        if (!current || current.path !== '/login') {
            // 使用 replace 避免历史堆叠，并加时间戳避免相同路由被忽略
            await router.replace({path: '/login', query: {t: String(Date.now())}})
        }
    } catch (_e) {
        // 忽略路由异常，进行兜底
    } finally {
        // 如果路由未生效（例如在 iframe 或某些守卫阻断），使用顶层跳转兜底
        try {
            const resolved = router.resolve({path: '/login', query: {t: String(Date.now())}})
            const href = resolved.href || '/login'
            const currentPath = router.currentRoute?.value?.path
            if (!currentPath || currentPath !== '/login') {
                if (window.top && window.top !== window.self) {
                    window.top.location.replace(href)
                } else if (window.location.pathname !== '/login') {
                    window.location.replace(href)
                }
            }
        } catch (_e2) {
            // ignore
        } finally {
            redirectingToLogin = false
        }
    }
}

// 统一的消息提示函数
export const message = {
    success: (message: string) => {
        if (message) {
            ElMessage.success(message)
        }
    },
    error: (message: string) => {
        showErrorMessage(message)
    },
    warning: (message: string) => {
        if (message) {
            ElMessage.warning(message)
        }
    },
    info: (message: string) => {
        if (message) {
            ElMessage.info(message)
        }
    }
}

/**
 * 处理分页结果，将分页相关的数字字段从字符串转换为数字
 * 因为后端将Long序列化为字符串，但el-pagination组件需要数字类型
 */
const convertPageResultNumbers = (data: any): any => {
    if (!data || typeof data !== 'object') {
        return data
    }

    // 如果是分页结果对象（包含 total, current, size, pages 字段）
    if ('total' in data || 'current' in data || 'size' in data || 'pages' in data) {
        const result = {...data}

        // 转换分页相关的数字字段
        if (result.total !== undefined && typeof result.total === 'string') {
            result.total = Number(result.total)
        }
        if (result.current !== undefined && typeof result.current === 'string') {
            result.current = Number(result.current)
        }
        if (result.size !== undefined && typeof result.size === 'string') {
            result.size = Number(result.size)
        }
        if (result.pages !== undefined && typeof result.pages === 'string') {
            result.pages = Number(result.pages)
        }

        // 递归处理 records 数组中的对象
        if (result.records && Array.isArray(result.records)) {
            result.records = result.records.map((item: any) => {
                if (typeof item === 'object' && item !== null) {
                    return convertPageResultNumbers(item)
                }
                return item
            })
        }

        return result
    }

    // 如果是数组，递归处理每个元素
    if (Array.isArray(data)) {
        return data.map(item => convertPageResultNumbers(item))
    }

    // 如果是普通对象，递归处理所有属性
    const result: any = {}
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            result[key] = convertPageResultNumbers(data[key])
        }
    }
    return result
}

// 请求拦截器
request.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const userStore = useUserStore()
        if (userStore.token && config.headers) {
            config.headers.Authorization = `Bearer ${userStore.token}`
        }
        return config
    },
    (error: AxiosError) => {
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    (response: AxiosResponse<Result>) => {
        const res = response.data
        // 检查是否是Result格式的响应
        if (res && typeof res === 'object' && 'code' in res) {
            if (res.code === 200) {
                // 处理分页结果，将分页相关的数字字段从字符串转换为数字
                const data = convertPageResultNumbers(res.data)
                return data
            } else {
                // 业务错误（code不为200），显示错误消息
                if (res.code === 403) {
                    showErrorMessage(res.message || '没有访问权限')
                } else if (res.code === 401) {
                    // 401未授权，显示错误消息并跳转登录
                    showErrorMessage(res.message || '未登录或Token无效')
                    const userStore = useUserStore()
                    userStore.logout()
                    toLogin()
                    return
                } else {
                    // 其他错误，显示错误消息
                    showErrorMessage(res.message || '请求失败')
                }
                return Promise.reject(new Error(res.message || '请求失败'))
            }
        } else {
            // 非Result格式的响应，直接返回
            return res
        }
    },
    (error: AxiosError<Result>) => {
        // 处理HTTP错误响应（status不为200的情况）
        // 注意：如果后端返回200状态码但code是403，会走上面的success回调，不会走这里
        if (error.response) {
            const status = error.response.status
            const data = error.response.data

            // 如果后端返回了Result格式的错误响应，使用其中的message
            if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
                // 403权限错误
                if (status === 403 || data.code === 403) {
                    showErrorMessage(data.message || '没有访问权限')
                } else if (status === 401 || data.code === 401) {
                    // 401未授权
                    showErrorMessage(data.message || '未登录或Token无效')
                    const userStore = useUserStore()
                    userStore.logout()
                    toLogin()
                } else {
                    // 其他错误
                    showErrorMessage(data.message || error.message || '网络错误')
                }
            } else {
                // 非Result格式的错误响应
                if (status === 403) {
                    showErrorMessage('没有访问权限')
                } else if (status === 401) {
                    showErrorMessage('未登录或Token无效')
                    const userStore = useUserStore()
                    userStore.logout()
                    toLogin()
                } else {
                    showErrorMessage(error.message || '网络错误')
                }
            }
        } else {
            // 网络错误或其他错误（没有response对象）
            showErrorMessage(error.message || '网络错误')
        }
        return Promise.reject(error)
    }
)

export default request

