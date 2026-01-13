<template>
  <el-container class="layout-container">
    <!-- 左侧菜单栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <div class="logo-icon">C</div>
        <span v-if="!isCollapse" class="logo-text">Cloudwaer</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        class="sidebar-menu"
      >
        <menu-item :route="dashboardRoute" />
        <!-- 动态菜单项 -->
        <menu-item
          v-for="route in menuRoutes"
          :key="route.path"
          :route="route"
        />
      </el-menu>
    </el-aside>
    
    <el-container>
      <!-- 顶部导航栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="header-icon" @click="toggleCollapse">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
          <el-icon class="header-icon" @click="handleRefresh">
            <Refresh />
          </el-icon>
          <el-breadcrumb class="header-breadcrumb" separator="/">
            <el-breadcrumb-item
              v-for="item in breadcrumbs"
              :key="item.path"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <div class="header-actions">
            <button class="header-action-btn" type="button">
              <el-icon><Search /></el-icon>
            </button>
            <button class="header-action-btn" type="button">
              <el-icon><Bell /></el-icon>
            </button>
            <button class="header-action-btn" type="button" @click="toggleFullscreen">
              <el-icon><FullScreen /></el-icon>
            </button>
            <button class="header-action-btn" type="button">
              <el-icon><Setting /></el-icon>
            </button>
          </div>
          <el-dropdown @command="handleCommand" trigger="click">
            <span class="user-avatar">
              <el-avatar :size="32" :icon="UserFilled" />
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <span>{{ userStore.userInfo.nickname || userStore.userInfo.username }}</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <!-- 标签页区域 -->
      <div class="tabs-container">
        <el-tabs
          v-model="activeTab"
          type="card"
          closable
          class="tabs-wrapper"
          @tab-remove="handleTabRemove"
          @tab-click="handleTabClick"
        >
          <el-tab-pane
            v-for="tab in tabs"
            :key="tab.path"
            :label="tab.title"
            :name="tab.path"
            :closable="tab.closable !== false"
          />
        </el-tabs>
        
        <!-- 标签页操作按钮 -->
        <div class="tabs-actions" v-if="tabs.length > 1">
          <el-dropdown @command="handleTabCommand" trigger="click">
            <el-button text type="primary" size="small" class="tabs-dropdown-btn">
              <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="closeOther">关闭其他</el-dropdown-item>
                <el-dropdown-item command="closeAll">关闭所有</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <!-- 主内容区 -->
      <el-main class="main-content">
        <router-view :key="viewKey" />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useTabsStore } from '@/stores/tabs'
import { message } from '@/api/request.ts'
import {
  Expand,
  Fold,
  UserFilled,
  ArrowDown,
  Refresh,
  Search,
  Bell,
  FullScreen,
  Setting
} from '@element-plus/icons-vue'
import MenuItem from './components/MenuItem.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()

const isCollapse = ref(false)
const refreshKey = ref(0)
const isRestoringTabs = ref(true)
// 使用 computed 让菜单路由响应式地跟随 store 的变化
const menuRoutes = computed(() => userStore.menuRoutes || [])

const activeMenu = computed(() => route.path)

const dashboardRoute = {
  path: '/dashboard',
  name: 'dashboard',
  meta: {
    title: '首页',
    icon: 'House'
  }
}

// 标签页相关
const tabs = computed(() => tabsStore.tabs)
const activeTab = computed({
  get: () => tabsStore.activeTab,
  set: (value) => {
    tabsStore.setActiveTab(value)
  }
})

const breadcrumbs = computed(() => {
  const items = route.matched
    .filter((item) => item.meta?.title || item.name)
    .map((item) => ({
      title: item.meta?.title || item.name,
      path: item.path
    }))
  if (items.length === 0) {
    return [{ title: route.name || route.path, path: route.path }]
  }
  return items
})

const viewKey = computed(() => `${route.fullPath}-${refreshKey.value}`)

// 监听路由变化，自动添加标签页
watch(
  () => route.path,
  (newPath) => {
    if (isRestoringTabs.value) {
      return
    }
    // 忽略登录页和404页
    if (newPath === '/login' || newPath === '/404') {
      return
    }
    
    // 如果路由有 meta.title，使用它作为标签页标题
    const title = route.meta?.title || route.name || newPath
    
    // 添加标签页
    tabsStore.addTab({
      name: route.name || newPath,
      path: newPath,
      title: title,
      closable: newPath !== '/dashboard' // 首页不可关闭
    })
  },
  { immediate: true }
)

// 标签页点击事件
const handleTabClick = (tab) => {
  const path = tab.props?.name || tab.name
  if (path && path !== route.path) {
    router.push(path)
  }
}

