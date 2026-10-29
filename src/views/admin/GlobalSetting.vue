<template>
  <div class="global-setting-page">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>服务器设置</span>
          <div class="card-actions">
            <el-button @click="load">刷新</el-button>
            <el-button v-if="canSave" type="primary" plain :loading="saving" @click="handleSave">保存</el-button>
            <el-button v-if="canPublish" type="primary" :loading="publishing" @click="handlePublish">发布设置</el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="pendingCount > 0" type="warning" :closable="false" show-icon class="pending-alert"
                :title="`有 ${pendingCount} 项已保存但未发布`"
                description="保存只是草稿；点击「发布设置」后各实例立即切换生效（无需重启）。" />
      <el-alert v-else type="success" :closable="false" show-icon class="pending-alert"
                title="所有设置均已发布" description="未覆盖的配置项自动使用配置文件 / 代码默认值兜底。" />

      <el-tabs v-model="activeTab">
        <el-tab-pane v-for="tab in settingTabs" :key="tab.name" :label="tab.label" :name="tab.name">
          <div class="setting-list">
            <div v-for="item in tab.items" :key="item.settingKey" class="setting-row">
              <div class="setting-label">
                <span>{{ item.remark || item.settingKey }}</span>
                <span class="setting-key">{{ item.settingKey }}</span>
              </div>
              <div class="setting-control">
                <el-tooltip :disabled="item.implemented !== false" content="暂未完成" placement="top">
                  <div>
                    <el-switch v-if="item.valueType === 'BOOL'" :model-value="boolOf(item)"
                               :disabled="item.implemented === false"
                               @update:model-value="(v: boolean) => setBool(item, v)" />
                    <el-input-number v-else-if="item.valueType === 'INT' || item.valueType === 'LONG'"
                                     :model-value="numOf(item)" :controls="false" style="width: 220px"
                                     :disabled="item.implemented === false"
                                     @update:model-value="(v: number | undefined) => setNum(item, v)" />
                    <el-input v-else :model-value="strOf(item)" style="width: 220px"
                              :disabled="item.implemented === false"
                              @update:model-value="(v: string) => setStr(item, v)" />
                  </div>
                </el-tooltip>
              </div>
              <div class="setting-meta">
                <el-tag v-if="item.implemented === false" size="small" type="info">暂未完成</el-tag>
                <el-tag size="small" :type="sourceTagType(item.source)">来源：{{ sourceText(item.source) }}</el-tag>
                <el-tag v-if="item.pendingPublish" size="small" type="warning">待发布</el-tag>
                <el-button v-if="canReset && item.dbValue != null" link type="primary"
                           @click="handleReset(item)">恢复默认</el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="第三方登录" name="oauth">
          <div class="oauth-toolbar">
            <el-button v-if="canOauthSave" type="primary" @click="openOauthDialog()">新增第三方登录</el-button>
            <el-tag type="info" size="small">登录流程本体暂未开放，配置先就绪</el-tag>
          </div>
          <el-table :data="oauthList" border style="width: 100%">
            <el-table-column prop="providerType" label="类型" width="120" />
            <el-table-column prop="providerName" label="显示名" width="140" />
            <el-table-column prop="clientId" label="Client ID" min-width="160" show-overflow-tooltip />
            <el-table-column label="启用" width="80">
              <template #default="{ row }">
                <el-tag :type="row.enabled === 1 ? 'success' : 'info'" size="small">
                  {{ row.enabled === 1 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sort" label="排序" width="70" />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button v-if="canOauthSave" link type="primary" @click="openOauthDialog(row)">编辑</el-button>
                <el-button v-if="canOauthDelete" link type="danger" @click="handleOauthDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="oauthDialogVisible" :title="oauthForm.id ? '编辑第三方登录' : '新增第三方登录'" width="640px"
               destroy-on-close>
      <el-form :model="oauthForm" label-width="120px">
        <el-form-item label="供应商类型" required>
          <el-select v-model="oauthForm.providerType" style="width: 100%">
            <el-option v-for="t in providerTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="显示名称" required>
          <el-input v-model="oauthForm.providerName" placeholder="登录按钮展示名" />
        </el-form-item>
        <el-form-item label="Client ID" required>
          <el-input v-model="oauthForm.clientId" />
        </el-form-item>
        <el-form-item label="Client Secret">
          <el-input v-model="oauthForm.clientSecret" type="password" show-password
                    placeholder="留空保持原值（新填则覆盖）" />
        </el-form-item>
        <el-form-item label="授权页地址">
          <el-input v-model="oauthForm.authUrl" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="Token 地址">
          <el-input v-model="oauthForm.tokenUrl" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="用户信息地址">
          <el-input v-model="oauthForm.userInfoUrl" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="Scope">
          <el-input v-model="oauthForm.scope" />
        </el-form-item>
        <el-form-item label="回调地址">
          <el-input v-model="oauthForm.redirectUri" placeholder="可空" />
        </el-form-item>
        <el-form-item label="图标 URL">
          <el-input v-model="oauthForm.icon" placeholder="可空" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="oauthForm.sort" :controls="false" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="oauthEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="oauthDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="oauthSaving" @click="handleOauthSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref} from 'vue'
import {
  deleteOauthProvider,
  getOauthProviders,
  getSettings,
  publishSettings,
  resetSettings,
  saveOauthProvider,
  saveSettings,
  type OauthProvider,
  type SettingItem
} from '@/api/setting.ts'
import {message} from '@/api/request.ts'
import {checkButtonPermission} from '@/utils/permission.ts'

const loading = ref<boolean>(false)
const saving = ref<boolean>(false)
const publishing = ref<boolean>(false)
const activeTab = ref<string>('captcha')

const items = ref<SettingItem[]>([])
const draft = reactive<Record<string, string>>({})
const initial = reactive<Record<string, string>>({})

const canSave = checkButtonPermission('globalsetting', 'admin:setting:save')
const canPublish = checkButtonPermission('globalsetting', 'admin:setting:publish')
const canReset = checkButtonPermission('globalsetting', 'admin:setting:reset')
const canOauthSave = checkButtonPermission('globalsetting', 'admin:oauth:save')
const canOauthDelete = checkButtonPermission('globalsetting', 'admin:oauth:delete')

const settingTabs = computed(() => {
  const groups: Record<string, SettingItem[]> = {captcha: [], auth: [], security: [], system: []}
  for (const item of items.value) {
    const bucket = item.groupKey === 'captcha' ? 'captcha'
      : (item.groupKey === 'jwt' || item.groupKey === 'auth') ? 'auth'
        : item.groupKey === 'security' ? 'security' : 'system'
    groups[bucket].push(item)
  }
  return [
    {name: 'captcha', label: '验证码', items: groups.captcha},
    {name: 'auth', label: '登录与 Token', items: groups.auth},
    {name: 'security', label: '安全', items: groups.security},
    {name: 'system', label: '系统', items: groups.system}
  ]
})

const pendingCount = computed(() => items.value.filter(i => i.pendingPublish).length)

const strOf = (item: SettingItem): string => draft[item.settingKey] ?? ''

const boolOf = (item: SettingItem): boolean => draft[item.settingKey] === 'true'

const numOf = (item: SettingItem): number | undefined => {
  const raw = draft[item.settingKey]
  if (raw === '' || raw == null) return undefined
  const n = Number(raw)
  return Number.isNaN(n) ? undefined : n
}

const setStr = (item: SettingItem, v: string) => {
  if (item.implemented === false) return
  draft[item.settingKey] = v ?? ''
}

const setBool = (item: SettingItem, v: boolean) => {
  if (item.implemented === false) return
  draft[item.settingKey] = v ? 'true' : 'false'
}

const setNum = (item: SettingItem, v: number | undefined) => {
  if (item.implemented === false) return
  draft[item.settingKey] = v == null ? '' : String(v)
}

const sourceText = (source: string): string => {
  if (source === 'DB') return '已发布'
  if (source === 'YML') return '配置文件'
  return '代码默认'
}

const sourceTagType = (source: string): 'success' | 'warning' | 'info' => {
  if (source === 'DB') return 'success'
  if (source === 'YML') return 'warning'
  return 'info'
}

const load = async (): Promise<void> => {
  loading.value = true
  try {
    const list = await getSettings()
    items.value = list || []
    for (const item of items.value) {
      const value = item.dbValue ?? item.effectiveValue ?? ''
      draft[item.settingKey] = value
      initial[item.settingKey] = value
    }
  } catch (e) {
    console.error('加载设置失败', e)
  } finally {
    loading.value = false
    await loadOauth()
  }
}

const handleSave = async (): Promise<void> => {
  const changed = items.value
    .filter(i => i.implemented !== false)
    .filter(i => (draft[i.settingKey] ?? '') !== (initial[i.settingKey] ?? ''))
    .map(i => ({settingKey: i.settingKey, settingValue: draft[i.settingKey] === '' ? null : draft[i.settingKey]}))
  if (!changed.length) {
    message.info('没有需要保存的改动')
    return
  }
  saving.value = true
  try {
    await saveSettings(changed)
    message.success('已保存（草稿）；点击「发布设置」后生效')
    await load()
  } finally {
    saving.value = false
  }
}

const handlePublish = async (): Promise<void> => {
  publishing.value = true
  try {
    const result = await publishSettings()
    message.success(`发布成功：${result?.keyCount ?? 0} 项已广播到各实例`)
    await load()
  } finally {
    publishing.value = false
  }
}

const handleReset = async (item: SettingItem): Promise<void> => {
  await resetSettings([item.settingKey])
  message.success(`已恢复默认（草稿）：${item.settingKey}；发布后生效`)
  await load()
}

// ---- 第三方登录 ----

const providerTypes = ['GITHUB', 'GITEE', 'WECHAT', 'GOOGLE', 'CUSTOM']

const oauthList = ref<OauthProvider[]>([])
const oauthDialogVisible = ref<boolean>(false)
const oauthSaving = ref<boolean>(false)
const oauthEnabled = ref<boolean>(true)

const emptyOauthForm = (): OauthProvider => ({
  id: undefined,
  providerType: 'GITHUB',
  providerName: '',
  clientId: '',
  clientSecret: '',
  authUrl: '',
  tokenUrl: '',
  userInfoUrl: '',
  scope: '',
  redirectUri: '',
  icon: '',
  sort: 0,
  enabled: 1,
  remark: ''
})

const oauthForm = reactive<OauthProvider>(emptyOauthForm())

const loadOauth = async (): Promise<void> => {
  try {
    oauthList.value = (await getOauthProviders()) || []
  } catch (e) {
    console.error('加载第三方登录失败', e)
  }
}

const openOauthDialog = (row?: OauthProvider): void => {
  Object.assign(oauthForm, row ? {...row, clientSecret: ''} : emptyOauthForm())
  oauthEnabled.value = (row?.enabled ?? 1) === 1
  oauthDialogVisible.value = true
}

const handleOauthSave = async (): Promise<void> => {
  if (!oauthForm.providerName || !oauthForm.clientId) {
    message.warning('显示名称与 Client ID 必填')
    return
  }
  oauthSaving.value = true
  try {
    await saveOauthProvider({...oauthForm, enabled: oauthEnabled.value ? 1 : 0})
    message.success('已保存第三方登录配置')
    oauthDialogVisible.value = false
    await loadOauth()
  } finally {
    oauthSaving.value = false
  }
}

const handleOauthDelete = async (row: OauthProvider): Promise<void> => {
  if (!row.id) return
  await deleteOauthProvider(row.id)
  message.success('已删除')
  await loadOauth()
}

onMounted(load)
</script>

<style scoped>
.global-setting-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pending-alert {
  margin-bottom: 16px;
}

.setting-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.setting-label {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-key {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.setting-control {
  width: 240px;
}

.setting-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.oauth-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
</style>
