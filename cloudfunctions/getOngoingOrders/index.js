// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const ordersCollection = db.collection('orders')
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = event.openid || wxContext.OPENID
  
  try {
    // 查询用户相关的进行中订单
    // 包括：用户发布的未完成订单和用户接单的未完成订单
    const result = await ordersCollection.where(_.or([
      {
        publisherId: openid,
        status: _.in(['pending', 'accepted', 'delivering'])
      },
      {
        delivererId: openid,
        status: _.in(['accepted', 'delivering'])
      }
    ]))
    .orderBy('createTime', 'desc')
    .get()
    
    return {
      success: true,
      data: result.data
    }
  } catch (err) {
    console.error('获取进行中订单失败', err)
    return {
      success: false,
      message: '获取进行中订单失败',
      error: err
    }
  }
} 