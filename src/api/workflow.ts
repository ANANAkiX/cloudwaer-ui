import request from './request.ts'
import type { PageParams, PageResult } from '@/types'

// ===== 类型定义 =====

/** 流程节点 */
export interface WorkflowNode {
  id?: string | number
  nodeId: string
  nodeName: string
  nodeType: 'start' | 'end' | 'user_task' | 'cc' | 'condition' | 'parallel' | 'timer' | 'trigger' | 'service' | 'sub_process'
  assigneeType?: 'user' | 'role' | 'dept' | 'variable' | 'initiator' | 'leader'
  assigneeVal?: string
  multiType?: 'any' | 'countersign' | 'or_sign'
  multiCount?: number
  dueHours?: number
  formJson?: string
  actionJson?: string
  listenerJson?: string
  configJson?: string
  sortOrder?: number
  x?: number
  y?: number
}

/** 流程连线 */
export interface WorkflowEdge {
  id?: string | number
  edgeId: string
  sourceId: string
  targetId: string
  edgeName?: string
  edgeCondition?: string
  sortOrder?: number
}

/** 流程定义 */
export interface WorkflowDef {
  id?: string | number
  defKey: string
  defName: string
  category?: string
  version?: number
  defStatus?: number
  dslJson?: string
  formId?: string | number
  formKey?: string
  endTime?: string
  remark?: string
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
  createTime?: string
  updateTime?: string
}

/** 流程实例 */
export interface WorkflowInstance {
  id?: string | number
  instanceId: string
  defId?: string | number
  defKey: string
  defVersion?: number
  defName?: string
  businessKey?: string
  title?: string
  formJson?: string
  instStatus?: number
  statusDesc?: string
  priority?: string
  dueTime?: string
  startUser?: string
  startTime?: string
  endTime?: string
  currentNodes?: string
  varsJson?: string
}

/** 用户任务 */
export interface WorkflowTask {
  id?: string | number
  taskId: string
  instanceId: string
  defId?: string | number
  defKey: string
  defName?: string
  nodeId: string
  nodeName?: string
  taskName?: string
  taskStatus?: number
  statusDesc?: string
  assignee?: string
  candidateUsers?: string
  candidateGroups?: string
  multiType?: string
  formJson?: string
  comment?: string
  result?: string
  dueTime?: string
  claimTime?: string
  completeTime?: string
  durationMs?: number
  createTime?: string
  startUser?: string
}

/** 表单定义 */
export interface WorkflowForm {
  id?: string | number
  formKey: string
  formName: string
  category?: string
  version?: number
  formStatus?: number
  schemaJson?: string
  remark?: string
  createTime?: string
  updateTime?: string
}

/** 历史记录 */
export interface WorkflowHistory {
  id?: string | number
  instanceId: string
  taskId?: string
  nodeId?: string
  nodeName?: string
  nodeType?: string
  action: string
  operator?: string
  detail?: string
  result?: string
  durationMs?: number
  createTime?: string
}

/** 任务操作请求 */
export interface TaskCompletePayload {
  taskId: string
  action?: 'approve' | 'reject' | 'transfer' | 'return' | 'countersign' | 'cc'
  comment?: string
  targetUser?: string
  formJson?: string
  variables?: Record<string, any>
}

/** 启动流程请求 */
export interface ProcessStartPayload {
  defKey: string
  businessKey?: string
  title?: string
  formJson?: string
  priority?: string
  variables?: Record<string, any>
}

// ===== 流程定义 API =====

export function getWorkflowDefs(params: PageParams & { category?: string; keyword?: string }) {
  return request.get<PageResult<WorkflowDef>>('/workflow/definition/list', { params })
}

export function getWorkflowDefDetail(id: string | number) {
  return request.get<WorkflowDef>('/workflow/definition/detail', { params: { id } })
}

export function getWorkflowDefVersions(defKey: string) {
  return request.get<WorkflowDef[]>('/workflow/definition/versions', { params: { defKey } })
}

export function saveWorkflowDef(data: WorkflowDef) {
  return request.post<string | number>('/workflow/definition/save', data)
}

export function publishWorkflowDef(id: string | number) {
  return request.post<boolean>('/workflow/definition/publish', null, { params: { id } })
}

export function offlineWorkflowDef(id: string | number) {
  return request.post<boolean>('/workflow/definition/offline', null, { params: { id } })
}

