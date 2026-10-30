/**
 * 平台 WS 实时通道客户端（cloudwaer-common-ws 对应的前端侧）。
 *
 * - 连接：/ws?token=xxx（Vite/nginx 需代理 ws）；token 取自登录态
 * - 自动重连：指数退避 1s→30s；服务端 ping 帧回 pong；长时间无帧视为死连接重连
 * - 帧格式与后端 WsEnvelope 一致：{type, channel, targetUserId, payload, ts, id}
 */

export interface WsEnvelope {
    id?: string
    type: string
    channel?: string
    targetUserId?: number
    payload?: Record<string, any>
    ts?: number
}

type EnvelopeHandler = (env: WsEnvelope) => void

let socket: WebSocket | null = null
let manuallyClosed = false
let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null
let lastFrameAt = 0
let onEnvelope: EnvelopeHandler | null = null
let onStatus: ((connected: boolean) => void) | null = null

function wsUrl(): string {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const token = localStorage.getItem('token') || ''
    const clientId = 'admin'
    return `${proto}://${location.host}/ws?token=${encodeURIComponent(token)}&clientId=${clientId}`
}

function clearTimers(): void {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
    if (pingTimer) {
        clearInterval(pingTimer)
        pingTimer = null
    }
}

function scheduleReconnect(): void {
    if (manuallyClosed) return
    const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts))
    reconnectAttempts++
    reconnectTimer = setTimeout(connect, delay)
}

function connect(): void {
    if (manuallyClosed) return
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return
    try {
        socket = new WebSocket(wsUrl())
    } catch (e) {
        scheduleReconnect()
        return
    }
    socket.onopen = () => {
        reconnectAttempts = 0
        lastFrameAt = Date.now()
        onStatus?.(true)
        // 客户端保活：25s 一帧（服务端 30s ping，双向覆盖）
        pingTimer = setInterval(() => {
            send({type: 'ping', ts: Date.now()})
            // 超过 75s 无任何帧 → 视为死连接，重建
            if (Date.now() - lastFrameAt > 75000) {
                socket?.close()
            }
        }, 25000)
    }
    socket.onmessage = (event: MessageEvent) => {
        lastFrameAt = Date.now()
        try {
            const env = JSON.parse(String(event.data)) as WsEnvelope
            if (env.type === 'ping') {
                send({type: 'pong', ts: Date.now()})
                return
            }
            if (env.type === 'pong' || env.type === 'hello') return
            onEnvelope?.(env)
        } catch (e) {
            // 忽略非法帧
        }
    }
    socket.onclose = () => {
        clearTimers()
        onStatus?.(false)
        scheduleReconnect()
    }
    socket.onerror = () => {
        socket?.close()
    }
}

function send(env: Partial<WsEnvelope>): void {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(env))
    }
}

/**
 * 接入通道：注册帧处理器并建立连接（重复调用只更新处理器）
 */
export function connectWs(handlers: { onEnvelope: EnvelopeHandler; onStatus?: (connected: boolean) => void }): void {
    onEnvelope = handlers.onEnvelope
    onStatus = handlers.onStatus ?? null
    manuallyClosed = false
    connect()
}

/**
 * 断开（登出时调用），停止重连
 */
export function disconnectWs(): void {
    manuallyClosed = true
    clearTimers()
    socket?.close()
    socket = null
}
