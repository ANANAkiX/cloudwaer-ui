import { createI18n } from 'vue-i18n'

export type LocaleKey = string

const LOCALE_STORAGE_KEY = 'cloudwaer.locale'

function loadLocaleMessages() {
  // Auto-discover locale files under ./locales
  const modules = import.meta.glob('./locales/*.ts', { eager: true }) as Record<string, any>
  const messages: Record<string, any> = {}

  for (const [path, mod] of Object.entries(modules)) {
    const file = path.split('/').pop() || ''
    const locale = file.replace(/\.ts$/, '')
    messages[locale] = mod.default || mod
  }

  return messages
}

export function getDefaultLocale(): LocaleKey {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (saved) return saved
  return 'zh-CN'
}

export const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'zh-CN',
  messages: loadLocaleMessages()
})

export function setLocale(locale: LocaleKey) {
  i18n.global.locale.value = locale
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

export function getAvailableLocales(): LocaleKey[] {
  const messages = i18n.global.messages.value as any
  return Object.keys(messages)
}
