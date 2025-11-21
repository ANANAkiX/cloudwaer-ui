<template>
  <div class="codegen-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>代码生成</span>
        </div>
      </template>

      <!-- 数据库连接选择（顶部） -->
      <div style="margin-bottom: 20px">
        <el-form :inline="true" :model="connectionForm">
          <el-form-item label="数据库连接">
            <el-select
              v-model="connectionForm.connectionId"
              placeholder="请选择数据库连接"
              style="width: 300px"
              @change="handleConnectionChange"
            >
              <el-option
                v-for="conn in connectionList"
                :key="conn.id"
                :label="`${conn.name} (${conn.host}:${conn.port}/${conn.database})`"
                :value="conn.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="选择数据库表" />
        <el-step title="配置表单字段" />
        <el-step title="配置代码生成选项" />
        <el-step title="生成代码" />
      </el-steps>

      <div class="step-content" style="margin-top: 40px">
        <!-- 步骤1：选择数据库表（以表格形式展示） -->
        <div v-if="currentStep === 0">
          <el-table
            :data="tableList"
            border
            style="width: 100%"
            v-loading="loading"
            @row-click="handleTableRowClick"
            highlight-current-row
          >
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="tableName" label="表名" align="center" />
            <el-table-column prop="tableComment" label="表注释" align="center" />
            <el-table-column label="操作" width="120" align="center">
              <template #default="scope">
                <el-button type="primary" link @click="handleSelectTable(scope.row.tableName)">
                  选择
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 步骤2：配置表单字段 -->
        <div v-if="currentStep === 1">
          <el-form :model="formConfig" label-width="150px" style="margin-bottom: 20px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="实体类名称">
                  <el-input v-model="formConfig.entityName" placeholder="请输入实体类名称（如：User）" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="实体类注释">
                  <el-input v-model="formConfig.entityComment" placeholder="请输入实体类注释（如：用户）" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="主键字段">
                  <el-select v-model="formConfig.primaryKeyField" style="width: 100%">
                    <el-option
                      v-for="pk in primaryKeys"
                      :key="pk"
                      :label="pk"
                      :value="pk"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <el-divider>字段配置</el-divider>

          <el-table
            :data="formFields"
            border
            style="width: 100%"
            max-height="500"
          >
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="columnName" label="字段名" width="150" align="center" />
            <el-table-column prop="columnComment" label="字段注释" width="150" align="center" />
            <el-table-column prop="dataType" label="数据库类型" width="120" align="center" />
            <el-table-column label="Java类型" width="180" align="center">
              <template #default="scope">
                <el-select
                  v-model="scope.row.javaType"
                  placeholder="选择Java类型"
                  style="width: 100%"
                >
                  <el-option label="String" value="String" />
                  <el-option label="Integer" value="Integer" />
                  <el-option label="Long" value="Long" />
                  <el-option label="Double" value="Double" />
                  <el-option label="Float" value="Float" />
                  <el-option label="BigDecimal" value="java.math.BigDecimal" />
                  <el-option label="Boolean" value="Boolean" />
                  <el-option label="LocalDate" value="java.time.LocalDate" />
                  <el-option label="LocalTime" value="java.time.LocalTime" />
                  <el-option label="LocalDateTime" value="java.time.LocalDateTime" />
                  <el-option label="byte[]" value="byte[]" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="前端类型" width="150" align="center">
              <template #default="scope">
                <el-select
                  v-model="scope.row.fieldType"
                  placeholder="选择前端类型"
                  style="width: 100%"
                >
                  <el-option label="input" value="input" />
                  <el-option label="textarea" value="textarea" />
                  <el-option label="number" value="number" />
                  <el-option label="select" value="select" />
                  <el-option label="date" value="date" />
                  <el-option label="datetime" value="datetime" />
                  <el-option label="switch" value="switch" />
                  <el-option label="radio" value="radio" />
                  <el-option label="checkbox" value="checkbox" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="是否必填" width="100" align="center">
              <template #default="scope">
                <el-switch
                  v-model="scope.row.required"
                  :disabled="scope.row.primaryKey"
                />
                <span v-if="scope.row.primaryKey" style="margin-left: 5px; color: #909399; font-size: 12px">主键</span>
              </template>
            </el-table-column>
            <el-table-column label="显示在列表" width="120" align="center">
              <template #default="scope">
                <el-switch v-model="scope.row.showInList" />
              </template>
            </el-table-column>
            <el-table-column label="显示在表单" width="120" align="center">
              <template #default="scope">
                <el-switch v-model="scope.row.showInForm" />
              </template>
            </el-table-column>
            <el-table-column label="可搜索" width="100" align="center">
              <template #default="scope">
                <el-switch v-model="scope.row.searchable" />
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 步骤3：配置代码生成选项 -->
        <div v-if="currentStep === 2">
          <el-form :model="codeGenConfig" label-width="200px">
            <el-form-item label="模块名称">
              <el-input v-model="codeGenConfig.moduleName" placeholder="请输入模块名称（如：admin）" />
            </el-form-item>
            <el-form-item label="包名">
              <el-input v-model="codeGenConfig.packageName" placeholder="请输入包名（如：com.cloudwaer.admin）" />
            </el-form-item>
            <el-form-item label="作者">
              <el-input v-model="codeGenConfig.author" placeholder="请输入作者名称" />
            </el-form-item>
            <el-form-item label="是否启用分页查询">
              <el-switch v-model="codeGenConfig.enablePagination" />
            </el-form-item>
            <el-form-item label="是否启用逻辑删除">
              <el-switch v-model="codeGenConfig.enableLogicDelete" />
            </el-form-item>
            <el-form-item label="生成后端代码">
              <el-switch v-model="codeGenConfig.generateBackend" />
            </el-form-item>
            <el-form-item label="生成前端代码">
              <el-switch v-model="codeGenConfig.generateFrontend" />
            </el-form-item>
            <el-form-item label="生成权限SQL">
              <el-switch v-model="codeGenConfig.generatePermission" />
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤4：生成代码 -->
        <div v-if="currentStep === 3">
          <div v-if="!fileTree && !generating" style="text-align: center; padding: 40px">
            <el-empty description="请点击生成代码按钮生成代码" />
          </div>
          
          <!-- 文件结构预览 -->
          <div v-if="fileTree && !generating" style="margin-bottom: 20px">
            <el-card>
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span>生成的文件结构</span>
                  <el-button type="primary" @click="handleDownloadZip" :loading="downloadLoading">
                    <el-icon><Download /></el-icon>
                    下载ZIP压缩包
                  </el-button>
                </div>
              </template>
              
              <el-tree
                :data="fileTree"
                :props="{ label: 'label', children: 'children' }"
                default-expand-all
                style="max-height: 500px; overflow-y: auto"
                @node-click="handleFileClick"
              >
                <template #default="{ node, data }">
                  <span 
                    style="display: flex; align-items: center; gap: 5px; cursor: pointer"
                    :style="{ color: data.isFile ? '#409EFF' : 'inherit' }"
                  >
                    <el-icon v-if="data.isFile">
                      <Document />
                    </el-icon>
                    <el-icon v-else>
                      <Folder />
                    </el-icon>
                    <span>{{ data.label }}</span>
                  </span>
                </template>
              </el-tree>
            </el-card>
          </div>
          
          <!-- 加载中 -->
          <div v-if="generating" style="text-align: center; padding: 40px">
            <el-icon class="is-loading" style="font-size: 40px"><Loading /></el-icon>
            <p style="margin-top: 20px">正在生成代码...</p>
          </div>
        </div>

        <!-- 文件预览对话框 -->
        <el-dialog
          v-model="filePreviewVisible"
          :title="filePreviewPath"
          width="80%"
          top="5vh"
        >
          <el-input
            v-model="filePreviewContent"
            type="textarea"
            :rows="30"
            readonly
            style="font-family: 'Consolas', 'Monaco', 'Courier New', monospace; font-size: 14px"
          />
          <template #footer>
            <el-button @click="filePreviewVisible = false">关闭</el-button>
            <el-button type="primary" @click="handleCopyContent">复制内容</el-button>
          </template>
        </el-dialog>
      </div>

      <div class="step-actions" style="margin-top: 40px; text-align: center">
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button
          v-if="currentStep < 3"
          type="primary"
          :loading="loading"
          @click="nextStep"
        >
          下一步
        </el-button>
        <el-button
          v-if="currentStep === 3"
          type="primary"
          :loading="generating"
          @click="handleGenerateCode"
        >
          生成代码
        </el-button>
      </div>
    </el-card>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from '@/api/request.ts'
