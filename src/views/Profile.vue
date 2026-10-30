<template>
  <div class="profile-page">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>个人资料</span>
        </div>
      </template>

      <div class="profile-body">
        <div class="avatar-section" v-loading="avatarUploading">
          <el-upload
            :show-file-list="false"
            :http-request="onAvatarUpload as any"
            :before-upload="beforeAvatarUpload"
            accept="image/jpeg,image/png,image/gif,image/webp"
          >
            <el-avatar :size="96" :src="profileForm.avatar || undefined" :icon="UserFilled" class="profile-avatar" />
          </el-upload>
          <div class="avatar-tip">点击更换头像</div>
        </div>

        <el-form
          ref="profileFormRef"
          :model="profileForm"
          :rules="profileRules"
          label-width="90px"
          class="profile-form"
        >
          <el-form-item label="登录账号">
            <el-input v-model="profileForm.username" disabled />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="profileForm.nickname" maxlength="50" placeholder="请输入昵称" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="profileForm.email" maxlength="100" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="profileForm.phone" maxlength="20" placeholder="请输入手机号" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="profileSaving" @click="handleSaveProfile">保存</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <el-card class="password-card">
      <template #header>
        <div class="card-header">
          <span>修改密码</span>
        </div>
      </template>

      <el-form
        ref="pwdFormRef"
        :model="pwdForm"
        :rules="pwdRules"
        label-width="90px"
        class="password-form"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="pwdForm.oldPassword"
            type="password"
            show-password
            maxlength="32"
            placeholder="请输入原密码"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="pwdForm.newPassword"
            type="password"
            show-password
            maxlength="32"
            placeholder="6-32 位新密码"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="pwdForm.confirmPassword"
            type="password"
            show-password
            maxlength="32"
            placeholder="请再次输入新密码"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="pwdSaving" @click="handleChangePassword">提交</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="oauth-card">
      <template #header>
        <div class="card-header">
          <span>第三方账号</span>
          <span class="oauth-tip">绑定后可用第三方账号快捷登录</span>
        </div>
      </template>
      <div v-loading="oauthLoading" class="oauth-body">
        <div v-if="!oauthProviders.length && !oauthBindings.length" class="oauth-empty">
          暂无可用的第三方登录（在「全局设置 · 第三方登录」启用后展示）
        </div>
        <template v-else>
          <div v-for="b in oauthBindings" :key="b.providerType" class="oauth-row">
            <div class="oauth-main">
              <span class="oauth-name">{{ providerName(b.providerType) }}</span>
              <span class="oauth-user">{{ b.providerUsername || '已绑定' }}</span>
            </div>
            <el-button size="small" @click="handleUnbindOauth(b.providerType)">解绑</el-button>
          </div>
          <div v-for="p in unboundProviders" :key="p.type" class="oauth-row">
            <div class="oauth-main">
              <span class="oauth-name">{{ p.name }}</span>
              <span class="oauth-user">未绑定</span>
            </div>
            <el-button size="small" type="primary" @click="handleBindOauth(p.type)">绑定</el-button>
          </div>
        </template>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue'
import {FormInstance, FormRules} from 'element-plus'
import {UserFilled} from '@element-plus/icons-vue'
import {message} from '@/api/request.ts'
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar
} from '@/api/user.ts'
import {
  getPublicSettings,
  getOauthBindUrl,
  getOauthBindings,
  unbindOauth,
  type OauthBindingInfo,
  type PublicSettings
} from '@/api/auth.ts'
import {rsaEncryptWithPublicKey} from '@/utils/rsa.ts'
import {useUserStore} from '@/stores/user'

const userStore = useUserStore()

const loading = ref<boolean>(false)
const profileSaving = ref<boolean>(false)
const pwdSaving = ref<boolean>(false)
const avatarUploading = ref<boolean>(false)

const profileFormRef = ref<FormInstance | null>(null)
const pwdFormRef = ref<FormInstance | null>(null)

const profileForm = reactive({
  username: '',
  nickname: '',
  email: '',
  phone: '',
  avatar: ''
})

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const passwordTransport = ref<PublicSettings['passwordTransport']>({enabled: false})

const profileRules: FormRules = {
  email: [
    {
      validator: (_rule, value, callback) => {
        if (!value) return callback()
        const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
        if (!emailRegex.test(value)) return callback(new Error('请输入正确的邮箱地址'))
        callback()
      },
      trigger: 'blur'
    }
  ]
}

