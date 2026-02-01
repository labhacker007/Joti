import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

function Unauthorized() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 20 }}>
      <Result
        status="403"
        title="403"
        subTitle="You do not have permission to access this page."
        extra={<Button type="primary" onClick={() => navigate('/')}>Go Home</Button>}
      />
    </div>
  );
}

export default Unauthorized;
