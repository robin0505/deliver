// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const ordersCollection = db.collection('orders')
const usersCollection = db.collection('users')
const configCollection = db.collection('config')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 解构订单数据
  const { 
    platform, 
    description, 
    pickupLocation, 
    pickupCode,
    dormitory, 
    reward, 
    remarks,
    fee
  } = event
  
  // 检查必要字段
  if (!platform || !description || !pickupLocation || !dormitory || !reward) {
    return {
      success: false,
      message: '缺少必要信息'
    }
  }

  try {
    // 查询用户信息
    const userResult = await usersCollection.where({
      _openid: openid
    }).get()
    console.log(userResult)
    if (userResult.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    let user = userResult.data[0] || {}
    
    // 尽可能获取用户昵称，提高容错性
    const publisherName = user.name || user.nickName || '微信用户'
    
    // 获取系统配置
    const configResult = await configCollection.where({
      type: 'systemConfig'
    }).get()
    
    const config = configResult.data[0] || {
      creditScoreThreshold: 60
    }
    
    // 检查用户信誉分
    if (user.creditScore < config.creditScoreThreshold) {
      return {
        success: false,
        message: '您的信誉分过低，暂时无法发布订单'
      }
    }
    
    // 创建订单
    const orderData = {
      _openid: openid,
      publisherId: openid,
      publisherName: publisherName,
      publisherPhone: user.phone || '',
      publisherAvatar: user.avatarUrl || '',
      platform,
      description,
      pickupLocation,
      pickupCode: pickupCode || '',
      dormitory,
      reward: parseFloat(reward) || 0,
      fee: parseFloat(fee) || 5.0,
      remarks: remarks || '',
      status: 'pending',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await ordersCollection.add({
      data: orderData
    })
    
    return {
      success: true,
      data: {
        _id: result._id
      },
      message: '订单发布成功'
    }
  } catch (err) {
    console.error('发布订单失败', err)
    return {
      success: false,
      message: '发布订单失败',
      error: err
    }
  }
} 