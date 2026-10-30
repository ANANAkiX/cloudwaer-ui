import type {MessageItem} from '@/api/message.ts'

/**
 * 站内信跳转链接映射（约定：bizType=跳转目标类型，bizId=目标 id）。
 *
 * - blog_article → 博客文章详情 /article/{bizId}
 * - blog_profile → 博客个人主页 /profile
 * 未识别或缺 bizId 返回 null（点击进入消息中心）。
 */

const blogOrigin = (): string =>
    (import.meta as any).env?.VITE_BLOG_UI_ORIGIN || 'http://localhost:4100'

export function messageLink(item: MessageItem): string | null {
    if (!item?.bizType || !item?.bizId) return null
    if (item.bizType === 'blog_article') {
        return `${blogOrigin()}/article/${item.bizId}`
    }
    if (item.bizType === 'blog_profile') {
        return `${blogOrigin()}/profile`
    }
    return null
}
