// noinspection TypeScriptCheckImport
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { RouteInfo } from '@/types'

// 使用 import.meta.glob 预加载所有 views 下的组件，但只在需要时加载
// 这样 Vite 可以在构建时知道所有组件路径，同时支持动态导入
// @ts-ignore
const componentModules = import.meta.glob('../views/**/*.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
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
  ] as RouteRecordRaw[]
})

// 动态加载路由
// 注意：刷新页面后，Vue Router 会重置，但 sessionStorage 中的 routesLoaded 可能还是 true
// 所以我们需要在路由守卫中检查路由是否真的存在，如果不存在则重新加载
let routesLoaded = false

// 检查路由是否已存在（包括子路由，排除通配符路由）
// noinspection JSUnusedLocalSymbols
// @ts-ignore
// 递归添加路由（支持嵌套路由）
const addRoutes = (routeList: RouteInfo[], parentName: string = 'MainLayout'): void => {
  if (!routeList || !Array.isArray(routeList)) {
    return
  }
  
  routeList.forEach(route => {
    // 如果路由被隐藏，跳过（父级菜单通常被标记为hidden，不添加到路由中）
    if (route.meta?.hidden) {
      // 但如果有子路由，仍然需要递归处理子路由
      if (route.children && route.children.length > 0 && Array.isArray(route.children)) {
        addRoutes(route.children, parentName)
      }
      return
    }
    
    // 检查path是否存在
    if (!route.path) {
      console.warn('路由path为空，跳过:', route)
      // 如果有子路由，仍然处理子路由
      if (route.children && route.children.length > 0 && Array.isArray(route.children)) {
        addRoutes(route.children, parentName)
      }
      return
    }
    
    // 检查name是否存在
    if (!route.name) {
      console.warn('路由name为空，跳过:', route)
      // 如果有子路由，仍然处理子路由
      if (route.children && route.children.length > 0 && Array.isArray(route.children)) {
        addRoutes(route.children, parentName)
      }
      return
    }
    
    // 检查是否有component，没有component的路由需要根据path自动生成
    // 如果component为空，尝试根据path自动生成component路径
    if (!route.component && route.path) {
      // 根据path自动生成component路径
      // 例如：/codegen/generator -> /codegen/CodeGenerator
      // 例如：/admin/user -> /admin/User
      // 例如：/gateway -> /gateway/Gateway
      const pathParts = route.path.split('/').filter(p => p)
      if (pathParts.length > 0) {
        // 获取最后一部分作为组件名，转换为首字母大写的驼峰命名
        const lastPart = pathParts[pathParts.length - 1]
        // 将下划线或连字符分隔的字符串转换为驼峰命名（首字母大写）
        // generator -> Generator -> CodeGenerator (如果路径是/codegen/generator)
        let componentName = lastPart
          .split(/[-_]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('')
        
        // 构建component路径
        // 例如：/codegen/generator -> /codegen/CodeGenerator
        // 例如：/admin/user -> /admin/User
        // 例如：/gateway -> /gateway/Gateway
        if (pathParts.length > 1) {
          // 多级路径：使用目录名 + 组件名的组合形式
          // 如果组合形式不匹配，再尝试单独形式（/codegen/Generator）
          route.component = '/' + pathParts.slice(0, -1).join('/') + '/' + componentName
        } else {
          // 单级路径：直接使用组件名
          route.component = '/' + componentName
        }
      }
    }
    
    // 如果还是没有component，且没有子路由，则跳过
    if (!route.component) {
      // 没有component的路由（父级菜单），只处理子路由
      if (route.children && route.children.length > 0 && Array.isArray(route.children)) {
        addRoutes(route.children, parentName)
      }
      return
    }
    
    // 外链检测：当 path 以 http/https 开头，转为内部 iframe 路由
    const isExternal = /^https?:\/\//i.test(route.path)
    const internalPath = isExternal
      ? `/ext/${encodeURIComponent(route.path)}`
      : route.path

    const routeConfig: RouteRecordRaw = {
      path: internalPath,
      name: route.name,
      meta: { ...(route.meta || {}), ...(isExternal ? { iframeUrl: route.path } : {}) },
      component: undefined as any
    }
    
    // 设置component - 使用动态导入，按需加载
    if (isExternal) {
      // 外链使用通用 iframe 视图
      routeConfig.component = () => import('../views/common/IFrameView.vue')
    } else if (route.component) {
      // 后端返回的 component 格式类似：/admin/Permission 或 /gateway/Gateway
      // 需要转换为：../views/admin/Permission.vue
      let componentPath = route.component
      
      // 确保路径以 / 开头
      if (!componentPath.startsWith('/')) {
        componentPath = '/' + componentPath
      }
      
      // 添加 .vue 扩展名（如果还没有）
      if (!componentPath.endsWith('.vue')) {
        componentPath = componentPath + '.vue'
      }
      
      // 构建完整的组件路径（相对于 router 目录）
      const fullPath = `../views${componentPath}`
      
      // 从预加载的模块映射中查找组件
      // import.meta.glob 返回的键是相对于当前文件的路径，统一使用 / 作为分隔符
      // 标准化路径：统一使用 / 分隔符，并转换为小写进行比较
      const normalizedFullPath = fullPath.toLowerCase().replace(/\\/g, '/')
      
      // 查找匹配的组件路径（忽略大小写和路径分隔符）
      const foundPath = Object.keys(componentModules).find(key => {
        const normalizedKey = key.toLowerCase().replace(/\\/g, '/')
        return normalizedKey === normalizedFullPath
      })
      
      if (foundPath) {
        // 如果找到了预加载的模块，使用它（按需加载，不会预加载）
        routeConfig.component = componentModules[foundPath]
      } else {
        // 如果没找到，尝试更灵活的匹配（处理大小写和目录结构问题）
        // 例如：../views/Gateway.vue 应该匹配 ../views/gateway/Gateway.vue
        const componentName = componentPath.split('/').pop()?.replace('.vue', '') || ''
        const componentNameLower = componentName.toLowerCase()
        const componentNameFirstUpper = componentName.charAt(0).toUpperCase() + componentName.slice(1).toLowerCase()
        
        // 获取原始路径部分（用于组合形式的组件名匹配）
        const originalPathParts = route.path.split('/').filter(p => p)
        
        // 尝试多种匹配方式
        const flexibleMatch = Object.keys(componentModules).find(key => {
          const normalizedKey = key.toLowerCase().replace(/\\/g, '/')
          const keyParts = normalizedKey.split('/')
          
          // 方式1：精确匹配组件名（忽略大小写）
          if (normalizedKey.endsWith(`/${componentNameLower}.vue`)) {
            return true
          }
          
          // 方式2：在目录中查找同名组件（例如：gateway/Gateway.vue）
          // 目录名是小写的组件名，组件名是首字母大写的组件名
          if (normalizedKey.includes(`/${componentNameLower}/`) && 
              normalizedKey.endsWith(`/${componentNameFirstUpper}.vue`)) {
            return true
          }
          
          // 方式2.1：在目录中查找，支持组合形式的组件名（例如：codegen/CodeGenerator.vue）
          // 如果component路径是 /codegen/generator，实际文件是 codegen/CodeGenerator.vue
          // 这种情况下，目录名是codegen，组件名是CodeGenerator
          const componentDir = componentPath.split('/').slice(0, -1).join('/')
          const normalizedComponentDir = componentDir.toLowerCase().replace(/\\/g, '/')
          if (normalizedComponentDir && normalizedKey.includes(normalizedComponentDir + '/') && 
              normalizedKey.endsWith(`/${componentNameFirstUpper}.vue`)) {
            return true
          }
          
          // 方式2.2：在目录中查找，支持组合形式的组件名（例如：codegen/CodeGenerator.vue）
          // 如果路径是 /codegen/generator，尝试查找 codegen/CodeGenerator.vue
          // 这种情况下，组件名是 Code + Generator 的组合（目录名首字母大写+组件名首字母大写）
          if (originalPathParts.length > 1 && keyParts.length >= 2) {
            const dirName = keyParts[keyParts.length - 2]
            const routeDirName = originalPathParts[originalPathParts.length - 2]
            const routeComponentName = originalPathParts[originalPathParts.length - 1]
            
            // 组合名称：codegen + generator = CodeGenerator
            const dirNameCap = routeDirName.charAt(0).toUpperCase() + routeDirName.slice(1).toLowerCase()
            const componentNameCap = routeComponentName.charAt(0).toUpperCase() + routeComponentName.slice(1).toLowerCase()
            const combinedName = dirNameCap + componentNameCap
            
            // 检查是否是目录名+组件名的组合形式（例如：codegen/CodeGenerator.vue）
            if (normalizedKey.includes(`/${dirName}/`) && 
                normalizedKey.endsWith(`/${combinedName.toLowerCase()}.vue`)) {
              return true
            }
          }
          
          // 方式3：目录名和组件名相同（例如：gateway/gateway.vue）
          const dirName = keyParts[keyParts.length - 2]
          if (dirName === componentNameLower && normalizedKey.endsWith(`/${componentNameLower}.vue`)) {
            return true
          }
          
          // 方式4：目录名和组件名都是首字母大写（例如：Gateway/Gateway.vue）
          if (dirName === componentNameLower && normalizedKey.endsWith(`/${componentNameFirstUpper}.vue`)) {
            return true
          }
          
          return false
        })
        
        if (flexibleMatch) {
          routeConfig.component = componentModules[flexibleMatch]
        } else {
          // 如果还是没找到，记录警告并使用默认组件
          console.warn(`组件路径未找到: ${fullPath}，组件名: ${componentName}，可用路径:`, Object.keys(componentModules).slice(0, 10))
          routeConfig.component = () => import('../views/Dashboard.vue')
        }
      }
    }
    
    // 如果有子路由，递归添加
    if (route.children && route.children.length > 0 && Array.isArray(route.children)) {
      // 先添加当前路由，再添加子路由
      router.addRoute(parentName, routeConfig)
      addRoutes(route.children, route.name)
    } else {
      // 没有子路由，直接添加
      router.addRoute(parentName, routeConfig)
    }
  })
}

// 重新加载路由（用于权限更新后）
export const reloadRoutes = async (): Promise<void> => {
  const userStore = useUserStore()
  if (!userStore.token) {
    return
  }
  
  try {
    // 获取最新的路由数据
    const { getCurrentUserRoutes } = await import('@/api/route.ts')
    const routes = await getCurrentUserRoutes()
    
    if (routes && Array.isArray(routes)) {
      // 更新 store 中的路由数据
      userStore.setMenuRoutes(routes)
      
      // 重新添加路由到 router（先移除旧路由，再添加新路由）
      // 注意：Vue Router 没有直接移除路由的方法，但可以通过重新添加来覆盖
      // 这里我们只添加新路由，如果路由已存在，会被覆盖
      addRoutes(routes)
    }
  } catch (error) {
    console.error('重新加载路由失败:', error)
  }
}

// @ts-ignore
router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()
  
  // 如果已登录但访问登录页，跳转到首页
  if (to.path === '/login' && userStore.token) {
    next('/')
    return
  }
  
  // 如果未登录且需要认证，跳转到登录页
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
    return
  }

  // 如果已登录，检查路由是否已加载
  if (userStore.token) {
    // 检查是否有路由数据（从 localStorage 或 store）
    const hasRouteData = (userStore.menuRoutes && userStore.menuRoutes.length > 0) || 
                         (localStorage.getItem('menuRoutes') && localStorage.getItem('menuRoutes') !== '[]')
    
    // 如果路由未加载，需要加载或恢复路由
    if (!routesLoaded) {
      // 路由未加载，开始加载
      try {
        // 优先使用 store 中已有的路由数据
        let routes = userStore.menuRoutes
        
        // 如果 store 中没有，尝试从 localStorage 恢复
        if ((!routes || routes.length === 0) && hasRouteData) {
          try {
            const storedRoutes = localStorage.getItem('menuRoutes')
            if (storedRoutes && storedRoutes !== '[]') {
              routes = JSON.parse(storedRoutes)
              userStore.setMenuRoutes(routes)
            }
          } catch (e) {
            console.error('从 localStorage 恢复路由失败:', e)
          }
        }
        
        // 如果 store 中没有路由数据，则调用API获取
        if (!routes || routes.length === 0) {
          // 从用户信息中获取用户ID
          let userId = userStore.userInfo?.id
          
          // 如果用户信息还没有加载，先加载用户信息
          if (!userId) {
            const userResult = await userStore.loadUserInfo()
            if (userResult.success) {
              userId = userStore.userInfo?.id
            }
          }
          
          if (!userId) {
            console.error('用户ID不存在，无法加载路由')
            next('/login')
            return
          }
          
          // 使用当前用户路由接口（通过Token获取，不需要传userId）
          const { getCurrentUserRoutes } = await import('@/api/route.ts')
          routes = await getCurrentUserRoutes()
          if (routes && Array.isArray(routes)) {
            // 将路由数据存储到 store 中
            userStore.setMenuRoutes(routes)
            // 同时保存到 localStorage
            localStorage.setItem('menuRoutes', JSON.stringify(routes))
          }
        }
        
        if (routes && Array.isArray(routes) && routes.length > 0) {
          addRoutes(routes)
          
          // 在所有动态路由添加完成后，添加通配符路由作为最后的路由
          // 这样只有在没有其他路由匹配时才会匹配通配符路由
          if (!router.hasRoute('CatchAll')) {
            router.addRoute('MainLayout', {
              path: '/:pathMatch(.*)*',
              name: 'CatchAll',
              redirect: '/404'
            })
          }
        }
        
        // 标记路由已加载
        routesLoaded = true
        
        // 等待路由添加完成后再导航
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 重新导航到目标路由，让 Vue Router 自然匹配
        // 如果路由不存在，通配符路由会自动匹配并重定向到404
        next({ ...to, replace: true })
      } catch (error) {
        console.error('加载路由失败:', error)
        // 即使加载失败，也标记为已加载，避免无限循环
        routesLoaded = true
        sessionStorage.setItem('routesLoaded', 'true')
        // 继续导航，让 Vue Router 自然匹配（如果路由不存在，通配符路由会处理）
        next()
      }
    } else {
      // 路由已加载，但可能刷新后路由丢失，需要恢复
      // 检查目标路由是否存在
      const targetRoute = router.resolve(to.path)
      if (targetRoute.name === 'CatchAll' || targetRoute.matched.length === 0) {
        // 路由不存在，尝试从 store 恢复
        let routes = userStore.menuRoutes
        
        if (!routes || routes.length === 0) {
          try {
            const storedRoutes = localStorage.getItem('menuRoutes')
            if (storedRoutes && storedRoutes !== '[]') {
              routes = JSON.parse(storedRoutes)
              userStore.setMenuRoutes(routes)
            }
          } catch (e) {
            console.error('从 localStorage 恢复路由失败:', e)
          }
        }
        
        if (routes && Array.isArray(routes) && routes.length > 0) {
          addRoutes(routes)
          
          // 添加通配符路由
          if (!router.hasRoute('CatchAll')) {
            router.addRoute('MainLayout', {
              path: '/:pathMatch(.*)*',
              name: 'CatchAll',
              redirect: '/404'
            })
          }
          
          // 等待路由添加完成
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // 重新导航
          next({ ...to, replace: true })
          return
        }
      }
      
      // 路由已加载，直接导航，让 Vue Router 自然匹配
      // 如果路由不存在，通配符路由会自动匹配并重定向到404
      next()
    }
  } else {
    // 未登录时，如果访问需要认证的页面，跳转到登录页
    if (to.path !== '/login' && to.path !== '/404') {
      // 检查是否是基础路由
      if (to.path === '/' || to.path === '/dashboard') {
        next('/login')
        return
      }
    }
    // 让 Vue Router 自然匹配，如果路由不存在，通配符路由会处理
    next()
  }
})

export default router

