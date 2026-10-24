/**
 * 权限工具
 * - checkButtonPermission：按 pageKey + code 校验（须在 config/permission.ts 配置）
 * - checkPermission：直接按权限码校验用户是否拥有
 * - v-permission 指令：用法 v-permission="'admin:user:add'" 或 v-permission="['admin:user:add','admin:user:edit']"
 */
import type { Directive } from 'vue'
import { useUserStore } from '@/stores/user'
import { hasButtonPermission } from '@/config/permission'

/**
 * 检查是否有权限显示某个按键（需页面在 ButtonPermissionConfig 中配置）
 */
export function checkButtonPermission(pageKey: string, permissionCode: string): boolean {
  const userStore = useUserStore()
  const userPermissions = userStore.permissionCodes || []
  return hasButtonPermission(pageKey, permissionCode, userPermissions)
}

/**
 * 直接检查用户是否拥有权限码（不依赖 pageKey 配置）
 * code 为空数组时返回 true（不限制）
 */
export function checkPermission(codes: string | string[]): boolean {
  const list = Array.isArray(codes) ? codes : [codes]
  if (!list.length) return true
  const userStore = useUserStore()
  const userPermissions = userStore.permissionCodes || []
  // 任一命中即显示（OR 语义）
  return list.some(code => userPermissions.includes(code))
}

/**
 * v-permission 指令：无权限时移除元素
 * v-permission="'admin:user:add'"
 * v-permission="['admin:user:edit','admin:user:delete']"
 */
export const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    applyPermission(el, binding.value)
  },
  updated(el, binding) {
    applyPermission(el, binding.value)
  }
}

function applyPermission(el: HTMLElement, value: string | string[] | undefined) {
  if (!value || (Array.isArray(value) && !value.length)) {
    return
  }
  if (!checkPermission(value)) {
    el.parentNode?.removeChild(el)
  }
}
