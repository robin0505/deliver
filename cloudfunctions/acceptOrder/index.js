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
  
  console.log('云函数 acceptOrder 开始执行', { event, openid });
  
  if (!orderId) {
    console.error('云函数 acceptOrder 错误: 订单ID不能为空');
    return {
      success: false,
      message: '订单ID不能为空'
    }
  }
  
  // 开发环境检测
  const isDevEnv = event.isDevEnv || false;
  console.log('云函数acceptOrder - 参数:', { orderId, openid, isDevEnv });
  
  // 开发环境特殊处理
  if (isDevEnv) {
    console.log('云函数acceptOrder - 开发环境模式');
    
    try {
      // 查询订单信息
      let orderResult;
      try {
        orderResult = await ordersCollection.doc(orderId).get();
        console.log('开发环境 - 查询到订单:', orderResult.data);
      } catch (err) {
        console.error('开发环境 - 订单不存在或查询失败:', err);
        return {
          success: false,
          message: '订单不存在或查询失败',
          error: err
        };
      }
      
      if (!orderResult.data) {
        console.error('开发环境 - 订单不存在');
        return {
          success: false,
          message: '订单不存在'
        };
      }
      
      // 更新订单状态
      try {
        await ordersCollection.doc(orderId).update({
          data: {
            status: 'accepted',
            delivererId: openid || 'test_deliverer_id',
            delivererName: '测试配送员',
            delivererPhone: '13800138000',
            acceptTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
        console.log('开发环境 - 订单状态更新成功');
      } catch (err) {
        console.error('开发环境 - 更新订单状态失败:', err);
        return {
          success: false,
          message: '更新订单状态失败',
          error: err
        };
      }
      
      return {
        success: true,
        message: '开发环境接单成功'
      };
    } catch (err) {
      console.error('开发环境接单失败', err);
      return {
        success: false,
        message: '开发环境接单失败',
        error: err
      };
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
    
    // 检查订单状态是否可接单
    if (order.status !== 'pending') {
      await transaction.rollback()
      return {
        success: false,
        message: '当前订单状态不可接单'
      }
    }
    
    // 检查是否是自己发布的订单
    if (order.publisherId === openid) {
      await transaction.rollback()
      return {
        success: false,
        message: '不能接自己发布的订单'
      }
    }
    
    // 查询用户信息
    const userResult = await usersCollection.where({
      _openid: openid
    }).get()
    
    if (userResult.data.length === 0) {
      await transaction.rollback()
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    const user = userResult.data[0]
    
    // 获取系统配置
    const configResult = await configCollection.where({
      type: 'systemConfig'
    }).get()
    
    const config = configResult.data[0] || {
      creditScoreThreshold: 60,
      maxActiveOrdersThreshold: 3
    }
    
    // 检查用户信誉分
    if (user.creditScore < config.creditScoreThreshold) {
      await transaction.rollback()
      return {
        success: false,
        message: '您的信誉分过低，暂时无法接单'
      }
    }
    
    // 检查用户是否已达到最大接单数
    const activeOrdersResult = await ordersCollection.where({
      delivererId: openid,
      status: _.in(['accepted', 'delivering'])
    }).count()
    
    if (activeOrdersResult.total >= config.maxActiveOrdersThreshold) {
      await transaction.rollback()
      return {
        success: false,
        message: `您当前已有${activeOrdersResult.total}个进行中的订单，暂时无法接更多订单`
      }
    }
    
    // 更新订单状态
    await transaction.collection('orders').doc(orderId).update({
      data: {
        status: 'accepted',
        delivererId: openid,
        delivererName: user.name || user.nickName,
        delivererPhone: user.phone || '',
        acceptTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    await transaction.commit()
    
    return {
      success: true,
      message: '接单成功'
    }
  } catch (err) {
    await transaction.rollback()
    console.error('接单失败', err)
    return {
      success: false,
      message: '接单失败',
      error: err
    }
  }
} 