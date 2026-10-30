// noinspection TypeScriptCheckImport
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { RouteInfo } from '@/types'

/** glob 键形如 ../views/admin/User.vue */
// @ts-ignore
const componentModules = import.meta.glob('../views/**/*.vue') as Record<
  string,
  () => Promise<unknown>
>

const STATIC_ROUTES: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },

  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false, title: '注册' }
  },

  {
    path: '/login/oauth-callback',
    name: 'OauthCallback',
    component: () => import('@/views/OauthCallback.vue'),
    meta: { requiresAuth: false, title: '第三方登录' }
  },

  {
    path: '/wiki/s/:token',
    name: 'WikiShareView',
    component: () => import('@/views/wiki/ShareView.vue'),
    meta: { requiresAuth: false, title: '知识分享' }
  },
  {
    path: '/',
    name: 'MainLayout',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页', icon: 'House' }
      },
      {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人信息' }
      },
      {
        path: '/404',
        name: 'NotFound',
        component: () => import('@/views/404.vue'),
        meta: { requiresAuth: false, title: '404' }
      }
    ]
  },
  {
    path: '/404',
    name: 'NotFoundStandalone',
    component: () => import('@/views/404.vue'),
    meta: { requiresAuth: false, title: '404' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes: STATIC_ROUTES
})

let routesLoaded = false

/** 统一 key 为小写正斜杠，便于忽略大小写比较 */
function norm(path: string): string {
  return path.toLowerCase().replace(/\\/g, '/')
}

function pascal(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('')
}

/**
 * 后端菜单 component / path → 本地 views 文件。
 * 支持：
 * - 精确：/admin/Permission.vue
 * - 同名：/gateway → views/gateway/Gateway.vue
 * - 目录+词：/codegen/generator → views/codegen/CodeGenerator.vue
 * - 菜单路径名：/blog/articlemanagement → views/blog/ArticleManagement.vue
 */
function resolveComponentLoader(
  componentHint: string | undefined,
  routePath: string
): (() => Promise<unknown>) | null {
  const keys = Object.keys(componentModules)
  if (!keys.length) return null

  // 候选「相对 views 的路径」列表（不含扩展名）
  const candidates: string[] = []

  if (componentHint) {
    let hint = componentHint.startsWith('/') ? componentHint : `/${componentHint}`
    hint = hint.replace(/\.vue$/i, '')
    candidates.push(hint)
  }

  // 由路由 path 生成候选：/admin/user → /admin/User
  const parts = routePath.split('/').filter(Boolean)
  if (parts.length) {
    const last = parts[parts.length - 1]
    const file = pascal(last)
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/')
      candidates.push(`/${dir}/${file}`)
      // 目录名 + 末段：codegen + generator → CodeGenerator
      candidates.push(`/${dir}/${pascal(parts[parts.length - 2])}${file}`)
    } else {
      candidates.push(`/${file}`)
    }
    // 仅文件名：/admin/user → /User（在 views 根目录时少见）
    candidates.push(`/${file}`)
  }

  const keysNorm = keys.map(k => ({ raw: k, n: norm(k) }))

  // 1) 精确（忽略大小写 / 斜杠）
  for (const cand of candidates) {
    const target = norm(`../views${cand}.vue`)
    const hit = keysNorm.find(k => k.n === target)
    if (hit) return componentModules[hit.raw]
  }

  // 2) 末段文件名匹配：…/User.vue
  for (const cand of candidates) {
    const base = cand.split('/').pop()!.toLowerCase()
    const suffix = `/${base}.vue`
    const hits = keysNorm.filter(k => k.n.endsWith(suffix))
    if (hits.length === 1) return componentModules[hits[0].raw]
    if (hits.length > 1) {
      // 目录名与 path 第一段一致优先
      const first = parts[0]?.toLowerCase()
      const inDir = hits.find(h => h.n.includes(`/${first}/`))
      return componentModules[(inDir || hits[0]).raw]
    }
  }

  // 3) 组合名：…/CodeGenerator.vue（目录首字母大写 + 末段）
  if (parts.length >= 2) {
    const combo = `${pascal(parts[parts.length - 2])}${pascal(parts[parts.length - 1])}`.toLowerCase()
    const suffix = `/${combo}.vue`
    const hit = keysNorm.find(k => k.n.endsWith(suffix))
    if (hit) return componentModules[hit.raw]
  }

  return null
}

