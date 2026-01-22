<template>
  <div class="process-application">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>流程申请</span>
          <div class="header-actions">
            <el-input
                v-model="searchKeyword"
                placeholder="搜索流程名称"
                clearable
                style="width: 260px"
                @clear="handleSearch"
                @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon>
                  <Search/>
                </el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>
        </div>
      </template>

      <!-- 流程分类标签 -->
      <div class="category-tabs">
        <el-tabs v-model="activeCategory" @tab-change="handleCategoryChange">
          <el-tab-pane label="全部" name="all"/>
          <el-tab-pane
              v-for="item in flowableTypeOptions"
              :key="getFlowableTypeValue(item) || String(item.id)"
              :label="getFlowableTypeLabel(item)"
              :name="getFlowableTypeValue(item)"
          />
        </el-tabs>
      </div>

      <!-- 流程卡片网格 -->
      <div class="process-grid">
        <el-row :gutter="20">
          <el-col :span="6" v-for="process in processList" :key="process.id">
            <el-card class="process-card" shadow="hover" @click="openApplicationDialog(process)">
              <div class="process-icon">
                <el-icon :size="40">
                  <component :is="getProcessIcon(process.category)"/>
                </el-icon>
              </div>
              <div class="process-info">
                <h3>{{ process.processName }}</h3>
                <p class="process-key">{{ process.processKey }}</p>
                <p class="process-desc">{{ process.description || '暂无描述' }}</p>
                <div class="process-stats">
                  <span class="stat-item">
                    <el-icon><User/></el-icon>
                    {{ process.instanceCount || 0 }} 个实例
                  </span>

                </div>
              </div>
              <div class="process-actions">
                <el-button type="primary" size="small" @click.stop="openApplicationDialog(process)">
                  <el-icon>
                    <VideoPlay/>
                  </el-icon>
                  申请流程
                </el-button>
                <el-button size="small" @click.stop="viewProcessDetail(process)">
                  <el-icon>
                    <View/>
                  </el-icon>
                  查看详情
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
            v-model:current-page="pageParams.current"
            v-model:page-size="pageParams.size"
            :page-sizes="[12, 24, 48, 96]"
            :total="pageParams.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 申请流程对话框 -->
    <el-dialog
        v-model="applicationDialogVisible"
        :title="`申请${currentProcessName}`"
        width="800px"
        :close-on-click-modal="false"
    >
      <div class="application-form">
        <!-- 基本信息 -->
        <el-form
            ref="formRef"
            :model="applicationForm"
            :rules="formRules"
            label-width="120px"
        >
           <el-form-item label="业务Key" prop="businessKey">
             <el-input
                 v-model="applicationForm.businessKey"
                 placeholder="请输入业务Key（可选）"
             />
           </el-form-item>
            <el-form-item label="任务优先级" prop="priority">
              <DictSelect
                v-model="applicationForm.priority"
                type="flowable_priority"
                value-field="value"
                label-field="label"
                placeholder="请选择任务优先级"
                style="width: 100%"
              />
            </el-form-item>

           <el-form-item label="结束时间" prop="dueTime">
             <el-date-picker
               v-model="applicationForm.dueTime"
               type="datetime"
               placeholder="请选择结束时间"
               format="YYYY-MM-DD HH:mm"
               value-format="YYYY-MM-DDTHH:mm:ss"
               style="width: 100%"
             />
           </el-form-item>
           <el-divider />
           <!-- 动态表单字段 -->

          <template v-if="hasFormJson">
            <form-create
                v-model="formCreateData"
                v-model:api="formCreateApi"
                :rule="formCreateRule"
                :option="formCreateOptions"
            />
          </template>
          <el-divider />
          <!-- 备注 -->
          <el-form-item label="备注">
            <el-input
                v-model="applicationForm.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入备注信息（可选）"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="applicationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitApplication" :loading="submitLoading">
          提交申请
        </el-button>
      </template>
    </el-dialog>

    <!-- 流程详情对话框 -->
    <el-dialog
        v-model="detailDialogVisible"
        title="流程详情"
        width="600px"
    >
      <div class="process-detail" v-if="currentProcess">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="流程名称">
            {{ currentProcess.processName }}
          </el-descriptions-item>
          <el-descriptions-item label="流程Key">
            {{ currentProcess.processKey }}
          </el-descriptions-item>
          <el-descriptions-item label="分类">
            <el-tag>{{ getCategoryText(currentProcess.category) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="版本">
            v{{ currentProcess.version }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ currentProcess.description || '暂无描述' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(currentProcess.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatTime(currentProcess.updateTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="实例数量">
            {{ currentProcess.instanceCount || 0 }}
          </el-descriptions-item>

        </el-descriptions>

        <!-- 流程图预览 -->
        <div class="process-diagram" v-if="currentProcess.diagram">
          <el-divider content-position="left">流程图</el-divider>
          <img :src="currentProcess.diagram" alt="流程图" style="width: 100%; max-height: 300px;"/>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, onMounted, computed} from 'vue'
import {ElMessage} from 'element-plus'
import {
  Search, User, Clock, VideoPlay, View, UploadFilled,
  Document, Money, Setting, More
} from '@element-plus/icons-vue'
import { startFlowableProcess, getProcessDefinitions, getProcessDefinitionDetail } from '@/api/flowable'
import type { FlowableProcessDefinition } from '@/api/flowable'

import { useDict } from '@/utils/dict'
import DictSelect from '@/components/DictSelect.vue'
import FcDesigner from '@/components/FcDesigner'


// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const applicationDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const activeCategory = ref('all')
const searchKeyword = ref('')
const currentProcess = ref<FlowableProcessDefinition | null>(null)
const currentProcessName = computed(() => {
  if (!currentProcess.value) return ''
  return currentProcess.value.processName || ''
})
const attachments = ref<any[]>([])
const {dicts} = useDict(['flowable_type'])
const flowableTypeOptions = computed(() => dicts.value.flowable_type || [])
const formCreate = (FcDesigner as any).formCreate

// 分页参数
const pageParams = reactive({
  current: 1,
  size: 12,
  total: 0
})

// 流程列表
const processList = ref<FlowableProcessDefinition[]>([])

// 申请表单
const applicationForm = reactive<Record<string, any>>({
  businessKey: '',
  priority: 'normal',
  dueTime: '',
  remark: ''
})

const currentModelEndTime = ref<string>('')


// 表单字段配置
const formJsonPayload = ref<any | null>(null)
const formCreateRule = ref<any[]>([])
const formCreateOptions = ref<Record<string, any>>({})
const formCreateData = ref<Record<string, any>>({})
const formCreateApi = ref<any>(null)
const hasFormJson = computed(() => !!formJsonPayload.value)

// 表单引用
const formRef = ref()

// 上传地址
const uploadUrl = '/api/upload'

// 表单验证规则
const formRules = computed(() => {
  return {
    businessKey: [
      { pattern: /^[a-zA-Z0-9_-]*$/, message: '业务Key只能包含字母、数字、下划线和连字符', trigger: 'blur' }
    ],
    priority: [
      { required: true, message: '请选择任务优先级', trigger: 'change' }
    ],
    dueTime: [
      { required: true, message: '请选择结束时间', trigger: 'change' },
      {
        validator: (_rule: any, value: any, callback: any) => {
          if (!value) {
            callback()
            return
          }
          const due = value instanceof Date ? value : new Date(value)
          if (Number.isNaN(due.getTime())) {
            callback(new Error('结束时间格式不正确'))
            return
          }
          if (due.getTime() < Date.now()) {
            callback(new Error('结束时间不能是过去的时间'))
            return
          }

          if (currentModelEndTime.value && currentModelEndTime.value !== '-') {
            const modelEnd = new Date(currentModelEndTime.value)
            if (!Number.isNaN(modelEnd.getTime()) && due.getTime() > modelEnd.getTime()) {
              callback(new Error('结束时间不能超过模型结束时间'))
              return
            }
          }

          callback()
        },
        trigger: 'change'
      }
    ]
  }
})


const parseFormJsonPayload = (raw: any) => {
  if (!raw) return null
  try {
    let data = raw
    if (typeof data === 'string') {
      data = JSON.parse(data)
    }
    if (typeof data === 'string') {
      data = JSON.parse(data)
    }
    return data && typeof data === 'object' ? data : null
  } catch (error) {
    console.error('解析表单JSON失败:', error)
    return null
  }
}

const parseFormCreateJson = (raw: any) => {
  if (!raw) return null
  try {
    if (typeof raw === 'string') {
      if (formCreate?.parseJson) {
        return formCreate.parseJson(raw)
      }
      return JSON.parse(raw)
    }
    return raw
  } catch (error) {
    console.error('解析表单配置失败:', error)
    return null
  }
}

const normalizeFormCreateOptions = (options: any) => {
  const normalized = options && typeof options === 'object' ? {...options} : {}
  normalized.submitBtn = false
  normalized.resetBtn = false
  return normalized
}

const resetFormCreate = () => {
  formJsonPayload.value = null
  formCreateRule.value = []
  formCreateOptions.value = {}
  formCreateData.value = {}
  formCreateApi.value = null
}

const initFormCreate = (raw: any) => {
  const payload = parseFormJsonPayload(raw)
  if (!payload) {
    resetFormCreate()
    return
  }
  const rule = parseFormCreateJson(payload.rule || payload.rules)
  const options = parseFormCreateJson(payload.options || payload.option)
  formJsonPayload.value = payload
  formCreateRule.value = Array.isArray(rule) ? rule : []
  formCreateOptions.value = normalizeFormCreateOptions(options)
  formCreateData.value = {}
}

const applyValuesToRules = (rules: any[], values: Record<string, any>) => {
  if (!Array.isArray(rules)) return
  rules.forEach((rule) => {
    if (!rule || typeof rule !== 'object') return
    if (rule.field && Object.prototype.hasOwnProperty.call(values, rule.field)) {
      const value = values[rule.field]
      rule.value = value
      rule.props = rule.props || {}
      rule.props.value = value
    }
    if (Array.isArray(rule.children)) {
      applyValuesToRules(rule.children, values)
    }
    if (Array.isArray(rule.control)) {
      rule.control.forEach((control: any) => {
        if (Array.isArray(control?.rule)) {
          applyValuesToRules(control.rule, values)
        }
      })
    }
  })
}

const buildFormJsonWithValues = () => {
  if (!formJsonPayload.value) return ''
  const values = formCreateData.value || {}
  const ruleCopy = JSON.parse(JSON.stringify(formCreateRule.value || []))
  applyValuesToRules(ruleCopy, values)
  const ruleJson = formCreate?.toJson ? formCreate.toJson(ruleCopy) : JSON.stringify(ruleCopy)
  const optionsRaw = formJsonPayload.value.options || formJsonPayload.value.option || ''
  const optionsJson = typeof optionsRaw === 'string' ? optionsRaw : JSON.stringify(optionsRaw || {})
  return JSON.stringify({rule: ruleJson, options: optionsJson})
}

const validateFormCreate = async () => {
  if (!formCreateApi.value || !formCreateApi.value.validate) return true
  const result = formCreateApi.value.validate()
  if (result && typeof result.then === 'function') {
    return result
  }
  return result !== false
}

// 方法
const loadData = async () => {
  try {
    loading.value = true

    const response = await getProcessDefinitions({
      current: pageParams.current,
      size: pageParams.size,
      category: activeCategory.value === 'all' ? undefined : activeCategory.value,
      keyword: searchKeyword.value || undefined
    })

    processList.value = response.records || []
    pageParams.total = response.total || 0

  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
    processList.value = []
    pageParams.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pageParams.current = 1
  loadData()
}

const handleCategoryChange = () => {
  pageParams.current = 1
  loadData()
}

const handleSizeChange = (size: number) => {
  pageParams.size = size
  pageParams.current = 1
  loadData()
}

const handleCurrentChange = (current: number) => {
  pageParams.current = current
  loadData()
}

const openApplicationDialog = (process: FlowableProcessDefinition) => {
  if (!process.formJson) {
    ElMessage.warning('没有配置表单数据')
    return
  }
  currentProcess.value = process
  resetFormCreate()
  initFormCreate(process.formJson)

  Object.assign(applicationForm, {
    businessKey: '',
    priority: 'normal',
    dueTime: '',
    remark: ''
  })
  currentModelEndTime.value = ''

  if (process.endTime) {
    currentModelEndTime.value = process.endTime
    applicationForm.dueTime = process.endTime
  }

  attachments.value = []
  applicationDialogVisible.value = true

}



const handleSubmitApplication = async () => {
  try {
    await formRef.value.validate()
    if (hasFormJson.value) {
      await validateFormCreate()
    }
    if (!currentProcess.value) return

    submitLoading.value = true

    const variables: Record<string, any> = {}

    const formJson = buildFormJsonWithValues()
    if (formJson) {
      variables.formJson = formJson
    }

    variables.priority = applicationForm.priority
    if (applicationForm.dueTime) {
      variables.dueTime = applicationForm.dueTime
    }

    if (applicationForm.remark) {
      variables.remark = applicationForm.remark
    }


    if (attachments.value.length > 0) {
      variables.attachments = attachments.value.map(file => ({
        name: file.name,
        url: file.url
      }))
    }

    await startFlowableProcess({
      processDefinitionKey: currentProcess.value.processKey,
      businessKey: applicationForm.businessKey || undefined,
      variables
    })

    applicationDialogVisible.value = false
    ElMessage.success('申请成功')
  } catch (error) {
    console.error(error)
  } finally {
    submitLoading.value = false
  }
}

const viewProcessDetail = async (process: FlowableProcessDefinition) => {
  try {
    const detail = await getProcessDefinitionDetail(process.id)
    currentProcess.value = detail
    detailDialogVisible.value = true
  } catch (error) {
    console.error('获取流程详情失败:', error)
    ElMessage.error('获取流程详情失败')
  }
}

const getProcessIcon = (category: string) => {
  switch (category) {
    case 'leave':
      return Document
    case 'expense':
      return Money
    case 'approval':
      return Setting
    case 'ea':
      return Setting
    default:
      return More
  }
}

const getFlowableTypeValue = (item: any) => {
  if (!item) return ''
  const value = item.value != null ? item.value : (item.code != null ? item.code : item.id)
  return value == null ? '' : String(value)
}

const getFlowableTypeLabel = (item: any) => {
  if (!item) return ''
  if (item.label != null && String(item.label) !== '') return String(item.label)
  if (item.value != null && String(item.value) !== '') return String(item.value)
  if (item.code != null && String(item.code) !== '') return String(item.code)
  return ''
}

const getCategoryText = (category: string) => {
  const hit = flowableTypeOptions.value.find(item => getFlowableTypeValue(item) === String(category))
  return hit ? getFlowableTypeLabel(hit) : '未分类'
}

const handleUploadSuccess = (response: any, fieldId: string) => {
  if (response.code === 200) {
    const fileList = applicationForm[fieldId] || []
    fileList.push({
      name: response.data.name,
      url: response.data.url
    })
    applicationForm[fieldId] = fileList
  } else {
    ElMessage.error('上传失败')
  }
}

const handleBeforeUpload = () => {
  // 文件大小限制
  return true
}

const handleAttachmentSuccess = (response: any) => {
  if (response.code === 200) {
    attachments.value.push({
      name: response.data.name,
      url: response.data.url
    })
  } else {
    ElMessage.error('上传失败')
  }
}

const handleAttachmentRemove = () => {
  // 处理附件移除逻辑
}

const formatTime = (time?: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString()
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.process-application {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .category-tabs {
    margin-bottom: 20px;
  }

  .process-grid {
    margin-bottom: 20px;

    .process-card {
      cursor: pointer;
      transition: all 0.3s ease;
      height: 280px;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }

      .process-icon {
        text-align: center;
        margin-bottom: 15px;
        color: #409eff;
      }

      .process-info {
        text-align: center;

        h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          color: #303133;
        }

        .process-key {
          color: #909399;
          font-size: 12px;
          margin: 5px 0;
        }

        .process-desc {
          color: #606266;
          font-size: 14px;
          margin: 10px 0;
          height: 40px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-clamp: 2;
        }

        .process-stats {
          display: flex;
          justify-content: space-around;
          margin: 15px 0;

          .stat-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 12px;
            color: #909399;
          }
        }
      }

      .process-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 15px;
      }
    }
  }

  .pagination {
    text-align: center;
  }

  .application-form {
    max-height: 60vh;
    overflow-y: auto;

    .upload-demo {
      text-align: center;

      :deep(.el-upload) {
        width: 100%;
      }

      :deep(.el-upload-dragger) {
        width: 100%;
      }
    }
  }

  .process-detail {
    .process-diagram {
      margin-top: 20px;
      text-align: center;
    }
  }
}
</style>
