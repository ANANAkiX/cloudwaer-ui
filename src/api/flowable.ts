import request from './request.ts'
import type { PageParams, PageResult } from '@/types'

/**
 * Flowable 节点动作配置
 */
export interface FlowableNodeAction {
  nodeId: string
  nodeName: string
  eventType: string
  actionType: string
  actionConfig: string
}

/**
 * Flowable 模型列表项
 */
export interface FlowableModelListItem {
  id: string | number
  modelKey: string
  modelName: string
  category?: string
  version?: number
  modelStatus?: number
  updateTime?: string
  endTime?: string
}

export interface FlowableModelDetail {
  id?: string | number
  modelKey: string
  modelName: string
  category?: string
  version?: number
  modelStatus?: number
  remark?: string
  bpmnXml?: string
  nodeActions?: FlowableNodeAction[]
  formJson?: string
  isExecutable?: boolean
  updateTime?: string
  endTime?: string
}

export interface FlowableProcessDefinition {
  id: string
  processKey: string
  processName: string
  category: string
  version: number
  description?: string
  diagram?: string
  instanceCount?: number
  avgDuration?: string
  endTime?: string
  createTime?: string
  updateTime?: string
  formJson?: string
  formFields?: FormField[]
}


export interface FormField {
  id: string
  label: string
  type: 'input' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'radio' | 'checkbox' | 'upload'
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  precision?: number
  options?: { label: string; value: any }[]
  tip?: string
}

export interface FlowableProcessInstance {
  id: string
  processDefinitionKey: string
  processDefinitionName?: string
  businessKey?: string
  startTime?: string
  endTime?: string
  status?: string
  starter?: string
  dueTime?: string
}

export interface FlowableTaskItem {
  id: string
  name?: string
  taskDefinitionKey?: string
  processInstanceId?: string
  processDefinitionKey?: string
  processDefinitionName?: string
  businessKey?: string
  assignee?: string
  createTime?: string
  endTime?: string
  status?: string
  priority?: string
  dueTime?: string
}

export function getFlowableModelsByPage(params: PageParams): Promise<PageResult<FlowableModelListItem>> {
  return request({
    url: '/flowable/model/list',
    method: 'get',
    params
  })
}

export function getFlowableModelDetail(id: string | number): Promise<FlowableModelDetail> {
  return request({
    url: '/flowable/model/detail',
    method: 'get',
    params: { id }
  })
}

export function saveFlowableModel(data: FlowableModelDetail): Promise<string | number> {
  return request({
    url: '/flowable/model/save',
    method: 'post',
    data
  })
}

export function deleteFlowableModel(id: string | number): Promise<boolean> {
  return request({
    url: '/flowable/model/delete',
    method: 'delete',
    data: { id }
  })
}

export function publishFlowableModel(id: string | number): Promise<boolean> {
  return request({
    url: '/flowable/model/publish',
    method: 'post',
    data: { id }
  })
}

export function copyFlowableModel(payload: { sourceId: string | number; newModelKey?: string; newModelName?: string }): Promise<boolean> {
  return request({
    url: '/flowable/model/copy',
    method: 'post',
    data: payload
  })
}

export function rollbackFlowableModel(payload: { modelKey: string; version: number }): Promise<boolean> {
  return request({
    url: '/flowable/model/rollback',
    method: 'post',
    data: payload
  })
}

export function getProcessDefinitions(params: PageParams & { 
  category?: string
  keyword?: string 
}): Promise<PageResult<FlowableProcessDefinition>> {
  return request({
    url: '/flowable/definition/list',
    method: 'get',
    params
  })
}

export function getProcessDefinitionDetail(id: string): Promise<FlowableProcessDefinition> {
  return request({
    url: '/flowable/definition/detail',
    method: 'get',
    params: { id }
  })
}

export function startFlowableProcess(payload: {
  processDefinitionKey: string
  businessKey?: string
  variables?: Record<string, any>
}): Promise<string> {
  return request({
    url: '/flowable/process/start',
    method: 'post',
    data: payload
  })
}

export function getStartedProcessByPage(params: PageParams): Promise<PageResult<FlowableProcessInstance>> {
  return request({
    url: '/flowable/process/started',
    method: 'get',
    params
  })
}

export function getProcessInstances(params: PageParams & { keyword?: string; status?: string }): Promise<PageResult<FlowableProcessInstance>> {
  return request({
    url: '/flowable/process/started',
    method: 'get',
    params
  })
}

export function getFlowableProcessDetail(id: string): Promise<FlowableProcessInstance> {
  return request({
    url: '/flowable/process/detail',
    method: 'get',
    params: { id }
  })
}

export function deleteFlowableProcess(id: string): Promise<boolean> {
  return request({
    url: '/flowable/process/delete',
    method: 'delete',
    data: { processInstanceId: id }
  })
}

export function suspendFlowableProcess(id: string): Promise<boolean> {
  return request({
    url: '/flowable/process/suspend',
    method: 'post',
    params: { processInstanceId: id }
  })
}

export function activateFlowableProcess(id: string): Promise<boolean> {
  return request({
    url: '/flowable/process/activate',
    method: 'post',
    params: { processInstanceId: id }
  })
}

export function restartFlowableProcess(id: string): Promise<boolean> {
  return request({
    url: '/flowable/process/restart',
    method: 'post',
    params: { processInstanceId: id }
  })
}

export function terminateFlowableProcess(id: string): Promise<boolean> {
  return request({
    url: '/flowable/process/terminate',
    method: 'post',
    params: { processInstanceId: id }
  })
}

export function getProcessDiagram(id: string): Promise<string> {
  return request({
    url: '/flowable/process/diagram',
    method: 'get',
    params: { processInstanceId: id }
  })
}