export function deleteWorkflowDef(id: string | number) {
  return request.delete<boolean>('/workflow/definition/delete', { params: { id } })
}

// ===== 流程实例 API =====

export function startWorkflow(payload: ProcessStartPayload) {
  return request.post<string>('/workflow/instance/start', payload)
}

export function getStartedInstances(params: PageParams) {
  return request.get<PageResult<WorkflowInstance>>('/workflow/instance/started', { params })
}

export function getWorkflowInstances(params: PageParams & { status?: string; keyword?: string }) {
  return request.get<PageResult<WorkflowInstance>>('/workflow/instance/list', { params })
}

export function getWorkflowInstanceDetail(instanceId: string) {
  return request.get<WorkflowInstance>('/workflow/instance/detail', { params: { instanceId } })
}

export function suspendWorkflowInstance(instanceId: string) {
  return request.post<boolean>('/workflow/instance/suspend', null, { params: { instanceId } })
}

export function activateWorkflowInstance(instanceId: string) {
  return request.post<boolean>('/workflow/instance/activate', null, { params: { instanceId } })
}

export function terminateWorkflowInstance(instanceId: string) {
  return request.post<boolean>('/workflow/instance/terminate', null, { params: { instanceId } })
}

export function restartWorkflowInstance(instanceId: string) {
  return request.post<boolean>('/workflow/instance/restart', null, { params: { instanceId } })
}

export function deleteWorkflowInstance(instanceId: string) {
  return request.delete<boolean>('/workflow/instance/delete', { params: { instanceId } })
}

export function getWorkflowNodeForm(instanceId: string, nodeId: string) {
  return request.get<{ formId: any; formSchema: string | null; formData: string | null }>(
    '/workflow/instance/node-form', { params: { instanceId, nodeId } })
}

export function getWorkflowHistory(instanceId: string) {
  return request.get<WorkflowHistory[]>('/workflow/instance/history', { params: { instanceId } })
}

// ===== 抄送 API =====

export interface WorkflowCcRecord {
  id: number
  instanceId: string
  defKey: string
  defName?: string
  title?: string
  nodeId?: string
  ccType?: string
  ccTarget?: string
  ccBy?: string
  createTime?: string
  readStatus?: number
  readTime?: string
  instStatus?: number
  statusDesc?: string
}

export function getMyCcRecords(params: PageParams) {
  return request.get<PageResult<WorkflowCcRecord>>('/workflow/cc/list', { params })
}

export function markCcRead(id: number) {
  return request.post<boolean>('/workflow/cc/read', null, { params: { id } })
}

export function markAllCcRead() {
  return request.post<boolean>('/workflow/cc/read-all')
}

// ===== 用户任务 API =====

export function getTodoTasks(params: PageParams) {
  return request.get<PageResult<WorkflowTask>>('/workflow/task/todo', { params })
}

export function getDoneTasks(params: PageParams) {
  return request.get<PageResult<WorkflowTask>>('/workflow/task/done', { params })
}

export function getTasksByInstance(instanceId: string) {
  return request.get<PageResult<WorkflowTask>>('/workflow/task/by-instance', { params: { instanceId } })
}

export function getWorkflowTaskDetail(taskId: string) {
  return request.get<WorkflowTask>('/workflow/task/detail', { params: { taskId } })
}

export function claimWorkflowTask(taskId: string) {
  return request.post<boolean>('/workflow/task/claim', null, { params: { taskId } })
}

export function completeWorkflowTask(payload: TaskCompletePayload) {
  return request.post<boolean>('/workflow/task/complete', payload)
}

export function deleteWorkflowTask(taskId: string) {
  return request.delete<boolean>('/workflow/task/delete', { params: { taskId } })
}

// ===== 表单 API =====

export function getWorkflowForms(params: PageParams & { category?: string; keyword?: string }) {
  return request.get<PageResult<WorkflowForm>>('/workflow/form/list', { params })
}

export function getWorkflowFormDetail(id: string | number) {
  return request.get<WorkflowForm>('/workflow/form/detail', { params: { id } })
}

/** 可用监听器目录（key → 显示名，供设计器下拉） */
export function getListenerCatalog() {
  return request.get<Record<string, string>>('/workflow/listener/catalog')
}

export function saveWorkflowForm(data: WorkflowForm) {
  return request.post<string | number>('/workflow/form/save', data)
}

export function deleteWorkflowForm(id: string | number) {
  return request.delete<boolean>('/workflow/form/delete', { params: { id } })
}
