const app = getApp();

Page({
  data: {
    userInfo: null,
    showVerify: false,
    verifyQuestion: '请填写学校校徽上的字样',
    answerInput: '',
    correctAnswer: '厚德博学', // 校徽上的字样，后续可由管理员配置
    isDevEnv: true, // 是否为开发环境
    showMultiUserLogin: false, // 是否显示多用户登录面板
    testUsers: [
      { name: '李明（普通用户）', avatar: '/images/default-avatar.png', role: '普通用户' },
      { name: '张伟（配送员）', avatar: '/images/default-avatar.png', role: '配送员' },
      { name: '王强（管理员）', avatar: '/images/default-avatar.png', role: '管理员' }
    ],
    loading: false
  },

  onLoad: function() {
    // 检查用户是否已登录
    if (app.globalData.isLoggedIn) {
      this.navigateToNext();
    }
    
    // 获取系统信息检测平台
    const systemInfo = wx.getSystemInfoSync();
    console.log("系统信息:", systemInfo);
    console.log("平台:", systemInfo.platform);
    
    // 确保开发环境标识正确设置
    const isInDevTools = systemInfo.platform === 'devtools';
    
    // 更新页面数据
    this.setData({
      isDevEnv: isInDevTools || app.globalData.isDevEnv,
      showMultiUserLogin: isInDevTools // 在开发工具中自动显示测试登录选项
    });
    
    console.log("环境变量:", {
      isDevEnv: this.data.isDevEnv,
      showMultiUserLogin: this.data.showMultiUserLogin,
      globalIsDevEnv: app.globalData.isDevEnv
    });
  },

  // 模拟登录（仅开发环境使用）
  mockLogin: function() {
    console.log('进入模拟登录函数');
    
    // 显示多用户登录面板（不加环境检查，确保可以切换）
    this.setData({
      showMultiUserLogin: true
    });
    console.log('显示测试用户面板:', this.data.showMultiUserLogin);
  },
  
  // 选择测试用户登录
  selectTestUser: function(e) {
    const index = e.currentTarget.dataset.index;
    const user = this.data.testUsers[index];
    
    wx.showLoading({
      title: '模拟登录中',
    });
    
    // 创建模拟用户数据
    const mockUserInfo = {
      nickName: user.name,
      avatarUrl: user.avatar,
      gender: 1,
      country: 'China',
      province: 'Beijing',
      city: 'Haidian'
    };
    
    // 生成唯一的测试openid（使用固定前缀加角色确保同一用户每次使用相同ID）
    const mockOpenid = 'test_' + user.role + '_' + index;
    
    console.log('测试用户登录信息:', mockUserInfo, mockOpenid);
    
    // 保存模拟数据
    app.globalData.userInfo = mockUserInfo;
    app.globalData.openid = mockOpenid;
    app.globalData.isLoggedIn = true;
    app.globalData.userRole = user.role;
    wx.setStorageSync('userInfo', mockUserInfo);
    wx.setStorageSync('openid', mockOpenid);
    wx.setStorageSync('userRole', user.role);
    
    // 创建模拟用户记录
    wx.cloud.callFunction({
      name: 'createUser',
      data: {
        openid: mockOpenid,
        userInfo: mockUserInfo,
        createTime: new Date(),
        // 添加基本用户信息，避免需要填写个人资料页
        name: user.name,
        phone: '138' + index + '0138000',
        dormitory: (index + 1) + '号宿舍楼',
        creditScore: 100,
        points: 500,
        role: user.role
      },
      success: res => {
        wx.hideLoading();
        
        // 直接跳转到首页而不是用户信息页
        this.navigateToNext();
      },
      fail: err => {
        console.error('创建模拟用户失败', err);
        wx.hideLoading();
        wx.showToast({
          title: '模拟登录失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 关闭多用户登录面板
  closeMultiUserLogin: function() {
    this.setData({
      showMultiUserLogin: false
    });
  },

  // 获取用户信息
  onGetUserInfo: function(e) {
    if (e.detail.userInfo) {
      this.setData({
        userInfo: e.detail.userInfo,
        showVerify: true
      });
      
      // 获取微信用户的openid
      wx.showLoading({
        title: '登录中',
      });
      
      wx.cloud.callFunction({
        name: 'login',
        success: res => {
          wx.hideLoading();
          const openid = res.result.openid;
          app.globalData.openid = openid;
          
          // 查询用户是否已注册
          wx.cloud.callFunction({
            name: 'getUserData',
            data: {
              openid: openid
            },
            success: res => {
              // 如果用户已注册，直接进入下一页
              if (res.result && res.result.data) {
                // 保存用户数据
                app.globalData.userInfo = e.detail.userInfo;
                app.globalData.isLoggedIn = true;
                wx.setStorageSync('userInfo', e.detail.userInfo);
                wx.setStorageSync('openid', openid);
                
                // 如果用户已完善信息，直接进入首页
                if (res.result.data.name && res.result.data.phone && res.result.data.dormitory) {
                  this.navigateToNext();
                } else {
                  // 否则先完善个人资料
                  wx.navigateTo({
                    url: '/pages/userInfo/index?isNew=true',
                  });
                }
              } else {
                // 显示校园身份验证
                this.setData({ showVerify: true });
              }
            },
            fail: err => {
              console.error('获取用户数据失败', err);
              wx.hideLoading();
            }
          });
        },
        fail: err => {
          console.error('登录失败', err);
          wx.hideLoading();
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '请授权获取用户信息',
        icon: 'none'
      });
    }
  },

  // 输入答案
  onAnswerInput: function(e) {
    this.setData({
      answerInput: e.detail.value
    });
  },

  // 验证答案
  verifyAnswer: function() {
    const { answerInput, correctAnswer, userInfo } = this.data;
    
    if (!answerInput) {
      wx.showToast({
        title: '请输入答案',
        icon: 'none'
      });
      return;
    }
    
    // 验证答案是否正确（此处可以更换为云函数验证，避免前端硬编码答案）
    if (answerInput === correctAnswer) {
      // 答案正确，创建新用户
      wx.showLoading({
        title: '验证成功',
      });
      
      const openid = app.globalData.openid;
      if (!openid) {
        wx.hideLoading();
        wx.showToast({
          title: '登录态异常，请重试',
          icon: 'none'
        });
        return;
      }
      
      // 调用云函数创建用户
      wx.cloud.callFunction({
        name: 'createUser',
        data: {
          openid: openid,
          userInfo: userInfo,
          createTime: new Date()
        },
        success: res => {
          wx.hideLoading();
          
          // 保存登录状态
          app.globalData.userInfo = userInfo;
          app.globalData.isLoggedIn = true;
          wx.setStorageSync('userInfo', userInfo);
          wx.setStorageSync('openid', openid);
          
          // 跳转到完善信息页面
          wx.navigateTo({
            url: '/pages/userInfo/index?isNew=true',
          });
        },
        fail: err => {
          console.error('创建用户失败', err);
          wx.hideLoading();
          wx.showToast({
            title: '注册失败，请重试',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '校验答案不正确',
        icon: 'none'
      });
    }
  },

  // 跳转到下一页
  navigateToNext: function() {
    wx.switchTab({
      url: '/pages/home/index',
    });
  },
  
  // 显示用户协议
  showUserAgreement: function() {
    wx.navigateTo({
      url: '/pages/agreement/index?type=user',
    });
  },
  
  // 显示隐私政策
  showPrivacyPolicy: function() {
    wx.navigateTo({
      url: '/pages/agreement/index?type=privacy',
    });
  },

  // 微信一键登录
  handleWechatLogin: function() {
    this.setData({ loading: true });
    
    // 显示加载提示
    wx.showLoading({ title: '登录中...' });
    
    // 调用微信登录接口获取code
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('获取到登录code:', res.code);
          
          // 通过云函数获取openid和session_key
          wx.cloud.callFunction({
            name: 'wxLogin',
            data: { code: res.code },
            success: (result) => {
              console.log('登录成功:', result.result);
              const { openid, session_key } = result.result;
              
              if (!openid) {
                this.handleLoginError('未获取到有效用户标识');
                return;
              }
              
              // 保存登录状态
              getApp().globalData.openid = openid;
              getApp().globalData.isLoggedIn = true;
              wx.setStorageSync('openid', openid);
              
              // 获取已注册的用户信息
              this.getUserFromDatabase(openid);
            },
            fail: (err) => {
              console.error('调用登录云函数失败:', err);
              this.handleLoginError('登录处理失败');
            }
          });
        } else {
          this.handleLoginError('获取登录凭证失败');
        }
      },
      fail: (err) => {
        console.error('微信登录API调用失败:', err);
        this.handleLoginError('微信登录失败');
      }
    });
  },
  
  // 从数据库获取用户信息
  getUserFromDatabase: function(openid) {
    wx.cloud.callFunction({
      name: 'getUserData',
      data: { openid },
      success: (res) => {
        if (res.result && res.result.success) {
          // 用户已存在，直接登录成功
          const userData = res.result.data;
          this.handleLoginSuccess(userData);
        } else {
          // 用户不存在，需要创建新用户
          this.createNewUser(openid);
        }
      },
      fail: (err) => {
        console.error('获取用户数据失败:', err);
        this.handleLoginError('获取用户信息失败');
      }
    });
  },
  
  // 创建新用户
  createNewUser: function(openid) {
    // 创建基本用户数据
    const userData = {
      openid: openid,
      nickName: '微信用户',  // 默认昵称
      avatarUrl: '/images/default-avatar.png',  // 默认头像
      createTime: new Date(),
      role: 'user',
      creditScore: 100,
      points: 100
    };
    
    wx.cloud.callFunction({
      name: 'createUser',
      data: userData,
      success: (res) => {
        if (res.result && res.result.success) {
          this.handleLoginSuccess(userData);
        } else {
          this.handleLoginError('创建用户失败');
        }
      },
      fail: (err) => {
        console.error('创建用户失败:', err);
        this.handleLoginError('创建用户失败');
      }
    });
  },
  
  // 处理登录成功
  handleLoginSuccess: function(userData) {
    // 隐藏加载提示
    wx.hideLoading();
    this.setData({ loading: false });
    
    // 保存用户信息
    const app = getApp();
    const userInfo = {
      nickName: userData.name || userData.nickName || '微信用户',
      avatarUrl: userData.avatarUrl || '/images/default-avatar.png'
    };
    
    app.globalData.userInfo = userInfo;
    app.globalData.userRole = userData.role || 'user';
    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('userRole', userData.role || 'user');
    
    // 提示登录成功
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500,
      complete: () => {
        // 跳转到首页
        wx.switchTab({ url: '/pages/home/index' });
      }
    });
  },
  
  // 处理登录错误
  handleLoginError: function(message) {
    wx.hideLoading();
    this.setData({ loading: false });
    
    wx.showToast({
      title: message || '登录失败，请重试',
      icon: 'none',
      duration: 2000
    });
  }
})