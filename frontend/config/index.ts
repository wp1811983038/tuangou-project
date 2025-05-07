// frontend/config/index.ts

// 环境配置
interface EnvConfig {
    baseUrl: string;
  }
  
  // 不同环境配置
  const env: Record<string, EnvConfig> = {
    development: {
      baseUrl: 'http://localhost:8000/api'
    },
    production: {
      baseUrl: 'http://your-api-domain.com/api'
    }
  };
  
  // 当前环境
  const currentEnv = 'development';
  
  export default {
    baseUrl: env[currentEnv].baseUrl
  };