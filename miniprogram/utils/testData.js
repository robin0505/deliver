/**
 * 开发数据生成工具
 * 用于开发环境下生成初始数据，方便开发和测试
 */

// 创建开发数据函数
const createDevData = function() {
  console.log('开始创建开发环境数据...');
  
  // 检查是否支持云能力
  if (!wx.cloud) {
    console.log('当前环境不支持云开发，跳过数据创建');
    showToastMessage('当前环境不支持云开发', 'none');
    return;
  }
  
  // 仅在开发环境中创建数据
  try {
    const { platform } = wx.getAppBaseInfo();
    if (platform !== 'devtools') {
      console.log('非开发环境，跳过开发数据创建');
      return;
    }
    
    // 获取APP实例
    const app = getApp();
    if (!app) {
      console.log('无法获取App实例，跳过数据创建');
      showToastMessage('无法获取应用实例', 'none');
      return;
    }
    
    // 尝试创建开发数据
    createDevDataWithFallback();
  } catch (err) {
    console.error('创建开发数据过程出错:', err);
    showToastMessage('创建开发数据失败', 'none');
  }
};

// 带有后备机制的开发数据创建
const createDevDataWithFallback = function() {
  // 获取APP实例
  const app = getApp();
  let openid = app.globalData.openid;
  
  // 如果用户未登录，使用模拟openid
  if (!openid) {
    openid = 'dev_user_' + new Date().getTime();
    console.log('用户未登录，使用模拟openid:', openid);
  }
  
  // 首先尝试通过云数据库创建
  try {
    // 创建用户数据
    createDevUserData(openid);
    
    // 创建订单数据
    createDevOrderData(openid);
  } catch (err) {
    console.error('通过云数据库创建数据失败:', err);
    showToastMessage('创建数据失败', 'none');
  }
};

// 创建用户数据
const createDevUserData = function(openid) {
  // 获取数据库实例
  const db = wx.cloud.database();
  
  // 查询当前用户是否已存在
  db.collection('users').where({
    _openid: openid
  }).get().then(res => {
    if (res.data.length > 0) {
      console.log('用户数据已存在，无需创建');
      return;
    }
    
    // 创建用户数据
    db.collection('users').add({
      data: {
        _openid: openid,
        nickName: '开发用户',
        avatarUrl: '/images/default-avatar.png',
        createTime: new Date(),
        lastLoginTime: new Date(),
        role: 'user', // 用户角色
        status: 'active', // 用户状态
        balance: 0, // 账户余额（分）
        orderCount: 0, // 订单数量
        deliveryCount: 0, // 配送数量
        score: 100, // 用户评分
      }
    }).then(res => {
      console.log('用户数据创建成功:', res._id);
    }).catch(err => {
      console.error('用户数据创建失败:', err);
    });
  }).catch(err => {
    console.error('查询用户数据失败:', err);
  });
};

// 创建订单数据
const createDevOrderData = function(openid) {
  // 获取数据库实例
  const db = wx.cloud.database();
  
  // 查询是否已经有订单数据
  db.collection('orders').where({
    publisherId: openid
  }).count().then(res => {
    if (res.total > 0) {
      console.log('已有订单数据，跳过创建');
      return;
    }
    
    // 创建5个订单数据
    createMultipleOrders(openid, 5);
  }).catch(err => {
    console.error('查询订单数据失败:', err);
  });
};

// 创建多个订单
const createMultipleOrders = function(openid, count) {
  // 获取数据库实例
  const db = wx.cloud.database();
  
  // 创建随机订单数据
  const orders = [];
  for (let i = 0; i < count; i++) {
    // 创建数据
    const now = new Date();
    now.setHours(now.getHours() - i * 2); // 每个订单相差2小时
    
    // 随机订单数据
    const platformOptions = ['美团', '饿了么', '商超便利', '同城配送', '货运快递'];
    const randomPlatform = platformOptions[Math.floor(Math.random() * platformOptions.length)];
    
    // 随机状态
    const statusOptions = ['待接单', '待取货', '待送达', '已完成', '已取消'];
    const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    
    // 随机费用和报酬 (元为单位)
    const randomFee = (Math.random() * 40 + 10).toFixed(2); // 10-50元随机配送费
    const randomReward = (Math.random() * 8 + 2).toFixed(2); // 2-10元随机小费
    
    // 随机备注
    const descOptions = [
      '请帮忙配送，谢谢',
      '请按照订单备注配送',
      '请尽快送达，谢谢',
      '不用敲门，放门口就行',
      '麻烦放在前台，谢谢',
      '请联系我取件',
      '请小心轻放',
      '不要辣，谢谢',
      '帮忙带一下餐具',
      '帮忙点一下完成'
    ];
    const randomDesc = descOptions[Math.floor(Math.random() * descOptions.length)];
    
    // 创建订单数据
    const orderData = {
      publisherId: openid,
      publisher: {
        nickName: '开发用户',
        avatarUrl: '/images/default-avatar.png'
      },
      description: randomDesc,
      platform: randomPlatform,
      shop: `${randomPlatform}商家${Math.floor(Math.random() * 1000) + 1}`,
      status: randomStatus,
      fee: parseFloat(randomFee),
      reward: parseFloat(randomReward),
      createTime: now
    };
    
    // 添加到订单数组
    orders.push(orderData);
  }
  
  // 批量添加到数据库
  addOrdersBatch(orders);
};

// 批量添加订单
const addOrdersBatch = function(orders) {
  // 获取数据库实例
  const db = wx.cloud.database();
  
  // 批量添加订单
  const addPromises = orders.map(order => {
    return db.collection('orders').add({
      data: order
    });
  });
  
  // 等待所有添加完成
  Promise.all(addPromises).then(results => {
    console.log(`成功添加${results.length}个订单数据`);
    showToastMessage(`成功添加${results.length}个订单`, 'success');
  }).catch(err => {
    console.error('批量添加订单失败:', err);
    showToastMessage('添加订单失败', 'none');
  });
};

// 辅助函数 - 显示提示消息
const showToastMessage = function(message, icon = 'none') {
  wx.showToast({
    title: message,
    icon: icon,
    duration: 2000
  });
};

// 模块导出
module.exports = {
  createDevData
}; 