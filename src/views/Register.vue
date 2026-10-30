<template>
  <div class="register-container">
    <div class="register-box">
      <h2 class="title">{{ hasTicket ? 'Cloudwaer管理系统' : '注册账号' }}</h2>
      <div v-if="hasTicket" class="oauth-intro">
        <el-avatar v-if="avatar" :size="56" :src="avatar" class="oauth-avatar" />
        <div class="oauth-tip">注册后将自动绑定账号</div>
      </div>
      <el-form :model="registerForm" :rules="rules" ref="registerFormRef" class="register-form">
        <el-form-item prop="username">
          <el-input
              v-model="registerForm.username"
              placeholder="账号"
              prefix-icon="User"
              size="large"
          />
        </el-form-item>
        <el-form-item prop="nickname">
          <el-input
              v-model="registerForm.nickname"
              placeholder="昵称（可选）"
              prefix-icon="UserFilled"
              size="large"
          />
        </el-form-item>
        <el-form-item prop="email">
          <el-input
              v-model="registerForm.email"
              placeholder="邮箱（可选）"
              prefix-icon="Message"
              size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
              v-model="registerForm.password"
              type="password"
              placeholder="密码（6-32 位）"
              prefix-icon="Lock"
              size="large"
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              placeholder="确认密码"
              prefix-icon="Lock"
              size="large"
              @keyup.enter="handleRegister"
          />
        </el-form-item>
        <el-form-item>
          <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleRegister"
              class="register-button"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
      <div v-if="!hasTicket" class="login-entry">
        <span class="login-entry-text">已有账号？</span>
        <el-link type="primary" :underline="false" @click="router.push('/login')">去登录</el-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, onMounted, onUnmounted} from 'vue'
import {onBeforeRouteLeave, useRouter} from 'vue-router'
import {useUserStore} from '@/stores/user'
import {FormInstance, FormRules} from 'element-plus'
import {message} from '@/api/request.ts'
import {getPublicSettings, oauthRegister, register, type PublicSettings} from '@/api/auth.ts'
import {rsaEncryptWithPublicKey} from '@/utils/rsa.ts'

const router = useRouter()
const userStore = useUserStore()

const registerFormRef = ref<FormInstance | null>(null)
const loading = ref<boolean>(false)
const avatar = ref<string>('')
const hasTicket = ref<boolean>(false)
const passwordTransport = ref<PublicSettings['passwordTransport']>({enabled: false})

const registerForm = reactive({
  username: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const rules: FormRules = {
  username: [
    {required: true, message: '请输入用户名', trigger: 'blur'}
  ],
  email: [
    {
      validator: (_rule, value, callback) => {
        if (!value) return callback()
        const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
        if (!emailRegex.test(value)) return callback(new Error('请输入有效的邮箱地址'))
        callback()
      },
      trigger: 'blur'
    }
  ],
  password: [
    {required: true, message: '请输入密码', trigger: 'blur'},
    {min: 6, max: 32, message: '密码长度需为 6-32 位', trigger: 'blur'}
  ],
  confirmPassword: [
    {required: true, message: '请再次输入密码', trigger: 'blur'},
    {
      validator: (_rule, value, callback) => {
        if (value !== registerForm.password) return callback(new Error('两次输入的密码不一致'))
        callback()
      },
      trigger: 'blur'
    }
  ]
}

/** 清理 OAuth 全流程临时会话键（含注册票据/资料） */
const cleanupOauthSessionKeys = (): void => {
  const keys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && key.startsWith('oauth_')) keys.push(key)
  }
  keys.forEach(key => sessionStorage.removeItem(key))
}

// 离开注册页即清理票据与预填资料：SPA 路由跳转（下条）+ 整页卸载（地址栏跳转/刷新/关标签）都覆盖
onBeforeRouteLeave(() => {
  cleanupOauthSessionKeys()
})

const purgeOnUnload = (): void => {
  cleanupOauthSessionKeys()
}

onMounted(() => {
  window.addEventListener('pagehide', purgeOnUnload)
})

onUnmounted(() => {
  window.removeEventListener('pagehide', purgeOnUnload)
})

/**
 * 密码传输加密启用时用公钥 RSA 加密（未启用原样返回；启用但缺公钥时拦截，不发明文）
 */
const encryptPassword = (password: string): string => {
  const pt = passwordTransport.value
  if (!pt?.enabled) return password
  if (!pt.publicKey) {
    message.error('服务器密码加密配置不完整（缺少公钥），请联系管理员在「服务器设置」生成密钥对并发布')
    throw new Error('password transport public key missing')
  }
  try {
    return rsaEncryptWithPublicKey(password, pt.publicKey)
  } catch (e) {
    message.error('密码加密失败，请刷新页面后重试')
    throw e
  }
}

onMounted(async () => {
  const ticket = sessionStorage.getItem('oauth_register_ticket')
  hasTicket.value = !!ticket
  if (ticket) {
    // 预填第三方授权带回的昵称/邮箱/头像
    try {
      const raw = sessionStorage.getItem('oauth_register_profile')
      if (raw) {
        const p = JSON.parse(raw) || {}
        if (p.nickname) registerForm.nickname = String(p.nickname)
        if (p.email) registerForm.email = String(p.email)
        if (p.avatar) avatar.value = String(p.avatar)
      }
    } catch (e) {
      // 资料损坏时忽略预填，不影响注册
    }
  }
  try {
    const pub = await getPublicSettings()
    passwordTransport.value = pub?.passwordTransport || {enabled: false}
  } catch (e) {
    passwordTransport.value = {enabled: false}
  }
})

const handleRegister = async (): Promise<void> => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    loading.value = true
    try {
      if (hasTicket.value) {
        // 第三方引导注册：绑定第三方账号并自动登录
        const registerTicket = sessionStorage.getItem('oauth_register_ticket')
        if (!registerTicket) {
          message.warning('注册票据已失效，请重新通过第三方登录发起注册')
          return
        }
        const res = await oauthRegister({
          registerTicket,
          username: registerForm.username,
          password: encryptPassword(registerForm.password),
          nickname: registerForm.nickname || undefined,
          email: registerForm.email || undefined
        })
        if (res && res.status === 'OK' && res.token) {
          userStore.setToken(res.token)
          cleanupOauthSessionKeys()
          message.success('注册成功，已绑定第三方账号')
          router.push('/')
        }
        // 其它错误已在 request.ts 中统一提示
      } else {
        // 直接注册：成功后回登录页手动登录
        await register({
          username: registerForm.username,
          password: encryptPassword(registerForm.password),
          nickname: registerForm.nickname || undefined,
          email: registerForm.email || undefined
        })
        message.success('注册成功，请登录')
        router.replace('/login')
      }
    } catch (error: any) {
      // 错误消息已在 request.ts 中统一处理
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--cw-bg);
}

.register-box {
  width: 420px;
  padding: 40px;
  background: var(--cw-surface);
  border: 1px solid var(--cw-border);
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  margin-bottom: 20px;
  color: var(--cw-text);
  font-size: 24px;
}

.oauth-intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.oauth-avatar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.oauth-tip {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--cw-accent) 18%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--cw-accent) 10%, var(--cw-surface));
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: center;
}

.register-form {
  margin-top: 12px;
}

.register-button {
  width: 100%;
}

.login-entry {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
}

.login-entry-text {
  color: var(--el-text-color-secondary);
}
</style>
