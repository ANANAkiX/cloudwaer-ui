import { defineStore } from 'pinia'

export interface TabInfo {
  name: string
  path: string
  title: string
  closable?: boolean // 是否可关闭，首页不可关闭
}

interface TabsState {
  tabs: TabInfo[]
  activeTab: string // 当前激活的标签页路径
}

export const useTabsStore = defineStore('tabs', {
  state: (): TabsState => ({
    tabs: [
      {
        name: 'Dashboard',
        path: '/dashboard',
        title: '首页',
        closable: false // 首页不可关闭
      }
    ],
    activeTab: '/dashboard'
  }),
  
  getters: {
    // 获取当前激活的标签页
    currentTab: (state) => {
      return state.tabs.find(tab => tab.path === state.activeTab)
    }
  },
  
  actions: {
    /**
     * 添加标签页
     */
    addTab(tab: TabInfo) {
      // 检查标签页是否已存在
      const existingTab = this.tabs.find(t => t.path === tab.path)
      if (existingTab) {
        // 如果已存在，直接激活
        this.activeTab = tab.path
        return
      }
      
      // 添加新标签页
      this.tabs.push(tab)
      this.activeTab = tab.path
      
      // 持久化到 localStorage
      this.persistTabs()
    },
    
    /**
     * 移除标签页
     */
    removeTab(path: string): string | null {
      // 不能关闭首页
      if (path === '/dashboard') {
        return null
      }
      
      const index = this.tabs.findIndex(tab => tab.path === path)
      if (index === -1) {
        return null
      }
      
      const removedTab = this.tabs[index]
      this.tabs.splice(index, 1)
      
      // 如果关闭的是当前激活的标签页，需要切换到其他标签页
      if (this.activeTab === path) {
        // 优先切换到右侧的标签页，如果没有则切换到左侧的
        if (index < this.tabs.length) {
          // 切换到右侧标签页
          this.activeTab = this.tabs[index].path
        } else if (this.tabs.length > 0) {
          // 切换到左侧标签页
          this.activeTab = this.tabs[index - 1].path
        } else {
          // 如果没有其他标签页，切换到首页
          this.activeTab = '/dashboard'
          // 确保首页存在
          if (!this.tabs.find(t => t.path === '/dashboard')) {
            this.tabs.unshift({
              name: 'Dashboard',
              path: '/dashboard',
              title: '首页',
              closable: false
            })
          }
        }
      }
      
      // 持久化到 localStorage
      this.persistTabs()
      
      // 返回新的激活标签页路径
      return this.activeTab
    },
    
    /**
     * 设置激活的标签页
     */
    setActiveTab(path: string) {
      // 确保标签页存在
      const tab = this.tabs.find(t => t.path === path)
      if (tab) {
        this.activeTab = path
        this.persistTabs()
      }
    },
    
    /**
     * 关闭其他标签页
     */
    closeOtherTabs(currentPath: string) {
      this.tabs = this.tabs.filter(tab => 
        tab.path === currentPath || tab.path === '/dashboard' // 保留当前和首页
      )
      this.activeTab = currentPath
      this.persistTabs()
    },
    
    /**
     * 关闭所有标签页
     */
    closeAllTabs() {
      this.tabs = [
        {
          name: 'Dashboard',
          path: '/dashboard',
          title: '首页',
          closable: false
        }
      ]
      this.activeTab = '/dashboard'
      this.persistTabs()
    },
    
    /**
     * 持久化标签页到 localStorage
     */
    persistTabs() {
      try {
        localStorage.setItem('tabs', JSON.stringify(this.tabs))
        localStorage.setItem('activeTab', this.activeTab)
      } catch (e) {
        console.error('保存标签页失败:', e)
      }
    },
    
    /**
     * 从 localStorage 恢复标签页
     */
    restoreTabs() {
      try {
        const tabsStr = localStorage.getItem('tabs')
        const activeTabStr = localStorage.getItem('activeTab')
        
        if (tabsStr) {
          const savedTabs = JSON.parse(tabsStr)
          // 确保首页存在
          if (!savedTabs.find((t: TabInfo) => t.path === '/dashboard')) {
            savedTabs.unshift({
              name: 'Dashboard',
              path: '/dashboard',
              title: '首页',
              closable: false
            })
          }
          this.tabs = savedTabs
        }
        
        if (activeTabStr && this.tabs.find(t => t.path === activeTabStr)) {
          this.activeTab = activeTabStr
        }
      } catch (e) {
        console.error('恢复标签页失败:', e)
      }
    }
  }
})

