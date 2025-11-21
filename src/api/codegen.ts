// noinspection TypeScriptUnresolvedReference

import request from './request.ts'
import axios from 'axios'
import { useUserStore } from '@/stores/user'
import { PageResult } from '@/types'

/**
 * 数据库连接信息
 */
export interface DatabaseConnectionInfo {
  id?: string | number
  name: string
  dbType: string
  host: string
  port: number
  username: string
  password?: string
  database: string
  enabled?: boolean
}

/**
 * 表结构元数据
 */
export interface TableMetadataInfo {
  tableName: string
  tableComment?: string
  tableType?: string
  databaseName?: string
  primaryKeys?: string[]
  columns?: ColumnMetadataInfo[]
}

/**
 * 列元数据
 */
export interface ColumnMetadataInfo {
  columnName: string
  dataType: string
  javaType?: string
  columnComment?: string
  primaryKey?: boolean
  nullable?: boolean
  autoIncrement?: boolean
  defaultValue?: string
  size?: number
  decimalDigits?: number
  ordinalPosition?: number
}

/**
 * 表单字段配置
 */
export interface FormFieldConfigInfo {
  fieldName: string
  label?: string
  fieldType?: string
  required?: boolean
  showInList?: boolean
  showInForm?: boolean
  searchable?: boolean
  listWidth?: number
  placeholder?: string
  validationRules?: any[]
  formOrder?: number
  listOrder?: number
  gridSpan?: number
  rowIndex?: number
  dictType?: string
  options?: any[]
}

/**
 * 代码生成配置
 */
export interface CodeGenConfigInfo {
  id?: string | number
  tableName: string
  connectionId: string | number
  moduleName: string
  packageName: string
  author?: string
  entityName: string
  entityComment?: string
  generateBackend?: boolean
  generateFrontend?: boolean
  generatePermission?: boolean
  backendPath?: string
  frontendPath?: string
  enablePagination?: boolean
  enableLogicDelete?: boolean
  formFields?: FormFieldConfigInfo[]
  queryFields?: string[]
  primaryKeyField?: string
}

// ==================== 数据库连接管理 ====================

/**
 * 获取所有数据库连接列表
 */
export function getDatabaseConnectionList(): Promise<DatabaseConnectionInfo[]> {
  return request({
    url: '/codegen/database-connection/list',
    method: 'get'
  })
}

/**
 * 分页查询数据库连接列表
 */
export function getDatabaseConnectionPage(params: {
  current: number
  size: number
  keyword?: string
}): Promise<PageResult<DatabaseConnectionInfo>> {
  return request({
    url: '/codegen/database-connection/page',
    method: 'get',
    params
  })
}

/**
 * 根据ID获取数据库连接详情
 */
export function getDatabaseConnectionById(id: string | number): Promise<DatabaseConnectionInfo> {
  return request({
    url: '/codegen/database-connection/detail',
    method: 'get',
    params: { id }
  })
}

/**
 * 测试数据库连接
 */
export function testDatabaseConnection(data: DatabaseConnectionInfo): Promise<boolean> {
  return request({
    url: '/codegen/database-connection/test',
    method: 'post',
    data
  })
}

/**
 * 新增数据库连接配置
 */
export function saveDatabaseConnection(data: DatabaseConnectionInfo): Promise<void> {
  return request({
    url: '/codegen/database-connection/save',
    method: 'post',
    data
  })
}

/**
 * 更新数据库连接配置
 */
export function updateDatabaseConnection(data: DatabaseConnectionInfo): Promise<void> {
  return request({
    url: '/codegen/database-connection/update',
    method: 'put',
    data
  })
}

/**
 * 删除数据库连接配置
 */
export function deleteDatabaseConnection(id: string | number): Promise<void> {
  return request({
    url: '/codegen/database-connection/delete',
    method: 'delete',
    data: { id }
  })
}

/**
 * 启用/禁用数据库连接配置
 */
export function toggleDatabaseConnectionEnabled(id: string | number, enabled: boolean): Promise<void> {
  return request({
    url: '/codegen/database-connection/toggle-enabled',
    method: 'put',
    params: { id, enabled }
  })
}

// ==================== 数据库元数据管理 ====================

/**
 * 获取数据库中的所有表列表
 */
export function getTableList(connectionId: string | number): Promise<string[]> {
  return request({
    url: '/codegen/metadata/tables',
    method: 'get',
    params: { connectionId }
  })
}

/**
 * 获取表结构元数据
 */
export function getTableMetadata(connectionId: string | number, tableName: string): Promise<TableMetadataInfo> {
  return request({
    url: '/codegen/metadata/table',
    method: 'get',
    params: { connectionId, tableName }
  })
}

/**
 * 获取多个表的结构元数据
 */
export function getTableMetadataList(connectionId: string | number, tableNames: string[]): Promise<TableMetadataInfo[]> {
  return request({
    url: '/codegen/metadata/tables/metadata',
    method: 'post',
    params: { connectionId },
    data: tableNames
  })
}

