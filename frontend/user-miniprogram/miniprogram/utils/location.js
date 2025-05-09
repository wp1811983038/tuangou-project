// utils/location.js - 位置相关工具函数

/**
 * 获取当前位置
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 位置信息
 */
export const getLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    // 检查用户是否授权了位置信息
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          // 已授权，直接获取位置
          getWxLocation(options).then(resolve).catch(reject);
        } else {
          // 未授权，先请求授权
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              // 授权成功，获取位置
              getWxLocation(options).then(resolve).catch(reject);
            },
            fail: (err) => {
              // 授权失败，尝试弹窗引导
              if (err.errMsg.indexOf('auth deny') > -1) {
                wx.showModal({
                  title: '提示',
                  content: '需要获取您的位置才能显示附近的商户，请打开位置权限',
                  confirmText: '去设置',
                  success: (res) => {
                    if (res.confirm) {
                      wx.openSetting({
                        success: (res) => {
                          if (res.authSetting['scope.userLocation']) {
                            // 用户在设置页允许了位置权限
                            getWxLocation(options).then(resolve).catch(reject);
                          } else {
                            // 用户在设置页仍然拒绝了位置权限
                            reject(new Error('用户拒绝授予位置权限'));
                          }
                        }
                      });
                    } else {
                      // 用户取消了弹窗
                      reject(new Error('用户取消授权'));
                    }
                  }
                });
              } else {
                // 其他错误
                reject(err);
              }
            }
          });
        }
      },
      fail: reject
    });
  });
};

/**
 * 调用微信获取位置API
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 位置信息
 */
const getWxLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: options.type || 'gcj02', // gcj02为国测局坐标，可用于wx.openLocation
      success: async (res) => {
        try {
          // 获取位置成功
          const locationData = {
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy,
            speed: res.speed,
            altitude: res.altitude,
            name: '当前位置'  // 默认名称
          };

          // 使用逆地址解析获取更多位置信息
          try {
            const addressInfo = await getAddressFromLocation(res.latitude, res.longitude);
            Object.assign(locationData, addressInfo);
          } catch (error) {
            console.warn('获取地址信息失败，使用默认位置名称', error);
          }

          // 缓存位置信息
          wx.setStorageSync('location', locationData);
          resolve(locationData);
        } catch (error) {
          reject(error);
        }
      },
      fail: (err) => {
        // 如果获取位置失败，尝试返回上次缓存的位置
        const cachedLocation = wx.getStorageSync('location');
        if (cachedLocation) {
          console.warn('获取位置失败，使用缓存位置', err);
          resolve(cachedLocation);
        } else {
          reject(err);
        }
      }
    });
  });
};

/**
 * 根据经纬度获取地址信息（模拟实现）
 * @param {number} latitude - 纬度
 * @param {number} longitude - 经度
 * @returns {Promise<Object>} 地址信息
 */
const getAddressFromLocation = (latitude, longitude) => {
  return new Promise((resolve) => {
    // 模拟地址解析，实际项目中应该调用地图API
    setTimeout(() => {
      resolve({
        name: '杭州市西湖区',
        address: '杭州市西湖区文一西路969号',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        street: '文一西路',
        street_number: '969号'
      });
    }, 100);
  });
};

/**
 * 计算两点之间的距离（单位：米）
 * @param {number} lat1 - 第一个点的纬度
 * @param {number} lng1 - 第一个点的经度
 * @param {number} lat2 - 第二个点的纬度
 * @param {number} lng2 - 第二个点的经度
 * @returns {number} 两点之间的距离（米）
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const EARTH_RADIUS = 6378137.0; // 地球半径，单位：米
  
  function toRadians(d) {
    return d * Math.PI / 180.0;
  }
  
  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);
  const a = radLat1 - radLat2;
  const b = toRadians(lng1) - toRadians(lng2);
  
  let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + 
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
  s = s * EARTH_RADIUS;
  s = Math.round(s * 10000) / 10000; // 保留四位小数
  
  return s;
};

/**
 * 将距离格式化为便于阅读的形式
 * @param {number} distance - 距离（米）
 * @returns {string} 格式化后的距离
 */
export const formatDistance = (distance) => {
  if (distance < 1000) {
    return `${Math.floor(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
};

/**
 * 打开位置在地图上
 * @param {number} latitude - 纬度
 * @param {number} longitude - 经度
 * @param {string} name - 位置名称
 * @param {string} address - 位置地址
 */
export const openLocation = (latitude, longitude, name, address) => {
  wx.openLocation({
    latitude,
    longitude,
    name: name || '',
    address: address || '',
    scale: 18
  });
};

export default {
  getLocation,
  calculateDistance,
  formatDistance,
  openLocation
};