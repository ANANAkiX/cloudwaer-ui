<template>
  <el-popover placement="bottom-end" width="320" trigger="click">
    <template #reference>
      <button class="header-action-btn" type="button">
        <el-badge :value="messageStore.unreadCount" :max="99"
                  :type="messageStore.unreadCount > 0 ? 'danger' : 'info'">
          <el-icon><Bell /></el-icon>
        </el-badge>
      </button>
    </template>
    <div class="bell-panel">
      <div class="bell-head">
        <span>消息</span>
        <el-button v-if="messageStore.unreadCount" link type="primary" size="small" @click="readAll">全部已读</el-button>
      </div>
      <div v-if="!messageStore.recent.length" class="bell-empty">暂无新消息</div>
      <div v-else class="bell-list">
        <div v-for="item in messageStore.recent" :key="item.messageId" class="bell-item" @click="openItem(item)">
          <span class="bell-dot" :class="{unread: !item.readFlag}" />
          <span class="bell-title">{{ item.title }}</span>
        </div>
      </div>
      <div class="bell-foot">
        <el-button link type="primary" size="small" @click="goCenter">查看全部</el-button>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import {useRouter} from 'vue-router'
import {useMessageStore} from '@/stores/message.ts'
import {messageLink} from '@/utils/messageLink.ts'
import type {MessageItem} from '@/api/message.ts'

const router = useRouter()
const messageStore = useMessageStore()

const readAll = async (): Promise<void> => {
  await messageStore.markAllRead()
}

const openItem = (item: MessageItem): Promise<void> | void => {
  if (!item.readFlag && item.recipientId) {
    messageStore.markRead([item.recipientId])
  }
  const url = messageLink(item)
  if (url) {
    window.open(url, '_blank')
    return
  }
  goCenter()
}

const goCenter = (): void => {
  router.push('/message/messagecenter')
}
</script>

<style scoped>
.bell-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bell-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.bell-empty {
  color: var(--el-text-color-secondary);
  text-align: center;
  padding: 16px 0;
  font-size: 13px;
}

.bell-list {
  display: flex;
  flex-direction: column;
  max-height: 260px;
  overflow: auto;
}

.bell-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  cursor: pointer;
  border-radius: 4px;
}

.bell-item:hover {
  background: var(--el-fill-color-light);
}

.bell-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  flex: none;
}

.bell-dot.unread {
  background: var(--el-color-danger);
}

.bell-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bell-foot {
  text-align: center;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 6px;
}
</style>
