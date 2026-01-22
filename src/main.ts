import { createApp } from 'vue'
import { createPinia } from 'pinia'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import './style.css'
// @ts-ignore
import FcDesigner, { formCreate } from '@/components/FcDesigner'
import { ElBadge } from 'element-plus'
import { i18n } from '@/i18n'
import { useAppStore } from '@/stores/app'

const app = createApp(App)
const pinia = createPinia()

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.use(FcDesigner)
app.use(formCreate)
app.use(ElBadge)
app.use(pinia)
app.use(router)
app.use(i18n)

// init app-level theme early
useAppStore(pinia).initTheme()

app.use(ElementPlus)
app.mount('#app')


