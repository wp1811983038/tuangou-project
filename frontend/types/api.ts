// API响应基础接口
export interface ApiResponse<T = any> {
    code: number;
    msg: string;
    data: T;
  }
  
  // 用户登录响应数据
  export interface UserLoginData {
    token: string;
    userInfo: {
      userId: number;
      nickname: string;
      avatar: string;
      phone: string;
    }
  }
  
  // 商户登录响应数据
  export interface MerchantLoginData {
    token: string;
    merchantInfo: {
      merchantId: number;
      name: string;
      logo: string;
      phone: string;
      contactPerson: string;
      address: string;
    }
  }
  
  // 管理员登录响应数据
  export interface AdminLoginData {
    token: string;
    adminInfo: {
      adminId: number;
      username: string;
      name: string;
      phone: string;
      role: number;
    }
  }