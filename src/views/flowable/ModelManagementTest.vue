<template>
  <div class="model-management-test">
    <h2>模型管理测试页面</h2>
    <el-button @click="testAPI" type="primary">测试API</el-button>
    <div v-if="apiData" class="api-result">
      <h3>API响应数据：</h3>
      <pre>{{ JSON.stringify(apiData, null, 2) }}</pre>
    </div>
    <div v-if="error" class="error">
      <h3>错误信息：</h3>
      <pre>{{ error }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getModelList } from '@/api/model'

const apiData = ref<any>(null)
const error = ref<string>('')

const testAPI = async () => {
  try {
    console.log('开始测试API...')
    const response = await getModelList({
      current: 1,
      size: 10
    })
    console.log('API响应:', response)
    apiData.value = response
    error.value = ''
  } catch (err) {
    console.error('API错误:', err)
    error.value = JSON.stringify(err, null, 2)
    apiData.value = null
  }
}
</script>

<style scoped>
.model-management-test {
  padding: 20px;
}
.api-result, .error {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
