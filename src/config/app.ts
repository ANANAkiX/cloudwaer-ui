// Frontend feature switches loaded from Vite env
// VITE_LOGIN_CAPTCHA: 'on' | 'off' | undefined
// 登录页是否启用图形验证码开关（从 Vite 环境变量读取）
export const LOGIN_CAPTCHA_SWITCH = (import.meta as any).env?.VITE_LOGIN_CAPTCHA?.toString().toLowerCase?.() || ''

export const createDefaultDbConnectionForm = () => ({
  // 连接名称（用于列表展示/区分不同连接）
  name: '',
  // 数据库类型（用于驱动/表单默认展示）
  dbType: 'MySQL',
  // 数据库主机地址
  host: 'localhost',
  // 数据库端口
  port: 3306,
  // 默认连接的数据库名称
  database: '',
  // 数据库用户名
  username: '',
  // 数据库密码
  password: '',
  // 是否启用该连接配置
  enabled: true
})

export const GATEWAY_TEMPLATE_DEFAULTS = {
  // Nacos 路由 ID（用于网关路由唯一标识）
  nacosRouteId: 'ext-nacos',
  // Nacos 服务地址（用于网关转发到 Nacos 控制台）
  nacosUri: 'http://localhost:8848',
  // Nacos 路由路径匹配规则
  nacosPathPattern: '/ext-proxy/nacos/**',
  // Swagger 聚合端口（用于快速模板生成）
  swaggerPorts: {
    // 管理端 Swagger 端口
    admin: 4102,
    // 认证端 Swagger 端口
    authentication: 4101
  },
  // 基础路由模板（用于快速生成管理端路由）
  baseRoute: {
    // 目标服务名（注册中心服务 ID）
    serviceId: 'cloudwaer-admin-serve',
    // 路由匹配路径
    pathPattern: '/admin/**',
    // 路由目标 URI（负载均衡前缀）
    uri: 'lb://cloudwaer-admin-serve'
  },
  // CSP frame-ancestors 允许嵌入的来源列表
  cspFrameAncestors: ["'self'", 'http://localhost:5173', 'http://localhost:4100']
}

// 网关 CSP 头部模板（基于 cspFrameAncestors 拼接）
export const GATEWAY_TEMPLATE_CSP = `frame-ancestors ${GATEWAY_TEMPLATE_DEFAULTS.cspFrameAncestors.join(' ')}`
