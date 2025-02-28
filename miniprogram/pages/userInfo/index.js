// pages/userInfo/index.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    userData: {},
    dormitoryOptions: ['1号宿舍楼', '2号宿舍楼', '3号宿舍楼', '4号宿舍楼', '5号宿舍楼', '6号宿舍楼'],
    dormitoryIndex: 0,
    roomNumber: '',
    formData: {},
    isFormValid: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      });
      return;
    }

    // 加载用户数据
    this.loadUserData();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 加载用户数据
  loadUserData: function() {
    const userInfo = app.globalData.userInfo || {};
    const userData = wx.getStorageSync('userData') || {};
    
    // 提取宿舍信息
    let roomNumber = '';
    let dormitoryIndex = 0;
    
    if (userData.dormitory) {
      const dormMatch = userData.dormitory.match(/^(\d+)号宿舍楼/);
      if (dormMatch && dormMatch[1]) {
        dormitoryIndex = parseInt(dormMatch[1]) - 1;
        if (dormitoryIndex < 0 || dormitoryIndex >= this.data.dormitoryOptions.length) {
          dormitoryIndex = 0;
        }
      }
      
      const roomMatch = userData.dormitory.match(/(\d+)$/);
      if (roomMatch && roomMatch[1]) {
        roomNumber = roomMatch[1];
      }
    }
    
    this.setData({
      userInfo: userInfo,
      userData: userData,
      dormitoryIndex: dormitoryIndex,
      roomNumber: roomNumber
    });
  },

  // 选择头像
  chooseAvatar: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        
        wx.showLoading({
          title: '上传中',
        });
        
        // 上传头像到云存储
        const cloudPath = 'avatars/' + app.globalData.openid + Date.now() + '.jpg';
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: res => {
            const avatarUrl = res.fileID;
            
            // 更新用户头像
            this.setData({
              'userInfo.avatarUrl': avatarUrl
            });
            
            // 更新全局用户信息
            app.globalData.userInfo.avatarUrl = avatarUrl;
            
            // 更新云数据库
            wx.cloud.callFunction({
              name: 'updateUserInfo',
              data: {
                avatarUrl: avatarUrl
              },
              success: () => {
                wx.hideLoading();
                wx.showToast({
                  title: '头像更新成功',
                  icon: 'success'
                });
              },
              fail: err => {
                console.error('更新头像失败', err);
                wx.hideLoading();
                wx.showToast({
                  title: '头像更新失败',
                  icon: 'none'
                });
              }
            });
          },
          fail: err => {
            console.error('上传头像失败', err);
            wx.hideLoading();
            wx.showToast({
              title: '上传头像失败',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  // 宿舍楼选择变更
  dormitoryChange: function(e) {
    this.setData({
      dormitoryIndex: e.detail.value
    });
  },

  // 手机号验证
  verifyPhone: function() {
    wx.showToast({
      title: '暂未开放此功能',
      icon: 'none'
    });
  },

  // 检查必填字段 - 只保留最基本的必填项
  checkFormValidity: function() {
    const { name, phone } = this.data.formData;
    
    // 只检查姓名和电话
    const isValid = !!name && !!phone && phone.length === 11;
    
    this.setData({
      isFormValid: isValid
    });
    
    return isValid;
  },

  // 提交表单时添加更多日志
  submitForm: function(e) {
    console.log("尝试提交表单:", e.detail.value);
    
    if (!this.checkFormValidity()) {
      console.log("表单验证失败:", this.data.formData);
      wx.showToast({
        title: '请完善必要信息',
        icon: 'none'
      });
      return;
    }
    
    // 其他提交逻辑...
    console.log("表单验证通过，准备提交");
    // 表单提交代码...
  }
})