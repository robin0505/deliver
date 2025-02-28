// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const { orderId } = event
    
    if (!orderId) {
      return {
        success: false,
        message: '订单ID不能为空'
      }
    }
    
    // 1. 获取订单信息
    const orderRes = await db.collection('orders').doc(orderId).get()
    if (!orderRes.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }
    
    const order = orderRes.data
    
    // 2. 检查订单状态
    if (order.status === 3) {
      return {
        success: false,
        message: '订单已完成'
      }
    }
    
    if (order.status !== 2) {
      return {
        success: false,
        message: '只有已送达的订单才能标记为完成'
      }
    }
    
    // 3. 更新订单状态为已完成
    await db.collection('orders').doc(orderId).update({
      data: {
        status: 3,
        completeTime: db.serverDate()
      }
    })
    
    // 4. 分配积分奖励给配送员
    const totalPoints = order.fee + order.reward
    await db.collection('users').doc(order.delivererId).update({
      data: {
        points: _.inc(totalPoints)
      }
    })
    
    // 5. 记录积分变动
    await db.collection('pointsHistory').add({
      data: {
        userId: order.delivererId,
        orderId: orderId,
        points: totalPoints,
        type: 'earn',
        description: '完成配送订单',
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      message: '订单已完成，配送员已获得积分奖励'
    }
    
  } catch (err) {
    return {
      success: false,
      message: err.message
    }
  }
} 