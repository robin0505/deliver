// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const userCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  // 使用传入的openid或当前用户的openid
  const openid = event.openid || wxContext.OPENID
  
  try {
    // 查询用户数据
    const userResult = await userCollection.where({
      _openid: openid
    }).get()
    
    if (userResult.data.length > 0) {
      return {
        success: true,
        data: userResult.data[0]
      }
    } else {
      return {
        success: false,
        message: '用户不存在'
      }
    }
  } catch (err) {
    console.error('查询用户数据失败', err)
    return {
      success: false,
      message: '查询用户数据失败',
      error: err
    }
  }
} 