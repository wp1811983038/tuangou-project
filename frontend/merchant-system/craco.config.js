const CracoLessPlugin = require('craco-less');

module.exports = {
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
  // 添加 webpack 开发服务器配置
  devServer: {
    allowedHosts: 'all', // 允许所有主机访问
    // 如果上面的设置不起作用，可以尝试下面的配置：
    // allowedHosts: ['localhost', '.localhost'],
  }
};