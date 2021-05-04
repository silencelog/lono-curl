import md5 from 'md5'

const DEBOUNCE_TIME = 600

const requestMap = {}

/**
 * [debounce 避免重复请求]
 * @param  {[type]} instance [description]
 * @return {[type]}          [description]
 */
function debounce (instance, axios, opt) {
  // 请求拦截器
  instance.interceptors.request.use(function (config) {
    const isT = typeof opt.debounce === 'function' ? opt.debounce(config) : opt.debounce
    if (config.debounce !== false && isT) {
      const configMD5 = createConfigMD5(config)
      const item = requestMap[configMD5]
      if (!item || (item.date && (item.date.getTime() + DEBOUNCE_TIME) < new Date().getTime())) {
        requestMap[configMD5] = {
          config: config,
          date: new Date()
        }
      } else {
        config.cancelToken = new axios.CancelToken(e => {
          e(`重复请求被中断: ${JSON.stringify(config)}`)
        })
      }
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
    }, DEBOUNCE_TIME)
    return response
  }, error => {
  // 这里判断异常情况，如果axios.isCancel 为 true时，说明请求被取消
    if (axios.isCancel(error)) {
      // 请求取消
      console.warn(error)
    } else {
      // 请求失败
      if (error.code === 'ECONNABORTED' && error.message.indexOf('timeout') !== -1) {
        console.warn('请求超时')
      } else if (error.message === 'Network Error') {
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
  const params = typeof config.params === 'string' ? config.params : JSON.stringify(config.params)
  const data = typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
  return md5(`${config.method}${config.url}${params}${data}`)
}

export default debounce