import {
  getDatabaseConnectionList,
  getTableList,
  getTableMetadata,
  generateFormConfig,
  previewGeneratedFiles,
  generateAllCode,
  type DatabaseConnectionInfo,
  type CodeGenConfigInfo,
  type ColumnMetadataInfo
} from '@/api/codegen'
import { Download, Document, Folder, Loading } from '@element-plus/icons-vue'

const currentStep = ref(0)
const loading = ref(false)
const generating = ref(false)

const connectionList = ref<DatabaseConnectionInfo[]>([])
const tableList = ref<Array<{ tableName: string; tableComment?: string }>>([])
const tableMetadata = ref<any>(null)
const primaryKeys = ref<string[]>([])
const formFields = ref<Array<{
  columnName: string
  columnComment?: string
  dataType: string
  javaType: string
  fieldType: string
  required: boolean
  primaryKey: boolean
  nullable: boolean
  showInList: boolean
  showInForm: boolean
  searchable: boolean
}>>([])

const connectionForm = reactive({
  connectionId: '' as string | number | undefined
})

const formConfig = reactive({
  entityName: '',
  entityComment: '',
  primaryKeyField: '',
  queryFields: [] as string[]
})

const codeGenConfig = reactive({
  moduleName: '',
  packageName: '',
  author: 'cloudwaer',
  enablePagination: true,
  enableLogicDelete: false,
  generateBackend: true,
  generateFrontend: true,
  generatePermission: true
})

