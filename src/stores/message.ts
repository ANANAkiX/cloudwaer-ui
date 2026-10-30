import {defineStore} from 'pinia'
import {connectWs, disconnectWs} from '@/utils/ws.ts'
import {inbox, markAllRead, markRead, removeMessage, unreadCount, type MessageItem} from '@/api/message.ts'

interface MessageState {
    unreadCount: number
    connected: boolean
    /** 通道启停门闩：登出后关闭，阻断 WS 回调触发的 REST（登出竞态） */
    active: boolean
    /** 最近消息（铃铛下拉预览用，实时追加） */
    recent: MessageItem[]
}

export const useMessageStore = defineStore('message', {
    state: (): MessageState => ({
        unreadCount: 0,
        connected: false,
        active: false,
        recent: []
    }),
    actions: {
        /**
         * 接入实时通道（登录后调用）：WS 推送为主，REST 兜底对账
         */
        connect(): void {
            this.active = true
            connectWs({
                onEnvelope: env => {
                    if (env.type === 'unread') {
                        this.unreadCount = Number(env.payload?.count ?? 0) || 0
                        return
                    }
                    if (env.type === 'message') {
                        const payload = env.payload || {}
                        if (payload.unreadCount != null) {
                            this.unreadCount = Number(payload.unreadCount) || 0
                        }
                        this.recent.unshift({
                            recipientId: String(payload.recipientId ?? ''),
                            messageId: String(payload.messageId ?? ''),
                            msgType: (payload.msgType as MessageItem['msgType']) || 'SYSTEM',
                            title: String(payload.title ?? ''),
                            senderName: String(payload.senderName ?? '') || '系统',
                            bizType: payload.bizType,
                            bizId: payload.bizId,
                            readFlag: 0,
                            createTime: payload.createTime
                        })
                        this.recent = this.recent.slice(0, 10)
                    }
                },
                onStatus: connected => {
                    if (!this.active) return
                    this.connected = connected
                    if (!connected) {
                        // 断线重连后 REST 对账（WS 只是快通道，DB 是事实源）
                        this.refreshUnread()
                    }
                }
            })
            this.refreshUnread()
            this.refreshRecent()
        },
        disconnect(): void {
            // 先关闸再断连：WS onclose 异步回调不得再触发 REST（登出竞态会 401 刷错误提示）
            this.active = false
            disconnectWs()
            this.connected = false
            this.unreadCount = 0
            this.recent = []
        },
        async refreshUnread(): Promise<void> {
            if (!this.active || !localStorage.getItem('token')) return
            try {
                this.unreadCount = Number(await unreadCount()) || 0
            } catch (e) {
                console.error('拉取未读数失败', e)
            }
        },
        /** 铃铛下拉预览：拉最近 5 条（WS 只推增量，存量靠 REST 补齐） */
        async refreshRecent(): Promise<void> {
            if (!this.active || !localStorage.getItem('token')) return
            try {
                const page = await inbox(1, 5)
                this.recent = (page?.records || []).map(item => ({...item, senderName: item.senderName || '系统'}))
            } catch (e) {
                console.error('拉取最近消息失败', e)
            }
        },
        async markRead(ids: string[]): Promise<void> {
            await markRead(ids)
            for (const item of this.recent) {
                if (ids.includes(item.recipientId)) {
                    item.readFlag = 1
                }
            }
            await this.refreshUnread()
        },
        async markAllRead(): Promise<void> {
            await markAllRead()
            this.recent = []
            await this.refreshUnread()
        },
        async remove(recipientId: string): Promise<void> {
            await removeMessage(recipientId)
            this.recent = this.recent.filter(item => item.recipientId !== recipientId)
            await this.refreshUnread()
        }
    }
})
