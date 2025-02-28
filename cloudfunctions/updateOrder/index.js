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
    const { orderId, updateData } = event
    
    if (!orderId) {
      return {
        success: false,
        message: '订单ID不能为空'
      }
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return {
        success: false,
        message: '更新数据不能为空'
      }
    }
    
    // 1. 查询订单确认存在且有权限更新
    const orderRes = await db.collection('orders').doc(orderId).get()
    if (!orderRes.data) {
      return {
        success: false,
        message: '订单不存在'
      }
    }
    
    const order = orderRes.data
    
    // 2. 检查权限（发布者或接单者才能更新订单）
    if (order.publisherId !== wxContext.OPENID && order.delivererId !== wxContext.OPENID) {
      return {
        success: false,
        message: '没有权限更新此订单'
      }
    }
    
    // 3. 保护字段，防止恶意修改
    // 移除不允许用户直接更新的敏感字段
    const safeUpdateData = { ...updateData }
    const restrictedFields = [
      '_id', 
      '_openid', 
      'publisherId', 
      'delivererId', 
      'createTime',
      'points',  // 防止直接修改积分
      'fee',     // 防止直接修改费用
      'reward'   // 防止直接修改奖励
    ]
    
    restrictedFields.forEach(field => {
      if (safeUpdateData.hasOwnProperty(field)) {
        delete safeUpdateData[field]
      }
    })
    
    // 4. 添加更新时间
    safeUpdateData.updateTime = db.serverDate()
    
    // 5. 执行更新
    await db.collection('orders').doc(orderId).update({
      data: safeUpdateData
    })
    
    return {
      success: true,
      message: '订单更新成功'
    }
    
  } catch (err) {
    return {
      success: false,
      message: err.message
    }
  }
} 