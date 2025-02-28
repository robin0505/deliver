// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取 WX Context (微信调用上下文)，包括 OPENID、APPID 和 UNIONID（需满足 UNIONID 获取条件）
  const wxContext = cloud.getWXContext()
  
  // 检查是否为开发环境
  const isDevEnv = wxContext.APPID === 'wx123456789abc'; // 此处为开发者工具的APPID
  
  // 如果是开发环境，使用固定的测试openid
  const openid = isDevEnv ? 'test_openid_dev_environment' : wxContext.OPENID;

  return {
    event,
    openid: openid,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
} 