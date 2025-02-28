/**
 * 订单创建工具
 * 用于创建真实订单数据
 */

// 订单平台选项
const PLATFORMS = ['美团', '饿了么', '商超便利', '同城配送', '货运快递'];
// 订单状态选项
const STATUS_OPTIONS = ['pending', 'accepted', 'delivered', 'completed', 'cancelled'];
// 随机描述选项
const DESC_OPTIONS = [
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

/**
 * 创建单个订单
 * @param {Object} orderData 订单数据（可选）
 * @returns {Promise} 创建结果
 */
function createSingleOrder(orderData = null) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      reject(new Error('请使用2.2.3以上版本基础库'));
      return;
    }

    // 获取用户信息
    const app = getApp();
    const userInfo = app && app.globalData ? app.globalData.userInfo : null;
    const openid = app && app.globalData ? app.globalData.openid : '';
    
    if (!userInfo || !openid) {
      reject(new Error('未登录状态无法创建订单'));
      return;
    }

    // 获取发布者名称 - 修复测试用户显示问题
    let publisherName = '用户';
    if (userInfo) {
      // 优先使用userInfo中的昵称
      publisherName = userInfo.nickName || '用户';
      
      // 检查是否为测试用户，测试用户的openid有特定前缀
      if (openid.startsWith('test_')) {
        // 从存储中获取完整的用户数据
        const storageUserInfo = wx.getStorageSync('userInfo');
        if (storageUserInfo && storageUserInfo.nickName) {
          publisherName = storageUserInfo.nickName;
          
          // 打印日志用于调试
          console.log('使用测试用户昵称:', publisherName);
        }
      }
    }
    
    console.log('当前用户信息:', userInfo);
    console.log('发布者名称:', publisherName);

    // 如果没有传入订单数据，创建随机订单
    if (!orderData) {
      // 默认为待接单状态
      const status = 'pending';
      const randomPlatform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
      // 10-50元随机配送费
      const randomFee = (Math.random() * 40 + 10).toFixed(2);
      // 200-1000积分随机小费
      const randomReward = Math.floor(Math.random() * 800 + 200);
      // 随机备注
      const randomDesc = DESC_OPTIONS[Math.floor(Math.random() * DESC_OPTIONS.length)];

      // 设置默认的取件和配送地址
      const pickupLocation = `${randomPlatform}取货点${Math.floor(Math.random() * 10) + 1}`;
      const dormitory = `${Math.floor(Math.random() * 10) + 1}号宿舍楼`;
      
      orderData = {
        // 基本信息
        platform: randomPlatform,
        description: randomDesc,
        fee: parseFloat(randomFee),
        reward: randomReward,
        status: status,
        pickupLocation: pickupLocation,
        dormitory: dormitory,
        // 用户信息
        publisherId: openid,
        publisherName: publisherName,
        publisherAvatar: userInfo.avatarUrl || '',
        // 时间信息
        createTime: new Date()
      };
    }

    // 调用云数据库添加记录
    const db = wx.cloud.database();
    db.collection('orders').add({
      data: orderData
    }).then(res => {
      console.log('订单创建成功', res);
      if (app && app.globalData) {
        app.globalData.needRefreshOrderList = true;
      }
      resolve({
        _id: res._id,
        ...orderData
      });
    }).catch(err => {
      console.error('订单创建失败', err);
      reject(err);
    });
  });
}

/**
 * 批量创建多个订单
 * @param {Number} count 要创建的订单数量
 * @returns {Promise} 创建结果
 */
function createMultipleOrders(count = 5) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud) {
      reject(new Error('请使用2.2.3以上版本基础库'));
      return;
    }
    
    if (count <= 0 || count > 20) {
      reject(new Error('订单数量应该在1-20之间'));
      return;
    }

    // 获取用户信息
    const app = getApp();
    const userInfo = app && app.globalData ? app.globalData.userInfo : null;
    const openid = app && app.globalData ? app.globalData.openid : '';
    
    if (!userInfo || !openid) {
      reject(new Error('未登录状态无法创建订单'));
      return;
    }
    
    // 获取发布者名称 - 修复测试用户显示问题
    let publisherName = '用户';
    if (userInfo) {
      // 优先使用userInfo中的昵称
      publisherName = userInfo.nickName || '用户';
      
      // 检查是否为测试用户，测试用户的openid有特定前缀
      if (openid.startsWith('test_')) {
        // 从存储中获取完整的用户数据
        const storageUserInfo = wx.getStorageSync('userInfo');
        if (storageUserInfo && storageUserInfo.nickName) {
          publisherName = storageUserInfo.nickName;
          console.log('批量创建使用测试用户昵称:', publisherName);
        }
      }
    }

    // 创建多个订单的函数
    const createOrders = async () => {
      const db = wx.cloud.database();
      const promises = [];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < count; i++) {
        // 默认为待接单状态
        const status = 'pending';
        const randomPlatform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
        // 10-50元随机配送费
        const randomFee = (Math.random() * 40 + 10).toFixed(2);
        // 200-1000积分随机小费
        const randomReward = Math.floor(Math.random() * 800 + 200);
        // 随机备注
        const randomDesc = DESC_OPTIONS[Math.floor(Math.random() * DESC_OPTIONS.length)];
        
        // 设置默认的取件和配送地址
        const pickupLocation = `${randomPlatform}取货点${Math.floor(Math.random() * 10) + 1}`;
        const dormitory = `${Math.floor(Math.random() * 10) + 1}号宿舍楼`;

        // 创建订单记录
        const orderData = {
          // 基本信息
          platform: randomPlatform,
          description: randomDesc,
          fee: parseFloat(randomFee),
          reward: randomReward,
          status: status,
          pickupLocation: pickupLocation,
          dormitory: dormitory,
          // 用户信息
          publisherId: openid,
          publisherName: publisherName,
          publisherAvatar: userInfo.avatarUrl || '',
          // 时间信息
          createTime: new Date()
        };

        // 添加到云数据库
        const promise = db.collection('orders').add({
          data: orderData
        }).then(res => {
          successCount++;
          return res;
        }).catch(err => {
          console.error(`第${i+1}个订单创建失败`, err);
          failCount++;
          return null;
        });

        promises.push(promise);
      }

      await Promise.all(promises);
      return { success: successCount, fail: failCount };
    };

    // 执行批量创建
    createOrders().then(result => {
      if (app && app.globalData) {
        app.globalData.needRefreshOrderList = true;
      }
      console.log('批量创建订单结果', result);
      resolve(result);
    }).catch(err => {
      console.error('批量创建订单失败', err);
      reject(err);
    });
  });
}

module.exports = {
  createSingleOrder,
  createMultipleOrders
}; 