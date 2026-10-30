<template>
  <div class="message-center-page">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>消息中心</span>
          <div class="card-actions">
            <el-button @click="load">刷新</el-button>
            <el-button type="primary" plain @click="handleAllRead">全部已读</el-button>
          </div>
        </div>
      </template>

      <el-table :data="records" border style="width: 100%">
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.readFlag ? 'info' : 'danger'" size="small">
              {{ row.readFlag ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link v-if="messageLink(row)" type="primary" :underline="false" @click="openLink(row)">
              {{ row.title }}
            </el-link>
            <span v-else>{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ typeText(row.msgType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发送人" width="120">
          <template #default="{ row }">
            {{ row.senderName || '系统' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="时间" width="170" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="messageLink(row)" link type="primary" @click="openLink(row)">查看</el-button>
            <el-button v-if="!row.readFlag" link type="primary" @click="handleRead(row)">已读</el-button>
            <el-button link type="danger" @click="handleRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            :page-sizes="[10, 20, 50]"
            v-model:current-page="page"
            v-model:page-size="size"
            @current-change="load"
            @size-change="load"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {inbox, type MessageItem} from '@/api/message.ts'
import {messageLink} from '@/utils/messageLink.ts'
import {useMessageStore} from '@/stores/message.ts'

const messageStore = useMessageStore()
const loading = ref<boolean>(false)
const records = ref<MessageItem[]>([])
const total = ref<number>(0)
const page = ref<number>(1)
const size = ref<number>(10)

const typeText = (type: string): string => {
  if (type === 'NOTICE') return '公告'
  if (type === 'PRIVATE') return '私信'
  return '系统'
}

const load = async (): Promise<void> => {
  loading.value = true
  try {
    const result = await inbox(page.value, size.value)
    records.value = (result?.records || []).map(r => ({...r, senderName: r.senderName || '系统'}))
    total.value = Number(result?.total || 0)
    messageStore.refreshUnread()
  } catch (e) {
    console.error('加载收件箱失败', e)
  } finally {
    loading.value = false
  }
}

const handleRead = async (row: MessageItem): Promise<void> => {
  await messageStore.markRead([row.recipientId])
  await load()
}

const openLink = async (row: MessageItem): Promise<void> => {
  const url = messageLink(row)
  if (!url) return
  if (!row.readFlag && row.recipientId) {
    await messageStore.markRead([row.recipientId])
  }
  window.open(url, '_blank')
  await load()
}

const handleAllRead = async (): Promise<void> => {
  await messageStore.markAllRead()
  await load()
}

const handleRemove = async (row: MessageItem): Promise<void> => {
  await messageStore.remove(row.recipientId)
  await load()
}

onMounted(load)
</script>

<style scoped>
.message-center-page {
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

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
