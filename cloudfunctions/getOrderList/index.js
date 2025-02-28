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
  
  // 分页参数
  const pageSize = event.pageSize || 10
  const pageNum = event.page || 1
  const skip = (pageNum - 1) * pageSize
  
  // 筛选条件
  const platform = event.platform || ''
  const keyword = event.keyword || ''
  const status = event.status || 'all'
  const onlyMine = event.onlyMine || false
  const isDevEnv = event.isDevEnv || false
  
  console.log('云函数getOrderList - 查询参数:', { openid, pageSize, pageNum, skip, platform, keyword, status, onlyMine, isDevEnv })
  
  try {
    // 构建查询条件
    const query = {}
    
    // 根据状态筛选
    if (status !== 'all') {
      query.status = status
    } else {
      // 默认显示所有除已取消和已过期外的订单
      query.status = _.nin(['cancelled', 'expired'])
    }
    
    // 处理只看自己的订单还是可接的订单
    if (onlyMine) {
      // 查询自己发布的订单
      query.publisherId = openid
    } else {
      // 查询可接单的订单(已经过滤掉已取消和已过期)
      if (status === 'pending' || status === 'all') {
        // 不查看自己发布的待接单
        query.publisherId = _.neq(openid)
      }
    }
    
    // 如果指定了平台，添加平台筛选条件
    if (platform) {
      query.platform = platform
    }
    
    // 如果有搜索关键字，添加描述搜索条件
    if (keyword) {
      query.description = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }

    // 排除测试订单（如果存在）
    // 使用条件确保只排除明确标记为测试的订单
    // 没有test字段的订单将被视为真实订单
    query.test = _.neq(true)
    
    console.log('云函数getOrderList - 最终查询条件:', JSON.stringify(query))
    
    // 查询订单
    const result = await ordersCollection.where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    console.log('云函数getOrderList - 查询结果数量:', result.data.length)
    
    // 如果没有查询到数据，但是在"全部"标签下，尝试不使用平台过滤条件再次查询
    if (result.data.length === 0 && platform === '') {
      console.log('云函数getOrderList - 没有查询到订单数据，尝试不使用status过滤条件查询')
      
      // 移除status过滤条件
      delete query.status
      
      const fallbackResult = await ordersCollection.where(query)
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()
      
      console.log('云函数getOrderList - 无status过滤条件查询结果数量:', fallbackResult.data.length)
      
      if (fallbackResult.data.length > 0) {
        console.log('云函数getOrderList - 发现未过滤的订单数据')
        
        // 使用没有status过滤的结果
        const countResult = await ordersCollection.where(query).count()
        
        return {
          success: true,
          data: fallbackResult.data,
          total: countResult.total,
          pageSize: pageSize,
          pageNum: pageNum,
          query: query
        }
      }
    }
    
    // 开发环境下，如果仍然没有查询到数据，尝试完全不使用过滤条件
    if (result.data.length === 0 && isDevEnv) {
      console.log('云函数getOrderList - 开发环境，没有查询到订单数据，尝试不使用任何过滤条件')
      
      // 开发环境下无条件查询
      const devResult = await ordersCollection
        .orderBy('createTime', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()
      
      console.log('云函数getOrderList - 开发环境无过滤条件查询结果数量:', devResult.data.length)
      
      if (devResult.data.length > 0) {
        const countResult = await ordersCollection.count()
        
        return {
          success: true,
          data: devResult.data,
          total: countResult.total,
          pageSize: pageSize,
          pageNum: pageNum,
          query: '开发环境 - 无过滤条件'
        }
      }
    }
    
    // 获取总数
    const countResult = await ordersCollection.where(query).count()
    
    return {
      success: true,
      data: result.data,
      total: countResult.total,
      pageSize: pageSize,
      pageNum: pageNum,
      query: query
    }
  } catch (err) {
    console.error('云函数getOrderList - 获取订单列表失败', err)
    return {
      success: false,
      message: '获取订单列表失败',
      error: err.message || JSON.stringify(err)
    }
  }
} 