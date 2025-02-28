// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const configCollection = db.collection('config')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 查询配置数据
    const configResult = await configCollection.where({
      type: 'systemConfig'
    }).get()
    
    if (configResult.data.length > 0) {
      return {
        success: true,
        data: configResult.data[0]
      }
    } else {
      // 如果没有配置数据，则创建默认配置
      const defaultConfig = {
        type: 'systemConfig',
        creditScoreThreshold: 60,
        pointsRate: 100,
        dailyWithdrawLimit: 200,
        cancelPenalty: 1,
        overTimePenalty: 3,
        repRecoveryThreshold: 5,
        repRecoveryValue: 1,
        maxActiveOrdersThreshold: 3,
        overThresholdPenalty: 1,
        schoolVerifyAnswer: '厚德博学',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      
      await configCollection.add({
        data: defaultConfig
      })
      
      return {
        success: true,
        data: defaultConfig
      }
    }
  } catch (err) {
    console.error('获取配置失败', err)
    return {
      success: false,
      message: '获取配置失败',
      error: err
    }
  }
} 