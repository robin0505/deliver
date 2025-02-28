const app = getApp();

Page({
  data: {
    activeTab: 'published', // 默认显示我发布的
    orders: [],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  // 状态文本转换函数
  getStatusText: function(status) {
    const statusMap = {
      0: '已取消',
      1: '待接单',
      2: '配送中',
      3: '已完成',
      4: '待确认',
      5: '有争议'
    };
    return statusMap[status] || '未知状态';
  },

  onLoad: function() {
    // 加载初始数据
    this.loadHistoryOrders();
  },

  onShow: function() {
    // 如果需要刷新订单数据
    if (app.globalData.historyOrdersNeedRefresh) {
      app.globalData.historyOrdersNeedRefresh = false;
      this.resetAndLoad();
    }
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.resetAndLoad(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 重置数据并重新加载
  resetAndLoad: function(callback) {
    this.setData({
      orders: [],
      page: 1,
      hasMore: true,
      loading: true
    }, () => {
      this.loadHistoryOrders(callback);
    });
  },

  // 切换选项卡
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    if (this.data.activeTab !== tab) {
      this.setData({
        activeTab: tab
      }, () => {
        this.resetAndLoad();
      });
    }
  },

  // 加载历史订单
  loadHistoryOrders: function(callback) {
    const { activeTab, page, pageSize, orders } = this.data;
    
    wx.cloud.callFunction({
      name: 'getHistoryOrders',
      data: {
        type: activeTab, // 'published' or 'delivered'
        page: page,
        pageSize: pageSize
      },
      success: res => {
        if (res.result && res.result.success) {
          const newOrders = res.result.data;
          
          // 合并订单数据
          const updatedOrders = page === 1 ? newOrders : [...orders, ...newOrders];
          
          this.setData({
            loading: false,
            orders: updatedOrders,
            hasMore: newOrders.length >= pageSize,
            page: page + 1
          });
        } else {
          this.setData({
            loading: false,
            hasMore: false
          });
          
          wx.showToast({
            title: res.result.message || '加载失败',
            icon: 'none'
          });
        }
        
        if (callback) callback();
      },
      fail: err => {
        console.error('获取历史订单失败', err);
        this.setData({
          loading: false,
          hasMore: false
        });
        
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
        
        if (callback) callback();
      }
    });
  },

  // 加载更多订单
  loadMoreOrders: function() {
    if (!this.data.hasMore || this.data.loading) return;
    
    this.setData({ loading: true });
    this.loadHistoryOrders();
  },

  // 跳转到订单详情
  goToOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/orderDetail/index?id=${orderId}`,
    });
  }
}); 