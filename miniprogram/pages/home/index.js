const app = getApp();

// 引入测试数据工具
const testDataUtil = require('../../utils/testData');
// 引入身份验证工具
const auth = require('../../utils/auth');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    dormitory: '',
    creditScore: 100,
    creditScoreClass: 'user-credit-good',
    creditScoreText: '良好',
    points: 0,
    userRole: '',
    userRoleText: '',
    ongoingOrders: [],
    isDevEnv: false
  },

  onLoad: function() {
    // 获取全局数据
    const app = getApp();
    
    // 检查是否为开发环境
    try {
      const { platform } = wx.getAppBaseInfo();
      this.setData({
        isDevEnv: platform === 'devtools'
      });
      
      // 检查是否需要生成开发环境数据
      if (this.data.isDevEnv) {
        console.log('开发环境，尝试生成初始数据');
        testDataUtil.createDevData();
      }
    } catch (error) {
      console.error('获取系统信息失败:', error);
      this.setData({
        isDevEnv: false
      });
    }

    // 检查用户登录状态
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      userInfo: app.globalData.userInfo
    });

    // 如果已登录，获取用户信息和进行中的订单
    if (this.data.isLoggedIn) {
      this.loadUserData();
      this.loadOngoingOrders();
    }
  },

  onShow: function() {
    this.checkLoginStatus();
    if (app.globalData.isLoggedIn) {
      this.loadUserData();
      this.loadOngoingOrders();
    }
  },

  // 检查登录状态
  checkLoginStatus: function() {
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      userInfo: app.globalData.userInfo
    });

    // 如果未登录，重定向到登录页
    if (!app.globalData.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/login/index',
      });
    }
  },

  // 加载用户数据
  loadUserData: function() {
    // 如果是开发环境，使用模拟数据
    if (this.data.isDevEnv) {
      console.log('开发环境使用模拟用户数据');
      this.setMockUserData();
      return;
    }
    
    const that = this;
    wx.cloud.callFunction({
      name: 'getUserData',
      data: {
        openid: app.globalData.openid
      },
      success: res => {
        if (res.result && res.result.data) {
          const userData = res.result.data;
          
          // 更新用户数据
          app.globalData.creditScore = userData.creditScore || 100;
          app.globalData.points = userData.points || 0;
          app.globalData.userRole = userData.role || 'user';
          
          // 计算信誉分显示类和文本
          let creditScoreClass = 'user-credit-good';
          let creditScoreText = '良好';
          
          if (userData.creditScore < 80) {
            creditScoreClass = 'user-credit-warning';
            creditScoreText = '一般';
          }
          
          if (userData.creditScore < 60) {
            creditScoreClass = 'user-credit-danger';
            creditScoreText = '较差';
          }
          
          // 设置用户角色文本
          let userRoleText = '普通用户';
          if (userData.role === 'deliverer') {
            userRoleText = '配送员';
          } else if (userData.role === 'admin') {
            userRoleText = '管理员';
          }
          
          this.setData({
            dormitory: userData.dormitory || '',
            creditScore: userData.creditScore || 100,
            creditScoreClass: creditScoreClass,
            creditScoreText: creditScoreText,
            points: userData.points || 0,
            userRole: userData.role || 'user',
            userRoleText: userRoleText
          });
        }
      },
      fail: err => {
        console.error('获取用户数据失败', err);
        
        // 开发环境下使用模拟数据
        if (this.data.isDevEnv) {
          console.log('云函数调用失败，使用模拟用户数据');
          this.setMockUserData();
        }
      }
    });
  },
  
  // 设置模拟用户数据
  setMockUserData: function() {
    // 获取用户角色
    const userRole = auth.getUserRole();
    
    // 模拟用户数据
    const mockUserData = {
      dormitory: '8号楼303',
      creditScore: 95,
      points: 500,
      role: userRole
    };
    
    // 计算信誉分显示类和文本
    let creditScoreClass = 'user-credit-good';
    let creditScoreText = '良好';
    
    if (mockUserData.creditScore < 80) {
      creditScoreClass = 'user-credit-warning';
      creditScoreText = '一般';
    }
    
    if (mockUserData.creditScore < 60) {
      creditScoreClass = 'user-credit-danger';
      creditScoreText = '较差';
    }
    
    // 设置用户角色文本
    let userRoleText = '普通用户';
    if (mockUserData.role === 'deliverer') {
      userRoleText = '配送员';
    } else if (mockUserData.role === 'admin') {
      userRoleText = '管理员';
    }
    
    this.setData({
      dormitory: mockUserData.dormitory,
      creditScore: mockUserData.creditScore,
      creditScoreClass: creditScoreClass,
      creditScoreText: creditScoreText,
      points: mockUserData.points,
      userRole: mockUserData.role,
      userRoleText: userRoleText
    });
    
    // 更新全局数据
    app.globalData.creditScore = mockUserData.creditScore;
    app.globalData.points = mockUserData.points;
    app.globalData.userRole = mockUserData.role;
    
    console.log('已设置模拟用户数据，角色:', mockUserData.role);
  },

  // 加载进行中的订单
  loadOngoingOrders: function() {
    // 如果是开发环境，使用模拟订单数据
    if (this.data.isDevEnv) {
      console.log('开发环境使用模拟订单数据');
      this.setMockOngoingOrders();
      return;
    }
    
    const that = this;
    const openid = app.globalData.openid;
    
    wx.cloud.callFunction({
      name: 'getOngoingOrders',
      data: {
        openid: openid
      },
      success: res => {
        if (res.result && res.result.data) {
          // 处理订单数据，添加状态文本和格式化时间
          const orders = res.result.data.map(item => {
            // 添加状态文本
            let statusText = '待接单';
            if (item.status === 'accepted') {
              statusText = '进行中';
            } else if (item.status === 'delivered') {
              statusText = '已送达';
            } else if (item.status === 'completed') {
              statusText = '已完成';
            } else if (item.status === 'cancelled') {
              statusText = '已取消';
            }
            
            // 格式化时间
            const createTime = new Date(item.createTime);
            const createTimeFormat = `${createTime.getMonth() + 1}月${createTime.getDate()}日 ${createTime.getHours()}:${createTime.getMinutes() < 10 ? '0' + createTime.getMinutes() : createTime.getMinutes()}`;
            
            // 判断是否是我接的单
            const isMyTake = item.courierId === openid;
            
            return {
              ...item,
              statusText,
              createTimeFormat,
              isMyTake
            };
          });
          
          this.setData({
            ongoingOrders: orders
          });
        }
      },
      fail: err => {
        console.error('获取进行中订单失败', err);
        
        // 开发环境下使用模拟数据
        if (this.data.isDevEnv) {
          console.log('云函数调用失败，使用模拟订单数据');
          this.setMockOngoingOrders();
        }
      }
    });
  },
  
  // 设置模拟进行中的订单
  setMockOngoingOrders: function() {
    // 模拟订单数据
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 格式化时间
    const formatTime = (date) => {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}`;
    };
    
    const mockOrders = [
      {
        _id: 'mock_ongoing_1',
        publisherId: app.globalData.openid,
        description: '测试订单1-帮取快递',
        platform: 'express',
        pickupLocation: '东门快递点',
        dormitory: '6号楼203',
        fee: 500,
        reward: 100,
        status: 'pending',
        statusText: '待接单',
        createTime: yesterday,
        createTimeFormat: formatTime(yesterday),
        isMyTake: false
      },
      {
        _id: 'mock_ongoing_2',
        publisherId: 'other_user',
        delivererId: app.globalData.openid,
        description: '测试订单2-帮买午餐',
        platform: 'food',
        pickupLocation: '学生食堂',
        dormitory: '8号楼105',
        fee: 300,
        reward: 200,
        status: 'accepted',
        statusText: '进行中',
        createTime: yesterday,
        acceptTime: now,
        createTimeFormat: formatTime(yesterday),
        isMyTake: true
      }
    ];
    
    this.setData({
      ongoingOrders: mockOrders
    });
    
    console.log('已设置模拟进行中订单数据');
  },

  // 取消订单
  cancelOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？取消会扣除信誉分',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '取消中',
          });
          
          // 开发环境下模拟取消
          if (this.data.isDevEnv) {
            setTimeout(() => {
              wx.hideLoading();
              wx.showToast({
                title: '取消成功(模拟)',
                icon: 'success'
              });
              
              // 更新订单列表，移除被取消的订单
              const updatedOrders = this.data.ongoingOrders.filter(order => order._id !== orderId);
              this.setData({
                ongoingOrders: updatedOrders
              });
            }, 1000);
            return;
          }
          
          // 正式环境调用云函数
          wx.cloud.callFunction({
            name: 'cancelOrder',
            data: {
              orderId: orderId,
              openid: app.globalData.openid
            },
            success: res => {
              wx.hideLoading();
              
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '取消成功',
                  icon: 'success'
                });
                
                // 重新加载订单列表
                this.loadOngoingOrders();
              } else {
                wx.showToast({
                  title: res.result.message || '取消失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              wx.hideLoading();
              console.error('取消订单失败', err);
              wx.showToast({
                title: '取消失败，请重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 标记送达
  markDelivered: function(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.navigateTo({
      url: `/pages/orderDetail/index?id=${orderId}&action=deliver`,
    });
  },

  // 确认收货
  confirmOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认收货',
      content: '确认已收到物品吗？确认后将完成订单并支付积分',
      success: res => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中',
          });
          
          // 开发环境下模拟确认收货
          if (this.data.isDevEnv) {
            setTimeout(() => {
              wx.hideLoading();
              wx.showToast({
                title: '订单已完成(模拟)',
                icon: 'success'
              });
              
              // 更新订单列表，移除已完成的订单
              const updatedOrders = this.data.ongoingOrders.filter(order => order._id !== orderId);
              
              // 更新积分余额
              const confirmOrder = this.data.ongoingOrders.find(order => order._id === orderId);
              if (confirmOrder) {
                const newPoints = this.data.points - confirmOrder.reward;
                this.setData({
                  ongoingOrders: updatedOrders,
                  points: newPoints
                });
              } else {
                this.setData({
                  ongoingOrders: updatedOrders
                });
              }
            }, 1000);
            return;
          }
          
          // 正式环境调用云函数
          wx.cloud.callFunction({
            name: 'completeOrder',
            data: {
              orderId: orderId,
              openid: app.globalData.openid
            },
            success: res => {
              wx.hideLoading();
              
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '订单已完成',
                  icon: 'success'
                });
                
                // 重新加载订单列表和用户数据
                this.loadOngoingOrders();
                this.loadUserData();
              } else {
                wx.showToast({
                  title: res.result.message || '操作失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              wx.hideLoading();
              console.error('完成订单失败', err);
              wx.showToast({
                title: '操作失败，请重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  }
}); 