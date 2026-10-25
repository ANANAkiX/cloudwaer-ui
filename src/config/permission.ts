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

  // 字典管理
  'dict': [
    { permissionCode: 'admin:dict:add', visible: true },
    { permissionCode: 'admin:dict:edit', visible: true },
    { permissionCode: 'admin:dict:delete', visible: true },
    { permissionCode: 'admin:dict:refresh', visible: true }
  ],

  // 代码生成
  'codegen': [
    { permissionCode: 'codegen:connection:add', visible: true },
    { permissionCode: 'codegen:connection:edit', visible: true },
    { permissionCode: 'codegen:connection:delete', visible: true },
    { permissionCode: 'codegen:connection:toggle', visible: true },
    { permissionCode: 'codegen:generator:all', visible: true },
    { permissionCode: 'codegen:generator:backend', visible: true },
    { permissionCode: 'codegen:generator:frontend', visible: true }
  ],

  // Flowable 模型管理（主操作）
  'flowableModel': [
    { permissionCode: 'flowable:model:save', visible: true },
    { permissionCode: 'flowable:model:publish', visible: true },
    { permissionCode: 'flowable:model:delete', visible: true },
    { permissionCode: 'flowable:model:copy', visible: true }
  ],

  // Flowable 任务
  'flowableTask': [
    { permissionCode: 'flowable:task:claim', visible: true },
    { permissionCode: 'flowable:task:complete', visible: true },
    { permissionCode: 'flowable:task:delete', visible: true }
  ],

  // 博客主申请
  'blogAuthor': [
    {
      permissionCode: 'blog:author:handle',
      visible: true
    }
  ],

  // 微论坛话题
  'blogTopic': [
    {
      permissionCode: 'blog:topic:manage',
      visible: true
    }
  ],

  // 博客文章
  'blogArticle': [
    {
      permissionCode: 'blog:article:add',
      visible: true
    },
    {
      permissionCode: 'blog:article:edit',
      visible: true
    },
    {
      permissionCode: 'blog:article:delete',
      visible: true
    },
    {
      permissionCode: 'blog:article:import',
      visible: true
    }
  ],

  // 博客分类
  'blogCategory': [
    {
      permissionCode: 'blog:category:add',
      visible: true
    },
    {
      permissionCode: 'blog:category:edit',
      visible: true
    },
    {
      permissionCode: 'blog:category:delete',
      visible: true
    }
  ],

  // 博客标签
  'blogTag': [
    {
      permissionCode: 'blog:tag:add',
      visible: true
    },
    {
      permissionCode: 'blog:tag:edit',
      visible: true
    },
    {
      permissionCode: 'blog:tag:delete',
      visible: true
    }
  ],

  // 博客评论/审核中心：按钮码已收敛为登录+服务端 ADMIN，前端不依赖旧 comment:* 码
  'blogComment': [],

  // 博客站点设置
  'blogSetting': [
    {
      permissionCode: 'blog:setting:view',
      visible: true
    },
    {
      permissionCode: 'blog:setting:edit',
      visible: true
    }
  ],

  // 博客合集管理
  'blogCollection': [
    {
      permissionCode: 'blog:collection:view',
      visible: true
    },
    {
      permissionCode: 'blog:collection:add',
      visible: true
    },
    {
      permissionCode: 'blog:collection:edit',
      visible: true
    },
    {
      permissionCode: 'blog:collection:delete',
      visible: true
    }
  ],

  // 平台文件管理
  'sysFile': [
    {
      permissionCode: 'sys:file:view',
      visible: true
    },
    {
      permissionCode: 'sys:file:upload',
      visible: true
    },
    {
      permissionCode: 'sys:file:delete',
      visible: true
    },
    {
      permissionCode: 'sys:oss:config',
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

