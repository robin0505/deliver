const app = getApp();

Page({
  data: {
    platform: 'express', // 默认为快递
    description: '',
    pickupLocation: '',
    pickupCode: '',
    dormitory: '',
    dormitoryOptions: ['1号宿舍楼', '2号宿舍楼', '3号宿舍楼', '4号宿舍楼', '5号宿舍楼', '6号宿舍楼'],
    roomNumber: '',
    reward: 5, // 默认5积分奖励
    remarks: '',
    remarksLength: 0,
    isAgree: false,
    isFormValid: false,
    isDevEnv: false // 是否开发环境
  },

  onLoad: function(options) {
    console.log('订单创建页面加载');
    
    // 获取系统信息判断是否为开发环境
    // 修改：使用新API替换废弃的getSystemInfoSync
    try {
      const { platform } = wx.getAppBaseInfo();
      const isDevEnv = platform === 'devtools';
      console.log('当前环境:', isDevEnv ? '开发环境' : '生产环境');
      
      this.setData({
        isDevEnv: isDevEnv
      });
    } catch (error) {
      console.error('获取系统信息失败:', error);
      // 降级处理，默认非开发环境
      this.setData({
        isDevEnv: false
      });
    }
    
    // 如果用户已有宿舍信息，自动填充
    if (app.globalData.isLoggedIn) {
      const userInfo = app.globalData.userInfo;
      const userData = wx.getStorageSync('userData');
      
      console.log('当前用户信息:', userInfo);
      console.log('本地存储用户数据:', userData);
      
      if (userData && userData.dormitory) {
        // 提取宿舍楼信息
        const dorm = userData.dormitory;
        const dormMatch = dorm.match(/^(\d+号宿舍楼)/);
        const roomMatch = dorm.match(/(\d+)$/);
        
        if (dormMatch) {
          this.setData({
            dormitory: dormMatch[1]
          });
          console.log('自动填充宿舍楼:', dormMatch[1]);
        }
        
        if (roomMatch) {
          this.setData({
            roomNumber: roomMatch[1]
          });
          console.log('自动填充宿舍号:', roomMatch[1]);
        }
      }
    }
    
    // 修改：初始化后延迟检查表单，确保状态更新
    setTimeout(() => {
      this.checkFormValidity();
    }, 300);
  },
  
  // 页面显示时再次检查表单
  onShow: function() {
    console.log('订单创建页面显示');
    
    // 修改：延迟检查表单，确保状态更新
    setTimeout(() => {
      this.checkFormValidity();
    }, 300);
  },

  // 选择平台类型
  selectPlatform: function(e) {
    const type = e.currentTarget.dataset.type;
    console.log('选择平台类型:', type);
    this.setData({
      platform: type
    }, () => {
      this.checkFormValidity();
    });
  },

  // 选择宿舍楼
  onDormitoryChange: function(e) {
    const index = e.detail.value;
    const dormitory = this.data.dormitoryOptions[index];
    console.log('选择宿舍楼:', dormitory);
    this.setData({
      dormitory: dormitory
    }, () => {
      this.checkFormValidity();
    });
  },

  // 积分奖励变化
  onRewardChange: function(e) {
    const reward = e.detail.value;
    console.log('积分奖励变化:', reward);
    this.setData({
      reward: reward
    });
  },

  // 备注内容变化
  onRemarksInput: function(e) {
    const value = e.detail.value;
    console.log('备注内容变化，长度:', value.length);
    this.setData({
      remarks: value,
      remarksLength: value.length
    });
  },

  // 监听物品描述变化
  onDescriptionChange: function(e) {
    const value = e.detail.value;
    console.log('物品描述变化:', value, e.detail);
    
    // 更新状态后强制检查表单
    this.setData({
      description: value
    }, () => {
      console.log('物品描述已更新为:', this.data.description);
      this.checkFormValidity();
    });
  },

  // 监听取件地点变化
  onPickupLocationChange: function(e) {
    const value = e.detail.value;
    console.log('取件地点变化:', value, e.detail);
    
    // 更新状态后强制检查表单
    this.setData({
      pickupLocation: value
    }, () => {
      console.log('取件地点已更新为:', this.data.pickupLocation);
      this.checkFormValidity();
    });
  },

  // 监听取件码变化
  onPickupCodeChange: function(e) {
    const value = e.detail.value;
    console.log('取件码变化:', value, e.detail);
    this.setData({
      pickupCode: value
    });
    // 取件码是可选的，不影响表单验证
  },

  // 监听宿舍号变化
  onRoomNumberChange: function(e) {
    const value = e.detail.value;
    console.log('宿舍号变化:', value, e.detail);
    
    // 更新状态后强制检查表单
    this.setData({
      roomNumber: value
    }, () => {
      console.log('宿舍号已更新为:', this.data.roomNumber);
      this.checkFormValidity();
    });
  },

  // 协议同意状态变化
  onAgreeChange: function(e) {
    const isAgree = e.detail.value.length > 0;
    console.log('协议同意状态变化:', isAgree);
    this.setData({
      isAgree: isAgree
    }, () => {
      this.checkFormValidity();
    });
  },

  // 检查表单是否有效
  checkFormValidity: function() {
    const { platform, description, pickupLocation, dormitory, roomNumber, isAgree } = this.data;
    
    // 添加详细日志以便调试
    console.log('表单验证详细信息 ===========================');
    console.log('- 平台:', platform, platform ? '✓' : '✗');
    console.log('- 描述:', description, description ? '✓' : '✗');
    console.log('- 取件地点:', pickupLocation, pickupLocation ? '✓' : '✗');
    console.log('- 宿舍楼:', dormitory, dormitory ? '✓' : '✗');
    console.log('- 宿舍号:', roomNumber, roomNumber ? '✓' : '✗');
    console.log('- 同意协议:', isAgree, isAgree ? '✓' : '✗');
    
    const isValid = platform && description && pickupLocation && dormitory && roomNumber && isAgree;
    
    console.log('表单验证 - 平台:', platform, '描述:', description, '取件地点:', pickupLocation, 
                '宿舍楼:', dormitory, '宿舍号:', roomNumber, '同意协议:', isAgree);
    console.log('表单验证结果:', isValid ? '有效' : '无效');
    
    this.setData({
      isFormValid: isValid
    });
    
    return isValid; // 返回验证结果，方便调用者使用
  },

  // 显示平台协议
  showAgreement: function() {
    console.log('跳转到协议页面');
    wx.navigateTo({
      url: '/pages/agreement/index?type=service',
    });
  },
  
  // 调试功能：手动验证表单
  debugValidateForm: function() {
    console.log('手动验证表单开始');
    console.log('当前表单数据:', {
      platform: this.data.platform,
      description: this.data.description,
      pickupLocation: this.data.pickupLocation,
      dormitory: this.data.dormitory,
      roomNumber: this.data.roomNumber,
      isAgree: this.data.isAgree
    });
    
    const result = this.checkFormValidity();
    
    wx.showToast({
      title: result ? '表单有效' : '表单无效',
      icon: 'none'
    });
  },

  // 提交订单
  submitOrder: function(e) {
    console.log('尝试提交订单，表单数据:', e.detail.value);
    console.log('当前表单状态:', this.data.isFormValid ? '有效' : '无效');
    
    // 再次进行表单验证，确保最新状态
    if (!this.checkFormValidity()) {
      wx.showToast({
        title: '请完善订单信息',
        icon: 'none'
      });
      return;
    }
    
    if (!app.globalData.isLoggedIn) {
      console.log('用户未登录，跳转到登录页面');
      wx.navigateTo({
        url: '/pages/login/index',
      });
      return;
    }
    
    const formData = e.detail.value;
    const { platform, dormitory, roomNumber, reward } = this.data;
    
    // 完整宿舍地址
    const fullDormitory = `${dormitory}${roomNumber}`;
    
    console.log('准备调用云函数，参数:', {
      platform, 
      description: formData.description,
      pickupLocation: formData.pickupLocation,
      pickupCode: formData.pickupCode,
      dormitory: fullDormitory,
      reward,
      remarks: formData.remarks
    });
    
    wx.showLoading({
      title: '提交中',
    });
    
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        platform: platform,
        description: formData.description,
        pickupLocation: formData.pickupLocation,
        pickupCode: formData.pickupCode,
        dormitory: fullDormitory,
        reward: reward,
        remarks: formData.remarks,
        fee: 5 // 基础配送费5积分
      },
      success: res => {
        wx.hideLoading();
        console.log('云函数返回结果:', res);
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '发布成功',
            icon: 'success'
          });
          
          // 设置全局标记，通知订单列表页刷新
          app.globalData.orderListNeedRefresh = true;
          
          // 跳转到订单详情页
          setTimeout(() => {
            wx.redirectTo({
              url: `/pages/orderDetail/index?id=${res.result.data._id}`,
            });
          }, 1500);
        } else {
          const errorMessage = res.result && res.result.message ? res.result.message : '发布失败';
          console.error('发布订单失败，原因:', errorMessage);
          wx.showToast({
            title: errorMessage,
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('发布订单失败，云函数调用失败:', err);
        wx.showToast({
          title: '发布失败，请重试',
          icon: 'none'
        });
      }
    });
  }
}); 