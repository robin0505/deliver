const app = getApp();

Page({
  data: {
    isLoggedIn: false,
    userInfo: {},
    userData: {},
    isDevMode: false // 是否为开发模式
  },

  onLoad: function() {
    // 检查登录状态
    this.checkLoginStatus();
    // 检查是否为开发环境
    this.checkDevMode();
  },

  onShow: function() {
    // 每次显示页面时检查登录状态，确保数据最新
    this.checkLoginStatus();
  },

  // 检查是否为开发环境
  checkDevMode: function() {
    // 判断是否为开发环境的逻辑
    // 可以根据实际情况调整判断条件
    const accountInfo = wx.getAccountInfoSync();
    const envType = accountInfo.miniProgram.envVersion;
    
    // 如果是开发或体验版本，则显示测试工具
    const isDevMode = envType === 'develop' || envType === 'trial';
    
    this.setData({ isDevMode });
    console.log('当前环境:', envType, '是否为开发模式:', isDevMode);
  },

  // 检查登录状态并获取用户数据
  checkLoginStatus: function() {
    const isLoggedIn = app.globalData.isLoggedIn;
    
    this.setData({ isLoggedIn: isLoggedIn });
    
    if (isLoggedIn) {
      const userInfo = app.globalData.userInfo || {};
      const userData = wx.getStorageSync('userData') || {};
      
      this.setData({
        userInfo: userInfo,
        userData: userData
      });
    }
  },

  // 跳转到登录页面
  goToLogin: function() {
    wx.navigateTo({
      url: '/pages/login/index',
    });
  },

  // 跳转到用户详细信息页面
  goToUserInfo: function() {
    wx.navigateTo({
      url: '/pages/userInfo/index',
    });
  },

  // 跳转到钱包页面
  goToWallet: function() {
    wx.navigateTo({
      url: '/pages/wallet/index',
    });
  },

  // 跳转到充值页面
  goToRecharge: function() {
    wx.navigateTo({
      url: '/pages/recharge/index',
    });
  },

  // 跳转到正在进行的订单页面
  goToOngoingOrders: function(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/pages/ongoingOrders/index?type=${type}`,
    });
  },

  // 跳转到历史订单页面
  goToHistoryOrder: function() {
    wx.navigateTo({
      url: '/pages/historyOrder/index',
    });
  },

  // 跳转到地址管理页面
  goToAddress: function() {
    wx.navigateTo({
      url: '/pages/address/index',
    });
  },

  // 跳转到反馈建议页面
  goToFeedback: function() {
    wx.navigateTo({
      url: '/pages/feedback/index',
    });
  },

  // 联系客服
  contactService: function() {
    // 该功能通过button open-type="contact"实现
    // 此方法仅为占位，实际点击会触发微信原生客服
  },

  // 跳转到关于我们页面
  goToAbout: function() {
    wx.navigateTo({
      url: '/pages/about/index',
    });
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          app.globalData.isLoggedIn = false;
          app.globalData.userInfo = null;
          // 清除本地存储的用户数据
          wx.removeStorageSync('userData');
          
          // 更新页面状态
          this.setData({
            isLoggedIn: false,
            userInfo: {},
            userData: {}
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 跳转到测试工具页面
  goToTestTool: function() {
    wx.navigateTo({
      url: '/pages/testTool/index',
    });
  }
}); 