const translations: Record<string, string> = {
  'Create element': '创建元素',
  'Search': '搜索',
  'Data': '数据',
  'Participants': '参与者',
  'Expanded Pool': '展开泳池',
  'Empty Pool': '空泳池',
  'Data Store Reference': '数据存储引用',
  'Data Object Reference': '数据对象引用',
  'Escalation Boundary Event (non-interrupting)': '升级边界事件（非中断）',
  'Conditional Boundary Event (non-interrupting)': '条件边界事件（非中断）',
  'Signal Boundary Event (non-interrupting)': '信号边界事件（非中断）',
  'Message Boundary Event (non-interrupting)': '消息边界事件（非中断）',
  'Timer Boundary Event (non-interrupting)': '定时边界事件（非中断）',
  'Escalation Boundary Event': '升级边界事件',
  'Conditional Boundary Event': '条件边界事件',
  'Signal Boundary Event': '信号边界事件',
  'Message Boundary Event': '消息边界事件',
  'Timer Boundary Event': '定时边界事件',
  'Parallel Gateway': '并行网关',
  'Exclusive Gateway': '排他网关',
  'Inclusive Gateway': '包容网关',
  'Event-based Gateway': '事件网关',
  'Complex Gateway': '复杂网关',
  'Start Event': '开始事件',
  'End Event': '结束事件',
  'Intermediate Throw Event': '中间抛出事件',
  'Intermediate Catch Event': '中间捕获事件',
  'Task': '任务',
  'Send Task': '发送任务',
  'Receive Task': '接收任务',
  'User Task': '用户任务',
  'Manual Task': '手工任务',
  'Business Rule Task': '规则任务',
  'Service Task': '服务任务',
  'Script Task': '脚本任务',
  'Sub Process': '子流程',
  'Call Activity': '调用活动',
  'Text Annotation': '文本注释',
  'Group': '分组',
  'Lane': '泳道',
  'Pool': '泳池'
}

function translate(template: string, replacements?: Record<string, string | number>): string {
  const result = translations[template] || template
  if (!replacements) {
    return result
  }

  return result.replace(/{([^}]+)}/g, (_, key) => String(replacements[key] ?? `{${key}}`))
}

export default translate
