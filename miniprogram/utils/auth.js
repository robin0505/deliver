/**
 * 身份验证和权限检查工具函数
 */
const app = getApp();

// 检查用户是否已登录
const isLoggedIn = () => {
  return app.globalData.isLoggedIn;
};

// 获取当前用户角色
const getUserRole = () => {
  return app.globalData.userRole || 'user';
};

// 检查用户是否有指定角色
const hasRole = (requiredRole) => {
  const currentRole = getUserRole();
  
  // 角色权限等级: admin > deliverer > user
  if (requiredRole === 'admin') {
    return currentRole === 'admin';
  } 
  else if (requiredRole === 'deliverer') {
    return currentRole === 'admin' || currentRole === 'deliverer';
  }
  else {
    // 所有人都有user权限
    return true;
  }
};

// 检查用户是否是配送员
const isDeliverer = () => {
  return hasRole('deliverer');
};

// 检查用户是否是管理员
const isAdmin = () => {
  return hasRole('admin');
};

// 路由守卫：检查登录状态
const checkLoginRedirect = () => {
  if (!isLoggedIn()) {
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });
    
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/login/index',
      });
    }, 1000);
    
    return false;
  }
  return true;
};

// 路由守卫：检查角色权限
const checkRoleRedirect = (requiredRole) => {
  if (!isLoggedIn()) {
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });
    
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/login/index',
      });
    }, 1000);
    
    return false;
  }
  
  if (!hasRole(requiredRole)) {
    wx.showToast({
      title: '没有访问权限',
      icon: 'none'
    });
    
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/home/index',
      });
    }, 1000);
    
    return false;
  }
  
  return true;
};

module.exports = {
  isLoggedIn,
  getUserRole,
  hasRole,
  isDeliverer,
  isAdmin,
  checkLoginRedirect,
  checkRoleRedirect
}; 