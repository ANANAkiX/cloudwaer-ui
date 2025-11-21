<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDict, mapDictOptions } from '@/utils/dict'

interface Props {
  type: string
  modelValue?: string | number | null
  valueField?: 'value' | 'code'
  labelField?: 'label' | 'value'
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  valueField: 'value',
  labelField: 'label',
  placeholder: '请选择',
  clearable: true,
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string | number | null): void
  (e: 'change', v: string | number | null): void
}>()

const { dicts, loading, refresh } = useDict([props.type])

const options = computed(() => mapDictOptions(dicts.value[props.type] || [], props.valueField, props.labelField))

// 将选项值统一转为字符串用于选择器匹配，避免 1 与 '1' 类型不一致导致显示为数字
const optionValueStr = (v: any) => (v === null || v === undefined ? '' : String(v))
const selectOptions = computed(() => (options.value || []).map(o => ({
  ...o,
  valueStr: optionValueStr(o.value)
})))

// 内部绑定字符串值，回传时按选项原始值类型回传
const value = computed({
  get: () => optionValueStr(props.modelValue),
  set: (v: any) => {
    const str = optionValueStr(v)
    const found = selectOptions.value.find(o => o.valueStr === str)
    const rawVal = found ? (found as any).value : v
    emit('update:modelValue', rawVal as any)
    emit('change', rawVal as any)
  }
})

watch(() => props.type, async () => {
  await refresh()
})
</script>

<template>
  <el-select v-model="value" :loading="loading" :placeholder="placeholder" :clearable="clearable" :disabled="disabled" filterable>
    <el-option v-for="opt in selectOptions" :key="String(opt.value)" :label="opt.label" :value="opt.valueStr" />
  </el-select>
</template>