const fileTree = ref<any[]>([])
const downloadLoading = ref(false)
const filePreviewVisible = ref(false)
const filePreviewPath = ref('')
const filePreviewContent = ref('')

// 加载数据库连接列表
const loadConnectionList = async () => {
  try {
    const data = await getDatabaseConnectionList()
    connectionList.value = data || []
  } catch (error) {
    console.error('加载数据库连接列表失败:', error)
  }
}

// 处理数据库连接变化
const handleConnectionChange = async () => {
  if (!connectionForm.connectionId) {
    return
  }
  loading.value = true
  try {
    const data = await getTableList(connectionForm.connectionId)
    // 将表名转换为对象数组，方便显示注释
    tableList.value = (data || []).map((tableName: string) => ({
      tableName,
      tableComment: ''
    }))
    // 重置表格选择
    tableMetadata.value = null
    formFields.value = []
  } catch (error) {
    console.error('加载数据库表列表失败:', error)
    message.error('加载数据库表列表失败')
  } finally {
    loading.value = false
  }
}

// 处理表格行点击
const handleTableRowClick = (row: { tableName: string }) => {
  handleSelectTable(row.tableName)
}

// 选择数据库表
const handleSelectTable = async (tableName: string) => {
  if (!connectionForm.connectionId || !tableName) {
    return
  }
  loading.value = true
  try {
    // 获取表结构元数据
    const metadata = await getTableMetadata(connectionForm.connectionId, tableName)
    tableMetadata.value = metadata

    // 设置主键字段
    primaryKeys.value = metadata.primaryKeys || []
    if (primaryKeys.value.length > 0) {
      formConfig.primaryKeyField = primaryKeys.value[0]
    }

    // 初始化表单字段配置
    const columns = metadata.columns || []
    formFields.value = columns.map((col: ColumnMetadataInfo) => {
      // 根据数据库类型和Java类型推断前端类型
      const frontendType = getFrontendType(col.dataType, col.javaType)
      
      return {
        columnName: col.columnName,
        columnComment: col.columnComment || col.columnName,
        dataType: col.dataType || '',
        javaType: col.javaType || 'String',
        fieldType: frontendType,
        required: !col.nullable && !col.primaryKey, // 默认必填：非空且非主键
        primaryKey: col.primaryKey || false,
        nullable: col.nullable || false,
        showInList: true, // 默认显示在列表
        showInForm: !col.primaryKey || !col.autoIncrement, // 主键且自增时不显示在表单
        searchable: false // 默认不可搜索
      }
    })

    // 自动生成表单配置
    try {
      const config = await generateFormConfig(connectionForm.connectionId, tableName)
      formConfig.entityName = config.entityName || convertTableNameToEntityName(tableName)
      formConfig.entityComment = config.entityComment || formConfig.entityName
      formConfig.queryFields = config.queryFields || []
      
      codeGenConfig.moduleName = config.moduleName || ''
      codeGenConfig.packageName = config.packageName || ''
      codeGenConfig.author = config.author || 'cloudwaer'
      codeGenConfig.enablePagination = config.enablePagination ?? true
      codeGenConfig.enableLogicDelete = config.enableLogicDelete ?? false

      // 如果配置中有字段配置，合并到formFields
      if (config.formFields && config.formFields.length > 0) {
        const fieldMap = new Map(formFields.value.map(f => [f.columnName, f]))
        config.formFields.forEach((configField: any) => {
          const field = fieldMap.get(configField.fieldName)
          if (field) {
            field.fieldType = configField.fieldType || field.fieldType
            field.required = configField.required ?? field.required
            field.showInList = configField.showInList ?? field.showInList
            field.showInForm = configField.showInForm ?? field.showInForm
            field.searchable = configField.searchable ?? field.searchable
          }
        })
      }
    } catch (error) {
      // 如果生成表单配置失败，使用默认值
      formConfig.entityName = convertTableNameToEntityName(tableName)
      formConfig.entityComment = formConfig.entityName
    }
  } catch (error) {
    console.error('加载表结构元数据失败:', error)
    message.error('加载表结构元数据失败')
  } finally {
    loading.value = false
  }
}

