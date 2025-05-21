// src/utils/export.js
import * as XLSX from 'xlsx';

/**
 * 导出数据到Excel文件
 * @param {Array} data 要导出的数据数组
 * @param {String} fileName 文件名（不含扩展名）
 * @param {String} sheetName 工作表名称
 */
export const exportToExcel = (data, fileName = 'export', sheetName = 'Sheet1') => {
  if (!data || data.length === 0) {
    console.error('导出数据为空');
    return;
  }
  
  try {
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 将JSON数据转换为工作表
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // 生成Excel文件并下载
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAsExcelFile(excelBuffer, fileName);
  } catch (error) {
    console.error('导出Excel失败：', error);
  }
};

/**
 * 保存Excel文件到本地
 * @param {ArrayBuffer} buffer Excel文件的二进制数据
 * @param {String} fileName 文件名（不含扩展名）
 */
const saveAsExcelFile = (buffer, fileName) => {
  // 创建Blob对象
  const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // 创建下载链接
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(data);
  link.download = `${fileName}.xlsx`;
  
  // 模拟点击下载
  document.body.appendChild(link);
  link.click();
  
  // 移除链接
  setTimeout(() => {
    window.URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  }, 100);
};

/**
 * 从Excel文件导入数据
 * @param {File} file Excel文件对象
 * @returns {Promise} 返回解析后的数据数组
 */
export const importFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 获取第一个工作表的名称
        const firstSheetName = workbook.SheetNames[0];
        
        // 获取第一个工作表的数据
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 将工作表转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error('解析Excel文件失败: ' + error.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 导出指定列的数据到Excel
 * @param {Array} data 原始数据数组
 * @param {Array} columns 要导出的列配置，例如：[{title: '名称', dataIndex: 'name'}]
 * @param {String} fileName 文件名（不含扩展名）
 * @param {String} sheetName 工作表名称
 */
export const exportTableToExcel = (data, columns, fileName = 'export', sheetName = 'Sheet1') => {
  if (!data || data.length === 0 || !columns || columns.length === 0) {
    console.error('导出数据或列配置为空');
    return;
  }
  
  try {
    // 转换数据，只保留需要的列
    const exportData = data.map(item => {
      const exportItem = {};
      columns.forEach(column => {
        if (column.title && column.dataIndex) {
          // 处理嵌套属性
          if (column.dataIndex.includes('.')) {
            const keys = column.dataIndex.split('.');
            let value = item;
            for (const key of keys) {
              value = value?.[key];
              if (value === undefined || value === null) break;
            }
            exportItem[column.title] = value !== undefined ? value : '';
          } else {
            // 处理自定义渲染
            if (column.render && typeof column.render === 'function') {
              try {
                // 尝试使用渲染函数，但不依赖React组件
                const renderedValue = column.render(item[column.dataIndex], item);
                if (typeof renderedValue === 'string' || typeof renderedValue === 'number') {
                  exportItem[column.title] = renderedValue;
                } else {
                  exportItem[column.title] = item[column.dataIndex];
                }
              } catch (e) {
                exportItem[column.title] = item[column.dataIndex];
              }
            } else {
              exportItem[column.title] = item[column.dataIndex];
            }
          }
        }
      });
      return exportItem;
    });
    
    // 导出数据
    exportToExcel(exportData, fileName, sheetName);
  } catch (error) {
    console.error('导出Excel失败：', error);
  }
};

export default {
  exportToExcel,
  importFromExcel,
  exportTableToExcel
};