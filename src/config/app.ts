// Frontend feature switches loaded from Vite env
// VITE_LOGIN_CAPTCHA: 'on' | 'off' | undefined
export const LOGIN_CAPTCHA_SWITCH = (import.meta as any).env?.VITE_LOGIN_CAPTCHA?.toString().toLowerCase?.() || ''
