<template>
  <div class="oauth-callback-container">
    <div class="oauth-callback-box">
      <h2 class="title">Cloudwaer管理系统</h2>
      <div class="status-area">
        <el-icon class="is-loading status-icon"><Loading /></el-icon>
        <p class="status-text">{{ statusText }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {Loading} from '@element-plus/icons-vue'
import {useUserStore} from '@/stores/user'
import {message} from '@/api/request.ts'
import {oauthBind, oauthLogin} from '@/api/auth.ts'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

/** 发起授权时记录的意图：login-登录 / bind-绑定到当前账号 */
const intent = sessionStorage.getItem('oauth_intent') || 'login'
const isBind = intent === 'bind'
const statusText = ref<string>(isBind ? '正在绑定…' : '正在登录…')

/** 清理 OAuth 流程临时会话数据 */
const cleanupOauthSession = (): void => {
  sessionStorage.removeItem('oauth_state')
  sessionStorage.removeItem('oauth_intent')
  sessionStorage.removeItem('oauth_provider')
}

/** 流程失败回发起处（绑定回个人信息，登录回登录页） */
const backToStart = (): void => {
  cleanupOauthSession()
  router.replace(isBind ? '/profile' : '/login')
}

onMounted(async () => {
  const error = typeof route.query.error === 'string' ? route.query.error : ''
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const failTip = isBind ? '第三方绑定失败' : '第三方登录失败'

  // 第三方回调带回错误（拒绝授权、提供方异常等）
  if (error) {
    message.error(`${failTip}（${error}），请重新发起`)
    backToStart()
    return
  }

  if (!code || !state) {
    message.error(`${failTip}：参数缺失，请重新发起`)
    backToStart()
    return
  }

  // 防伪 state 校验
  const savedState = sessionStorage.getItem('oauth_state')
  if (!savedState || savedState !== state) {
    message.error('授权状态校验失败，请重新发起')
    backToStart()
    return
  }

  const providerType = sessionStorage.getItem('oauth_provider') || 'GITHUB'
  try {
    if (isBind) {
      await oauthBind({providerType, code, state, clientId: 'admin'})
      message.success('绑定成功')
      cleanupOauthSession()
      router.replace('/profile')
      return
    }
    const res = await oauthLogin({providerType, code, state, clientId: 'admin'})
    if (res?.status === 'NEED_REGISTER') {
      if (!res.registerTicket) {
        message.error(`${failTip}：注册票据缺失，请重试`)
        backToStart()
        return
      }
      // 未绑定系统账号：票据/资料暂存给注册页，注册成功后自动绑定并登录
      sessionStorage.setItem('oauth_register_ticket', res.registerTicket)
      sessionStorage.setItem('oauth_register_profile', JSON.stringify(res.profile || {}))
      cleanupOauthSession()
      router.replace('/register')
      return
    }
    if (res && res.status === 'OK' && res.token) {
      // 与密码登录成功分支完全一致：落 token → 提示 → 进首页
      userStore.setToken(res.token)
      message.success('登录成功')
      cleanupOauthSession()
      router.push('/')
    } else {
      message.error(`${failTip}，请重试`)
      backToStart()
    }
  } catch (e: any) {
    message.error(e?.message || `${failTip}，请重试`)
    backToStart()
  }
})
</script>

<style scoped>
.oauth-callback-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: var(--cw-bg);
}

.oauth-callback-box {
  width: 400px;
  padding: 40px;
  background: var(--cw-surface);
  border: 1px solid var(--cw-border);
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  margin-bottom: 30px;
  color: var(--cw-text);
  font-size: 24px;
}

.status-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 16px;
}

.status-icon {
  font-size: 28px;
  color: var(--cw-accent);
}

.status-text {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 15px;
}
</style>