// 转换表名为实体类名（移除下划线，首字母大写）
const convertTableNameToEntityName = (tableName: string): string => {
  return tableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

// 处理文件点击
const handleFileClick = (data: any) => {
  if (data.isFile && data.content !== undefined) {
    filePreviewPath.value = data.path || data.label
    filePreviewContent.value = data.content
    filePreviewVisible.value = true
  }
}

// 复制文件内容
const handleCopyContent = () => {
  if (filePreviewContent.value) {
    navigator.clipboard.writeText(filePreviewContent.value).then(() => {
      message.success('内容已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
    })
  }
}

// 下一步
const nextStep = () => {
  if (currentStep.value === 0) {
    if (!connectionForm.connectionId) {
      message.warning('请选择数据库连接')
      return
    }
    if (!tableMetadata.value || formFields.value.length === 0) {
      message.warning('请选择数据库表')
      return
    }
  } else if (currentStep.value === 1) {
    if (!formConfig.entityName) {
      message.warning('请输入实体类名称')
      return
    }
    // 更新查询字段列表（可搜索的字段）
    formConfig.queryFields = formFields.value
      .filter(f => f.searchable)
      .map(f => f.columnName)
  } else if (currentStep.value === 2) {
    if (!codeGenConfig.moduleName) {
      message.warning('请输入模块名称')
      return
    }
    if (!codeGenConfig.packageName) {
      message.warning('请输入包名')
      return
    }
  }
  currentStep.value++
}

// 上一步
const prevStep = () => {
  currentStep.value--
}

// 构建文件树结构（包含文件内容）
const buildFileTreeFromPaths = (files: {
  backend?: Record<string, string>
  frontend?: Record<string, string>
  sql?: Record<string, string>
}): any[] => {
  const tree: any[] = []
  
  // 构建后端文件树
  if (files.backend && Object.keys(files.backend).length > 0) {
    const backendNode = { label: 'backend', children: [] as any[] }
    Object.entries(files.backend).forEach(([filePath, content]) => {
      const parts = filePath.split('/').filter(p => p)
      let current = backendNode.children
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isFile = i === parts.length - 1 && part.includes('.')
        let node = current.find(n => n.label === part)
        if (!node) {
          node = { 
            label: part, 
            isFile, 
            path: isFile ? filePath : undefined,
            content: isFile ? content : undefined,
            children: isFile ? undefined : [] 
          }
          current.push(node)
        }
        if (!isFile && node.children) {
          current = node.children
        }
      }
    })
    tree.push(backendNode)
  }
  
  // 构建前端文件树
  if (files.frontend && Object.keys(files.frontend).length > 0) {
    const frontendNode = { label: 'frontend', children: [] as any[] }
    Object.entries(files.frontend).forEach(([filePath, content]) => {
      const parts = filePath.split('/').filter(p => p)
      let current = frontendNode.children
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isFile = i === parts.length - 1 && part.includes('.')
        let node = current.find(n => n.label === part)
        if (!node) {
          node = { 
            label: part, 
            isFile, 
            path: isFile ? filePath : undefined,
            content: isFile ? content : undefined,
            children: isFile ? undefined : [] 
          }
          current.push(node)
        }
        if (!isFile && node.children) {
          current = node.children
        }
      }
    })
    tree.push(frontendNode)
  }
  
  // 构建SQL文件树
  if (files.sql && Object.keys(files.sql).length > 0) {
    const sqlNode = { label: 'sql', children: [] as any[] }
    Object.entries(files.sql).forEach(([filePath, content]) => {
      // SQL文件路径可能已经是文件名，也可能包含路径
      const parts = filePath.split('/').filter(p => p)
      let current = sqlNode.children
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isFile = i === parts.length - 1 && part.includes('.')
        let node = current.find(n => n.label === part)
        if (!node) {
          node = { 
            label: part, 
            isFile, 
            path: isFile ? filePath : undefined,
            content: isFile ? content : undefined,
            children: isFile ? undefined : [] 
          }
          current.push(node)
        }
        if (!isFile && node.children) {
          current = node.children
        }
      }
    })
    tree.push(sqlNode)
  }
  
  return tree
}

