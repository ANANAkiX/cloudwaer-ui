<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { saveTag, type BlogTag } from '@/api/blog'
import { message } from '@/api/request.ts'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  modelValue?: (string | number)[]
  tags: BlogTag[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: (string | number)[]]
  created: [tag: BlogTag]
  creating: [busy: boolean]
}>()

const userStore = useUserStore()
const canCreate = computed(() => (userStore.permissionCodes || []).includes('blog:tag:add'))

/** 本地选中态，始终只存数字 ID 字符串 */
const selected = ref<string[]>([])
const creating = ref(false)

watch(
  () => props.modelValue,
  v => {
    const next = (v || []).map(x => String(x).trim()).filter(s => /^\d+$/.test(s))
    if (next.join(',') !== selected.value.join(',')) {
      selected.value = next
    }
  },
  { immediate: true, deep: true }
)

function pushId(ids: string[], id: string | number) {
  const s = String(id).trim()
  if (/^\d+$/.test(s) && !ids.includes(s)) ids.push(s)
}

function commit(ids: string[]) {
  selected.value = [...ids]
  emit('update:modelValue', [...ids])
}

/** 选中项立即写回父组件；新建标签异步完成后再补 ID */
async function onChange(raw: (string | number)[] | null | undefined) {
  const ids: string[] = []
  const names: string[] = []
  for (const v of raw || []) {
    if (v == null || v === '') continue
    const s = String(v).trim()
    if (/^\d+$/.test(s)) {
      pushId(ids, s)
    } else if (s) {
      names.push(s)
    }
  }
  commit(ids)

  if (!names.length) return

  creating.value = true
  emit('creating', true)
  try {
    for (const name of names) {
      const existed = props.tags.find(t => t.name === name)
      if (existed?.id != null) {
        pushId(ids, existed.id)
        commit(ids)
        continue
      }
      if (!canCreate.value) {
        message.warning('没有新建标签权限，请从标签管理添加')
        continue
      }
      try {
        const id = await saveTag({ name })
        pushId(ids, id)
        commit(ids)
        emit('created', { id, name })
        message.success(`已创建标签「${name}」`)
      } catch (e) {
        message.error(e instanceof Error ? e.message : '创建标签失败')
      }
    }
  } finally {
    creating.value = false
    emit('creating', false)
  }
}
</script>

<template>
  <el-select
    :model-value="selected"
    multiple
    filterable
    allow-create
    default-first-option
    :reserve-keyword="false"
    :disabled="disabled || creating"
    placeholder="搜索或输入后回车创建标签"
    style="width: 100%"
    @update:model-value="onChange"
  >
    <el-option v-for="t in tags" :key="String(t.id)" :label="t.name" :value="String(t.id)" />
    <template #footer v-if="canCreate">
      <div class="create-hint">
        <el-icon><Plus /></el-icon>
        {{ creating ? '正在创建标签…' : '输入不存在的名称并回车即可创建' }}
      </div>
    </template>
  </el-select>
</template>

<style scoped>
.create-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  padding: 4px 0;
}
</style>