// 标签页移除事件
const handleTabRemove = (targetName) => {
  const newActivePath = tabsStore.removeTab(targetName)
  if (newActivePath && newActivePath !== route.path) {
    router.push(newActivePath)
  }
}

// 标签页操作命令
const handleTabCommand = (command) => {
  if (command === 'closeOther') {
    tabsStore.closeOtherTabs(route.path)
  } else if (command === 'closeAll') {
    tabsStore.closeAllTabs()
    router.push('/dashboard')
  }
}

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleRefresh = () => {
  refreshKey.value += 1
}

const toggleFullscreen = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.()
  } else {
    await document.exitFullscreen?.()
  }
}

const handleCommand = async (command) => {
  if (command === 'logout') {
    await userStore.logout()
    message.success('退出登录成功')
    router.push('/login')
  }
}

// 加载用户信息、权限、菜单
const loadUserData = async () => {
  if (!userStore.token) {
    return
  }
  
  try {
    // 1. 先加载用户信息
    const userResult = await userStore.loadUserInfo()
    if (!userResult.success) {
      throw new Error('加载用户信息失败')
    }
    
    // 2. 用户信息加载成功后，再并行加载路由和权限
    // 注意：菜单路由会自动响应式更新，因为 menuRoutes 是 computed，直接引用 userStore.menuRoutes
    await Promise.all([
      userStore.loadUserRoutes(),
      userStore.loadUserPermissions()
    ])
  } catch (error) {
    console.error('加载用户数据失败:', error)
    // 错误消息已在 request.ts 中统一处理
    // 如果加载失败，可能是 token 失效，跳转到登录页
    await userStore.logout()
    router.push('/login')
  }
}

onMounted(() => {
  // 恢复标签页
  tabsStore.restoreTabs()
  isRestoringTabs.value = false
  
  // 如果路由或权限任一还未加载，则加载（防止仅有路由时未加载权限的情况）
  if (!userStore.menuRoutes || userStore.menuRoutes.length === 0 || !userStore.permissionCodes || userStore.permissionCodes.length === 0) {
    loadUserData()
  }
  
  // 初始化当前路由的标签页
  if (route.path !== '/login' && route.path !== '/404') {
    const title = route.meta?.title || route.name || route.path
    tabsStore.addTab({
      name: route.name || route.path,
      path: route.path,
      title: title,
      closable: route.path !== '/dashboard'
    })
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background-color: #f5f7fb;
}

.sidebar {
  background: linear-gradient(180deg, #0b1f35 0%, #0a1726 100%);
  overflow: hidden;
  transition: width 0.3s;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.05);
}

.logo {
  height: 64px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  font-weight: 600;
  background: rgba(7, 20, 33, 0.65);
}

.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2f7bff, #57b0ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  letter-spacing: 0.5px;
}

.sidebar-menu {
  border: none;
  height: calc(100vh - 64px);
  overflow-y: auto;
  background: transparent;
  padding: 6px 0 12px;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 220px;
}

.sidebar :deep(.el-menu) {
  background-color: transparent;
  border-right: none;
}

.sidebar :deep(.el-menu-item),
.sidebar :deep(.el-sub-menu__title) {
  height: 44px;
  line-height: 44px;
  margin: 4px 12px;
  border-radius: 10px;
  color: #cbd5e1;
}

.sidebar :deep(.el-menu--collapse .el-menu-item),
.sidebar :deep(.el-menu--collapse .el-sub-menu__title) {
  margin: 4px auto;
  width: 44px;
  justify-content: center;
  padding: 0;
  text-align: center;
}

.sidebar :deep(.el-menu--collapse .el-menu-item .el-tooltip__trigger),
.sidebar :deep(.el-menu--collapse .el-sub-menu__title .el-tooltip__trigger) {
  width: 100%;
  display: flex;
  justify-content: center;
}

.sidebar :deep(.el-menu--collapse .el-menu-item .el-icon),
.sidebar :deep(.el-menu--collapse .el-sub-menu__title .el-icon) {
  margin: 0;
}

.sidebar :deep(.el-menu-item .el-icon),
.sidebar :deep(.el-sub-menu__title .el-icon) {
  color: #9fb2c7;
}

.sidebar :deep(.el-sub-menu__icon-arrow) {
  color: #8aa0b7;
}

.sidebar :deep(.el-menu-item.is-active) {
  background: rgba(36, 80, 130, 0.6);
  color: #fff;
  box-shadow: inset 3px 0 0 #4ea1ff;
}

.sidebar :deep(.el-menu--collapse .el-menu-item.is-active) {
  box-shadow: none;
}

.sidebar :deep(.el-menu-item.is-active .el-icon) {
  color: #fff;
}

.sidebar :deep(.el-menu-item:hover),
.sidebar :deep(.el-sub-menu__title:hover) {
  background: rgba(22, 44, 71, 0.85);
  color: #fff;
}

.sidebar :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  background: rgba(22, 44, 71, 0.85);
  color: #fff;
}

