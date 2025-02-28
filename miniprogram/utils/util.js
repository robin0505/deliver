/**
 * 通用工具函数库
 */

// 格式化时间
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

// 格式化数字为两位
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 格式化金额, 单位为分，返回元
const formatAmount = amount => {
  return (amount / 100).toFixed(2)
}

// 生成随机字符串
const randomString = length => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 深拷贝对象
const deepClone = obj => {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }
  
  if (obj instanceof Object) {
    const newObj = {}
    Object.keys(obj).forEach(key => {
      newObj[key] = deepClone(obj[key])
    })
    return newObj
  }
}

// 防抖函数
const debounce = (fn, delay) => {
  let timer = null
  return function() {
    const context = this
    const args = arguments
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(context, args)
    }, delay)
  }
}

// 导出工具函数
module.exports = {
  formatTime,
  formatNumber,
  formatAmount,
  randomString,
  deepClone,
  debounce
} 