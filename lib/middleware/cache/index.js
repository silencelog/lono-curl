import md5 from 'md5'

const CACHE_TIME = 15000

const cacheMap = {}

/**
 * [debounce 请求缓存]
 * @param  {[type]} instance [description]
 * @return {[type]}          [description]
 */
export default function (instance, axios, opt) {
  const CancelToken = axios.CancelToken
  // 请求拦截器
  instance.interceptors.request.use(function (config) {
    if (config.cache !== false && isT(config, opt)) {
      const configMD5 = createConfigMD5(config)
      const item = cacheMap[configMD5]
      if (item && item.expire && (item.expire + CACHE_TIME) > getTime()) {
        const source = CancelToken.source()
        config.cancelToken = source.token
        source.cancel({
          data: item
        })
      }
    }
    return config
  }, function (error) {
    return Promise.reject(error)
  })

  // 响应拦截器
  instance.interceptors.response.use(response => {
    const config = response.config
    if (config.cache !== false && isT(config, opt)) {
      const configMD5 = createConfigMD5(config)
      cacheMap[configMD5] = {
        expire: getTime(),
        data: response.data
      }
    }
    return response
  }, error => {
    // 通过axios.isCancel(error)来判断是否返回有数据 有的话直接返回给用户
    if (axios.isCancel(error)) return Promise.resolve(error.message.data)
    // 如果没有的话 则是正常的接口错误 直接返回错误信息给用户
    return Promise.reject(error)
  })
}

function createConfigMD5 (config) {
  const params = typeof config.params === 'string' ? config.params : JSON.stringify(config.params)
  const data = typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
  return md5(`${config.method}${config.url}${params}${data}`)
}

function isT (config, opt) {
  return typeof opt.cache === 'function' ? opt.cache(config) : opt.cache
}

function getTime () {
  return new Date().getTime()
}
