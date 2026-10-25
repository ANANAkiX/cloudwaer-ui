<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  modelValue: string
  height?: number
  placeholder?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const content = computed({
  get: () => props.modelValue || '',
  set: v => emit('update:modelValue', v)
})

const html = computed(() => {
  try {
    return marked.parse(content.value || '') as string
  } catch {
    return ''
  }
})

const h = computed(() => props.height || 320)
</script>

<template>
  <div class="md-editor" :style="{ height: h + 'px' }">
    <textarea
      v-model="content"
      class="md-input"
      :placeholder="placeholder || 'Markdown 正文…'"
      spellcheck="false"
    />
    <div class="md-preview markdown-body" v-html="html" />
  </div>
</template>

<style scoped>
.md-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  overflow: hidden;
  width: 100%;
}
.md-input {
  border: none;
  border-right: 1px solid var(--el-border-color, #dcdfe6);
  padding: 12px;
  resize: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  background: #fff;
  color: var(--el-text-color-primary, #303133);
  box-sizing: border-box;
  height: 100%;
}
.md-preview {
  padding: 12px;
  overflow: auto;
  background: #fafafa;
  font-size: 13px;
  line-height: 1.7;
}
.md-preview :deep(pre) {
  background: #f0f2f5;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
}
.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3) {
  margin: 0.6em 0 0.4em;
}
@media (max-width: 900px) {
  .md-editor {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
  .md-input {
    border-right: none;
    border-bottom: 1px solid var(--el-border-color, #dcdfe6);
  }
}
</style>
