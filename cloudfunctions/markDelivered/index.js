// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
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
  
  const transaction = await db.startTransaction()
  
  try {
    // 查询订单信息
    const orderResult = await transaction.collection('orders').doc(orderId).get()
    if (!orderResult.data) {
      await transaction.rollback()
      return {
        success: false,
        message: '订单不存在'
      }
    }
    
    const order = orderResult.data
    
    // 检查是否是订单配送员
    if (order.delivererId !== openid) {
      await transaction.rollback()
      return {
        success: false,
        message: '只有订单配送员可以标记订单已送达'
      }
    }
    
    // 检查订单状态是否可标记为已送达
    if (order.status !== 'accepted') {
      await transaction.rollback()
      return {
        success: false,
        message: '当前订单状态不可标记为已送达'
      }
    }
    
    // 更新订单状态
    await transaction.collection('orders').doc(orderId).update({
      data: {
        status: 'delivering',
        deliveryTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    await transaction.commit()
    
    return {
      success: true,
      message: '订单已标记为送达状态'
    }
  } catch (err) {
    await transaction.rollback()
    console.error('标记订单已送达失败', err)
    return {
      success: false,
      message: '标记订单已送达失败',
      error: err
    }
  }
} 