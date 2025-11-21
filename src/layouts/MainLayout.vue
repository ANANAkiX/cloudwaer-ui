<template>
  <el-container class="layout-container">
    <!-- 左侧菜单栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
      <div class="logo">
        <span v-if="!isCollapse">Cloudwaer</span>
        <span v-else>C</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        class="sidebar-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><House /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
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
          <el-icon class="collapse-icon" @click="toggleCollapse">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
        </div>
        <div class="header-center">
          <span class="header-title">顶部导航栏以及其他信息</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand" trigger="click">
            <span class="user-avatar">
              <el-avatar :size="40" :icon="UserFilled" />
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
        <router-view />
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
import { House, Expand, Fold, UserFilled, ArrowDown } from '@element-plus/icons-vue'
import MenuItem from './components/MenuItem.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()

const isCollapse = ref(false)
// 使用 computed 让菜单路由响应式地跟随 store 的变化
const menuRoutes = computed(() => userStore.menuRoutes || [])

const activeMenu = computed(() => route.path)

// 标签页相关
const tabs = computed(() => tabsStore.tabs)
const activeTab = computed({
  get: () => tabsStore.activeTab,
  set: (value) => {
    tabsStore.setActiveTab(value)
  }
})

// 监听路由变化，自动添加标签页
watch(
  () => route.path,
  (newPath) => {
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
}

.sidebar {
  background-color: #304156;
  overflow: hidden;
  transition: width 0.3s;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: white;
  font-size: 20px;
  font-weight: bold;
  background-color: #2b3a4a;
  overflow: hidden;
}

.sidebar-menu {
  border: none;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 200px;
}

.header {
  background-color: white;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-icon {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
  transition: color 0.3s;
}

.collapse-icon:hover {
  color: #409EFF;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.header-title {
  color: #606266;
  font-size: 16px;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-avatar {
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: transform 0.3s;
}

.user-avatar:hover {
  transform: scale(1.1);
}

.tabs-container {
  background-color: white;
  display: flex;
  align-items: center;
  padding: 0 20px;
  min-height: 40px;
}

.tabs-wrapper {
  flex: 1;
  min-width: 0; /* 允许flex子元素收缩 */
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
  height: 40px;
}

.tabs-container :deep(.el-tabs__nav-wrap) {
  border: none !important;
  height: 40px;
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
  height: 40px;
}

.tabs-container :deep(.el-tabs__item) {
  height: 32px;
  line-height: 32px;
  padding: 0 15px;
  margin-top: 4px;
  border: none !important;
  border-width: 0 !important;
  border-style: none !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  margin-right: 4px;
  transition: all 0.3s;
  box-shadow: none !important;
  outline: none !important;
  -webkit-box-shadow: none !important;
  -moz-box-shadow: none !important;
}

.tabs-container :deep(.el-tabs__item.is-active) {
  background-color: #409eff;
  color: white;
  border: none !important;
  border-width: 0 !important;
  border-style: none !important;
  border-color: transparent !important;
  box-shadow: none !important;
  outline: none !important;
  -webkit-box-shadow: none !important;
  -moz-box-shadow: none !important;
}

.tabs-container :deep(.el-tabs__item:hover) {
  color: #409eff;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

.tabs-container :deep(.el-tabs__item.is-active:hover) {
  color: white;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

.tabs-container :deep(.el-tabs__item .el-icon-close) {
  margin-left: 4px;
  font-size: 12px;
}

.tabs-container :deep(.el-tabs__item.is-active .el-icon-close) {
  color: white;
}

.tabs-container :deep(.el-tabs__item.is-active .el-icon-close:hover) {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.tabs-actions {
  margin-left: 10px;
  display: flex;
  align-items: center;
  flex-shrink: 0; /* 防止按钮被压缩 */
}

.tabs-dropdown-btn {
  padding: 4px 8px;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
  height: calc(100vh - 100px); /* 减去 header (60px) 和 tabs (40px) 的高度 */
}
</style>