export function getProcessBpmnXml(id: string): Promise<string> {
  return request({
    url: '/flowable/process/bpmn',
    method: 'get',
    params: { processInstanceId: id }
  })
}

export function getProcessVariables(id: string): Promise<Array<{ name: string; type: string; value: any; createTime?: string }>> {
  return request({
    url: '/flowable/process/variables',
    method: 'get',
    params: { processInstanceId: id }
  })
}

export function getProcessHistory(id: string): Promise<Array<{ id: string; userName: string; action: string; time: string; endTime?: string; duration: string; comment: string; type?: string }>> {
  return request({
    url: '/flowable/process/history',
    method: 'get',
    params: { processInstanceId: id }
  })
}

export function getProcessHighlight(id: string): Promise<{ activeActivityIds: string[]; completedActivityIds: string[]; completedFlowIds: string[] }> {
  return request({
    url: '/flowable/process/highlight',
    method: 'get',
    params: { processInstanceId: id }
  })
}

export function getTodoTasksByPage(params: PageParams): Promise<PageResult<FlowableTaskItem>> {
  return request({
    url: '/flowable/task/todo',
    method: 'get',
    params
  })
}

export function getDoneTasksByPage(params: PageParams): Promise<PageResult<FlowableTaskItem>> {
  return request({
    url: '/flowable/task/done',
    method: 'get',
    params
  })
}

export function claimFlowableTask(taskId: string): Promise<boolean> {
  return request({
    url: '/flowable/task/claim',
    method: 'post',
    data: { taskId }
  })
}

export function completeFlowableTask(payload: {
  taskId: string
  comment?: string
  variables?: Record<string, any>
}): Promise<boolean> {
  return request({
    url: '/flowable/task/complete',
    method: 'post',
    data: payload
  })
}

export function getFlowableTaskDetail(id: string): Promise<FlowableTaskItem> {
  return request({
    url: '/flowable/task/detail',
    method: 'get',
    params: { id }
  })
}

export function deleteFlowableTask(id: string): Promise<boolean> {
  return request({
    url: '/flowable/task/delete',
    method: 'delete',
    data: { taskId: id }
  })
}

// 节点动作相关API
export function saveNodeAction(data: FlowableNodeAction): Promise<boolean> {
  return request({
    url: '/node-action/save',
    method: 'post',
    data
  })
}

export function batchSaveNodeActions(data: FlowableNodeAction[]): Promise<boolean> {
  return request({
    url: '/node-action/batch-save',
    method: 'post',
    data
  })
}

export function deleteNodeAction(id: string | number): Promise<boolean> {
  return request({
    url: '/node-action/delete/' + id,
    method: 'delete'
  })
}

export function getNodeActions(params: {
  modelKey: string
  modelVersion: number
  nodeId?: string
  eventType: string
}): Promise<FlowableNodeAction[]> {
  return request({
    url: '/node-action/list',
    method: 'get',
    params
  })
}

export function getNodeActionsByModelId(modelId: string | number): Promise<FlowableNodeAction[]> {
  return request({
    url: '/node-action/model/' + modelId,
    method: 'get'
  })
}

export function updateNodeActionStatus(id: string | number, enabled: number): Promise<boolean> {
  return request({
    url: '/node-action/status/' + id,
    method: 'put',
    params: { enabled }
  })
}

export function getNodeActionConfig(params: {
  processDefinitionId: string
  nodeId: string
}): Promise<string> {
  return request({
    url: '/node-action/config',
    method: 'get',
    params
  })
}

// BPMN部署相关API
export interface BpmnDeployRequest {
  bpmnXml: string
  deploymentName: string
  category: string
}

export interface BpmnDeployWithActionsRequest {
  bpmnXml: string
  deploymentName: string
  category: string
  nodeActions: FlowableNodeAction[]
}

export interface BpmnUpdateRequest {
  bpmnXml: string
  deploymentName: string
  category: string
  processKey: string
}

export function deployBpmn(data: BpmnDeployRequest): Promise<any> {
  return request({
    url: '/bpmn-deploy/deploy',
    method: 'post',
    data
  })
}

export function deployBpmnWithActions(data: BpmnDeployWithActionsRequest): Promise<any> {
  return request({
    url: '/bpmn-deploy/deploy-with-actions',
    method: 'post',
    data
  })
}

export function updateBpmn(data: BpmnUpdateRequest): Promise<any> {
  return request({
    url: '/bpmn-deploy/update',
    method: 'post',
    data
  })
}

export function deleteDeployment(deploymentId: string): Promise<boolean> {
  return request({
    url: '/bpmn-deploy/delete/' + deploymentId,
    method: 'delete'
  })
}

export function getDeploymentDetail(deploymentId: string): Promise<any> {
  return request({
    url: '/bpmn-deploy/detail/' + deploymentId,
    method: 'get'
  })
}

export function extractBpmnNodes(bpmnXml: string): Promise<string[]> {
  return request({
    url: '/bpmn-deploy/extract-nodes',
    method: 'post',
    data: { bpmnXml }
  })
}

export function extractUserTasks(bpmnXml: string): Promise<string[]> {
  return request({
    url: '/bpmn-deploy/extract-user-tasks',
    method: 'post',
    data: { bpmnXml }
  })
}

export function validateBpmnXml(bpmnXml: string): Promise<boolean> {
  return request({
    url: '/bpmn-deploy/validate',
    method: 'post',
    data: { bpmnXml }
  })
}

export function generateProcessDiagram(processDefinitionId: string): Promise<string> {
  return request({
    url: '/bpmn-deploy/diagram/' + processDefinitionId,
    method: 'get'
  })
}
