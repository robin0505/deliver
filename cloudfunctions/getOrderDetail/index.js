// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const ordersCollection = db.collection('orders')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const orderId = event.orderId
  
  if (!orderId) {
    return {
      success: false,
      message: '订单ID不能为空'
    }
  }
  
  try {
    // 查询订单详情
    const result = await ordersCollection.doc(orderId).get()
    
    if (!result.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }
    
    const order = result.data
    
    // 判断当前用户与订单的关系
    const isPublisher = order.publisherId === openid
    const isDeliverer = order.delivererId === openid
    const canAccept = !isPublisher && order.status === 'pending'
    
    return {
      success: true,
      data: {
        ...order,
        isPublisher,
        isDeliverer,
        canAccept
      }
    }
  } catch (err) {
    console.error('获取订单详情失败', err)
    return {
      success: false,
      message: '获取订单详情失败',
      error: err
    }
  }
} 