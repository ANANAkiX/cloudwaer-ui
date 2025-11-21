/**
 * 权限工具函数
 * 
 * @author cloudwaer
 */
import { useUserStore } from '@/stores/user'
import { hasButtonPermission } from '@/config/permission'

/**
 * 检查是否有权限显示某个按键
 * @param pageKey 页面标识（如 'user', 'role', 'permission'）
 * @param permissionCode 权限代码
 * @returns 是否显示
 */
export function checkButtonPermission(pageKey: string, permissionCode: string): boolean {
  const userStore = useUserStore()
  const userPermissions = userStore.permissionCodes || []
  return hasButtonPermission(pageKey, permissionCode, userPermissions)
}

/**
 * 权限指令（用于v-if）
 * 使用方式：v-permission="'admin:user:add'"
 */
export const permissionDirective = {
  mounted(el: HTMLElement, binding: { value: string }) {
    const permissionCode = binding.value
    if (!permissionCode) {
      return
    }
    
    // 从页面路径推断页面标识
    const path = window.location.pathname
    let pageKey = ''
    if (path.includes('/admin/user')) {
      pageKey = 'user'
    } else if (path.includes('/admin/role')) {
      pageKey = 'role'
    } else if (path.includes('/admin/permission')) {
      pageKey = 'permission'
    }
    
    if (pageKey && !checkButtonPermission(pageKey, permissionCode)) {
      el.style.display = 'none'
    }
  }
}

