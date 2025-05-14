// utils/location.js - 位置相关工具函数

import { get, post } from './request';
import { apiPath } from '../config/api';

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
 * 根据经纬度获取地址信息
 * @param {number} latitude - 纬度
 * @param {number} longitude - 经度
 * @returns {Promise<Object>} 地址信息
 */
export const getAddressFromLocation = (latitude, longitude) => {
  return new Promise((resolve, reject) => {
    // 添加参数校验
    if (!latitude || !longitude) {
      console.warn('位置参数不完整，使用默认位置');
      resolve({
        name: '当前位置',
        address: '未知地址'
      });
      return;
    }
    
    post(apiPath.location.address, {
      latitude,
      longitude
    }, {
      showError: false // 不显示错误提示，自己处理
    }).then(res => {
      resolve(res);
    }).catch(err => {
      console.warn('位置服务请求失败:', err);
      // 如果API调用失败，返回基本位置信息
      resolve({
        name: '当前位置',
        address: '未知地址',
        province: '',
        city: '',
        district: ''
      });
    });
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

/**
 * 判断位置是否在商户服务范围内
 * @param {Object} userLocation - 用户位置 {latitude, longitude}
 * @param {Object} merchant - 商户信息，包含服务半径和中心点
 * @returns {boolean} 是否在服务范围内
 */
export const isInMerchantServiceArea = (userLocation, merchant) => {
  if (!userLocation || !merchant || !merchant.latitude || !merchant.longitude || !merchant.service_radius) {
    return false;
  }
  
  // 计算用户与商户中心点距离
  const distance = calculateDistance(
    userLocation.latitude, 
    userLocation.longitude, 
    merchant.latitude, 
    merchant.longitude
  );
  
  // 判断是否在服务半径内
  return distance <= (merchant.service_radius * 1000); // 转换为米
};

/**
 * 判断位置是否在多边形区域内（矩形边界检查版本）
 * @param {Object} point - 位置点 {latitude, longitude}
 * @param {Object} boundary - 边界 {north, south, east, west}
 * @returns {boolean} 是否在区域内
 */
export const isPointInBoundary = (point, boundary) => {
  if (!point || !boundary) return false;
  
  const { latitude, longitude } = point;
  const { north, south, east, west } = boundary;
  
  return latitude <= north && 
         latitude >= south && 
         longitude <= east && 
         longitude >= west;
};

/**
 * 获取用户可服务的商户列表
 * @param {Object} userLocation - 用户位置 {latitude, longitude}
 * @param {number} pageNum - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Array>} 可服务的商户列表
 */
export const getAvailableMerchants = async (userLocation, pageNum = 1, pageSize = 10) => {
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    throw new Error('位置信息不完整');
  }
  
  try {
    // 获取商户列表，不限距离
    const params = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      page: pageNum,
      page_size: pageSize
    };
    
    const response = await get(apiPath.merchant.list, params, {
      showLoading: false
    });
    
    const merchants = response.data?.items || [];
    
    // 计算距离并添加是否在服务范围内标记
    merchants.forEach(merchant => {
      if (merchant.latitude && merchant.longitude) {
        // 计算距离
        const distanceInMeters = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          merchant.latitude,
          merchant.longitude
        );
        
        merchant.distance = parseFloat((distanceInMeters / 1000).toFixed(1)); // 转为公里
        merchant.inServiceArea = isInMerchantServiceArea(userLocation, merchant);
      } else {
        merchant.distance = null;
        merchant.inServiceArea = false;
      }
    });
    
    // 筛选符合服务范围的商户
    return merchants.filter(merchant => merchant.inServiceArea);
  } catch (error) {
    console.error('获取可服务商户失败', error);
    return [];
  }
};

/**
 * 检查用户是否在指定商户服务范围内
 * @param {number} merchantId - 商户ID
 * @param {Object} userLocation - 用户位置 {latitude, longitude}
 * @returns {Promise<boolean>} 是否在服务范围内
 */
export const checkMerchantServiceArea = async (merchantId, userLocation) => {
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    throw new Error('位置信息不完整');
  }
  
  try {
    const result = await post(apiPath.location.checkServiceArea, {
      merchant_id: merchantId,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude
    });
    
    return result.data || false;
  } catch (error) {
    console.error('检查商户服务范围失败', error);
    return false;
  }
};

/**
 * 搜索附近位置
 * @param {Object} userLocation - 用户位置 {latitude, longitude}
 * @param {string} keyword - 搜索关键词
 * @param {number} radius - 搜索半径(km)
 * @returns {Promise<Array>} 搜索结果
 */
export const searchNearbyLocations = async (userLocation, keyword, radius = 5) => {
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    throw new Error('位置信息不完整');
  }
  
  try {
    const result = await post(apiPath.location.search, {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      keyword,
      radius
    });
    
    return result || [];
  } catch (error) {
    console.error('搜索附近位置失败', error);
    return [];
  }
};

/**
 * 获取两点间距离和时间（使用服务器API）
 * @param {Object} startPoint - 起点 {latitude, longitude}
 * @param {Object} endPoint - 终点 {latitude, longitude}
 * @returns {Promise<Object>} 距离和时间信息
 */
export const getDistanceAndDuration = async (startPoint, endPoint) => {
  if (!startPoint || !endPoint) {
    throw new Error('起点或终点信息不完整');
  }
  
  try {
    const result = await post(apiPath.location.distance, {
      start_latitude: startPoint.latitude,
      start_longitude: startPoint.longitude,
      end_latitude: endPoint.latitude,
      end_longitude: endPoint.longitude
    });
    
    return {
      distance: result.distance, // km
      duration: result.duration, // 秒
      formattedDistance: formatDistance(result.distance * 1000),
      formattedDuration: formatDuration(result.duration)
    };
  } catch (error) {
    console.error('获取距离和时间失败', error);
    
    // 如果API调用失败，使用直线距离
    const distanceInMeters = calculateDistance(
      startPoint.latitude,
      startPoint.longitude,
      endPoint.latitude,
      endPoint.longitude
    );
    
    return {
      distance: distanceInMeters / 1000, // 转为公里
      duration: null,
      formattedDistance: formatDistance(distanceInMeters),
      formattedDuration: null
    };
  }
};

/**
 * 格式化时间为易读形式
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间
 */
export const formatDuration = (seconds) => {
  if (!seconds) return null;
  
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes > 0 ? `${minutes}分钟` : ''}`;
  }
};

/**
 * 获取配送费
 * @param {number} merchantId - 商户ID
 * @param {number} addressId - 地址ID
 * @returns {Promise<number>} 配送费
 */
export const getDeliveryFee = async (merchantId, addressId) => {
  try {
    const result = await post(apiPath.location.deliveryFee, {
      merchant_id: merchantId,
      address_id: addressId
    });
    
    return result.fee || 0;
  } catch (error) {
    console.error('获取配送费失败', error);
    return 0;
  }
};

export default {
  getLocation,
  getAddressFromLocation,
  calculateDistance,
  formatDistance,
  openLocation,
  isInMerchantServiceArea,
  isPointInBoundary,
  getAvailableMerchants,
  checkMerchantServiceArea,
  searchNearbyLocations,
  getDistanceAndDuration,
  formatDuration,
  getDeliveryFee
};