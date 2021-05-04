export default  function (instance, axios, opt) {
  instance.interceptors.response.use(response => {
    const config = response.config
    return config.format !== false && opt.format ? response.data : response
  }, error => {
    return Promise.reject(error)
  })
}
