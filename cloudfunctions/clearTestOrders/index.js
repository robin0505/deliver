// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  console.log('开始清除测试订单，操作用户:', wxContext.OPENID)
  
  try {
    // 查询所有测试订单
    const queryResult = await db.collection('orders')
      .where({
        test: true
      })
      .get()
    
    const orders = queryResult.data
    console.log(`找到${orders.length}个测试订单`)
    
    if (orders.length === 0) {
      return {
        success: true,
        deleted: 0,
        message: '没有找到测试订单'
      }
    }
    
    // 由于小程序云函数一次最多删除20条记录，需要分批删除
    const batchSize = 100
    const batchTimes = Math.ceil(orders.length / batchSize)
    
    let deletedCount = 0
    
    // 分批删除订单
    for (let i = 0; i < batchTimes; i++) {
      const start = i * batchSize
      const end = Math.min(start + batchSize, orders.length)
      const batchOrders = orders.slice(start, end)
      
      // 获取当前批次的订单ID
      const orderIds = batchOrders.map(order => order._id)
      
      console.log(`删除第${i+1}批，共${orderIds.length}个订单`)
      
      try {
        // 执行批量删除
        const deleteResult = await db.collection('orders').where({
          _id: db.command.in(orderIds),
          test: true // 再次确认只删除测试订单
        }).remove()
        
        if (deleteResult.stats && deleteResult.stats.removed) {
          console.log(`成功删除第${i+1}批${deleteResult.stats.removed}个订单`)
          deletedCount += deleteResult.stats.removed
        }
      } catch (batchError) {
        console.error(`第${i+1}批删除失败:`, batchError)
      }
    }
    
    return {
      success: true,
      deleted: deletedCount,
      message: `成功删除${deletedCount}个测试订单`
    }
  } catch (err) {
    console.error('清除测试订单失败:', err)
    return {
      success: false,
      error: err,
      message: '清除测试订单失败'
    }
  }
} 