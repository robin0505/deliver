# clearTestOrders 云函数

这个云函数用于清除测试订单数据。

## 功能说明

- 查询并删除所有带有 `test: true` 标记的订单数据
- 支持批量删除，每批最多删除100条记录
- 返回删除的订单数量

## 部署方法

1. 在微信开发者工具中，确保您已经登录并选择了正确的云环境
2. 在左侧栏点击"云开发"
3. 点击"云函数列表"
4. 找到 clearTestOrders 函数目录，右键点击
5. 选择"上传并部署：云端安装依赖（不上传node_modules）"
6. 等待部署完成

## 调用方法

这个云函数主要通过测试工具页面进行调用。

如果需要在代码中调用，可以使用以下代码：

```javascript
wx.cloud.callFunction({
  name: 'clearTestOrders',
  success: res => {
    if (res.result && res.result.success) {
      console.log(`成功删除${res.result.deleted}个测试订单`);
    } else {
      console.error('删除测试订单失败', res);
    }
  },
  fail: err => {
    console.error('调用云函数失败', err);
  }
});
``` 