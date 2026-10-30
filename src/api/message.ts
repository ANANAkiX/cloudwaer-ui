import request from './request.ts'

export interface MessageItem {
    recipientId: string
    messageId: string
    msgType: 'NOTICE' | 'SYSTEM' | 'PRIVATE'
    title: string
    content?: string
    bizType?: string
    bizId?: string
    senderName?: string
    readFlag: number
    createTime?: string
}

export interface MessagePage {
    records: MessageItem[]
    total: number
    current: number
    size: number
}

/**
 * 未读数
 */
export function unreadCount(): Promise<number> {
    return request({
        url: '/message/unread-count',
        method: 'get'
    })
}

/**
 * 收件箱分页
 */
export function inbox(page = 1, size = 10): Promise<MessagePage> {
    return request({
        url: '/message/inbox',
        method: 'get',
        params: {page, size}
    })
}

/**
 * 批量已读
 */
export function markRead(recipientIds: string[]): Promise<boolean> {
    return request({
        url: '/message/read',
        method: 'put',
        data: recipientIds
    })
}

/**
 * 全部已读
 */
export function markAllRead(): Promise<boolean> {
    return request({
        url: '/message/read-all',
        method: 'put'
    })
}

/**
 * 删除收件箱条目
 */
export function removeMessage(recipientId: string): Promise<boolean> {
    return request({
        url: `/message/${recipientId}`,
        method: 'delete'
    })
}
