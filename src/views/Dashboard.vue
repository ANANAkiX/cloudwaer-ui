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
            <el-alert
              v-if="myApply"
              :title="applyAlertTitle"
              :type="applyAlertType"
              show-icon
              :closable="false"
              class="apply-alert"
            />
            <div class="apply-form" v-if="canApply">
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
                :disabled="myApply?.applyStatus === 0"
                style="margin-top: 12px"
                @click="onApply"
              >
                {{ myApply?.applyStatus === 0 ? '已提交，等待审核' : '提交申请' }}
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from '@/api/request.ts'
import { applyAuthor, getMyAuthorApply } from '@/api/blog'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const reason = ref('')
const submitting = ref(false)
const myApply = ref(null)
const roleIds = ref([])

const showApplyCard = computed(() => {
  // ADMIN / BLOGGER 不显示申请卡；其余登录用户可见
  if (!userStore.token) return false
  if (roleIds.value.includes(1) || roleIds.value.includes(4)) return false
  return true
})

const canApply = computed(() => {
  if (!myApply.value) return true
  // 待处理或已拒绝可再申请
  return myApply.value.applyStatus !== 0
})

const applyAlertTitle = computed(() => {
  const s = myApply.value?.applyStatus
  if (s === 0) return '已有待处理申请，请等待管理员审核'
  if (s === 1) return '申请已通过，请重新登录后使用博客功能'
  if (s === 2) return '上次申请被拒绝，可修改理由后重新申请'
  return ''
})

const applyAlertType = computed(() => {
  const s = myApply.value?.applyStatus
  if (s === 0) return 'warning'
  if (s === 1) return 'success'
  return 'info'
})

async function loadApply() {
  if (!userStore.token) return
  try {
    roleIds.value = (userStore.userInfo?.roleIds || []).map(Number)
    myApply.value = await getMyAuthorApply()
  } catch {
    myApply.value = null
  }
}

async function onApply() {
  submitting.value = true
  try {
    await applyAuthor(reason.value.trim() || undefined)
    message.success('申请已提交，管理员审核后将分配博客主角色')
    reason.value = ''
    await loadApply()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '申请失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadApply)
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

.apply-alert {
  margin-bottom: 12px;
}
</style>
