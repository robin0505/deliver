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
    
    // 检查是否是订单发布者
    if (order.publisherId !== openid) {
      await transaction.rollback()
      return {
        success: false,
        message: '只有订单发布者可以确认收货'
      }
    }
    
    // 检查订单状态是否可确认收货
    if (order.status !== 'delivering') {
      await transaction.rollback()
      return {
        success: false,
        message: '当前订单状态不可确认收货'
      }
    }
    
    // 获取系统配置
    const configResult = await configCollection.where({
      type: 'systemConfig'
    }).get()
    
    const config = configResult.data[0] || {
      pointsRate: 100
    }
    
    // 计算积分奖励（根据订单金额）
    const pointsReward = Math.floor(order.fee / config.pointsRate)
    
    // 更新订单状态
    await transaction.collection('orders').doc(orderId).update({
      data: {
        status: 'completed',
        completionTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    // 更新配送员余额和积分
    await transaction.collection('users').where({
      openid: order.delivererId
    }).update({
      data: {
        balance: _.inc(order.fee),
        points: _.inc(pointsReward),
        completedOrders: _.inc(1)
      }
    })
    
    // 记录交易
    await transaction.collection('transactions').add({
      data: {
        userId: order.delivererId,
        type: 'earning',
        amount: order.fee,
        description: `订单${orderId}配送收入`,
        orderId: orderId,
        createTime: db.serverDate()
      }
    })
    
    // 记录积分奖励
    if (pointsReward > 0) {
      await transaction.collection('pointsHistory').add({
        data: {
          userId: order.delivererId,
          type: 'order_reward',
          points: pointsReward,
          description: `订单${orderId}配送积分奖励`,
          orderId: orderId,
          createTime: db.serverDate()
        }
      })
    }
    
    await transaction.commit()
    
    return {
      success: true,
      message: '订单已确认完成'
    }
  } catch (err) {
    await transaction.rollback()
    console.error('确认订单完成失败', err)
    return {
      success: false,
      message: '确认订单完成失败',
      error: err
    }
  }
} 