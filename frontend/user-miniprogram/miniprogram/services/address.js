/**
 * services/address.js - 收货地址服务层
 */

import { get, post, put, del } from '../utils/request';
import { apiPath } from '../config/api';

/**
 * 获取用户地址列表
 * @returns {Promise<Array>} 地址列表
 */
export const getAddressList = async () => {
  try {
    console.log('📍 获取地址列表...');
    const addresses = await get(apiPath.user.addresses);
    console.log(`✅ 获取到 ${addresses.length} 个地址`);
    return addresses || [];
  } catch (error) {
    console.error('❌ 获取地址列表失败', error);
    return [];
  }
};

/**
 * 获取单个地址详情
 * @param {number} addressId - 地址ID
 * @returns {Promise<Object>} 地址详情
 */
export const getAddressDetail = async (addressId) => {
  try {
    console.log('📍 获取地址详情，ID:', addressId);
    const address = await get(`${apiPath.user.addresses}/${addressId}`);
    console.log('✅ 地址详情获取成功');
    return address;
  } catch (error) {
    console.error('❌ 获取地址详情失败', error);
    throw error;
  }
};

/**
 * 创建新地址
 * @param {Object} addressData - 地址数据
 * @returns {Promise<Object>} 创建的地址
 */
export const createAddress = async (addressData) => {
  try {
    console.log('📍 创建新地址:', addressData);
    
    // 数据验证
    const errors = validateAddressData(addressData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    const address = await post(apiPath.user.addresses, addressData);
    console.log('✅ 地址创建成功');
    
    // 如果是第一个地址或设置为默认，自动设为默认地址
    if (addressData.is_default) {
      await setDefaultAddress(address.id);
    }
    
    return address;
  } catch (error) {
    console.error('❌ 创建地址失败', error);
    throw error;
  }
};

/**
 * 更新地址
 * @param {number} addressId - 地址ID
 * @param {Object} addressData - 地址数据
 * @returns {Promise<Object>} 更新后的地址
 */
export const updateAddress = async (addressId, addressData) => {
  try {
    console.log('📍 更新地址，ID:', addressId);
    
    // 数据验证
    const errors = validateAddressData(addressData);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    const address = await put(`${apiPath.user.addresses}/${addressId}`, addressData);
    console.log('✅ 地址更新成功');
    
    // 如果设置为默认地址
    if (addressData.is_default && !address.is_default) {
      await setDefaultAddress(addressId);
    }
    
    return address;
  } catch (error) {
    console.error('❌ 更新地址失败', error);
    throw error;
  }
};

/**
 * 删除地址
 * @param {number} addressId - 地址ID
 * @returns {Promise<boolean>} 是否删除成功
 */
export const deleteAddress = async (addressId) => {
  try {
    console.log('📍 删除地址，ID:', addressId);
    const result = await del(`${apiPath.user.addresses}/${addressId}`);
    console.log('✅ 地址删除成功');
    return result.data || true;
  } catch (error) {
    console.error('❌ 删除地址失败', error);
    throw error;
  }
};

/**
 * 设置默认地址
 * @param {number} addressId - 地址ID
 * @returns {Promise<Object>} 更新后的地址
 */
export const setDefaultAddress = async (addressId) => {
  try {
    console.log('📍 设置默认地址，ID:', addressId);
    const address = await post(`${apiPath.user.addresses}/${addressId}/default`);
    console.log('✅ 默认地址设置成功');
    return address;
  } catch (error) {
    console.error('❌ 设置默认地址失败', error);
    throw error;
  }
};

/**
 * 验证地址数据
 * @param {Object} addressData - 地址数据
 * @returns {Array<string>} 错误信息数组
 */
export const validateAddressData = (addressData) => {
  const errors = [];
  
  if (!addressData.consignee || addressData.consignee.trim() === '') {
    errors.push('请填写收货人姓名');
  }
  
  if (!addressData.phone || addressData.phone.trim() === '') {
    errors.push('请填写手机号码');
  } else if (!/^1[3-9]\d{9}$/.test(addressData.phone)) {
    errors.push('请填写正确的手机号码');
  }
  
  if (!addressData.province || !addressData.city || !addressData.district) {
    errors.push('请选择完整的省市区');
  }
  
  if (!addressData.address || addressData.address.trim() === '') {
    errors.push('请填写详细地址');
  } else if (addressData.address.length < 5) {
    errors.push('详细地址至少5个字符');
  } else if (addressData.address.length > 100) {
    errors.push('详细地址不能超过100个字符');
  }
  
  return errors;
};

/**
 * 格式化地址显示
 * @param {Object} address - 地址对象
 * @returns {string} 格式化的地址字符串
 */
export const formatAddress = (address) => {
  if (!address) return '';
  
  const parts = [
    address.province || '',
    address.city || '',
    address.district || '',
    address.address || ''
  ].filter(part => part);
  
  return parts.join('');
};

/**
 * 格式化地址为单行显示
 * @param {Object} address - 地址对象
 * @returns {string} 单行地址字符串
 */
export const formatAddressOneLine = (address) => {
  if (!address) return '';
  
  const area = [
    address.province || '',
    address.city || '',
    address.district || ''
  ].filter(part => part).join(' ');
  
  return `${area} ${address.address || ''}`.trim();
};

/**
 * 从微信地址选择器格式化地址数据
 * @param {Object} wxAddress - 微信地址数据
 * @returns {Object} 格式化后的地址数据
 */
export const formatWxAddress = (wxAddress) => {
  return {
    consignee: wxAddress.userName || '',
    phone: wxAddress.telNumber || '',
    province: wxAddress.provinceName || '',
    city: wxAddress.cityName || '',
    district: wxAddress.countyName || '',
    address: wxAddress.detailInfo || '',
    postal_code: wxAddress.postalCode || '',
    is_default: false
  };
};

/**
 * 获取默认地址
 * @returns {Promise<Object|null>} 默认地址或null
 */
export const getDefaultAddress = async () => {
  try {
    const addresses = await getAddressList();
    return addresses.find(addr => addr.is_default) || null;
  } catch (error) {
    console.error('❌ 获取默认地址失败', error);
    return null;
  }
};

/**
 * 保存最近使用的地址ID到本地
 * @param {number} addressId - 地址ID
 */
export const saveLastUsedAddress = (addressId) => {
  try {
    wx.setStorageSync('lastUsedAddressId', addressId);
  } catch (error) {
    console.error('保存最近使用地址失败', error);
  }
};

/**
 * 获取最近使用的地址ID
 * @returns {number|null} 地址ID或null
 */
export const getLastUsedAddressId = () => {
  try {
    return wx.getStorageSync('lastUsedAddressId') || null;
  } catch (error) {
    console.error('获取最近使用地址失败', error);
    return null;
  }
};

export default {
  getAddressList,
  getAddressDetail,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  validateAddressData,
  formatAddress,
  formatAddressOneLine,
  formatWxAddress,
  getDefaultAddress,
  saveLastUsedAddress,
  getLastUsedAddressId
};