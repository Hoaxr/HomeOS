# 🏠 HomeOS

A premium, glassmorphic personal home dashboard designed to bring your smart home integrations, local utilities, and personal widgets together in a unified, beautiful interface.

![Aesthetic](https://img.shields.io/badge/Aesthetics-Glassmorphism-blueviolet?style=for-the-badge)
![Tech](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![Build](https://img.shields.io/badge/Vite-Ready-646CFF?style=for-the-badge&logo=vite)

---

## ✨ Features

- **💡 Philips Hue Control**: Manage your home lights with real-time toggle switches and brightness sliders routed securely through a local API proxy.
- **⚡ HomeWizard P1 Integration**: Real-time monitoring of active power consumption, gas metrics, and today's cumulative utility costs.
- **📹 Reolink IP Doorbell**: Live stream feed snapshot viewer directly on your dashboard.
- **📅 Trakt.tv Calendar**: Sync your TV show checklist to see upcoming episodes in an elegant schedules list.
- **🪙 Crypto Market Tracker**: Watch cryptocurrency price charts (sparkline charts) and check the current Fear & Greed index.
- **🌦️ Local Weather & Sky Card**: 5-day daily forecast and detailed current conditions (AQI, rain probability, wind speed) from the Open-Meteo API.
- **🎨 Dynamic Accents & Customizer**: Choose between Indigo, Emerald, Amber, Rose, Sky, and Violet color palettes. The page background gradient, card glow outlines, and scrollbars adapt instantly.
- **📰 News Ticker**: Smoothly rotating multi-source RSS news feeds and DVD release dates ticker at the bottom of the screen.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.0 or higher)
- npm or yarn

### Installation

1. **Clone the Repository**:
   ```bash
   git clone git@github.com:Hoaxr/HomeOS.git
   cd HomeOS
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` (or the indicated port) in your browser.

---

## ⚙️ Configuration

HomeOS runs fully locally in your browser. Configured parameters are stored in a local `config.json` file in the root directory (ignored from Git for your security). 

When you first launch the app, the **Setup Wizard** will guide you through connecting:
- Philips Hue Bridge IP and API Username Token
- Reolink IP camera URL and credentials
- HomeWizard Smart Meter IP address
- Trakt.tv Client ID and Secret

Alternatively, you can edit `config.json` manually:
```json
{
  "hue": {
    "ip": "192.168.1.XX",
    "username": "YOUR_HUE_TOKEN"
  },
  "reolink": {
    "ip": "192.168.1.XX",
    "username": "admin",
    "password": "YOUR_CAMERA_PASSWORD"
  },
  "homewizard": {
    "ip": "192.168.1.XX"
  },
  "location": {
    "city": "Amsterdam",
    "lat": 52.37,
    "lon": 4.89
  },
  "themeColor": "#6366f1",
  "isConfigured": true
}
```

---

## 🛡️ Security

Your passwords, local IP addresses, and API tokens are private.
- The `config.json` containing credentials is fully ignored in `.gitignore`.
- Vite development proxy handles request authentication securely on your machine.
- No remote telemetry or external database storage is used.
