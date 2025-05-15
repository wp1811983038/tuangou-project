// src/utils/format.js
/**
 * 格式化金额为精确到分的字符串
 * @param {number} amount 金额值
 * @param {string} symbol 货币符号
 * @returns {string} 格式化后的金额字符串
 */
export function formatPrice(amount, symbol = '¥') {
  if (amount === undefined || amount === null) return `${symbol}0.00`;
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}

/**
 * 格式化日期时间
 * @param {string|Date} date 日期对象或日期字符串
 * @param {string} format 格式化模式
 * @returns {string} 格式化后的日期字符串
 */
export function formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const pad = (num) => (num < 10 ? `0${num}` : num);
  
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化日期
 * @param {string|Date} date 日期对象或日期字符串
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
  return formatDateTime(date, 'YYYY-MM-DD');
}

/**
 * 格式化时间
 * @param {string|Date} date 日期对象或日期字符串
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(date) {
  return formatDateTime(date, 'HH:mm:ss');
}

/**
 * 格式化文件大小
 * @param {number} bytes 文件字节大小
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化电话号码
 * @param {string} phone 电话号码
 * @returns {string} 格式化后的电话号码
 */
export function formatPhone(phone) {
  if (!phone) return '';
  
  // 标准手机号格式化: 138****1234
  if (/^1\d{10}$/.test(phone)) {
    return phone.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1****$3');
  }
  
  // 标准座机格式化: 010-****1234
  if (/^\d{3,4}-\d{7,8}$/.test(phone)) {
    const [prefix, number] = phone.split('-');
    const masked = number.substr(0, number.length - 4).replace(/\d/g, '*');
    return `${prefix}-${masked}${number.substr(-4)}`;
  }
  
  // 其他格式，仅显示后四位
  if (phone.length > 4) {
    return `****${phone.substr(-4)}`;
  }
  
  return phone;
}

/**
 * 截断文本并添加省略号
 * @param {string} text 文本
 * @param {number} maxLength 最大长度
 * @returns {string} 截断后的文本
 */
export function truncateText(text, maxLength = 20) {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  return text.substr(0, maxLength) + '...';
}