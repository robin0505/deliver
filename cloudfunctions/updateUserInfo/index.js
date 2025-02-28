// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const usersCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取要更新的信息
  const { name, phone, dormitory } = event
  
  if (!name || !phone || !dormitory) {
    return {
      success: false,
      message: '缺少必要信息'
    }
  }
  
  try {
    // 检查用户是否存在
    const userCheck = await usersCollection.where({
      _openid: openid
    }).get()
    
    if (userCheck.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    // 更新用户信息
    await usersCollection.where({
      _openid: openid
    }).update({
      data: {
        name,
        phone,
        dormitory,
        updateTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      message: '更新成功'
    }
  } catch (err) {
    console.error('更新用户信息失败', err)
    return {
      success: false,
      message: '更新用户信息失败',
      error: err
    }
  }
} 