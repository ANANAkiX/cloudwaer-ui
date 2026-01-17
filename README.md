# Cloudwaer UI

基于 Vue 3 + Vite + TypeScript + Element Plus 的后台管理前端。

## 技术栈

- Vue 3、TypeScript、Vite
- Element Plus、Pinia、Vue Router
- Axios

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

## 运行环境
- Node.js 18+

## 目录要点
- `src/api/request.ts` 全局 Axios 实例、统一拦截器与消息提示
  - 401 统一跳转登录（replace + 顶层跳转兜底）
  - 定时校验 Token：`/auth/token/valid`（在 `App.vue` 调用 `startTokenWatcher()` 启动）
- `src/stores/user.ts` 用户登录/登出、动态路由/权限加载
- `src/router` 动态按权限生成路由
- `src/components/DictSelect.vue` 通用字典选择组件

## 代理与跨域
开发环境建议配置 Vite 代理，将 `/api` 转发到网关或后端：

```ts
// vite.config.ts（示例）
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      rewrite: p => p
    }
  }
}
```

## 登录与会话
- 登录接口：`POST /auth/login`，返回 `{ token }` 存于 `localStorage`。
- 退出接口：`POST /auth/logout`，后端删除 Token，前端清理本地状态。
- Token 定时校验：默认 60 秒，入口在 `App.vue` 中：

```ts
import { onMounted } from 'vue'
import { startTokenWatcher } from '@/api/request'
onMounted(() => startTokenWatcher())
```

## 动态路由与权限
- 登录后通过接口获取路由/权限，生成前端路由并缓存到本地。
- 支持网关路由管理页面，新增/编辑/刷新网关路由。

## 构建与部署
- 构建产物默认输出到 `dist/`。
- 部署到 Nginx/静态服务器时，注意 History 路由的转发规则：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## 常见问题
- 删除旧的 JS 模块后仍请求 `.js`：请硬刷新（Ctrl+F5）或重启 dev 进程，清理 Vite 热更新缓存。
- 登录后未跳转：已在 `request.ts` 中加强 `toLogin()` 兜底；若在 iframe 中也会顶层跳转.



