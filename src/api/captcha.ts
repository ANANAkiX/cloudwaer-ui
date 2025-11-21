import request from './request'

export interface CaptchaResp {
  enabled: boolean
  captchaId?: string
  imageBase64?: string
  expireSeconds?: number
}

export function getCaptcha(): Promise<CaptchaResp> {
  return request({
    url: '/auth/captcha',
    method: 'get'
  })
}