const pwdRules: FormRules = {
  oldPassword: [
    {required: true, message: '请输入原密码', trigger: 'blur'}
  ],
  newPassword: [
    {required: true, message: '请输入新密码', trigger: 'blur'},
    {
      validator: (_rule, value, callback) => {
        if (!value) return callback()
        if (value.length < 6 || value.length > 32) return callback(new Error('新密码长度为 6-32 位'))
        callback()
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    {required: true, message: '请再次输入新密码', trigger: 'blur'},
    {
      validator: (_rule, value, callback) => {
        if (value !== pwdForm.newPassword) return callback(new Error('两次输入的密码不一致'))
        callback()
      },
      trigger: 'blur'
    }
  ]
}

const loadProfile = async () => {
  loading.value = true
  try {
    const profile = await getMyProfile()
    if (profile) {
      profileForm.username = profile.username || ''
      profileForm.nickname = profile.nickname || ''
      profileForm.email = profile.email || ''
      profileForm.phone = profile.phone || ''
      profileForm.avatar = profile.avatar || ''
    }
  } catch {
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadProfile()
  await loadOauthSection()
  try {
    const pub = await getPublicSettings()
    passwordTransport.value = pub?.passwordTransport || {enabled: false}
  } catch {
  }
})

// ===== 第三方账号绑定 =====
const oauthProviders = ref<PublicSettings['oauthProviders']>([])
const oauthBindings = ref<OauthBindingInfo[]>([])
const oauthLoading = ref<boolean>(false)

const unboundProviders = computed(() => {
  const bound = new Set(oauthBindings.value.map(b => b.providerType))
  return oauthProviders.value.filter(p => !bound.has(p.type))
})

const providerName = (type: string): string =>
  oauthProviders.value.find(p => p.type === type)?.name || type

const loadOauthSection = async () => {
  oauthLoading.value = true
  try {
    const [pub, bindings] = await Promise.all([getPublicSettings(), getOauthBindings()])
    oauthProviders.value = pub?.oauthProviders || []
    oauthBindings.value = bindings || []
  } catch {
    // 拉取失败保持空列表，不阻塞页面
  } finally {
    oauthLoading.value = false
  }
}

const handleBindOauth = async (providerType: string) => {
  try {
    const info = await getOauthBindUrl(providerType, 'admin', `${window.location.origin}/login/oauth-callback`)
    sessionStorage.setItem('oauth_intent', 'bind')
    sessionStorage.setItem('oauth_provider', providerType)
    sessionStorage.setItem('oauth_state', info.state)
    window.location.href = info.url
  } catch (e) {
    message.error(e instanceof Error ? e.message : '发起绑定失败')
  }
}

const handleUnbindOauth = async (providerType: string) => {
  try {
    await unbindOauth(providerType)
    message.success('已解绑')
    await loadOauthSection()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '解绑失败')
  }
}

const beforeAvatarUpload = (file: File) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) {
    message.error('头像仅支持 JPG/PNG/GIF/WEBP 图片')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    message.error('头像大小不能超过 2MB')
    return false
  }
  return true
}

const onAvatarUpload = async (options: { file: File }) => {
  avatarUploading.value = true
  try {
    const result = await uploadMyAvatar(options.file)
    if (result?.accessUrl) {
      profileForm.avatar = result.accessUrl
      message.success('头像上传成功')
    }
  } catch {
  } finally {
    avatarUploading.value = false
  }
}

const handleSaveProfile = async () => {
  if (!profileFormRef.value) return
  await profileFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    profileSaving.value = true
    try {
      await updateMyProfile({
        nickname: profileForm.nickname,
        email: profileForm.email,
        phone: profileForm.phone,
        avatar: profileForm.avatar
      })
      if (userStore.userInfo) {
        userStore.userInfo.nickname = profileForm.nickname
        localStorage.setItem('userInfo', JSON.stringify(userStore.userInfo))
      }
      message.success('保存成功')
    } catch {
    } finally {
      profileSaving.value = false
    }
  })
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

const handleChangePassword = async () => {
  if (!pwdFormRef.value) return
  await pwdFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    pwdSaving.value = true
    try {
      await changeMyPassword({
        oldPassword: encryptPassword(pwdForm.oldPassword),
        newPassword: encryptPassword(pwdForm.newPassword)
      })
      pwdForm.oldPassword = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
      pwdFormRef.value?.clearValidate()
      message.success('密码修改成功')
    } catch {
    } finally {
      pwdSaving.value = false
    }
  })
}
</script>

<style scoped>
.profile-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-body {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}

.profile-avatar {
  cursor: pointer;
  background: var(--el-fill-color-light);
}

.avatar-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.profile-form {
  flex: 1;
  max-width: 480px;
}

.password-card {
  margin-top: 16px;
}

.password-form {
  max-width: 480px;
}

.oauth-card {
  margin-top: 16px;
}

.oauth-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.oauth-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.oauth-empty {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.oauth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.oauth-row:last-child {
  border-bottom: none;
}

.oauth-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.oauth-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.oauth-user {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
