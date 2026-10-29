<template>
  <div class="login-container">
    <div class="login-box">
      <h2 class="title">Cloudwaer管理系统</h2>
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" class="login-form">
        <el-form-item>
          <el-radio-group v-model="loginMode" class="login-mode">
            <el-radio-button label="username">账号密码</el-radio-button>
            <el-radio-button label="email">邮箱</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="loginMode === 'username'" prop="username">
          <el-input
              v-model="loginForm.username"
              placeholder="Username"
              prefix-icon="User"
              size="large"
          />
        </el-form-item>
        <el-form-item v-else prop="email">
          <el-input
              v-model="loginForm.email"
              placeholder="Email"
              prefix-icon="Message"
              size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              prefix-icon="Lock"
              size="large"
              @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item v-if="captchaEnabled" prop="captchaCode">
          <div class="captcha-row">
            <el-input
                v-model="loginForm.captchaCode"
                placeholder="请输入验证码"
                prefix-icon="CircleCheck"
                size="large"
                @keyup.enter="handleLogin"
                class="captcha-input"
            />
            <img
                v-if="captchaImage"
                :src="captchaImage"
                class="captcha-img"
                alt="captcha"
                @click="refreshCaptcha"
            />
          </div>
        </el-form-item>
        <el-form-item>
          <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
              class="login-button"
          >
            登录
          </el-button>
        </el-form-item>
        <el-form-item v-if="oauthProviders.length">
          <div class="oauth-row">
            <el-button
                v-for="p in oauthProviders"
                :key="p.type"
                class="oauth-button"
                @click="handleOauthLogin(p)"
            >
              {{ p.name }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {useUserStore} from '@/stores/user'
import {FormInstance, FormRules} from 'element-plus'
import {message} from '@/api/request.ts'
import {getCaptcha} from '@/api/captcha'
import {getPublicSettings, type PublicSettings} from '@/api/auth.ts'
import {LOGIN_CAPTCHA_FORCE_OFF, LOGIN_CAPTCHA_FORCE_ON} from '@/config/app'
import {rsaEncryptWithPublicKey} from '@/utils/rsa.ts'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance | null>(null)
const loading = ref<boolean>(false)
const loginMode = ref<'username' | 'email'>('username')

const loginForm = reactive({
  username: '',
  email: '',
  password: '',
  captchaCode: ''
})

const captchaEnabled = ref<boolean>(false)
const captchaId = ref<string>('')
const captchaImage = ref<string>('')
const oauthProviders = ref<PublicSettings['oauthProviders']>([])
const passwordTransport = ref<PublicSettings['passwordTransport']>({enabled: false})

const rules: FormRules = {
  username: [
    {
      validator: (_rule, value, callback) => {
        if (loginMode.value !== 'username') return callback()
        if (!value) return callback(new Error('Please enter username'))
        callback()
      },
      trigger: 'blur'
    }
  ],
  email: [
    {
      validator: (_rule, value, callback) => {
        if (loginMode.value !== 'email') return callback()
        if (!value) return callback(new Error('Please enter email'))
        const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
        if (!emailRegex.test(value)) return callback(new Error('Invalid email'))
        callback()
      },
      trigger: 'blur'
    }
  ],
  password: [
    {required: true, message: 'Please enter password', trigger: 'blur'}
  ],
  captchaCode: [
    {
      validator: (_rule, value, callback) => {
        if (!captchaEnabled.value) return callback()
        if (!value) return callback(new Error('请输入验证码'))
        callback()
      },
      trigger: 'blur'
    }
  ]
}

// 检查登录状态，如果已登录则跳转到首页
onMounted(async () => {
  if (userStore.token) {
    router.push('/')
    return
  }
  // VITE_LOGIN_CAPTCHA=false 为强制关闭逃生门；未配置时跟随后端全局动态设置（发布即热生效）
  if (LOGIN_CAPTCHA_FORCE_OFF) {
    captchaEnabled.value = false
    return
  }
  try {
    const pub = await getPublicSettings()
    oauthProviders.value = pub?.oauthProviders || []
    passwordTransport.value = pub?.passwordTransport || {enabled: false}
    captchaEnabled.value = LOGIN_CAPTCHA_FORCE_ON ? true : !!pub?.captchaEnabled
  } catch (e) {
    // 公开设置拉取失败：退回 env 强制开关，不阻塞登录
    captchaEnabled.value = LOGIN_CAPTCHA_FORCE_ON
  }
  if (captchaEnabled.value) {
    await refreshCaptcha()
  }
})

const handleOauthLogin = (provider: { type: string; name: string }): void => {
  message.info(`第三方登录（${provider.name}）暂未开放`)
}

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

const refreshCaptcha = async (): Promise<void> => {
  try {
    const resp = await getCaptcha()
    if (resp && resp.enabled) {
      captchaEnabled.value = true
      captchaId.value = resp.captchaId || ''
      captchaImage.value = resp.imageBase64 || ''
      loginForm.captchaCode = ''
    } else {
      captchaEnabled.value = false
      captchaId.value = ''
      captchaImage.value = ''
      loginForm.captchaCode = ''
    }
  } catch (e) {
    captchaEnabled.value = false
  }
}

const handleLogin = async (): Promise<void> => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true
      try {
        const captchaPayload = captchaEnabled.value
            ? {captchaId: captchaId.value, captchaCode: loginForm.captchaCode}
            : undefined
        const payload = {
          username: loginMode.value === 'username' ? loginForm.username : undefined,
          email: loginMode.value === 'email' ? loginForm.email : undefined,
          password: encryptPassword(loginForm.password),
          loginType: loginMode.value === 'email' ? 'EMAIL_PASSWORD' : 'ACCESS_PASSWORD',
          scope: 'DEFAULT',
          clientId: 'admin'
        }
        const result = await userStore.login(payload, captchaPayload)
        if (result.success) {
          message.success('登录成功')
          router.push('/')
        } else {
          // 错误消息已在 request.ts 中统一处理，这里只处理成功消息
        }
      } catch (error: any) {
        // 错误消息已在 request.ts 中统一处理
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 24px;
}

.login-form {
  margin-top: 20px;
}

.login-button {
  width: 100%;
}

.login-mode {
  width: 100%;
  display: flex;
  justify-content: center;
}

.captcha-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.captcha-input {
  flex: 1 1 auto;
  min-width: 180px;
}

.captcha-img {
  height: 40px;
  cursor: pointer;
  border: 1px solid #eee;
  border-radius: 4px;
}

.captcha-refresh {
  white-space: nowrap;
}

.oauth-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.oauth-button {
  flex: 1;
}
</style>