// ==================== 表单生成管理 ====================

/**
 * 根据表结构生成表单配置
 */
export function generateFormConfig(connectionId: string | number, tableName: string): Promise<CodeGenConfigInfo> {
  return request({
    url: '/codegen/form/generate',
    method: 'post',
    params: { connectionId, tableName }
  })
}

/**
 * 根据表结构元数据生成表单字段配置
 */
export function generateFormFields(metadata: TableMetadataInfo): Promise<FormFieldConfigInfo[]> {
  return request({
    url: '/codegen/form/generate-fields',
    method: 'post',
    data: metadata
  })
}

/**
 * 保存或更新表单配置
 */
export function saveFormConfig(data: CodeGenConfigInfo): Promise<void> {
  return request({
    url: '/codegen/form/save',
    method: 'post',
    data
  })
}

/**
 * 获取表单配置
 */
export function getFormConfig(connectionId: string | number, tableName: string): Promise<CodeGenConfigInfo> {
  return request({
    url: '/codegen/form/config',
    method: 'get',
    params: { connectionId, tableName }
  })
}

/**
 * 根据ID获取表单配置
 */
export function getFormConfigById(id: string | number): Promise<CodeGenConfigInfo> {
  return request({
    url: `/codegen/form/config/${id}`,
    method: 'get'
  })
}

/**
 * 更新表单字段配置（用于布局调整）
 */
export function updateFormFields(connectionId: string | number, tableName: string, formFields: FormFieldConfigInfo[]): Promise<void> {
  return request({
    url: '/codegen/form/fields',
    method: 'put',
    params: { connectionId, tableName },
    data: formFields
  })
}

/**
 * 调整表单布局（批量更新字段的布局信息）
 */
export function adjustFormLayout(connectionId: string | number, tableName: string, formFields: FormFieldConfigInfo[]): Promise<void> {
  return request({
    url: '/codegen/form/layout',
    method: 'put',
    params: { connectionId, tableName },
    data: formFields
  })
}

// ==================== 代码生成管理 ====================

/**
 * 生成后端代码
 */
export function generateBackendCode(data: CodeGenConfigInfo): Promise<Record<string, string>> {
  return request({
    url: '/codegen/generator/backend',
    method: 'post',
    data
  })
}

/**
 * 生成前端代码
 */
export function generateFrontendCode(data: CodeGenConfigInfo): Promise<Record<string, string>> {
  return request({
    url: '/codegen/generator/frontend',
    method: 'post',
    data
  })
}

/**
 * 生成权限SQL
 */
export function generatePermissionSql(data: CodeGenConfigInfo): Promise<string> {
  return request({
    url: '/codegen/generator/permission',
    method: 'post',
    data
  })
}

/**
 * 预览生成的文件路径和内容
 */
export function previewGeneratedFiles(data: CodeGenConfigInfo): Promise<{
  backend?: Record<string, string>
  frontend?: Record<string, string>
  sql?: Record<string, string>
}> {
  return request({
    url: '/codegen/generator/preview',
    method: 'post',
    data
  })
}

/**
 * 生成所有代码（后端、前端、权限SQL）并下载ZIP压缩包
 */
export function generateAllCode(data: CodeGenConfigInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    const userStore = useUserStore()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (userStore.token) {
      headers.Authorization = `Bearer ${userStore.token}`
    }
    
    axios({
      baseURL: '/api',
      url: '/codegen/generator/all',
      method: 'post',
      data,
      responseType: 'blob', // 指定响应类型为blob（二进制数据）
      headers
    })
      .then((response: any) => {
        // 检查响应类型，如果是JSON错误响应，先解析错误信息
        const contentType = response.headers['content-type'] || ''
        if (contentType.includes('application/json')) {
          // 是JSON错误响应，解析错误信息
          response.data.text().then((text: string) => {
            try {
              const errorData = JSON.parse(text)
              reject(new Error(errorData.message || '生成代码失败'))
            } catch {
              reject(new Error('生成代码失败'))
            }
          })
          return
        }
        
        // 创建blob对象
        const blob = new Blob([response.data], { type: 'application/zip' })
        // 创建下载链接
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        // 从响应头获取文件名，如果没有则使用默认文件名
        const contentDisposition = response.headers['content-disposition'] || ''
        let fileName = `${data.moduleName}_${data.entityName}_${Date.now()}.zip`
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''))
          }
        }
        
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        resolve()
      })
      .catch((error: any) => {
        // 如果是blob类型的错误响应，尝试读取错误信息
        if (error.response && error.response.data instanceof Blob) {
          error.response.data.text().then((text: string) => {
            try {
              const errorData = JSON.parse(text)
              reject(new Error(errorData.message || '生成代码失败'))
            } catch {
              reject(new Error('生成代码失败'))
            }
          })
        } else {
          reject(error)
        }
      })
  })
}

