<template>
  <div class="icon-selector">
    <el-input
      v-model="inputValue"
      placeholder="点击选择图标"
      readonly
      @click="showDialog = true"
    >
      <template #prefix>
        <el-icon v-if="selectedIcon" :size="20">
          <component :is="selectedIcon" />
        </el-icon>
        <el-icon v-else :size="20"><Picture /></el-icon>
      </template>
      <template #suffix>
        <el-icon class="cursor-pointer" @click.stop="showDialog = true">
          <ArrowDown />
        </el-icon>
      </template>
    </el-input>

    <el-dialog
      v-model="showDialog"
      title="选择图标"
      width="800px"
      @close="handleDialogClose"
    >
      <div class="icon-selector-content">
        <el-input
          v-model="searchText"
          placeholder="搜索图标名称"
          clearable
          style="margin-bottom: 20px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <div class="icon-grid">
          <div
            v-for="icon in filteredIcons"
            :key="icon.name"
            class="icon-item"
            :class="{ active: selectedIconName === icon.name }"
            @click="selectIcon(icon)"
          >
            <el-icon :size="24">
              <component :is="icon.component" />
            </el-icon>
            <span class="icon-name">{{ icon.name }}</span>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDialog = false">取消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { Picture, ArrowDown, Search } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const showDialog = ref(false)
const searchText = ref('')
const selectedIconName = ref('')

// 获取所有图标
const allIcons = computed(() => {
  const icons = []
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    icons.push({
      name: key,
      component: component
    })
  }
  // 按名称排序
  return icons.sort((a, b) => a.name.localeCompare(b.name))
})

// 过滤图标（支持中文搜索）
const filteredIcons = computed(() => {
  if (!searchText.value) {
    return allIcons.value
  }
  const search = searchText.value.trim()
  // 对于中文，直接使用原始搜索；对于英文，转换为小写
  const normalizedSearch = /[\u4e00-\u9fa5]/.test(search) ? search : search.toLowerCase()
  return allIcons.value.filter(icon => {
    const iconName = icon.name
    // 如果搜索词包含中文，直接匹配；否则转换为小写匹配
    if (/[\u4e00-\u9fa5]/.test(search)) {
      return iconName.includes(search)
    } else {
      return iconName.toLowerCase().includes(normalizedSearch)
    }
  })
})

// 当前选中的图标组件
const selectedIcon = computed(() => {
  if (!selectedIconName.value) {
    return null
  }
  return ElementPlusIconsVue[selectedIconName.value] || null
})

// 输入框显示的值
const inputValue = computed(() => {
  return selectedIconName.value || ''
})

// 初始化选中的图标
watch(() => props.modelValue, (newVal) => {
  if (newVal && ElementPlusIconsVue[newVal]) {
    selectedIconName.value = newVal
  } else {
    selectedIconName.value = ''
  }
}, { immediate: true })

// 选择图标（直接确认并关闭）
const selectIcon = (icon) => {
  selectedIconName.value = icon.name
  emit('update:modelValue', selectedIconName.value)
  showDialog.value = false
  searchText.value = '' // 清空搜索
}

// 关闭对话框
const handleDialogClose = () => {
  searchText.value = ''
}
</script>

<style scoped>
.icon-selector {
  width: 100%;
}

.cursor-pointer {
  cursor: pointer;
}

.icon-selector-content {
  max-height: 500px;
  overflow-y: auto;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  padding: 10px 0;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: #fff;
}

.icon-item:hover {
  border-color: #409eff;
  background-color: #ecf5ff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.icon-item.active {
  border-color: #409eff;
  background-color: #ecf5ff;
  color: #409eff;
}

.icon-name {
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
  text-align: center;
  word-break: break-all;
}

.icon-item.active .icon-name {
  color: #409eff;
  font-weight: 500;
}
</style>

