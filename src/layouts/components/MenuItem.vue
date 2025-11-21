<template>
  <!-- 如果有子菜单，使用 el-sub-menu -->
  <el-sub-menu
    v-if="route.children && route.children.length > 0"
    :index="routeIndex"
  >
    <template #title>
      <el-icon v-if="iconComponent">
        <component :is="iconComponent" />
      </el-icon>
      <span>{{ route.meta?.title || route.name }}</span>
    </template>
    <!-- 递归渲染子菜单 -->
    <menu-item
      v-for="child in route.children"
      :key="child.path || child.name"
      :route="child"
    />
  </el-sub-menu>
  
  <!-- 如果没有子菜单，使用 el-menu-item -->
  <el-menu-item
    v-else
    :index="routeIndex"
  >
    <el-icon v-if="iconComponent">
      <component :is="iconComponent" />
    </el-icon>
    <template #title>{{ route.meta?.title || route.name }}</template>
  </el-menu-item>
</template>

<script setup>
import { computed } from 'vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const props = defineProps({
  route: {
    type: Object,
    required: true
  }
})

// 根据图标名称获取图标组件
const iconComponent = computed(() => {
  if (!props.route.meta?.icon) {
    return null
  }
  const iconName = props.route.meta.icon
  return ElementPlusIconsVue[iconName] || null
})

// 计算路由索引（用于el-menu的index属性）
const routeIndex = computed(() => {
  const path = props.route.path
  if (typeof path === 'string' && /^https?:\/\/+/i.test(path)) {
    return `/ext/${encodeURIComponent(path)}`
  }
  return path || props.route.name || String(props.route.id || Math.random())
})
</script>

<style scoped>
</style>

