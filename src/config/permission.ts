/**
 * 权限配置
 * 用于配置按键、按钮等UI元素的显示权限
 * 
 * @author cloudwaer
 */

/**
 * 权限配置项
 */
export interface PermissionConfig {
  /** 权限代码 */
  permissionCode: string
  /** 是否显示（默认true） */
  visible?: boolean
}

/**
 * 按键权限配置
 * 配置各个页面中按键、按钮的显示权限
 */
export const ButtonPermissionConfig: Record<string, PermissionConfig[]> = {
  // 用户管理页面
  'user': [
    {
      permissionCode: 'admin:user:add',
      visible: true
    },
    {
      permissionCode: 'admin:user:edit',
      visible: true
    },
    {
      permissionCode: 'admin:user:delete',
      visible: true
    },
    {
      permissionCode: 'admin:user:assign-role',
      visible: true
    }
  ],
  
  // 角色管理页面
  'role': [
    {
      permissionCode: 'admin:role:add',
      visible: true
    },
    {
      permissionCode: 'admin:role:edit',
      visible: true
    },
    {
      permissionCode: 'admin:role:delete',
      visible: true
    },
    {
      permissionCode: 'admin:role:assign-permission',
      visible: true
    }
  ],
  
  // 权限管理页面
  'permission': [
    {
      permissionCode: 'admin:permission:add',
      visible: true
    },
    {
      permissionCode: 'admin:permission:edit',
      visible: true
    },
    {
      permissionCode: 'admin:permission:delete',
      visible: true
    }
  ],
  //网关
  'gateway': [
    {
      permissionCode: 'admin:gateway:add',
      visible: true
    },
    {
      permissionCode: 'admin:gateway:edit',
      visible: true
    },
    {
      permissionCode: 'admin:gateway:delete',
      visible: true
    },
    {
      permissionCode: 'admin:gateway:refresh',
      visible: true
    }
  ],
}

/**
 * 检查是否有权限显示某个按键
 * @param pageKey 页面标识（如 'user', 'role', 'permission'）
 * @param permissionCode 权限代码
 * @param userPermissions 用户拥有的权限代码列表
 * @returns 是否显示
 */
export function hasButtonPermission(
  pageKey: string,
  permissionCode: string,
  userPermissions: string[]
): boolean {
  const pageConfig = ButtonPermissionConfig[pageKey]
  if (!pageConfig) {
    // 如果页面没有配置，默认不显示
    return false
  }
  
  const config = pageConfig.find(item => item.permissionCode === permissionCode)
  if (!config) {
    // 如果按键没有配置，默认不显示
    return false
  }
  
  // 如果配置为不可见，直接返回false
  if (config.visible === false) {
    return false
  }
  
  // 检查用户是否有该权限
  return userPermissions.includes(permissionCode)
}

/**
 * 获取页面所有按键权限配置
 * @param pageKey 页面标识
 * @returns 权限配置数组
 */
export function getPageButtonPermissions(pageKey: string): PermissionConfig[] {
  return ButtonPermissionConfig[pageKey] || []
}

