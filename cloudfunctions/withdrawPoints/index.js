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
    const { amount } = event // amount为提现金额（元）
    
    if (!amount || amount <= 0) {
      return {
        success: false,
        message: '提现金额必须大于0'
      }
    }
    
    // 1. 获取系统配置
    const configRes = await db.collection('config').limit(1).get()
    if (!configRes.data || configRes.data.length === 0) {
      return {
        success: false,
        message: '系统配置不存在'
      }
    }
    
    const config = configRes.data[0]
    const pointsRate = config.pointsRate || 100 // 默认100积分=1元
    const dailyWithdrawLimit = config.dailyWithdrawLimit || 200 // 默认每日提现限额200元
    
    // 2. 检查提现金额是否超过每日限额
    if (amount > dailyWithdrawLimit) {
      return {
        success: false,
        message: `单日提现金额不能超过${dailyWithdrawLimit}元`
      }
    }
    
    // 3. 计算需要扣除的积分
    const pointsNeeded = Math.floor(amount * pointsRate)
    
    // 4. 检查用户积分是否足够
    const userRes = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()
    
    if (!userRes.data || userRes.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    const user = userRes.data[0]
    if (user.points < pointsNeeded) {
      return {
        success: false,
        message: '积分不足'
      }
    }
    
    // 5. 检查用户今日是否已达提现限额
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const withdrawalsToday = await db.collection('pointsHistory')
      .where({
        userId: wxContext.OPENID,
        type: 'withdraw',
        createTime: _.gte(today)
      })
      .get()
    
    let totalWithdrawnToday = 0
    if (withdrawalsToday.data && withdrawalsToday.data.length > 0) {
      totalWithdrawnToday = withdrawalsToday.data.reduce((sum, record) => sum + record.amount, 0)
    }
    
    if (totalWithdrawnToday + amount > dailyWithdrawLimit) {
      return {
        success: false,
        message: `您今日已提现${totalWithdrawnToday}元，超出每日限额${dailyWithdrawLimit}元`
      }
    }
    
    // 6. 扣除用户积分
    await db.collection('users').where({
      openid: wxContext.OPENID
    }).update({
      data: {
        points: _.inc(-pointsNeeded)
      }
    })
    
    // 7. 记录提现记录
    await db.collection('pointsHistory').add({
      data: {
        userId: wxContext.OPENID,
        points: -pointsNeeded,
        amount: amount,
        type: 'withdraw',
        description: '积分提现',
        status: 'processing', // 处理中，需要管理员审核
        createTime: db.serverDate()
      }
    })
    
    return {
      success: true,
      message: `提现申请成功，扣除${pointsNeeded}积分，提现金额${amount}元将在审核后到账`,
      points: pointsNeeded,
      amount: amount
    }
    
  } catch (err) {
    return {
      success: false,
      message: err.message
    }
  }
} 