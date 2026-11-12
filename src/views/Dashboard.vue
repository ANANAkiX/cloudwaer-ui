<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="welcome-card">
          <template #header>
            <div class="card-header">
              <span>欢迎使用 Cloudwaer 管理系统</span>
            </div>
          </template>
          <div class="welcome-content">
            <h2>页面信息</h2>
            <p>这是一个基于 Spring Cloud 的微服务架构管理系统</p>
            <el-divider />
            <el-descriptions :column="2" border>
              <el-descriptions-item label="系统名称">Cloudwaer</el-descriptions-item>
              <el-descriptions-item label="架构模式">微服务架构</el-descriptions-item>
              <el-descriptions-item label="技术栈">Spring Cloud + Vue 3</el-descriptions-item>
              <el-descriptions-item label="服务注册">Nacos</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>

      <el-col :span="24" v-if="showApplyCard">
        <el-card class="apply-card">
          <template #header>
            <div class="card-header">
              <span>申请成为博客主</span>
            </div>
          </template>
          <div class="apply-body">
            <p class="apply-tip">
              访客可自助申请开通博客主权限（文章完整 CRUD）。提交后由管理员在「博客管理 → 博客主申请」审核，并通过用户管理分配角色。
            </p>
            <div class="apply-form">
              <el-input
                v-model="reason"
                type="textarea"
                :rows="3"
                maxlength="255"
                show-word-limit
                placeholder="申请理由（可选）：例如写作方向、更新频率…"
              />
              <el-button
                type="primary"
                :loading="submitting"
                style="margin-top: 12px"
                @click="onApply"
              >
                提交申请
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { message } from '@/api/request.ts'
import { applyAuthor } from '@/api/blog'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const reason = ref('')
const submitting = ref(false)

const showApplyCard = computed(() => {
  // ADMIN / BLOGGER 不显示申请卡；其余登录用户可见
  if (!userStore.token) return false
  const roles = (userStore.userInfo?.roleIds || []).map(Number)
  return !roles.includes(1) && !roles.includes(4)
})

async function onApply() {
  submitting.value = true
  try {
    await applyAuthor(reason.value.trim() || undefined)
    message.success('申请已提交，管理员审核后将分配博客主角色')
    reason.value = ''
  } catch (e) {
    message.error(e instanceof Error ? e.message : '申请失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.welcome-card {
  min-height: 280px;
}

.apply-card {
  margin-top: 20px;
}

.card-header {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.welcome-content {
  padding: 10px 0;
}

.welcome-content h2 {
  margin: 0 0 10px 0;
  color: #409EFF;
  font-size: 24px;
}

.welcome-content p {
  margin: 10px 0;
  color: #606266;
  font-size: 16px;
}

.apply-tip {
  margin: 0 0 12px;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
}
</style>
