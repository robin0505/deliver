// 导入创建订单工具
const { createSingleOrder, createMultipleOrders } = require('../../utils/createOrder.js');
// 导入授权工具
const { isAdmin } = require('../../utils/auth.js');

Page({
  data: {
    createCount: 5,
    isLoading: false,
    logs: [],
    cloudFunctionError: false, // 记录云函数调用错误
    systemInfo: null, // 系统信息
    deviceInfo: {}, // 设备信息
    isAdminUser: false, // 是否为管理员用户
    userOpenId: '', // 用户的OpenID
    networkType: '', // 网络类型
    showSystemInfo: false, // 是否显示系统信息面板
    storageInfo: null, // 存储信息
  },

  onLoad: function (options) {
    console.log('开发工具页面加载');
    
    // 检查用户权限
    const adminAuth = isAdmin();
    this.setData({ isAdminUser: adminAuth });
    
    if (!adminAuth) {
      this.addLog('提示: 部分功能需要管理员权限');
    }
    
    // 获取用户OpenID
    const app = getApp();
    if (app && app.globalData && app.globalData.openid) {
      this.setData({ userOpenId: app.globalData.openid });
    }
    
    // 检查云环境
    if (!wx.cloud) {
      this.setData({ cloudFunctionError: true });
      this.addLog('错误: 当前环境不支持云开发，无法使用开发工具');
    } else {
      this.checkCloudFunction();
    }
    
    // 获取网络状态
    wx.getNetworkType({
      success: (res) => {
        this.setData({ networkType: res.networkType });
        this.addLog(`网络状态: ${res.networkType}`);
      }
    });
    
    // 获取存储信息
    wx.getStorageInfo({
      success: (res) => {
        this.setData({ storageInfo: res });
      }
    });
  },
  
  onShow: function() {
    // 每次显示页面时检查管理员状态
    this.setData({ isAdminUser: isAdmin() });
  },
  
  // 检查云函数是否可用
  checkCloudFunction: function() {
    this.addLog('检查云函数状态...');
    this.setData({ isLoading: true });
    
    wx.cloud.callFunction({
      name: 'getConfig',
      success: res => {
        this.addLog('云环境连接成功');
        this.setData({ isLoading: false });
      },
      fail: err => {
        console.error('云函数调用失败', err);
        this.setData({ 
          isLoading: false,
          cloudFunctionError: true
        });
        this.addLog(`错误: 云函数调用失败 - ${err.errMsg || JSON.stringify(err)}`);
      }
    });
  },

  // 添加日志
  addLog: function (log) {
    // 最多保留50条日志
    const logs = this.data.logs.slice(0, 49);
    logs.unshift(`${new Date().toLocaleTimeString()} ${log}`);
    this.setData({ logs });
  },

  /**
   * 清空日志
   */
  clearLogs: function () {
    this.setData({ logs: [] });
    this.addLog('日志已清空');
  },

  /**
   * 创建单个订单
   */
  createSingleOrder: function () {
    this.setData({ isLoading: true });
    this.addLog('开始创建订单...');

    createSingleOrder()
      .then(res => {
        this.addLog(`创建订单成功: ID ${res._id}`);
        this.setData({ isLoading: false });
      })
      .catch(err => {
        console.error('[订单创建失败]', err);
        this.addLog(`错误: 创建订单失败 - ${err.message || '未知错误'}`);
        this.setData({ isLoading: false });
        
        // 检查是否是云函数连接问题
        if (err.message && (err.message.includes('cloud function') || err.message.includes('云函数'))) {
          this.setData({ cloudFunctionError: true });
        }
      });
  },

  /**
   * 批量创建订单
   */
  createMultipleOrders: function () {
    const count = this.data.createCount;
    this.setData({ isLoading: true });
    this.addLog(`开始批量创建 ${count} 个订单...`);

    createMultipleOrders(count)
      .then(res => {
        const successCount = res.success || 0;
        const failCount = res.fail || 0;
        
        if (successCount > 0) {
          this.addLog(`成功创建 ${successCount} 个订单`);
        }
        
        if (failCount > 0) {
          this.addLog(`警告: ${failCount} 个订单创建失败`);
        }
        
        this.setData({ isLoading: false });
      })
      .catch(err => {
        console.error('[批量创建订单失败]', err);
        this.addLog(`错误: 批量创建订单失败 - ${err.message || '未知错误'}`);
        this.setData({ isLoading: false });
        
        // 检查是否是云函数连接问题
        if (err.message && (err.message.includes('cloud function') || err.message.includes('云函数'))) {
          this.setData({ cloudFunctionError: true });
        }
      });
  },

  /**
   * 修改创建数量
   */
  changeCount: function (e) {
    let count = parseInt(e.detail.value) || 1;
    
    // 限制范围在1-20之间
    if (count < 1) count = 1;
    if (count > 20) count = 20;
    
    this.setData({ createCount: count });
  },

  /**
   * 获取系统信息
   */
  getSystemInfo: function() {
    this.setData({ isLoading: true });
    this.addLog('获取系统信息...');
    
    try {
      const systemInfo = wx.getSystemInfoSync();
      this.setData({ 
        systemInfo: systemInfo,
        showSystemInfo: true,
        isLoading: false
      });
      this.addLog('系统信息获取成功');
    } catch (err) {
      this.setData({ isLoading: false });
      this.addLog(`错误: 获取系统信息失败 - ${err.message || JSON.stringify(err)}`);
      console.error('获取系统信息失败', err);
    }
  },
  
  /**
   * 关闭系统信息面板
   */
  closeSystemInfo: function() {
    this.setData({ showSystemInfo: false });
  },
  
  /**
   * 清理本地存储
   */
  clearStorage: function() {
    wx.showModal({
      title: '确认清理',
      content: '确定要清理所有本地存储数据吗？这将删除所有本地缓存的数据，包括登录信息。',
      confirmText: '确定清理',
      confirmColor: '#FF0000',
      success: (res) => {
        if (res.confirm) {
          try {
            this.setData({ isLoading: true });
            wx.clearStorageSync();
            this.addLog('成功清理本地存储');
            
            // 更新存储信息
            wx.getStorageInfo({
              success: (res) => {
                this.setData({ 
                  storageInfo: res,
                  isLoading: false
                });
              },
              fail: () => {
                this.setData({ isLoading: false });
              }
            });
            
            // 提示用户需要重新登录
            wx.showToast({
              title: '已清理所有数据，需要重新登录',
              icon: 'none',
              duration: 3000
            });
          } catch (err) {
            this.setData({ isLoading: false });
            this.addLog(`错误: 清理本地存储失败 - ${err.message || JSON.stringify(err)}`);
            console.error('清理本地存储失败', err);
          }
        }
      }
    });
  },

  // 重新部署云函数
  redeployCloudFunction: function () {
    wx.showModal({
      title: '云函数连接问题',
      content: '请确保已经正确部署云函数，并且小程序已经关联云环境。如果问题持续存在，请尝试重新部署云函数。',
      showCancel: false
    });
  },

  // 导航到订单列表
  navigateToOrderList: function () {
    wx.navigateTo({
      url: '/pages/orderList/index'
    });
  },
  
  // 复制OpenID到剪贴板
  copyOpenId: function() {
    if (this.data.userOpenId) {
      wx.setClipboardData({
        data: this.data.userOpenId,
        success: () => {
          wx.showToast({
            title: 'OpenID已复制',
            icon: 'success'
          });
          this.addLog('已复制OpenID到剪贴板');
        }
      });
    } else {
      this.addLog('错误: 未找到有效的OpenID');
      wx.showToast({
        title: '未找到有效的OpenID',
        icon: 'none'
      });
    }
  }
}) 