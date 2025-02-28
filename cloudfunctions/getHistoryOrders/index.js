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
  
  // 参数处理
  const pageSize = event.pageSize || 10
  const pageNum = event.pageNum || 1
  const skip = (pageNum - 1) * pageSize
  const type = event.type || 'all' // 'post'(发布的), 'take'(接的), 'all'(全部)
  const status = event.status // 可选，指定状态
  
  try {
    let query = {}
    
    // 根据类型构建查询
    if (type === 'post') {
      // 查询发布的订单
      query.publisherId = openid
    } else if (type === 'take') {
      // 查询接的单
      query.delivererId = openid
    } else {
      // 查询全部相关订单
      query = _.or([
        { publisherId: openid },
        { delivererId: openid }
      ])
    }
    
    // 如果指定了状态，添加状态过滤
    if (status) {
      if (type === 'all') {
        // 如果是查询全部，需要在or条件内部添加status
        query = _.or([
          { publisherId: openid, status },
          { delivererId: openid, status }
        ])
      } else {
        // 否则直接添加status条件
        query.status = status
      }
    }
    
    // 执行查询
    const result = await ordersCollection.where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const countResult = await ordersCollection.where(query).count()
    
    return {
      success: true,
      data: result.data,
      total: countResult.total,
      pageSize: pageSize,
      pageNum: pageNum
    }
  } catch (err) {
    console.error('获取历史订单失败', err)
    return {
      success: false,
      message: '获取历史订单失败',
      error: err
    }
  }
} 