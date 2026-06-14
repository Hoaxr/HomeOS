import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ConfigProvider } from './context/ConfigContext'
import { WeatherProvider } from './context/WeatherContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider>
      <WeatherProvider>
        <App />
      </WeatherProvider>
    </ConfigProvider>
  </React.StrictMode>,
)
