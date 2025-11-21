<script setup lang="ts">
import { computed } from 'vue'
import { useDict } from '@/utils/dict'

interface Props {
  type: string
  modelValue?: string | number | boolean
  trueCode?: string | number
  falseCode?: string | number
  activeText?: string
  inactiveText?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  trueCode: '1',
  falseCode: '0',
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number): void
  (e: 'change', v: string | number): void
}>()

// 拉取字典，用于显示开关文本
const { dicts } = useDict([props.type])

const activeLabel = computed(() => {
  if (props.activeText) return props.activeText
  const list = dicts.value[props.type] || []
  return (list.find(i => String(i.code) === String(props.trueCode))?.label) || '是'
})
const inactiveLabel = computed(() => {
  if (props.inactiveText) return props.inactiveText
  const list = dicts.value[props.type] || []
  return (list.find(i => String(i.code) === String(props.falseCode))?.label) || '否'
})

const checked = computed({
  get: () => String(props.modelValue) === String(props.trueCode),
  set: (v: boolean) => {
    const code = v ? props.trueCode : props.falseCode
    emit('update:modelValue', code)
    emit('change', code)
  }
})
</script>

<template>
  <el-switch
    v-model="checked"
    :active-text="activeLabel"
    :inactive-text="inactiveLabel"
    :disabled="disabled"
  />
</template>
