const app = getApp();

Page({
  data: {
    loading: true,
    orderData: null,
    userInfo: null,
    isMyOrder: false,
    isDeliverer: false,
    statusText: '',
    countdown: null,
    timer: null
  },

  onLoad: function(options) {
    if (options.id) {
      this.orderId = options.id;
      this.loadOrderDetail();
    } else {
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '订单ID不存在',
        icon: 'none'
      });
    }
  },

  onShow: function() {
    // 如果需要刷新订单数据（比如从其他页面返回）
    if (this.orderId && app.globalData.orderDetailNeedRefresh) {
      app.globalData.orderDetailNeedRefresh = false;
      this.loadOrderDetail();
    }
  },

  onUnload: function() {
    // 清除定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
  },

  // 加载订单详情
  loadOrderDetail: function() {
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'getOrderDetail',
      data: {
        orderId: this.orderId
      },
      success: res => {
        if (res.result && res.result.success) {
          const orderData = res.result.data;
          
          // 设置订单状态文本
          const statusTextMap = {
            0: '已取消',
            1: '待接单',
            2: '配送中',
            3: '已完成',
            4: '待确认',
            5: '有争议'
          };

          // 检查是否是自己发布的订单
          const isMyOrder = orderData.publisherId === app.globalData.openid;
          
          // 检查是否是自己接的单
          const isDeliverer = orderData.delivererId === app.globalData.openid;
          
          // 获取要显示的用户信息
          let userToShow = null;
          if (isMyOrder && orderData.delivererId) {
            userToShow = orderData.delivererInfo;
          } else if (!isMyOrder) {
            userToShow = orderData.publisherInfo;
          }

          this.setData({
            loading: false,
            orderData: orderData,
            statusText: statusTextMap[orderData.status] || '未知状态',
            isMyOrder: isMyOrder,
            isDeliverer: isDeliverer,
            userInfo: userToShow
          });

          // 如果是待接单状态，设置倒计时
          if (orderData.status === 1) {
            this.startCountdown(orderData.createTime);
          }
        } else {
          this.setData({
            loading: false,
            orderData: null
          });
          
          wx.showToast({
            title: res.result.message || '订单不存在',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('获取订单详情失败', err);
        this.setData({
          loading: false,
          orderData: null
        });
        
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 开始倒计时
  startCountdown: function(createTime) {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    
    // 订单有效期为30分钟
    const validTime = 30 * 60 * 1000;
    const createTimestamp = new Date(createTime).getTime();
    const expireTimestamp = createTimestamp + validTime;
    
    const updateCountdown = () => {
      const now = Date.now();
      const diff = expireTimestamp - now;
      
      if (diff <= 0) {
        clearInterval(this.data.timer);
        this.setData({
          countdown: '已超时',
          'orderData.status': 0,
          statusText: '已取消'
        });
        return;
      }
      
      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor(diff / 1000 % 60);
      
      this.setData({
        countdown: `${minutes}分${seconds}秒`
      });
    };
    
    updateCountdown();
    
    const timer = setInterval(updateCountdown, 1000);
    this.setData({ timer: timer });
  },

  // 取消订单
  cancelOrder: function() {
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中' });
          
          wx.cloud.callFunction({
            name: 'cancelOrder',
            data: {
              orderId: this.orderId
            },
            success: res => {
              wx.hideLoading();
              
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '取消成功',
                  icon: 'success'
                });
                
                // 刷新订单数据
                this.loadOrderDetail();
                
                // 设置全局标记，通知订单列表刷新
                app.globalData.orderListNeedRefresh = true;
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

  // 接单
  acceptOrder: function() {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/login/index',
      });
      return;
    }
    
    // 检查信誉分
    const userInfo = app.globalData.userInfo;
    if (userInfo.creditScore < 80) {
      wx.showToast({
        title: '信誉分不足，暂时无法接单',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '接单确认',
      content: '确认接此单吗？接单后请尽快与发单者联系并取件送达。',
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中' });
          
          // 打印调试信息
          console.log('开始接单，订单ID:', this.orderId);
          
          wx.cloud.callFunction({
            name: 'acceptOrder',
            data: {
              orderId: this.orderId
            },
            success: res => {
              wx.hideLoading();
              console.log('接单云函数返回结果:', res);
              
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '接单成功',
                  icon: 'success'
                });
                
                // 刷新订单数据
                this.loadOrderDetail();
                
                // 设置全局标记，通知订单列表刷新
                app.globalData.orderListNeedRefresh = true;
              } else {
                const errorMessage = res.result && res.result.message ? res.result.message : '接单失败';
                console.error('接单失败，原因:', errorMessage);
                wx.showToast({
                  title: errorMessage,
                  icon: 'none'
                });
              }
            },
            fail: err => {
              wx.hideLoading();
              console.error('接单云函数调用失败', err);
              wx.showToast({
                title: '接单失败，请稍后重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 标记已送达
  markDelivered: function() {
    wx.showModal({
      title: '送达确认',
      content: '确认已将物品送达指定地点？',
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中' });
          
          wx.cloud.callFunction({
            name: 'markDelivered',
            data: {
              orderId: this.orderId
            },
            success: res => {
              wx.hideLoading();
              
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '操作成功',
                  icon: 'success'
                });
                
                // 刷新订单数据
                this.loadOrderDetail();
              } else {
                wx.showToast({
                  title: res.result.message || '操作失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              wx.hideLoading();
              console.error('标记送达失败', err);
              wx.showToast({
                title: '操作失败，请重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 确认收货
  confirmOrder: function() {
    wx.showModal({
      title: '确认收货',
      content: '确认已收到物品？确认后将支付积分给配送员。',
      success: res => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中' });
          
          wx.cloud.callFunction({
            name: 'confirmOrder',
            data: {
              orderId: this.orderId
            },
            success: res => {
              wx.hideLoading();
              
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '确认成功',
                  icon: 'success'
                });
                
                // 刷新订单数据
                this.loadOrderDetail();
                
                // 设置全局标记，通知相关页面刷新
                app.globalData.orderListNeedRefresh = true;
                app.globalData.ongoingOrdersNeedRefresh = true;
              } else {
                wx.showToast({
                  title: res.result.message || '确认失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              wx.hideLoading();
              console.error('确认收货失败', err);
              wx.showToast({
                title: '确认失败，请重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 报告问题
  reportIssue: function() {
    wx.navigateTo({
      url: `/pages/feedback/index?orderId=${this.orderId}`,
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  }
}); 