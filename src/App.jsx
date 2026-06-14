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
import { resolveSecondary } from './utils/theme';

function App() {
  const { config, isLoaded } = useConfig();
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const themeColor = config?.themeColor || '#6366f1';

  useEffect(() => {
    const secondaryColor = resolveSecondary(themeColor);

    document.documentElement.style.setProperty('--accent-color', themeColor);
    document.documentElement.style.setProperty('--accent-secondary', secondaryColor);
  }, [themeColor]);

  if (!isLoaded) {
    return (
      <div className="init-loading-screen">
        <div className="init-logo-container">
          <img src={logoUrl} alt="HomeOS" className="init-logo" />
          <div className="init-spinner"></div>
        </div>
        <h2>Initializing HomeOS...</h2>
        <p>Loading your dashboard configuration</p>
      </div>
    );
  }

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
        <div className="left-columns-group">
          {/* Row 1 */}
          <div className="dashboard-row">
            <DoorbellFeed />
            <UpcomingShows />
          </div>
          {/* Row 2 */}
          <div className="dashboard-row">
            <CurrentWeather />
            <CryptoStats />
          </div>
        </div>

        {/* Col 3 */}
        <div className="column-3-group">
          <SkyCard />
          <HomeWizardEnergy />
          <HueControls />
        </div>

        {/* Row 3 */}
        <div className="forecast-full-width">
          <WeatherForecast />
        </div>

        {/* Row 4: News Ticker – full width */}
        <div className="forecast-full-width news-ticker-group">
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
