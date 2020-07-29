"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _axios = _interopRequireDefault(require("axios"));

var _crypto = _interopRequireDefault(require("crypto"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const defaultOption = {
  // 防止重复请求
  debounce: false,
  // 是否启用缓存
  // cache: false,
  // 请求超时
  timeout: 5000
};
const requestMap = {};
const CONTEXT_CURL = Symbol('context#curl');

class LodeCurl {
  constructor(opt = {}) {
    this.name = 'curl';
    this.isLode = true;
    this.opt = opt;
    this.curl = _axios.default;
    this.instance = null;
    this.requestIng = {};
  }

  install(lode) {
    var _this = this;

    return _asyncToGenerator(function* () {
      if (lode.context.hasOwnProperty(CONTEXT_CURL)) {
        return;
      }

      _this.opt = { ...defaultOption,
        ...lode.$config.curl,
        ..._this.opt
      };
      _this.instance = _axios.default.create(_this.opt);
      lode.context[CONTEXT_CURL] = _this.instance;
      lode.context.curl = _this.instance;

      if (_this.opt.debounce) {
        debounce(_this.instance);
      }
    })();
  }

}

function debounce(instance) {
  // 请求拦截器
  instance.interceptors.request.use(function (config) {
    const configMD5 = createConfigMD5(config);
    const item = requestMap[configMD5];

    if (!item || item.date && item.date.getTime() + defaultOption.timeout < new Date().getTime()) {
      requestMap[configMD5] = {
        config: config,
        date: new Date()
      };
    } else {
      config.cancelToken = new _axios.default.CancelToken(e => {
        e(`${config.url}---重复请求被中断`);
      });
    }

    return config;
  }, function (error) {
    return Promise.reject(error);
  }); // 响应拦截器

  instance.interceptors.response.use(response => {
    setTimeout(() => {
      const configMD5 = createConfigMD5(response.config);
      requestMap[configMD5] = undefined;
    }, 600);
    return response.data;
  }, error => {
    // 这里判断异常情况，如果axios.isCancel 为 true时，说明请求被取消
    if (_axios.default.isCancel(error)) {
      // 请求取消
      console.warn(error);
    } else {
      // 请求失败
      if (error.code === 'ECONNABORTED' && error.message.indexOf('timeout') !== -1) {
        console.warn('请求超时');
      } else if (error.message == 'Network Error') {
        console.error('网络连接异常，请重试');
      } else {
        console.error('未知错误', error.message);
      } // 请求如果失败了，务必从列表里面删掉，否则请求拦截器会取消请求


      if (error.config) {
        const configMD5 = createConfigMD5(error.config);
        requestMap[configMD5] = undefined;
      }
    }

    return Promise.reject(error);
  });
}

function createConfigMD5(config) {
  const md5 = _crypto.default.createHash('md5');

  const requestString = `${config.method}${config.url}${JSON.stringify(config.params)}${JSON.stringify(config.data)}`;
  const requestMD5 = md5.update(requestString).digest('hex');
  return requestMD5;
}

function _default(...arg) {
  return new LodeCurl(...arg);
}