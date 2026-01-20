import request from './request.ts'
import type { PageParams, PageResult } from '@/types'

// 模型列表项
export interface FlowableModelListItem {
  id: number
  modelKey: string
  modelName: string
  category: string
  version: number
  modelStatus: number
  remark?: string
  createTime?: string
  updateTime?: string
  endTime?: string
}


// 模型详情
export interface FlowableModelDetail {
  id: number
  modelKey: string
  modelName: string
  category: string
  version: number
  modelStatus: number
  bpmnXml: string
  nodeActions?: any[]
  nodeActionsJson?: string
  formJson?: string
  remark?: string
  createTime?: string
  updateTime?: string
  endTime?: string
}


// 保存模型
export interface ModelSaveDTO {
  id?: number
  modelKey: string
  modelName: string
  category?: string
  bpmnXml: string
  formJson?: string
  nodeActions?: any[]
  remark?: string
  endTime: string
}


// 发布模型
export interface ModelPublishDTO {
  id: number
}

// 获取模型列表
export function getModelList(params: PageParams): Promise<PageResult<FlowableModelListItem>> {
  return request({
    url: '/flowable/model/list',
    method: 'get',
    params
  })
}

// 获取模型版本列表
export function getModelVersions(modelKey: string): Promise<FlowableModelListItem[]> {
  return request({
    url: '/flowable/model/versions',
    method: 'get',
    params: { modelKey }
  })
}

// 获取模型详情
export function getModelDetail(id: number): Promise<FlowableModelDetail> {
  return request({
    url: '/flowable/model/detail',
    method: 'get',
    params: { id }
  })
}


// 保存模型
export function saveModel(data: ModelSaveDTO): Promise<number> {
  return request({
    url: '/flowable/model/save',
    method: 'post',
    data
  })
}

// 发布模型
export function publishModel(data: ModelPublishDTO): Promise<boolean> {
  return request({
    url: '/flowable/model/publish',
    method: 'post',
    data
  })
}

// 回退模型版本（生成新草稿版本）
export function rollbackModel(data: { modelKey: string; version: number }): Promise<boolean> {
  return request({
    url: '/flowable/model/rollback',
    method: 'post',
    data
  })
}

// 获取BPMN XML
export function getBpmnXml(id: number): Promise<string> {
  return request({
    url: '/flowable/model/bpmn',
    method: 'get',
    params: { id }
  })
}

// 删除模型
export function deleteModel(id: number): Promise<boolean> {
  return request({
    url: '/flowable/model/delete',
    method: 'delete',
    data: { id }
  })
}