function ensureCatchAll() {
  if (!router.hasRoute('CatchAll')) {
    router.addRoute('MainLayout', {
      path: '/:pathMatch(.*)*',
      name: 'CatchAll',
      redirect: '/404'
    })
  }
}

/** 递归注册后端下发的菜单路由 */
function addRoutes(routeList: RouteInfo[], parentName = 'MainLayout'): void {
  if (!Array.isArray(routeList)) return

  for (const route of routeList) {
    try {
      const children = Array.isArray(route.children) ? route.children : undefined

      // 隐藏目录 / 缺 path：只递归子节点
      if (route.meta?.hidden || !route.path) {
        if (children?.length) addRoutes(children, parentName)
        continue
      }
      if (!route.name) {
        console.warn('路由 name 为空，跳过:', route)
        if (children?.length) addRoutes(children, parentName)
        continue
      }

      const isExternal = /^https?:\/\//i.test(route.path)
      const path = isExternal ? `/ext/${encodeURIComponent(route.path)}` : route.path

      const routeConfig: RouteRecordRaw = {
        path,
        name: route.name,
        meta: { ...(route.meta || {}), ...(isExternal ? { iframeUrl: route.path } : {}) },
        component: undefined as never
      }

      if (isExternal) {
        routeConfig.component = () => import('../views/common/IFrameView.vue')
      } else {
        const loader = resolveComponentLoader(route.component, route.path)
        if (!loader) {
          console.warn(`组件未找到: component=${route.component || '-'} path=${route.path}`)
          // 纯父级菜单（无 component、无 children）跳过
          if (!children?.length) continue
        } else {
          routeConfig.component = loader as never
        }
      }

      if (children?.length) {
        router.addRoute(parentName, routeConfig)
        addRoutes(children, route.name as string)
      } else if (routeConfig.component) {
        router.addRoute(parentName, routeConfig)
      }
    } catch (error) {
      console.error('添加路由失败:', error, route)
    }
  }
}

/** 权限变更后重新拉取并注册路由 */
export const reloadRoutes = async (): Promise<void> => {
  const userStore = useUserStore()
  if (!userStore.token) return

  try {
    const { getCurrentUserRoutes } = await import('@/api/route.ts')
    const routes = await getCurrentUserRoutes()
    if (Array.isArray(routes) && routes.length) {
      userStore.setMenuRoutes(routes)
      addRoutes(routes)
    }
  } catch (error) {
    console.error('重新加载路由失败:', error)
  }
}

function restoreRoutesFromStorage(): RouteInfo[] | null {
  try {
    const raw = localStorage.getItem('menuRoutes')
    if (!raw || raw === '[]') return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length) {
      useUserStore().setMenuRoutes(parsed)
      return parsed
    }
  } catch (e) {
    console.error('从本地存储恢复路由失败:', e)
  }
  return null
}

async function ensureRoutesLoaded(): Promise<void> {
  const userStore = useUserStore()

  let routes = userStore.menuRoutes
  if (!routes?.length) {
    routes = restoreRoutesFromStorage() || []
  }

  if (!routes.length) {
    if (!userStore.userInfo?.id) {
      await userStore.loadUserInfo()
    }
    const { getCurrentUserRoutes } = await import('@/api/route.ts')
    routes = (await getCurrentUserRoutes()) || []
    if (routes.length) {
      userStore.setMenuRoutes(routes)
      localStorage.setItem('menuRoutes', JSON.stringify(routes))
    }
  }

  if (routes.length) {
    addRoutes(routes)
    ensureCatchAll()
  }
  routesLoaded = true
}

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()

  // OAuth 回调页放行：不参与登录态跳转，避免误伤回调处理
  if (to.path === '/login/oauth-callback') {
    next()
    return
  }

  if (to.path === '/login' && userStore.token) {
    next('/')
    return
  }

  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
    return
  }

  if (!userStore.token) {
    next()
    return
  }

  if (!routesLoaded) {
    try {
      await ensureRoutesLoaded()
      next({ ...to, replace: true })
    } catch (error) {
      console.error('加载路由失败:', error)
      routesLoaded = true
      next()
    }
    return
  }

  // 刷新后动态路由可能丢失：匹配不到则从 store/storage 恢复
  const resolved = router.resolve(to.path)
  if (resolved.name === 'CatchAll' || resolved.matched.length === 0) {
    try {
      await ensureRoutesLoaded()
      next({ ...to, replace: true })
      return
    } catch {
      /* fallthrough */
    }
  }

  next()
})

export default router