// 获取生成配置
const getGenerateConfig = (): CodeGenConfigInfo => {
  return {
    connectionId: connectionForm.connectionId!,
    tableName: tableMetadata.value.tableName,
    moduleName: codeGenConfig.moduleName,
    packageName: codeGenConfig.packageName,
    author: codeGenConfig.author,
    entityName: formConfig.entityName,
    entityComment: formConfig.entityComment,
    primaryKeyField: formConfig.primaryKeyField,
    queryFields: formConfig.queryFields.length > 0 
      ? formConfig.queryFields 
      : formFields.value.filter(f => f.searchable).map(f => f.columnName),
    enablePagination: codeGenConfig.enablePagination,
    enableLogicDelete: codeGenConfig.enableLogicDelete,
    generateBackend: codeGenConfig.generateBackend,
    generateFrontend: codeGenConfig.generateFrontend,
    generatePermission: codeGenConfig.generatePermission,
    formFields: formFields.value.map(field => ({
      fieldName: field.columnName,
      label: field.columnComment || field.columnName,
      fieldType: field.fieldType,
      required: field.required,
      showInList: field.showInList,
      showInForm: field.showInForm,
      searchable: field.searchable,
      javaType: field.javaType
    }))
  }
}

// 生成代码（预览文件结构）
const handleGenerateCode = async () => {
  if (!tableMetadata.value) {
    message.warning('请先选择数据库表')
    return
  }
  
  const config = getGenerateConfig()
  
  generating.value = true
  fileTree.value = []
  try {
    // 先预览文件结构
    const preview = await previewGeneratedFiles(config)
    fileTree.value = buildFileTreeFromPaths(preview)
    message.success('代码结构预览成功')
  } catch (error: any) {
    console.error('预览代码结构失败:', error)
    message.error(error.message || '预览代码结构失败')
  } finally {
    generating.value = false
  }
}

// 下载ZIP压缩包
const handleDownloadZip = async () => {
  if (!tableMetadata.value) {
    message.warning('请先选择数据库表')
    return
  }
  
  const config = getGenerateConfig()
  downloadLoading.value = true
  try {
    await generateAllCode(config)
    message.success('代码生成成功，ZIP压缩包已开始下载')
  } catch (error: any) {
    console.error('生成代码失败:', error)
    message.error(error.message || '生成代码失败')
  } finally {
    downloadLoading.value = false
  }
}

// 根据数据库类型和Java类型获取前端字段类型
const getFrontendType = (dataType: string, javaType: string): string => {
  if (!dataType && !javaType) return 'input'
  
  const type = (dataType || '').toLowerCase()
  const javaTypeLower = (javaType || '').toLowerCase()
  
  // 根据Java类型判断
  if (javaTypeLower.includes('localdate') || javaTypeLower.includes('date')) {
    return 'date'
  }
  if (javaTypeLower.includes('localtime') || javaTypeLower.includes('datetime')) {
    return 'datetime'
  }
  if (javaTypeLower.includes('boolean')) {
    return 'switch'
  }
  if (javaTypeLower.includes('integer') || javaTypeLower.includes('long') || 
      javaTypeLower.includes('double') || javaTypeLower.includes('float') ||
      javaTypeLower.includes('bigdecimal')) {
    return 'number'
  }
  
  // 根据数据库类型判断
  if (type.includes('text') || type.includes('clob')) {
    return 'textarea'
  }
  if (type.includes('date') || type.includes('time')) {
    return type.includes('time') ? 'datetime' : 'date'
  }
  
  return 'input'
}


onMounted(() => {
  loadConnectionList()
})
</script>

<style scoped>
.codegen-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-content {
  min-height: 300px;
  padding: 20px;
}

.step-actions {
  padding: 20px 0;
}
</style>

