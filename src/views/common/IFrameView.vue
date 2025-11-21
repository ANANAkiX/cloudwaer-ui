<template>
  <div class="iframe-wrapper">
    <iframe :src="iframeUrl" frameborder="0" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const iframeUrl = computed(() => (route.meta?.iframeUrl as string) || '')
</script>

<style scoped>
.iframe-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 120px);
  background: #fff;
}
.iframe-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
