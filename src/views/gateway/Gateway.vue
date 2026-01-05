<template>
  <div class="gateway-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>动态网关</span>
          <div style="display: flex; gap: 10px; align-items: center">
            <el-button v-if="canRefresh" type="success" @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
              刷新路由
            </el-button>
            <el-button v-if="canAdd" type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增路由
            </el-button>
            <el-dropdown v-if="canAdd" trigger="click">
              <el-button type="primary" plain>
                快速模板
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="useTemplateExternalProxy()">外链代理（IFrame 内嵌/Nacos示例）</el-dropdown-item>
                  <el-dropdown-item @click="useTemplateSwagger('admin', gatewayTemplateDefaults.swaggerPorts.admin)">Swagger（Admin 服务）</el-dropdown-item>
                  <el-dropdown-item @click="useTemplateSwagger('authentication', gatewayTemplateDefaults.swaggerPorts.authentication)">Swagger（Auth 服务）</el-dropdown-item>
                  <el-dropdown-item divided @click="useTemplateBasic(gatewayTemplateDefaults.baseRoute.serviceId, gatewayTemplateDefaults.baseRoute.pathPattern, gatewayTemplateDefaults.baseRoute.uri)">基础转发（Admin）</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>

      <el-table
        :data="tableData"
        border
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="routeId" label="路由ID" width="220" align="left">
          <template #default="scope">
            <span class="cell-ellipsis" :title="scope.row.routeId">{{ scope.row.routeId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="uri" label="URI" min-width="280" align="left">
          <template #default="scope">
            <span class="cell-ellipsis" :title="scope.row.uri">{{ scope.row.uri }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="predicates" label="断言" min-width="260" align="left">
          <template #default="scope">
            <template v-if="scope.row.predicates && scope.row.predicates.length">
              <el-tag v-for="(p, i) in scope.row.predicates.slice(0,3)" :key="i" type="info" style="margin-right:6px">
                {{ p.name }}
              </el-tag>
              <span v-if="scope.row.predicates.length > 3" class="more-indicator">+{{ scope.row.predicates.length - 3 }}</span>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="filters" label="过滤器" min-width="220" align="left">
          <template #default="scope">
            <template v-if="scope.row.filters && scope.row.filters.length">
              <el-tag v-for="(f, i) in scope.row.filters.slice(0,3)" :key="i" type="warning" style="margin-right:6px">
                {{ f.name }}
              </el-tag>
              <span v-if="scope.row.filters.length > 3" class="more-indicator">+{{ scope.row.filters.length - 3 }}</span>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="order" label="顺序" width="80" align="center" />
        <el-table-column prop="description" label="描述" min-width="200" align="left">
          <template #default="scope">
            <span class="cell-ellipsis" :title="scope.row.description">{{ scope.row.description }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="scope">
            <el-button v-if="canEdit" link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button v-if="canDelete" link type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div style="margin-top: 20px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="pageParams.current"
          v-model:page-size="pageParams.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pageResult.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="840px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="路由ID" prop="routeId">
          <el-input v-model="formData.routeId" placeholder="请输入路由ID（唯一标识）" />
        </el-form-item>
        <el-form-item label="URI" prop="uri">
          <el-input v-model="formData.uri" placeholder="请输入URI（如：lb://service-name 或 http://host:port）" />
        </el-form-item>
        <el-form-item label="顺序" prop="order">
          <el-input-number v-model="formData.order" :min="0" style="width: 100%" />
          <span style="color: #909399; font-size: 12px; margin-left: 8px">数字越小优先级越高</span>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="2"
            placeholder="请输入路由描述"
          />
        </el-form-item>
        <el-form-item label="断言配置" :label-width="100">
          <div  v-for="(predicate, index) in formData.predicates" :key="index" class="gw-form-line">
            <el-row :gutter="0">
              <el-col :span="8">
                <el-select v-model="predicate.name" placeholder="选择断言类型" style="width: 100%">
                  <el-option label="Path" value="Path" />
                  <el-option label="Method" value="Method" />
                  <el-option label="Header" value="Header" />
                  <el-option label="Query" value="Query" />
                  <el-option label="Cookie" value="Cookie" />
                  <el-option label="Host" value="Host" />
                  <el-option label="RemoteAddr" value="RemoteAddr" />
                  <el-option label="Before" value="Before" />
                  <el-option label="After" value="After" />
                  <el-option label="Between" value="Between" />
                </el-select>
              </el-col>
              <el-col :span="14">
                <div class="gw-inline">
                  <template v-if="predicate.name === 'Path' || predicate.name === 'Host' || predicate.name === 'RemoteAddr'">
                    <el-input v-model="predicate.args.pattern" :placeholder="getPredicatePlaceholder(predicate.name)" style="width: 100%" />
                  </template>
                  <template v-else-if="predicate.name === 'Method'">
                    <el-input v-model="predicate.args.methods" placeholder="如：GET,POST" style="width: 100%" />
                  </template>
                  <template v-else-if="predicate.name === 'Header' || predicate.name === 'Query' || predicate.name === 'Cookie'">
                    <el-input v-model="predicate.args.name" placeholder="名称" style="width: 40%" />
                    <el-input v-model="predicate.args.value" placeholder="值" style="width: 58%" />
                  </template>
                  <template v-else-if="predicate.name === 'Before' || predicate.name === 'After'">
                    <el-input v-model="predicate.args.datetime" placeholder="如：2025-01-01T00:00:00" style="width: 100%" />
                  </template>
                  <template v-else-if="predicate.name === 'Between'">
                    <el-input v-model="predicate.args.from" placeholder="起：2025-01-01T00:00:00" style="width: 49%" />
                    <el-input v-model="predicate.args.to" placeholder="止：2025-01-02T00:00:00" style="width: 49%" />
                  </template>
                  <template v-else>
                    <el-input v-model="predicate.args.pattern" placeholder="参数" style="width: 100%" />
                  </template>
                </div>
              </el-col>

              <el-col :span="2" class="gw-actions">
                <el-button @click="removePredicate(index)" type="danger" :icon="Delete" circle />
              </el-col>
            </el-row>
          </div>
        </el-form-item>
        <el-form-item label=" " :label-width="100">
          <el-button @click="addPredicate" type="primary" :icon="Plus" size="small">添加断言</el-button>
        </el-form-item>
        <el-form-item label="过滤器配置" :label-width="100">
          <div v-for="(filter, index) in formData.filters" :key="index" class="gw-form-line">
            <el-row :gutter="0">
              <el-col :span="8">
                <el-select v-model="filter.name" placeholder="选择过滤器类型" style="width: 100%">
                  <el-option label="StripPrefix" value="StripPrefix" />
                  <el-option label="PrefixPath" value="PrefixPath" />
                  <el-option label="AddRequestHeader" value="AddRequestHeader" />
                  <el-option label="AddResponseHeader" value="AddResponseHeader" />
                  <el-option label="RemoveRequestHeader" value="RemoveRequestHeader" />
                  <el-option label="RemoveResponseHeader" value="RemoveResponseHeader" />
                  <el-option label="SetResponseHeader" value="SetResponseHeader" />
                  <el-option label="RewriteResponseHeader" value="RewriteResponseHeader" />
                  <el-option label="Retry" value="Retry" />
                  <el-option label="SetStatus" value="SetStatus" />
                </el-select>
              </el-col>
              <el-col :span="14">
                <div class="gw-inline">
                  <template v-if="filter.name === 'StripPrefix'">
                    <el-input v-model="filter.args.parts" placeholder="parts（如：2）" style="width: 100%" />
                  </template>
                  <template v-else-if="filter.name === 'PrefixPath'">
                    <el-input v-model="filter.args.prefix" placeholder="prefix（如：/api）" style="width: 100%" />
                  </template>
                  <template v-else-if="filter.name === 'AddRequestHeader' || filter.name === 'AddResponseHeader' || filter.name === 'SetResponseHeader'">
                    <el-input v-model="filter.args.name" placeholder="header 名称" style="width: 40%" />
                    <el-input v-model="filter.args.value" placeholder="header 值" style="width: 58%" />
                  </template>
                  <template v-else-if="filter.name === 'RemoveRequestHeader' || filter.name === 'RemoveResponseHeader'">
                    <el-input v-model="filter.args.name" placeholder="header 名称" style="width: 100%" />
                  </template>
                  <template v-else-if="filter.name === 'RewriteResponseHeader'">
                    <el-input v-model="filter.args.name" placeholder="header 名称（如：Set-Cookie）" style="width: 32%" />
                    <el-input v-model="filter.args.regexp" placeholder="regexp（如：Path=/nacos）" style="width: 32%" />
                    <el-input v-model="filter.args.replacement" placeholder="replacement（如：Path=/ext-proxy/nacos）" style="width: 32%" />
                  </template>
                  <template v-else-if="filter.name === 'Retry'">
                    <el-input v-model="filter.args.retries" placeholder="retries（如：3）" style="width: 48%" />
                    <el-input v-model="filter.args.statuses" placeholder="statuses（如：BAD_GATEWAY,GatewayTimeout）" style="width: 48%" />
                  </template>
                  <template v-else-if="filter.name === 'SetStatus'">
                    <el-input v-model="filter.args.status" placeholder="status（如：200 或 302）" style="width: 100%" />
                  </template>
                  <template v-else>
                    <el-input v-model="filter.args.parts" placeholder="参数" style="width: 100%" />
                  </template>
                </div>
              </el-col>
              <el-col :span="2" class="gw-actions">
                <el-button @click="removeFilter(index)" type="danger" :icon="Delete" circle />
              </el-col>
            </el-row>
          </div>
        </el-form-item>
        <el-form-item label=" " :label-width="100">
          <el-button @click="addFilter" type="primary" :icon="Plus" size="small">添加过滤器</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, FormInstance } from 'element-plus'
import { message } from '@/api/request.ts'
import { Plus, Delete, Refresh } from '@element-plus/icons-vue'
import {
  getGatewayRoutesByPage,
  saveGatewayRoute,
  updateGatewayRoute,
  deleteGatewayRoute,
  refreshGatewayRoutes,
  type GatewayRouteInfo
} from '@/api/gateway'
import { checkButtonPermission } from '@/utils/permission'
import { GATEWAY_TEMPLATE_DEFAULTS, GATEWAY_TEMPLATE_CSP } from '@/config/app'

const loading = ref<boolean>(false)
const submitLoading = ref<boolean>(false)
const dialogVisible = ref<boolean>(false)
const dialogTitle = ref<string>('新增路由')
const formRef = ref<FormInstance | null>(null)
const tableData = ref<GatewayRouteInfo[]>([])

// 分页参数
const pageParams = ref({
  current: 1,
  size: 10,
  keyword: ''
})

// 分页结果
const pageResult = ref({
  records: [] as GatewayRouteInfo[],
  total: 0,
  current: 1,
  size: 10,
  pages: 0
})

// 权限检查
const canAdd = computed(() => checkButtonPermission('gateway', 'admin:gateway:add'))
const canEdit = computed(() => checkButtonPermission('gateway', 'admin:gateway:edit'))
const canDelete = computed(() => checkButtonPermission('gateway', 'admin:gateway:delete'))
const canRefresh = computed(() => checkButtonPermission('gateway', 'admin:gateway:refresh'))

const gatewayTemplateDefaults = GATEWAY_TEMPLATE_DEFAULTS

const formData = ref<GatewayRouteInfo>({
  routeId: '',
  uri: '',
  predicates: [],
  filters: [],
  order: 0,
  description: ''
})

const rules = {
  routeId: [
    { required: true, message: '请输入路由ID', trigger: 'blur' }
  ],
  uri: [
    { required: true, message: '请输入URI', trigger: 'blur' }
  ]
}

// 加载路由列表（分页）
const loadRoutes = async () => {
  loading.value = true
  try {
    const result = await getGatewayRoutesByPage({
      current: pageParams.value.current,
      size: pageParams.value.size,
      keyword: pageParams.value.keyword || undefined
    })
    pageResult.value = result
    tableData.value = result.records || []
  } catch (error) {
    // 错误消息已在 request.ts 中统一处理
  } finally {
    loading.value = false
  }
}

// 分页大小改变
const handleSizeChange = (size: number) => {
  pageParams.value.size = size
  pageParams.value.current = 1 // 重置到第一页
  loadRoutes()
}

// 当前页改变
const handleCurrentChange = (current: number) => {
  pageParams.value.current = current
  loadRoutes()
}

// 刷新路由（通知网关重新加载）
const handleRefresh = async () => {
  try {
    await ElMessageBox.confirm('确定要刷新网关路由吗？这将通知网关服务重新加载路由配置。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await refreshGatewayRoutes()
    message.success('刷新成功')
    // 重新加载路由列表（重置到第一页）
    pageParams.value.current = 1
    loadRoutes()
  } catch (error: any) {
    if (error !== 'cancel') {
      // 错误消息已在 request.ts 中统一处理
    }
  }
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增路由'
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row: GatewayRouteInfo) => {
  dialogTitle.value = '编辑路由'
  resetForm()
  formData.value = {
    id: row.id,
    routeId: row.routeId,
    uri: row.uri,
    predicates: row.predicates ? JSON.parse(JSON.stringify(row.predicates)) : [],
    filters: row.filters ? JSON.parse(JSON.stringify(row.filters)) : [],
    order: row.order || 0,
    description: row.description || ''
  }
  dialogVisible.value = true
}

// 删除
const handleDelete = async (row: GatewayRouteInfo) => {
  try {
    await ElMessageBox.confirm('确定要删除该路由吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteGatewayRoute(row.id!)
    message.success('删除成功')
    // 如果当前页没有数据了，且不是第一页，则跳转到上一页
    if (tableData.value.length === 1 && pageParams.value.current > 1) {
      pageParams.value.current--
    }
    loadRoutes()
  } catch (error: any) {
    if (error !== 'cancel') {
      // 错误消息已在 request.ts 中统一处理
    }
  }
}

// 提交
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        // 清理空的断言和过滤器参数
        const cleanedData = {
          ...formData.value,
          predicates: formData.value.predicates?.filter(p => p.name && p.args && Object.keys(p.args).length > 0),
          filters: formData.value.filters?.filter(f => f.name && f.args && Object.keys(f.args).length > 0)
        }

        const isEdit = !!formData.value.id
        if (isEdit) {
          await updateGatewayRoute(cleanedData)
          message.success('更新成功')
        } else {
          await saveGatewayRoute(cleanedData)
          message.success('新增成功')
          // 如果是新增，跳转到最后一页
          try {
            const tempResult = await getGatewayRoutesByPage({
              current: 1,
              size: pageParams.value.size,
              keyword: pageParams.value.keyword || undefined
            })
            const totalPages = Math.ceil((tempResult.total + 1) / pageParams.value.size)
            pageParams.value.current = totalPages
          } catch (e) {
            // 如果获取失败，保持当前页
          }
        }
        dialogVisible.value = false
        loadRoutes()
      } catch (error: any) {
        // 错误消息已在 request.ts 中统一处理
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 重置表单
const resetForm = () => {
  formData.value = {
    routeId: '',
    uri: '',
    predicates: [],
    filters: [],
    order: 0,
    description: ''
  }
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 对话框关闭
const handleDialogClose = () => {
  resetForm()
}

// 添加断言
const addPredicate = () => {
  if (!formData.value.predicates) {
    formData.value.predicates = []
  }
  formData.value.predicates.push({
    name: 'Path',
    args: { pattern: '' }
  })
}

// 删除断言
const removePredicate = (index: number) => {
  if (formData.value.predicates) {
    formData.value.predicates.splice(index, 1)
  }
}

// 添加过滤器
const addFilter = () => {
  if (!formData.value.filters) {
    formData.value.filters = []
  }
  formData.value.filters.push({
    name: 'StripPrefix',
    args: { parts: '' }
  })
}

// 删除过滤器
const removeFilter = (index: number) => {
  if (formData.value.filters) {
    formData.value.filters.splice(index, 1)
  }
}

// 格式化断言参数显示
const formatPredicateArgs = (args: Record<string, string>): string => {
  if (!args) return ''
  const entries = Object.entries(args)
  if (entries.length === 0) return ''
  return entries.map(([key, value]) => `${key}=${value}`).join(', ')
}

// 根据断言类型提供占位提示
const getPredicatePlaceholder = (name: string): string => {
  const placeholders: Record<string, string> = {
    Path: '请输入路径模式（如：/api/**）',
    Method: '请输入HTTP方法（如：GET,POST）',
    Header: '请输入Header名称和值（如：X-Request-Id=123）',
    Query: '请输入查询参数（如：name=value）',
    Cookie: '请输入Cookie名称和值（如：chocolate=ch.p）',
    Host: '请输入主机名（如：**.example.org）',
    RemoteAddr: '请输入IP地址（如：192.168.1.1/24）',
    Before: '请输入日期时间（如：2025-01-01T00:00:00）',
    After: '请输入日期时间（如：2025-01-01T00:00:00）',
    Between: '请输入日期时间范围'
  }
  return placeholders[name] || '请输入参数值'
}

// 快速模板：外链代理（以 Nacos 控制台为例）
const useTemplateExternalProxy = () => {
  dialogTitle.value = '新增路由 - 外链代理模板'
  resetForm()
  formData.value = {
    routeId: gatewayTemplateDefaults.nacosRouteId,
    uri: gatewayTemplateDefaults.nacosUri,
    predicates: [
      { name: 'Path', args: { pattern: gatewayTemplateDefaults.nacosPathPattern } }
    ],
    filters: [
      { name: 'StripPrefix', args: { parts: '2' } },
      { name: 'RemoveResponseHeader', args: { name: 'X-Frame-Options' } },
      { name: 'RemoveResponseHeader', args: { name: 'Content-Security-Policy' } },
      { name: 'SetResponseHeader', args: { name: 'Content-Security-Policy', value: GATEWAY_TEMPLATE_CSP } },
      { name: 'RewriteResponseHeader', args: { name: 'Set-Cookie', regexp: 'Path=/nacos', replacement: 'Path=/ext-proxy/nacos' } },
      { name: 'RewriteResponseHeader', args: { name: 'Location', regexp: '^/nacos/(.*)$', replacement: '/ext-proxy/nacos/$1' } }
    ],
    order: 0,
    description: '允许 IFrame 内嵌 Nacos 控制台'
  }
  dialogVisible.value = true
}

// 快速模板：Swagger 代理
const useTemplateSwagger = (service: 'admin' | 'authentication', port: number) => {
  dialogTitle.value = `新增路由 - Swagger(${service})`
  resetForm()
  const id = `ext-${service}-swagger`
  formData.value = {
    routeId: id,
    uri: `http://localhost:${port}`,
    predicates: [
      { name: 'Path', args: { pattern: `/ext-proxy/${service}-swagger/**` } }
    ],
    filters: [
      { name: 'StripPrefix', args: { parts: '2' } },
      { name: 'RemoveResponseHeader', args: { name: 'X-Frame-Options' } },
      { name: 'RemoveResponseHeader', args: { name: 'Content-Security-Policy' } },
      { name: 'SetResponseHeader', args: { name: 'Content-Security-Policy', value: GATEWAY_TEMPLATE_CSP } }
    ],
    order: 0,
    description: `${service} 服务 Swagger 代理（IFrame 内嵌）`
  }
  dialogVisible.value = true
}

// 快速模板：基础转发
const useTemplateBasic = (serviceId: string, pathPattern: string, uri: string) => {
  dialogTitle.value = '新增路由 - 基础转发'
  resetForm()
  formData.value = {
    routeId: serviceId,
    uri,
    predicates: [ { name: 'Path', args: { pattern: pathPattern } } ],
    filters: [],
    order: 0,
    description: `${serviceId} 的基础网关转发`
  }
  dialogVisible.value = true
}

onMounted(() => {
  loadRoutes()
})
</script>

<style scoped>
.gateway-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.gw-form-line { display: block; width: 100%; margin-bottom: 12px; }
.gw-actions { text-align: right; padding-left: 8px; }
.gw-form-line :deep(.el-row) { align-items: center; }
.cell-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.more-indicator { color: #909399; }
</style>
