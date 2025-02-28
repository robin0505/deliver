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
  
  // 使用传入的openid或者从上下文获取
  const openid = event.openid || wxContext.OPENID
  
  try {
    // 先查询用户是否存在
    const userResult = await userCollection.where({
      _openid: openid
    }).get()
    
    if (userResult.data && userResult.data.length > 0) {
      // 用户已存在，仅更新最后登录时间
      await userCollection.where({
        _openid: openid
      }).update({
        data: {
          lastLoginTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      
      return {
        success: true,
        message: '用户登录成功',
        data: userResult.data[0]
      }
    } else {
      // 创建新用户，使用最少的必要信息
      const userData = {
        _openid: openid,
        nickName: event.nickName || '微信用户',
        avatarUrl: event.avatarUrl || '',
        role: 'user',
        status: 'normal',
        creditScore: 100,
        points: 100,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      }
      
      const result = await userCollection.add({
        data: userData
      })
      
      return {
        success: true,
        message: '用户创建成功',
        data: userData
      }
    }
  } catch (err) {
    console.error('操作用户数据失败', err)
    return {
      success: false,
      message: '操作用户数据失败',
      error: err
    }
  }
} 