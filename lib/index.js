import axios from 'axios'
import crypto from 'crypto'

const defaultOption = {
  // 防止重复请求
  debounce: false,
  // 是否启用缓存
  // cache: false,
  // 请求超时
  timeout: 5000
}

const requestMap = {}

const CONTEXT_CURL = Symbol('context#curl')

class LodeCurl {
  constructor (opt = {}) {
    this.name = 'curl'
    this.isLono = true
    this.opt = opt
    this.curl = axios
    this.instance = null
  }
  async install (app) {
    if (app.context.hasOwnProperty(CONTEXT_CURL)) return
    this.opt = {
      ...defaultOption,
      ...app.$config.curl,
      ...this.opt
    }
    this.instance = axios.create(this.opt)
    // 重复请求拦截
    if (this.opt.debounce) {
      debounce(this.instance)
    }
    Object.defineProperties(app.context, {
      [CONTEXT_CURL]: {
        value: this.instance,
        writable: false
      },
      'curl': {
        value: this.instance,
        writable: false
      }
    })
  }
}

/**
 * [debounce 避免重复请求]
 * @param  {[type]} instance [description]
 * @return {[type]}          [description]
 */
function debounce (instance) {
  // 请求拦截器
  instance.interceptors.request.use(function (config) {
    const configMD5 = createConfigMD5(config)
    const item = requestMap[configMD5]
    if (!item || (item.date && (item.date.getTime() + defaultOption.timeout) < new Date().getTime())) {
      requestMap[configMD5] = {
        config: config,
        date: new Date()
      }
    } else {
      config.cancelToken = new axios.CancelToken(e => {
        e(`重复请求被中断: ${JSON.stringify(config)}`)
      })
    }
    return config
  }, function (error) {
    return Promise.reject(error)
  })
  // 响应拦截器
  instance.interceptors.response.use(response => {
    setTimeout(() => {
      const configMD5 = createConfigMD5(response.config)
      requestMap[configMD5] = undefined
    }, 600)
    return response.data
  }, error => {
  // 这里判断异常情况，如果axios.isCancel 为 true时，说明请求被取消
    if (axios.isCancel(error)) {
      // 请求取消
      console.warn(error)
    } else {
      // 请求失败
      if (error.code === 'ECONNABORTED' && error.message.indexOf('timeout') !== -1) {
        console.warn('请求超时')
      } else if (error.message == 'Network Error') {
        console.error('网络连接异常，请重试')
      } else {
        console.error('未知错误', error.message)
      }
      // 请求如果失败了，务必从列表里面删掉，否则请求拦截器会取消请求
      if (error.config) {
        const configMD5 = createConfigMD5(error.config)
        requestMap[configMD5] = undefined
      }
   }
    return Promise.reject(error)
  })
}

function createConfigMD5 (config) {
  const md5 = crypto.createHash('md5')
  const requestString = `${config.method}${config.url}${JSON.stringify(config.params)}${JSON.stringify(config.data)}`
  const requestMD5 = md5.update(requestString).digest('hex')
  return requestMD5
}

export default function (...arg) {
  return new LodeCurl(...arg)
}
