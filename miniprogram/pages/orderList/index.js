const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    currentTab: 'all',  // 当前选中的标签：all, express, food, other
    orders: [],  // 订单列表
    loading: false,  // 是否正在加载
    refreshing: false,  // 是否正在下拉刷新
    hasMore: true,  // 是否还有更多数据
    pageNum: 1,  // 当前页码
    pageSize: 10,  // 每页条数
    searchKeyword: '',  // 搜索关键词
    isDevEnv: false,  // 是否为开发环境
    noMoreData: false,
    tabs: [
      { id: 'all', name: '全部' },
      { id: 'express', name: '快递' },
      { id: 'food', name: '餐食' },
      { id: 'shopping', name: '购物' },
      { id: 'other', name: '其他' }
    ],
    searchFocus: false,
    searchPlaceholder: '搜索订单',
    startX: 0,
    startY: 0,
    lastRefreshTime: 0,
    currentPage: 1,
    isRefreshing: false,
    debugInfo: "" // 添加调试信息字段
  },

  // 页面加载
  onLoad: function() {
    // 获取系统信息判断是否为开发环境
    try {
      const { platform } = wx.getAppBaseInfo();
      this.setData({
        isDevEnv: platform === 'devtools'
      });
      console.log('当前环境:', platform === 'devtools' ? '开发环境' : '生产环境');
    } catch (error) {
      console.error('获取系统信息失败:', error);
      // 降级处理，默认非开发环境
      this.setData({
        isDevEnv: false
      });
    }
    
    this.loadOrders();
  },

  // 页面显示
  onShow: function() {
    // 获取全局数据
    const app = getApp();
    
    // 检查是否需要刷新订单列表
    if (app && app.globalData && app.globalData.needRefreshOrderList) {
      console.log('检测到需要刷新订单列表');
      
      // 重置页码并重新加载数据
      this.setData({
        currentPage: 1,
        orders: [],
        noMoreData: false
      });
      
      this.loadOrders();
      
      // 重置刷新标志
      app.globalData.needRefreshOrderList = false;
    }
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.refreshOrderList();
  },

  // 刷新订单列表
  refreshOrderList: function() {
    // 避免频繁刷新
    const now = new Date().getTime();
    if (now - this.data.lastRefreshTime < 1000) {
      wx.stopPullDownRefresh();
      return;
    }
    
    this.setData({
      orders: [],
      currentPage: 1,
      noMoreData: false,
      isRefreshing: true
    });
    
    this.loadOrders();
  },

  // 加载订单列表
  loadOrders: function() {
    if (this.data.loading || this.data.noMoreData) {
      return;
    }
    
    this.setData({
      loading: true,
      debugInfo: `开始加载订单...\n当前Tab: ${this.data.currentTab}\n页码: ${this.data.currentPage}`
    });
    
    console.log('开始加载订单列表，当前标签:', this.data.currentTab, '当前页:', this.data.currentPage);
    
    // 获取全局环境变量
    const app = getApp();
    const isDevEnv = app.globalData.isDevEnv || this.data.isDevEnv;
    console.log('当前环境:', isDevEnv ? '开发环境' : '生产环境');

    
    // 首先尝试使用云函数获取真实数据
    wx.cloud.callFunction({
      name: 'getOrderList',
      data: {
        platform: this.data.currentTab !== 'all' ? this.data.currentTab : '',
        keyword: this.data.searchKeyword,
        page: this.data.currentPage,
        pageSize: this.data.pageSize,
        status: 'all',  // 获取所有状态的订单
        isDevEnv: isDevEnv // 传递开发环境标志
        // 不传onlyMine参数，使用云函数的默认逻辑
      },
      success: res => {
        console.log('订单列表获取结果:', res);
        let debugStatus = '成功';
        
        if (res.result && res.result.success) {
          if (res.result.data && res.result.data.length > 0) {
            debugStatus = 'success';
            this.setData({
              debugInfo: this.data.debugInfo + 
                `\n云函数调用成功 ✓\n共获取 ${res.result.data.length} 条数据` +
                `\n查询条件: ${JSON.stringify(res.result.query)}`
            });
            
            // 格式化时间
            const newOrders = res.result.data.map(item => {
              // 格式化时间
              let createTimeFormat = '';
              if (item.createTime) {
                const createTime = new Date(item.createTime);
                createTimeFormat = `${createTime.getMonth() + 1}月${createTime.getDate()}日 ${createTime.getHours()}:${createTime.getMinutes() < 10 ? '0' + createTime.getMinutes() : createTime.getMinutes()}`;
              } else {
                console.log('订单缺少创建时间:', item);
                createTimeFormat = '未知时间';
              }
              
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
              
              // 确保publisherInfo字段存在
              const publisherInfo = item.publisher || {
                nickName: '未知用户',
                avatarUrl: '/images/default-avatar.png'
              };
              
              return {
                ...item,
                createTimeFormat,
                statusText,
                publisherInfo,
                // 转换报酬显示格式
                rewardText: (item.reward / 100).toFixed(2)
              };
            });
            
            console.log('处理后的订单数据:', newOrders.length, '条');
            
            // 更新数据
            const orders = this.data.currentPage === 1 ? newOrders : this.data.orders.concat(newOrders);
            
            this.setData({
              orders: orders,
              noMoreData: newOrders.length < this.data.pageSize,
              currentPage: this.data.currentPage + 1,
              lastRefreshTime: new Date().getTime(),
              loading: false,
              isRefreshing: false
            });
            
            wx.stopPullDownRefresh();
          } else {
            debugStatus = 'warning';
            this.setData({
              debugInfo: this.data.debugInfo + 
                `\n云函数调用成功 ✓\n但未返回数据 ⚠️\n查询条件: ${JSON.stringify(res.result.query || {})}`
            });
            
            // 如果是第一页没有数据，尝试直接从数据库获取
            if (this.data.currentPage === 1) {
              console.log('云函数返回数据为空，尝试从数据库直接获取');
              this.loadOrdersFromDatabase();
            } else {
              // 如果是加载更多没有数据，则表示没有更多了
              this.setData({
                noMoreData: true,
                loading: false,
                isRefreshing: false
              });
              
              wx.stopPullDownRefresh();
            }
          }
        } else {
          debugStatus = 'error';
          this.setData({
            debugInfo: this.data.debugInfo + 
              `\n云函数返回错误 ❌\n${res.result && res.result.message ? res.result.message : '未知错误'}`
          });
          
          // 如果是开发环境，尝试使用直接从数据库获取
          if (this.data.isDevEnv) {
            console.log('云函数返回错误，尝试从数据库直接获取');
            this.loadOrdersFromDatabase();
          } else {
            this.setData({
              orders: this.data.currentPage === 1 ? [] : this.data.orders,
              loading: false,
              isRefreshing: false
            });
            
            wx.showToast({
              title: '获取订单失败',
              icon: 'none'
            });
            
            wx.stopPullDownRefresh();
          }
        }
      },
      fail: err => {
        console.error('订单列表获取失败', err);
        this.setData({
          debugInfo: this.data.debugInfo + 
            `\n云函数调用失败 ❌\n错误信息: ${err.errMsg || JSON.stringify(err)}`
        });
        
        // 如果是开发环境，尝试使用直接从数据库获取
        if (this.data.isDevEnv) {
          console.log('云函数调用失败，尝试从数据库直接获取');
          this.loadOrdersFromDatabase();
        } else {
          this.setData({
            loading: false,
            isRefreshing: false
          });
          
          wx.showToast({
            title: '获取订单失败',
            icon: 'none'
          });
          
          wx.stopPullDownRefresh();
        }
      }
    });
  },
  
  // 直接从数据库加载订单数据
  loadOrdersFromDatabase: function() {
    console.log('直接从数据库加载订单数据');
    this.setData({
      debugInfo: this.data.debugInfo + "\n开始直接从数据库加载数据..."
    });
    
    // 获取数据库引用
    const db = wx.cloud.database();
    const ordersCollection = db.collection('orders');
    
    // 构建查询条件
    let query = {};
    
    // 按平台筛选
    if (this.data.currentTab !== 'all') {
      query.platform = this.data.currentTab;
    }
    
    // 按关键词筛选
    if (this.data.searchKeyword) {
      // 微信小程序数据库不支持模糊查询，这里简化处理
      query.description = db.RegExp({
        regexp: this.data.searchKeyword,
        options: 'i'
      });
    }
    
    // 分页参数
    const pageSize = this.data.pageSize;
    const skip = (this.data.currentPage - 1) * pageSize;
    
    console.log('数据库查询条件:', query, '跳过:', skip, '限制:', pageSize);
    this.setData({
      debugInfo: this.data.debugInfo + `\n查询条件: ${JSON.stringify(query)}\n跳过: ${skip}, 限制: ${pageSize}`
    });
    
    // 查询所有订单总数，不考虑分页
    ordersCollection.count().then(allCountRes => {
      console.log('所有订单总数:', allCountRes.total);
      
      // 先尝试用有条件查询
      ordersCollection.where(query)
        .count()
        .then(countRes => {
          console.log('符合条件的订单总数:', countRes.total);
          this.setData({
            debugInfo: this.data.debugInfo + `\n数据库中所有订单: ${allCountRes.total}条\n符合条件的订单: ${countRes.total}条`
          });
          
          // 如果有符合条件的订单，使用条件查询
          if (countRes.total > 0) {
            this.queryOrdersWithCondition(query, skip, pageSize);
          } 
          // 如果没有符合条件的订单，但数据库中有订单，尝试不使用条件查询
          else if (allCountRes.total > 0) {
            console.log('没有符合条件的订单，尝试查询所有订单');
            this.setData({
              debugInfo: this.data.debugInfo + `\n没有符合条件的订单，尝试查询所有订单`
            });
            this.queryOrdersWithCondition({}, skip, pageSize);
          } 
          // 数据库中没有任何订单
          else {
            console.log('数据库中没有任何订单数据');
            this.setData({
              debugInfo: this.data.debugInfo + `\n数据库中没有任何订单数据 ❌`,
              orders: [],
              noMoreData: true,
              loading: false,
              isRefreshing: false
            });
            
            wx.showToast({
              title: '暂无订单数据',
              icon: 'none'
            });
            
            wx.stopPullDownRefresh();
          }
        })
        .catch(err => {
          console.error('查询订单数量失败:', err);
          this.setData({
            debugInfo: this.data.debugInfo + `\n查询订单数量失败: ${err.errMsg || JSON.stringify(err)} ❌`,
            loading: false,
            isRefreshing: false
          });
          
          wx.showToast({
            title: '查询订单失败',
            icon: 'none'
          });
          
          wx.stopPullDownRefresh();
        });
    }).catch(err => {
      console.error('查询所有订单数量失败:', err);
      this.setData({
        debugInfo: this.data.debugInfo + `\n查询所有订单数量失败: ${err.errMsg || JSON.stringify(err)} ❌`,
        loading: false,
        isRefreshing: false
      });
      
      wx.showToast({
        title: '查询订单失败',
        icon: 'none'
      });
      
      wx.stopPullDownRefresh();
    });
  },
  
  // 使用指定条件查询订单
  queryOrdersWithCondition: function(query, skip, pageSize) {
    const db = wx.cloud.database();
    const ordersCollection = db.collection('orders');
    
    ordersCollection.where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
      .then(res => {
        console.log('数据库订单查询结果:', res);
        
        if (res.data && res.data.length > 0) {
          this.setData({
            debugInfo: this.data.debugInfo + `\n数据库查询成功 ✓\n获取 ${res.data.length} 条数据`
          });
          
          // 格式化订单数据
          const formattedOrders = res.data.map(item => {
            // 格式化时间
            let createTimeFormat = '';
            if (item.createTime) {
              const createTime = new Date(item.createTime);
              createTimeFormat = `${createTime.getMonth() + 1}月${createTime.getDate()}日 ${createTime.getHours()}:${createTime.getMinutes() < 10 ? '0' + createTime.getMinutes() : createTime.getMinutes()}`;
            } else {
              createTimeFormat = '未知时间';
            }
            
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
            
            // 确保publisherInfo字段存在
            const publisherInfo = item.publisher || {
              nickName: '未知用户',
              avatarUrl: '/images/default-avatar.png'
            };
            
            return {
              ...item,
              createTimeFormat,
              statusText,
              publisherInfo,
              // 转换报酬显示格式
              rewardText: (item.reward / 100).toFixed(2)
            };
          });
          
          // 更新数据
          const orders = this.data.currentPage === 1 ? formattedOrders : this.data.orders.concat(formattedOrders);
          
          this.setData({
            orders: orders,
            noMoreData: formattedOrders.length < pageSize,
            currentPage: this.data.currentPage + 1,
            loading: false,
            isRefreshing: false
          });
          
          // 在调试页面展示第一个订单的详细信息
          if (formattedOrders.length > 0) {
            this.setData({
              debugInfo: this.data.debugInfo + `\n示例订单: ${JSON.stringify(formattedOrders[0]).substring(0, 200)}...`
            });
          }
        } else {
          this.setData({
            debugInfo: this.data.debugInfo + `\n数据库查询返回空数据 ⚠️`,
            noMoreData: true,
            loading: false,
            isRefreshing: false
          });
          
          if (this.data.currentPage === 1 && this.data.orders.length === 0) {
            wx.showToast({
              title: '暂无订单数据',
              icon: 'none'
            });
          }
        }
        
        wx.stopPullDownRefresh();
      })
      .catch(err => {
        console.error('数据库订单查询失败:', err);
        this.setData({
          debugInfo: this.data.debugInfo + `\n数据库查询失败: ${err.errMsg || JSON.stringify(err)} ❌`,
          loading: false,
          isRefreshing: false
        });
        
        wx.showToast({
          title: '查询订单失败',
          icon: 'none'
        });
        
        wx.stopPullDownRefresh();
      });
  },

  // 从本地存储加载模拟订单数据
  loadLocalMockOrders: function(mockOrders) {
    console.log('从本地存储加载模拟订单数据', mockOrders);
    
    // 根据当前选项卡筛选
    let filteredOrders = mockOrders;
    if (this.data.currentTab !== 'all') {
      filteredOrders = mockOrders.filter(order => order.platform === this.data.currentTab);
    }
    
    // 根据搜索关键词筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.description.toLowerCase().includes(keyword) || 
        order.pickupLocation.toLowerCase().includes(keyword) ||
        (order.dormitory && order.dormitory.toLowerCase().includes(keyword))
      );
    }
    
    // 格式化时间并添加状态文本
    filteredOrders = filteredOrders.map(item => {
      // 格式化时间
      const createTime = new Date(item.createTime);
      const createTimeFormat = `${createTime.getMonth() + 1}月${createTime.getDate()}日 ${createTime.getHours()}:${createTime.getMinutes() < 10 ? '0' + createTime.getMinutes() : createTime.getMinutes()}`;
      
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
      
      return {
        ...item,
        createTimeFormat,
        statusText
      };
    });
    
    // 分页处理
    const startIndex = (this.data.currentPage - 1) * this.data.pageSize;
    const endIndex = startIndex + this.data.pageSize;
    const pageOrders = filteredOrders.slice(startIndex, endIndex);
    
    // 更新状态
    const orders = this.data.currentPage === 1 ? pageOrders : this.data.orders.concat(pageOrders);
    
    setTimeout(() => {
      this.setData({
        orders: orders,
        noMoreData: pageOrders.length < this.data.pageSize,
        currentPage: this.data.currentPage + 1,
        lastRefreshTime: new Date().getTime(),
        loading: false,
        isRefreshing: false
      });
      
      wx.stopPullDownRefresh();
    }, 200);
  },

  // 生成并加载模拟订单数据
  loadGeneratedMockOrders: function() {
    console.log('生成模拟订单数据');
    this.setData({
      debugInfo: this.data.debugInfo + "\n生成并使用模拟数据"
    });
    
    // 创建模拟订单数据
    const mockOrders = [];
    const now = new Date();
    
    // 创建模拟订单
    for (let i = 1; i <= 15; i++) {
      // 随机状态
      const statusOptions = ['pending', 'accepted', 'delivered'];
      const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      
      // 随机平台
      const platformOptions = ['express', 'food', 'shopping', 'other'];
      const randomPlatform = platformOptions[Math.floor(Math.random() * platformOptions.length)];
      
      // 创建时间
      const createTime = new Date();
      createTime.setHours(now.getHours() - Math.floor(Math.random() * 24));
      
      // 描述
      let description = '';
      if (randomPlatform === 'express') {
        description = `帮取${['顺丰', '京东', '菜鸟', '中通', '圆通'][Math.floor(Math.random() * 5)]}快递，取件码：${Math.floor(Math.random() * 900000) + 100000}`;
      } else if (randomPlatform === 'food') {
        description = `帮买${['麦当劳', '肯德基', '食堂', '沙县小吃', '奶茶'][Math.floor(Math.random() * 5)]}`;
      } else if (randomPlatform === 'shopping') {
        description = `帮买${['日用品', '水果', '零食', '文具', '饮料'][Math.floor(Math.random() * 5)]}`;
      } else {
        description = `其他帮忙，${['打印资料', '带课本', '送东西', '跑腿', '借物品'][Math.floor(Math.random() * 5)]}`;
      }
      
      // 生成随机公寓楼号和房间号
      const dormitory = `${Math.floor(Math.random() * 12) + 1}号楼${Math.floor(Math.random() * 5) + 1}0${Math.floor(Math.random() * 9) + 1}`;
      
      // 添加状态文本
      let statusText = '待接单';
      if (randomStatus === 'accepted') {
        statusText = '进行中';
      } else if (randomStatus === 'delivered') {
        statusText = '已送达';
      }
      
      // 格式化创建时间
      const createTimeFormat = `${createTime.getMonth() + 1}月${createTime.getDate()}日 ${createTime.getHours()}:${createTime.getMinutes() < 10 ? '0' + createTime.getMinutes() : createTime.getMinutes()}`;
      
      const mockOrder = {
        _id: `mock_order_${i}`,
        publisherId: i % 3 === 0 ? 'self_id' : `test_publisher_${i}`,
        publisher: {
          nickName: i % 3 === 0 ? '我' : `用户${i}`,
          avatarUrl: '/images/default-avatar.png'
        },
        publisherInfo: {
          nickName: i % 3 === 0 ? '我' : `用户${i}`,
          avatarUrl: '/images/default-avatar.png'
        },
        description: description,
        platform: randomPlatform,
        pickupLocation: randomPlatform === 'express' ? 
          ['东门快递点', '南门快递站', '西门菜鸟驿站', '北门京东派', '中心食堂旁'][Math.floor(Math.random() * 5)] : 
          ['学生食堂', '学校超市', '校外商店', '便利店', '水果店'][Math.floor(Math.random() * 5)],
        dormitory: dormitory,
        fee: Math.floor(Math.random() * 5000) + 500,
        reward: Math.floor(Math.random() * 300) + 100,
        status: randomStatus,
        statusText: statusText,
        createTime: createTime,
        createTimeFormat: createTimeFormat
      };
      
      mockOrders.push(mockOrder);
    }
    
    // 根据当前选项卡筛选
    let filteredOrders = mockOrders;
    if (this.data.currentTab !== 'all') {
      filteredOrders = mockOrders.filter(order => order.platform === this.data.currentTab);
    }
    
    // 根据搜索关键词筛选
    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.description.toLowerCase().includes(keyword) || 
        order.pickupLocation.toLowerCase().includes(keyword) ||
        order.dormitory.toLowerCase().includes(keyword)
      );
    }
    
    // 分页处理
    const startIndex = (this.data.currentPage - 1) * this.data.pageSize;
    const endIndex = startIndex + this.data.pageSize;
    const pageOrders = filteredOrders.slice(startIndex, endIndex);
    
    // 更新状态
    const orders = this.data.currentPage === 1 ? pageOrders : this.data.orders.concat(pageOrders);
    
    setTimeout(() => {
      this.setData({
        orders: orders,
        noMoreData: pageOrders.length < this.data.pageSize,
        currentPage: this.data.currentPage + 1,
        lastRefreshTime: new Date().getTime(),
        loading: false,
        isRefreshing: false
      });
      
      wx.stopPullDownRefresh();
    }, 200);
  },

  // 切换标签
  switchTab: function(e) {
    const tabId = e.currentTarget.dataset.id;
    
    // 安全检查，确保tabId不是undefined
    if (!tabId) {
      console.error('切换标签错误: tabId 是undefined');
      return;
    }
    
    console.log('切换标签:', tabId);
    
    // 只有当标签变化时才重新加载
    if (tabId !== this.data.currentTab) {
      this.setData({
        currentTab: tabId,
        currentPage: 1,
        orders: [],
        noMoreData: false,
        loading: false
      });
      
      this.loadOrders();
    }
  },

  // 搜索框聚焦
  onSearchFocus: function() {
    this.setData({
      searchFocus: true,
      searchPlaceholder: ''
    });
  },

  // 搜索框失焦
  onSearchBlur: function() {
    this.setData({
      searchFocus: false,
      searchPlaceholder: '搜索订单'
    });
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索确认
  onSearchConfirm: function(e) {
    console.log('搜索确认:', e.detail.value);
    this.setData({
      searchKeyword: e.detail.value,
      currentPage: 1,
      orders: [],
      noMoreData: false
    });
    this.loadOrders();
  },

  // 清空搜索
  clearSearch: function() {
    if (this.data.searchKeyword) {
      this.setData({
        searchKeyword: '',
        orders: [],
        currentPage: 1,
        noMoreData: false
      });
      
      this.loadOrders();
    }
  },

  // 查看订单详情
  viewOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/orderDetail/index?id=${orderId}`,
    });
  },

  // 触摸开始
  touchStart: function(e) {
    if (e.touches.length === 1) {
      this.setData({
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY
      });
    }
  },

  // 触摸结束
  touchEnd: function(e) {
    if (e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - this.data.startX;
      const deltaY = endY - this.data.startY;
      
      // 左右滑动切换选项卡
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50) {
        const tabs = this.data.tabs;
        const currentIndex = tabs.findIndex(tab => tab.id === this.data.currentTab);
        
        if (deltaX > 0 && currentIndex > 0) {
          // 右滑，切换到上一个选项卡
          const prevTab = tabs[currentIndex - 1].id;
          console.log('右滑切换到上一个标签:', prevTab);
          this.switchTab({
            currentTarget: {
              dataset: {
                id: prevTab
              }
            }
          });
        } else if (deltaX < 0 && currentIndex < tabs.length - 1) {
          // 左滑，切换到下一个选项卡
          const nextTab = tabs[currentIndex + 1].id;
          console.log('左滑切换到下一个标签:', nextTab);
          this.switchTab({
            currentTarget: {
              dataset: {
                id: nextTab
              }
            }
          });
        }
      }
    }
  },

  // 接单 (兼容旧代码)
  acceptOrder: function(e) {
    console.log('acceptOrder被调用，转发到onAcceptOrder', e);
    // 检查e是否为事件对象，如果不是，创建一个简单的对象
    if (!e || typeof e.stopPropagation !== 'function') {
      // 如果e有dataset属性，保留它
      const dataset = e && e.currentTarget ? e.currentTarget.dataset : (e && e.dataset ? e.dataset : {});
      e = { 
        stopPropagation: function() {}, 
        currentTarget: { dataset: dataset }
      };
      console.log('创建兼容的事件对象', e);
    }
    this.onAcceptOrder(e);
  },
  
  // 接单
  onAcceptOrder: function(e) {
    // 阻止事件冒泡
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    
    const orderId = e.currentTarget.dataset.id;
    console.log('接单:', orderId);
    
    // 检查用户是否登录
    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      
      // 跳转到登录页
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/index',
        });
      }, 1000);
      return;
    }
    
    // 检查信誉分
    const creditScore = app.globalData.creditScore || 0;
    console.log('当前用户信誉分:', creditScore);
    
    if (creditScore < 80) {
      wx.showToast({
        title: '信誉分不足，暂时无法接单',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认接单',
      content: '确定要接这个订单吗？接单后需要及时联系发布者。',
      success: (res) => {
        if (res.confirm) {
          // 调用接单云函数
          wx.showLoading({ title: '接单中...' });
          
          console.log('开始调用接单云函数，订单ID:', orderId);
          
          // 检查是否为开发环境
          const isDevEnv = app.globalData.isDevEnv;
          console.log('当前环境：', isDevEnv ? '开发环境' : '生产环境');
          
          wx.cloud.callFunction({
            name: 'acceptOrder',
            data: { 
              orderId: orderId,
              isDevEnv: isDevEnv
            },
            success: (res) => {
              wx.hideLoading();
              console.log('接单云函数返回结果:', res);
              
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '接单成功',
                  icon: 'success'
                });
                
                // 设置全局标记，通知相关页面刷新
                app.globalData.orderListNeedRefresh = true;
                
                // 刷新订单列表
                this.setData({
                  currentPage: 1,
                  orders: [],
                  noMoreData: false
                });
                this.loadOrders();
                
                // 跳转到订单详情页
                setTimeout(() => {
                  wx.navigateTo({
                    url: `/pages/orderDetail/index?id=${orderId}`
                  });
                }, 1500);
              } else {
                const errorMessage = res.result && res.result.message ? res.result.message : '接单失败';
                console.error('接单失败，原因:', errorMessage);
                wx.showToast({
                  title: errorMessage,
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('接单云函数调用失败:', err);
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

  // 滚动到底部加载更多
  onScrollToBottom: function() {
    console.log('滚动到底部，加载更多');
    if (!this.data.loading && !this.data.noMoreData) {
      this.loadOrders();
    }
  },

  // 点击订单项
  onOrderTap: function(e) {
    const orderId = e.currentTarget.dataset.id;
    console.log('点击订单:', orderId);
    
    // 跳转到订单详情页
    wx.navigateTo({
      url: `/pages/orderDetail/index?id=${orderId}`
    });
  }
}); 