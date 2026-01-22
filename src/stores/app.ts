import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getAvailableLocales, getDefaultLocale, setLocale, type LocaleKey } from '@/i18n'

export type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'cloudwaer.theme'

export const useAppStore = defineStore('app', () => {
  const theme = ref<ThemeMode>((localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || 'light')
  const locale = ref<LocaleKey>(getDefaultLocale())

  const availableLocales = computed(() => getAvailableLocales())

  const applyThemeToDom = (mode: ThemeMode) => {
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  const setTheme = (mode: ThemeMode) => {
    theme.value = mode
    localStorage.setItem(THEME_STORAGE_KEY, mode)
    applyThemeToDom(mode)
  }

  const initTheme = () => {
    applyThemeToDom(theme.value)
  }

  const setAppLocale = (next: LocaleKey) => {
    locale.value = next
    setLocale(next)
  }

  return {
    theme,
    locale,
    availableLocales,
    setTheme,
    initTheme,
    setAppLocale
  }
})
