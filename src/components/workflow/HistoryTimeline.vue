<template>
  <div class="history-timeline">
    <el-timeline>
      <el-timeline-item
        v-for="item in history"
        :key="item.id"
        :timestamp="formatTime(item.createTime)"
        :type="getTimelineType(item.action)"
        :hollow="item.action === 'wait'"
        placement="top"
      >
        <div class="timeline-content">
          <div class="timeline-header">
            <el-tag :type="getTagType(item.action)" size="small">{{ getActionLabel(item.action) }}</el-tag>
            <span class="timeline-operator">{{ item.operator || '系统' }}</span>
          </div>
          <div v-if="item.nodeName || item.nodeId" class="timeline-node">
            <el-icon><Connection /></el-icon> {{ item.nodeName || item.nodeId }}
          </div>
          <div v-if="item.detail" class="timeline-detail">{{ item.detail }}</div>
          <div v-if="item.durationMs" class="timeline-duration">
            耗时: {{ formatDuration(item.durationMs) }}
          </div>
        </div>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup lang="ts">
import { Connection } from '@element-plus/icons-vue'
import type { WorkflowHistory } from '@/api/workflow'

defineProps<{
  history: WorkflowHistory[]
}>()

function formatTime(time?: string): string {
  if (!time) return ''
  return time.replace('T', ' ').substring(0, 19)
}

function getTimelineType(action: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, any> = {
    start: 'primary',
    create: 'primary',
    claim: 'info',
    approve: 'success',
    reject: 'danger',
    transfer: 'warning',
    return: 'warning',
    cc: 'info',
    end: 'success',
    branch_end: 'info',
    join_arrive: 'info',
    join_pass: 'success',
    restart: 'warning',
    timer_fire: 'warning',
    error: 'danger'
  }
  return map[action] || 'info'
}

function getTagType(action: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  return getTimelineType(action)
}

function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    start: '发起',
    create: '创建',
    claim: '认领',
    approve: '同意',
    reject: '驳回',
    transfer: '转办',
    return: '退回',
    cc: '抄送',
    end: '结束',
    branch_end: '分支完成',
    join_arrive: '分支到达',
    join_pass: '汇聚放行',
    restart: '重新发起',
    timer_fire: '定时触发',
    wait: '等待处理',
    error: '异常'
  }
  return map[action] || action
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分${seconds % 60}秒`
  const hours = Math.floor(minutes / 60)
  return `${hours}小时${minutes % 60}分`
}
</script>

<style scoped>
.history-timeline {
  padding: 12px;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-operator {
  font-size: 13px;
  color: var(--cw-text);
  font-weight: 500;
}

.timeline-node {
  font-size: 12px;
  color: var(--cw-control-text);
  display: flex;
  align-items: center;
  gap: 4px;
}

.timeline-detail {
  font-size: 12px;
  color: var(--cw-control-text);
  background: color-mix(in srgb, var(--cw-text) 6%, var(--cw-surface));
  padding: 6px 10px;
  border-radius: 4px;
}

.timeline-duration {
  font-size: 11px;
  color: var(--cw-control-text);
}
</style>