.header {
  height: 56px;
  background-color: #fff;
  border-bottom: 1px solid #e9edf3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.header-icon {
  font-size: 18px;
  cursor: pointer;
  color: #4b5563;
  background: #f3f6fb;
  border-radius: 8px;
  padding: 6px;
  transition: all 0.2s ease;
}

.header-icon:hover {
  color: #1f6feb;
  background: #e9f2ff;
}

.header-breadcrumb {
  margin-left: 4px;
}

.header-breadcrumb :deep(.el-breadcrumb__inner) {
  color: #4b5563;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #eef1f6;
  background: #fff;
  color: #4b5563;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.header-action-btn:hover {
  color: #1f6feb;
  border-color: #cfe1ff;
  background: #f5f9ff;
}

.user-avatar {
  cursor: pointer;
  display: flex;
  align-items: center;
  border: 1px solid #eef1f6;
  padding: 2px;
  border-radius: 999px;
  transition: box-shadow 0.2s ease;
}

.user-avatar:hover {
  box-shadow: 0 0 0 3px rgba(64, 149, 255, 0.12);
}

.tabs-container {
  background-color: #fff;
  display: flex;
  align-items: center;
  padding: 0 16px;
  min-height: 44px;
  border-bottom: 1px solid #eef2f7;
}

.tabs-wrapper {
  flex: 1;
  min-width: 0;
}

.tabs-container :deep(.el-tabs) {
  height: 100%;
  border: none !important;
}

.tabs-container :deep(.el-tabs--border-card) {
  border: none !important;
  box-shadow: none !important;
}

.tabs-container :deep(.el-tabs--border-card > .el-tabs__header) {
  border: none !important;
  background-color: transparent !important;
}

.tabs-container :deep(.el-tabs--border-card > .el-tabs__header .el-tabs__nav) {
  border: none !important;
}

.tabs-container :deep(.el-tabs--card) {
  border: none !important;
}

.tabs-container :deep(.el-tabs--card > .el-tabs__header) {
  border: none !important;
}

.tabs-container :deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  border: none !important;
}

.tabs-container :deep(.el-tabs__header) {
  margin: 0;
  border: none !important;
  height: 44px;
}

.tabs-container :deep(.el-tabs__nav-wrap) {
  border: none !important;
  height: 44px;
}

.tabs-container :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.tabs-container :deep(.el-tabs__nav-wrap::before) {
  display: none;
}

.tabs-container :deep(.el-tabs__content) {
  display: none;
}

.tabs-container :deep(.el-tabs__active-bar) {
  display: none;
}

.tabs-container :deep(.el-tabs__nav) {
  height: 44px;
}

.tabs-container :deep(.el-tabs__item) {
  height: 30px;
  line-height: 30px;
  padding: 0 12px;
  margin-top: 7px;
  margin-right: 8px;
  border: 1px solid #e5e9f2;
  border-radius: 8px;
  background: #f6f8fb;
  color: #4b5563;
  transition: all 0.2s ease;
}

.tabs-container :deep(.el-tabs__item.is-active) {
  background-color: #fff;
  color: #1f6feb;
  border-color: #c9d7ef;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08);
}

.tabs-container :deep(.el-tabs__item:hover) {
  color: #1f6feb;
  background: #fff;
}

.tabs-container :deep(.el-tabs__item.is-active:hover) {
  color: #1f6feb;
}

.tabs-container :deep(.el-tabs__item .el-icon-close) {
  margin-left: 4px;
  font-size: 12px;
}

.tabs-container :deep(.el-tabs__item.is-active .el-icon-close) {
  color: #1f6feb;
}

.tabs-container :deep(.el-tabs__item.is-active .el-icon-close:hover) {
  background-color: rgba(31, 111, 235, 0.1);
  border-radius: 50%;
}

.tabs-actions {
  margin-left: 10px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.tabs-dropdown-btn {
  padding: 4px 8px;
  border-radius: 6px;
  background: #f6f8fb;
}

.main-content {
  background-color: #f5f7fb;
  padding: 20px;
  overflow-y: auto;
  height: calc(100vh - 100px);
}
</style>
