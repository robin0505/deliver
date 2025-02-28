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
    const { amount, orderId } = event // amount为充值金额（元），转换为积分
    
    if (!amount || amount <= 0) {
      return {
        success: false,
        message: '充值金额必须大于0'
      }
    }
    
    // 1. 获取系统配置，确定积分兑换比例
    const configRes = await db.collection('config').limit(1).get()
    if (!configRes.data || configRes.data.length === 0) {
      return {
        success: false,
        message: '系统配置不存在'
      }
    }
    
    const config = configRes.data[0]
    const pointsRate = config.pointsRate || 100 // 默认100积分=1元
    
    // 2. 计算充值积分数量
    const points = Math.floor(amount * pointsRate)
    
    // 3. 更新用户积分
    await db.collection('users').where({
      openid: wxContext.OPENID
    }).update({
      data: {
        points: _.inc(points)
      }
    })
    
    // 4. 记录充值记录
    await db.collection('pointsHistory').add({
      data: {
        userId: wxContext.OPENID,
        points: points,
        amount: amount,
        type: 'recharge',
        description: '充值积分',
        orderId: orderId || '',
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      message: `充值成功，获得${points}积分`,
      points: points
    }
    
  } catch (err) {
    return {
      success: false,
      message: err.message
    }
  }
} 