import axios from 'axios'
import debounce from './middleware/debounce'
import cache from './middleware/cache'
import format from './middleware/format'

const defaultOption = {
  // 防止重复请求
  debounce: false,
  // 是否启用缓存
  cache: false,
  // 请求超时
  timeout: 15000,
  // 格式化默认返回data
  format: true
}

const CONTEXT_CURL = Symbol('context#curl')

class LodeCurl {
  constructor (opt = {}) {
    this.name = 'curl'
    this.isLono = true
    this.opt = opt
    this.curl = axios
    this.instance = null
    this.middleware = []
  }

  use (fn, name) {
    this.middleware.push(fn)
    fn.call(this, this.instance, axios, this.opt)
    return this
  }
  
  async install (app) {
    if (app.context.hasOwnProperty(CONTEXT_CURL)) return
    this.opt = {
      ...defaultOption,
      ...app.$config.curl,
      ...this.opt
    }
    this.instance = axios.create(this.opt)
    
    // 加载重复请求拦截中间件
    this.opt.debounce && this.use(debounce)
    // 加载缓存中间件
    this.opt.cache && this.use(cache)
    // 加载格式化中间件
    this.opt.format && this.use(format)

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

export default function (...arg) {
  return new LodeCurl(...arg)
}
