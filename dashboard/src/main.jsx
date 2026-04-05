import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ConfigProvider, theme } from 'antd'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#C9A96E',
          colorBgBase: '#0A0A0A',
          colorTextBase: '#F5F5F0',
          fontFamily: "'DM Sans', sans-serif"
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
