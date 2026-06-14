import React, { useState, useEffect } from 'react';
import { useConfig } from './context/ConfigContext';
import SetupWizard from './components/SetupWizard';
import SettingsPage from './components/SettingsPage';
import GlobalClocks from './components/GlobalClocks';
import DoorbellFeed from './components/DoorbellFeed';
import HueControls from './components/HueControls';
import CryptoStats from './components/CryptoStats';
import UpcomingShows from './components/UpcomingShows';
import WeatherForecast from './components/WeatherForecast';
import CurrentWeather from './components/CurrentWeather';
import SkyCard from './components/SkyCard';
import HomeWizardEnergy from './components/HomeWizardEnergy';
import NewsTicker from './components/NewsTicker';
import { Settings } from 'lucide-react';
import logoUrl from './assets/logo.png';

function App() {
  const { config, isLoaded } = useConfig();
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const themeColor = config?.themeColor || '#6366f1';

  useEffect(() => {
    const secondaryColor = {
      '#6366f1': '#a855f7', // Indigo -> Purple
      '#10b981': '#06b6d4', // Emerald -> Cyan
      '#f59e0b': '#f97316', // Amber -> Orange
      '#f43f5e': '#d946ef', // Rose -> Fuchsia
      '#0ea5e9': '#6366f1', // Sky -> Indigo
      '#8b5cf6': '#ec4899', // Violet -> Pink
    }[themeColor] || '#a855f7';

    document.documentElement.style.setProperty('--accent-color', themeColor);
    document.documentElement.style.setProperty('--accent-secondary', secondaryColor);
  }, [themeColor]);

  if (!isLoaded) return <div className="loading">Initializing HomeOS...</div>;

  if (!config || !config.isConfigured) {
    return <SetupWizard />;
  }

  if (isEditingSettings) {
    return <SettingsPage onClose={() => setIsEditingSettings(false)} />;
  }

  return (
    <div className="dashboard-container">
      <header className="header glass-card">
        <div className="logo-group">
          <img src={logoUrl} alt="HomeOS" className="header-logo" />
        </div>
        <GlobalClocks />
        <button
          className="icon-btn settings-btn"
          onClick={() => setIsEditingSettings(true)}
          title="Dashboard Settings"
        >
          <Settings size={20} />
        </button>
      </header>

      <main className="main-grid">
        <div className="left-columns-group" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-between' }}>
          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>
            <DoorbellFeed />
            <UpcomingShows />
          </div>
          {/* Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'stretch' }}>
            <CurrentWeather />
            <CryptoStats />
          </div>
        </div>

        {/* Col 3 */}
        <div className="column-3-group" style={{ gridColumn: 'span 4' }}>
          <SkyCard />
          <HomeWizardEnergy />
          <HueControls />
        </div>

        {/* Row 3 */}
        <div className="forecast-full-width">
          <WeatherForecast />
        </div>

        {/* Row 4: News Ticker – full width */}
        <div className="forecast-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <NewsTicker />
          <NewsTicker feeds={[
            { id: 'dvds-releases', label: 'New Movie Releases', color: '#10b981', url: 'https://feeds.feedburner.com/DVDsReleaseDates' }
          ]} />
        </div>
      </main>
    </div>
  );
}

export default App;
