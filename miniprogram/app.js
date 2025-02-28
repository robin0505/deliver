// app.js
App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    openid: '',
    userStatus: 'normal', // normal或banned
    creditScore: 100, // 信誉分，初始为100
    points: 0, // 积分余额
    userRole: 'user', // 用户角色：user(普通用户)、deliverer(配送员)、admin(管理员)
    config: {
      creditScoreThreshold: 60, // 低于此信誉分限制功能
      pointsRate: 100, // 积分兑换比例，100积分=1元
      dailyWithdrawLimit: 200, // 每日提现限额（元）
      cancelPenalty: 1, // 取消订单扣除信誉分
      overTimePenalty: 3, // 超时未完成扣除信誉分
      repRecoveryThreshold: 5, // 连续完成多少单恢复信誉分
      repRecoveryValue: 1 // 每次恢复的信誉分值
    },
    isDevEnv: false, // 是否为开发环境
    statusBarHeight: 0,
    needRefreshOrderList: false // 是否需要刷新订单列表
  },

  onLaunch: function () {
    // 检查是否为开发环境
    try {
      // 使用新API替换废弃的getSystemInfoSync
      const { platform } = wx.getAppBaseInfo();
      const { statusBarHeight } = wx.getWindowInfo();
      
      this.globalData.isDevEnv = platform === 'devtools';
      this.globalData.statusBarHeight = statusBarHeight;
      
      console.log('环境检测：', platform === 'devtools' ? '开发环境' : '生产环境');
    } catch (error) {
      console.error('获取系统信息失败:', error);
      // 降级处理
      this.globalData.isDevEnv = false;
      this.globalData.statusBarHeight = 20; // 默认值
    }

    // 云开发环境初始化
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      try {
        // ============ 重要：云环境配置 ==============
        // 首次使用时，需要在微信开发者工具中创建云环境
        // 1. 点击开发者工具左侧"云开发"按钮
        // 2. 点击"创建环境"
        // 3. 输入环境名称（如 "deliver-cloud"）并创建
        // 4. 创建成功后，复制环境ID（如 "deliver-3g5x7l9e5c6d4d2b"）
        // 5. 将下方的云环境ID替换为您创建的环境ID
        
        // 初始化云环境配置 - 您的云环境ID
        const envId = 'delivers-env-5g2o7c84d90c5436';
        
        // 初始化云环境
        wx.cloud.init({
          env: envId,
          traceUser: true
        });
        
        console.log('云环境初始化完成，环境ID:', envId);
      } catch (err) {
        console.error('云环境初始化失败:', err);
      }
    }
    
    // 获取用户登录状态
    this.checkLoginStatus();
  },
  
  // 检查登录状态
  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid');
    const userRole = wx.getStorageSync('userRole');
    
    if (userInfo && openid) {
      this.globalData.isLoggedIn = true;
      this.globalData.userInfo = userInfo;
      this.globalData.openid = openid;
      this.globalData.userRole = userRole || 'user'; // 默认为普通用户
      console.log('用户已登录，用户ID:', openid, '角色:', this.globalData.userRole);
      
      // 获取用户最新数据
      this.getUserData(openid);
    } else {
      console.log('用户未登录');
      this.globalData.isLoggedIn = false;
    }
  },
  
  // 获取用户数据
  getUserData: function(openid) {
    // 如果是开发环境且没有云环境配置，使用模拟数据
    if (this.globalData.isDevEnv) {
      // 检查是否有开发数据
      const devUserData = wx.getStorageSync('devUserData');
      if (devUserData) {
        console.log('使用本地开发用户数据');
        this.setDevUserData(devUserData);
        return;
      }
      
      // 创建默认开发数据
      const defaultDevData = {
        status: 'normal',
        creditScore: 95,
        points: 1000,
        dormitory: '8号楼303'
      };
      
      console.log('使用默认开发用户数据');
      this.setDevUserData(defaultDevData);
      return;
    }

    // 在开发环境中，如果没有openid则使用模拟openid
    if (!openid) {
      console.log('无有效用户ID，使用模拟数据');
      return;
    }
    
    // 调用云函数获取用户数据
    const that = this;
    wx.cloud.callFunction({
      name: 'getUserData',
      data: {
        openid: openid
      },
      success: res => {
        if (res.result && res.result.data) {
          const userData = res.result.data;
          
          that.globalData.userStatus = userData.status || 'normal';
          that.globalData.creditScore = userData.creditScore || 100;
          that.globalData.points = userData.points || 0;
          that.globalData.userRole = userData.role || 'user'; // 获取用户角色
          
          // 存储用户角色
          wx.setStorageSync('userRole', that.globalData.userRole);
          
          // 如果用户被封禁，提示用户
          if (userData.status === 'banned') {
            wx.showModal({
              title: '账号已被封禁',
              content: '您的账号因违反平台规则已被封禁，如有疑问请联系管理员',
              showCancel: false
            });
          }
        }
      },
      fail: err => {
        console.error('获取用户数据失败', err);
        
        // 错误处理
        if (err.errCode === -501000) {
          console.warn('云环境配置错误，请按照app.js中的说明配置正确的云环境ID');
          
          // 开发环境下显示友好提示
          if (that.globalData.isDevEnv) {
            wx.showModal({
              title: '云环境未配置',
              content: '请在app.js中配置您的云环境ID，或使用下方按钮创建云环境',
              confirmText: '知道了',
              showCancel: false
            });
          }
        }
      }
    });
  },
  
  // 设置开发环境用户数据
  setDevUserData: function(data) {
    this.globalData.userStatus = data.status || 'normal';
    this.globalData.creditScore = data.creditScore || 100;
    this.globalData.points = data.points || 0;
    
    // 保存到本地存储，方便后续使用
    wx.setStorageSync('devUserData', data);
  },

  // 获取全局配置
  getConfig: function() {
    // 如果是开发环境使用默认配置
    if (this.globalData.isDevEnv) {
      // 已有默认配置，不需额外处理
      return;
    }
    
    const that = this;
    wx.cloud.callFunction({
      name: 'getConfig',
      success: res => {
        if (res.result && res.result.data) {
          that.globalData.config = res.result.data;
        }
      },
      fail: err => {
        console.error('获取配置失败', err);
      }
    });
  }
});
