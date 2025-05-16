import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import './index.less';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="exception-page">
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您访问的页面不存在"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;