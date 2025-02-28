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
        message: '只有订单发布者可以取消订单'
      }
    }
    
    // 检查订单状态是否可取消
    if (order.status !== 'pending' && order.status !== 'accepted') {
      await transaction.rollback()
      return {
        success: false,
        message: '当前订单状态不可取消'
      }
    }
    
    // 获取系统配置
    const configResult = await configCollection.where({
      type: 'systemConfig'
    }).get()
    
    const config = configResult.data[0] || {
      cancelPenalty: 1
    }
    
    // 更新订单状态
    await transaction.collection('orders').doc(orderId).update({
      data: {
        status: 'cancelled',
        updateTime: db.serverDate()
      }
    })
    
    // 如果订单已被接单，需要退还代取费用给发布者
    if (order.status === 'accepted' && order.delivererId) {
      // 更新发布者余额
      await transaction.collection('users').where({
        openid: order.publisherId
      }).update({
        data: {
          balance: _.inc(order.fee)
        }
      })
      
      // 记录交易
      await transaction.collection('transactions').add({
        data: {
          userId: order.publisherId,
          type: 'refund',
          amount: order.fee,
          description: `订单${orderId}取消退款`,
          orderId: orderId,
          createTime: db.serverDate()
        }
      })
    }
    
    // 扣除信用分作为惩罚
    await transaction.collection('users').where({
      openid: openid
    }).update({
      data: {
        creditScore: _.inc(-config.cancelPenalty)
      }
    })
    
    await transaction.commit()
    
    return {
      success: true,
      message: '订单取消成功'
    }
  } catch (err) {
    await transaction.rollback()
    console.error('取消订单失败', err)
    return {
      success: false,
      message: '取消订单失败',
      error: err
    }
  }
} 