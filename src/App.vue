<template>
  <router-view/>
</template>

<script setup lang="ts">
import {startTokenWatcher} from "@/api/request.ts";

startTokenWatcher()
</script>

<style scoped>
</style>



