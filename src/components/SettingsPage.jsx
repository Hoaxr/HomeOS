import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, Clock, Lightbulb, Zap, Camera, Tv, Rss, Coins, 
  Trash2, Save, X, ChevronRight, Settings, Shield, Info
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { POPULAR_COINS } from '../utils/coins';
import { resolveSecondary } from '../utils/theme';
import { useLocationSearch } from '../hooks/useLocationSearch';
import { AVAILABLE_CLOCKS } from '../utils/all_clocks';


const SettingsPage = ({ onClose }) => {
  const { config, saveConfig, clearConfig } = useConfig();
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState(() => {
    const base = config || {};
    return {
      hue: base.hue || { ip: '', username: '' },
      reolink: base.reolink || { ip: '', username: '', password: '' },
      homewizard: base.homewizard || { ip: '192.168.1.70' },
      trakt: base.trakt || { clientId: '', clientSecret: '' },
      location: base.location || { city: 'Papendrecht', lat: 51.83, lon: 4.68 },
      themeColor: base.themeColor || '#6366f1',
      showLookaheadDays: base.showLookaheadDays || 4,
      maxShows: base.maxShows || 5,
      crypto: base.crypto || ['bitcoin', 'ethereum'],
      cryptoPeriod: base.cryptoPeriod || '7d',
      newsLimit: base.newsLimit || 25,
      newsRotationSpeed: base.newsRotationSpeed || 30,
      rssFeeds: base.rssFeeds || [
        { id: 'nos',       label: 'NOS',       color: '#e63946', url: 'https://feeds.nos.nl/nosnieuwsalgemeen' },
        { id: 'tweakers',  label: 'Tweakers',  color: '#f4a261', url: 'https://tweakers.net/feeds/mixed.xml' },
        { id: 'ad',        label: 'AD',        color: '#e9c46a', url: 'https://www.ad.nl/rss.xml' },
        { id: 'crimesite', label: 'Crimesite', color: '#a8dadc', url: 'https://www.crimesite.nl/feed/' },
      ],
      energyTariffNormal: base.energyTariffNormal || 0.22,
      energyTariffDal: base.energyTariffDal || 0.20,
      gasTariff: base.gasTariff || 1.05,
      clocks: base.clocks || [
        { id: 'nl', label: 'Rotterdam', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
        { id: 'uk', label: 'London', timezone: 'Europe/London', flag: '🇬🇧' },
        { id: 'us', label: 'New York', timezone: 'America/New_York', flag: '🇺🇸' },
        { id: 'jp', label: 'Tokyo', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
        { id: 'au', label: 'Sydney', timezone: 'Australia/Sydney', flag: '🇦🇺' }
      ],
      isConfigured: true
    };
  });

  const [locationDirty, setLocationDirty] = useState(false);

  const {
    locationSearch,
    setLocationSearch,
    locationSuggestions,
    setLocationSuggestions,
    locationLoading
  } = useLocationSearch(formData.location.city || '');
  const [cryptoSearch, setCryptoSearch] = useState('');
  const [clockSearch, setClockSearch] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedLabel, setFeedLabel] = useState('');

  // Live theme preview
  useEffect(() => {
    const previewColor = formData.themeColor || '#6366f1';
    const secondaryColor = resolveSecondary(formData.themeColor);
    document.documentElement.style.setProperty('--accent-color', previewColor);
    document.documentElement.style.setProperty('--accent-secondary', secondaryColor);

    return () => {
      const originalColor = config?.themeColor || '#6366f1';
      const originalSecondary = resolveSecondary(originalColor);
      document.documentElement.style.setProperty('--accent-color', originalColor);
      document.documentElement.style.setProperty('--accent-secondary', originalSecondary);
    };
  }, [formData.themeColor, config?.themeColor]);

  const handleSave = () => {
    saveConfig({ ...formData, isConfigured: true });
    if (onClose) onClose();
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear all settings? This will restart the setup wizard.")) {
      clearConfig();
    }
  };



  // Crypto filter logic
  const query = cryptoSearch.toLowerCase().trim();
  const filteredCoins = POPULAR_COINS.filter(coin => 
    coin.name.toLowerCase().includes(query) || 
    coin.symbol.toLowerCase().includes(query) || 
    coin.id.toLowerCase().includes(query)
  );
  const hasExactMatch = POPULAR_COINS.some(coin => coin.id.toLowerCase() === query || coin.symbol.toLowerCase() === query);
  const showAddCustom = query.length > 0 && !hasExactMatch;

  const menuItems = [
    { id: 'general', label: 'General & Location', icon: Globe, color: 'text-accent' },
    { id: 'smartHome', label: 'Smart Home', icon: Lightbulb, color: 'text-amber' },
    { id: 'security', label: 'Security', icon: Camera, color: 'text-blue' },
    { id: 'entertainment', label: 'Entertainment & RSS', icon: Tv, color: 'text-purple' },
    { id: 'crypto', label: 'Crypto Tracking', icon: Coins, color: 'text-success' },
    { id: 'system', label: 'System & Theme', icon: Settings, color: 'text-accent' },
  ];

  return (
    <div className="settings-fullpage">
      {/* Upper bar */}
      <header className="settings-fullpage-header">
        <div className="title-group">
          <Settings size={26} className="text-accent icon-spin-hover" />
          <h2>System Settings</h2>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={16} /> Save Settings
          </button>
        </div>
      </header>

      {/* Main split layout */}
      <div className="settings-fullpage-layout">
        {/* Left Sidebar */}
        <aside className="settings-sidebar">
          <div className="settings-menu-list">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`settings-menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={18} className={`settings-menu-icon ${isActive ? item.color : ''}`} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
                </button>
              );
            })}
          </div>

          <div className="settings-sidebar-footer">
            <button className="btn-secondary danger-btn" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trash2 size={16} /> Wipe All Settings
            </button>
          </div>
        </aside>

        {/* Right Content Panel */}
        <main className="settings-main-content">
          <div className="settings-pane">
            
            {/* 🌐 Tab 1: General & Location */}
            {activeTab === 'general' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <div className="settings-pane-title">
                  <Globe size={24} className="text-accent" />
                  <span>General & Location</span>
                </div>
                <p className="settings-pane-desc">
                  Manage your home coordinates for weather forecasts and configure world clocks displayed in the header.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="settings-group-card" style={{ margin: 0 }}>
                      <div className="settings-group-title">
                        <Globe size={18} className="text-accent" /> Home Location
                      </div>
                      <div className="settings-input-row" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="input-group" style={{ position: 'relative' }}>
                          <label>City Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Papendrecht"
                            value={locationSearch}
                            onFocus={e => e.target.select()}
                            onChange={e => {
                              setLocationSearch(e.target.value);
                              setLocationDirty(true);
                              setFormData(prev => ({
                                ...prev,
                                location: { ...prev.location, city: e.target.value }
                              }));
                            }}
                          />
                          {locationLoading && (
                            <div className="pulse-dot" style={{ position: 'absolute', right: '16px', top: '38px', background: 'var(--accent-color)' }} />
                          )}
                          
                          {locationSuggestions.length > 0 && (
                            <div className="location-autocomplete-list">
                              {locationSuggestions.map(s => (
                                <div
                                  key={s.id}
                                  className="location-autocomplete-item"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      location: {
                                        city: s.name,
                                        lat: parseFloat(s.latitude.toFixed(4)),
                                        lon: parseFloat(s.longitude.toFixed(4))
                                      }
                                    }));
                                    setLocationSearch(s.name);
                                    setLocationSuggestions([]);
                                    setLocationDirty(false);
                                  }}
                                >
                                  <span className="city-name">{s.name}</span>
                                  <span className="city-meta">
                                    {s.admin1 ? `${s.admin1}, ` : ''}{s.country}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="settings-input-row" style={{ margin: 0 }}>
                          <div className="input-group">
                            <label>Latitude</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={formData.location.lat}
                              onFocus={e => e.target.select()}
                              onChange={e => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) setFormData(prev => ({ ...prev, location: { ...prev.location, lat: v } }));
                              }}
                            />
                          </div>
                          <div className="input-group">
                            <label>Longitude</label>
                            <input
                              type="number"
                              step="0.0001"
                              value={formData.location.lon}
                              onFocus={e => e.target.select()}
                              onChange={e => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v)) setFormData(prev => ({ ...prev, location: { ...prev.location, lon: v } }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="settings-group-card" style={{ margin: 0 }}>
                      <div className="settings-group-title">
                        <Clock size={18} className="text-accent" /> World Clocks
                      </div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <label className="crypto-section-label">Selected Clocks ({formData.clocks.length}/5)</label>
                        <div className="crypto-selection">
                          {formData.clocks.length === 0 ? (
                            <span className="setup-hint" style={{ margin: 0 }}>No world clocks selected.</span>
                          ) : (
                            formData.clocks.map(clock => (
                              <div
                                key={clock.id}
                                className="crypto-chip selected"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    clocks: formData.clocks.filter(c => c.id !== clock.id)
                                  });
                                }}
                              >
                                <span>{clock.flag} {clock.label}</span>
                                <span className="crypto-chip-remove">×</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="input-group">
                        <label>Search and add country</label>
                        <input
                          type="text"
                          placeholder={formData.clocks.length >= 5 ? 'Maximum of 5 timezones reached' : 'Type to search...'}
                          value={clockSearch}
                          onChange={e => setClockSearch(e.target.value)}
                          disabled={formData.clocks.length >= 5}
                        />
                      </div>

                      {clockSearch && (
                        <div className="crypto-available-section" style={{ marginTop: '12px' }}>
                          <div className="crypto-selection" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                            {AVAILABLE_CLOCKS.filter(c => c.label.toLowerCase().includes(clockSearch.toLowerCase())).map(clock => {
                              const isSelected = formData.clocks.find(fc => fc.id === clock.id);
                              return (
                                <div
                                  key={clock.id}
                                  className={`crypto-chip ${isSelected ? 'selected' : ''}`}
                                  onClick={() => {
                                    if (isSelected) {
                                      setFormData({ ...formData, clocks: formData.clocks.filter(c => c.id !== clock.id) });
                                    } else if (formData.clocks.length < 5) {
                                      setFormData({ ...formData, clocks: [...formData.clocks, clock] });
                                      setClockSearch('');
                                    }
                                  }}
                                >
                                  {clock.flag} {clock.label}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                </div>
              </motion.div>
            )}

            {/* 🔌 Tab 2: Smart Home */}
            {activeTab === 'smartHome' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <div className="settings-pane-title">
                  <Lightbulb size={24} className="text-amber" />
                  <span>Smart Home Integrations</span>
                </div>
                <p className="settings-pane-desc">
                  Connect and manage your smart home devices like the Philips Hue Bridge and the HomeWizard P1 energy meter.
                </p>

                <div className="settings-group-card">
                  <div className="settings-group-title">
                    <Lightbulb size={18} className="text-amber" /> Philips Hue Bridge
                  </div>
                  <div className="settings-input-row">
                    <div className="input-group">
                      <label>Bridge IP Address</label>
                      <input
                        type="text"
                        placeholder="e.g. 192.168.1.50"
                        value={formData.hue.ip}
                        onChange={e => setFormData({ ...formData, hue: { ...formData.hue, ip: e.target.value } })}
                      />
                    </div>
                    <div className="input-group">
                      <label>API Username / Token</label>
                      <input
                        type="password"
                        placeholder="Generated Hue Token"
                        value={formData.hue.username}
                        onChange={e => setFormData({ ...formData, hue: { ...formData.hue, username: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-group-card">
                  <div className="settings-group-title">
                    <Zap size={18} className="text-success" /> HomeWizard P1 Meter
                  </div>
                  <div className="settings-input-row">
                    <div className="input-group">
                      <label>P1 Meter IP Address</label>
                      <input
                        type="text"
                        placeholder="e.g. 192.168.1.70"
                        value={formData.homewizard.ip}
                        onChange={e => setFormData({ ...formData, homewizard: { ...formData.homewizard, ip: e.target.value } })}
                      />
                    </div>
                  </div>

                  <div className="settings-input-row">
                    <div className="input-group">
                      <label>Electricity Normal Tariff (€/kWh)</label>
                      <input
                        type="number"
                        step="0.00001"
                        placeholder="0.22093"
                        value={formData.energyTariffNormal}
                        onChange={e => setFormData({ ...formData, energyTariffNormal: e.target.value })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Electricity Off-Peak Tariff (€/kWh)</label>
                      <input
                        type="number"
                        step="0.00001"
                        placeholder="0.23303"
                        value={formData.energyTariffDal}
                        onChange={e => setFormData({ ...formData, energyTariffDal: e.target.value })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Gas Tariff (€/m³)</label>
                      <input
                        type="number"
                        step="0.00001"
                        placeholder="1.20642"
                        value={formData.gasTariff}
                        onChange={e => setFormData({ ...formData, gasTariff: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 📹 Tab 3: Security */}
            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <div className="settings-pane-title">
                  <Camera size={24} className="text-blue" />
                  <span>Security & Cameras</span>
                </div>
                <p className="settings-pane-desc">
                  Configure camera settings. Currently, the dashboard supports live snapshots from your Reolink Smart Doorbell.
                </p>

                <div className="settings-group-card">
                  <div className="settings-group-title">
                    <Camera size={18} className="text-blue" /> Reolink IP Doorbell
                  </div>
                  <div className="settings-input-row">
                    <div className="input-group">
                      <label>Doorbell IP Address</label>
                      <input
                        type="text"
                        placeholder="e.g. 192.168.1.66"
                        value={formData.reolink.ip}
                        onChange={e => setFormData({ ...formData, reolink: { ...formData.reolink, ip: e.target.value } })}
                      />
                    </div>
                  </div>

                  <div className="settings-input-row">
                    <div className="input-group">
                      <label>Camera Username</label>
                      <input
                        type="text"
                        placeholder="admin"
                        value={formData.reolink.username}
                        onChange={e => setFormData({ ...formData, reolink: { ...formData.reolink, username: e.target.value } })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Camera Password</label>
                      <input
                        type="password"
                        placeholder="Password"
                        value={formData.reolink.password}
                        onChange={e => setFormData({ ...formData, reolink: { ...formData.reolink, password: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 📺 Tab 4: Entertainment & RSS */}
            {activeTab === 'entertainment' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <div className="settings-pane-title">
                  <Tv size={24} className="text-purple" />
                  <span>Entertainment & News</span>
                </div>
                <p className="settings-pane-desc">
                  Link Trakt.tv to stay up to date with new TV series and movies, and configure RSS news feeds for the dashboard ticker.
                </p>

                <div className="settings-group-card">
                  <div className="settings-group-title">
                    <Tv size={18} className="text-purple" /> Trakt.tv Account API
                  </div>
                  <div className="settings-input-row">
                    <div className="input-group">
                      <label>Client ID</label>
                      <input
                        type="password"
                        placeholder="Trakt Client ID"
                        value={formData.trakt.clientId}
                        onChange={e => setFormData({ ...formData, trakt: { ...formData.trakt, clientId: e.target.value } })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Client Secret</label>
                      <input
                        type="password"
                        placeholder="Trakt Client Secret"
                        value={formData.trakt.clientSecret || ''}
                        onChange={e => setFormData({ ...formData, trakt: { ...formData.trakt, clientSecret: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-group-card">
                  <div className="settings-group-title">
                    <Rss size={18} className="text-purple" /> News Feeds (RSS)
                  </div>

                  <div className="rss-feeds-list" style={{ marginBottom: 24 }}>
                    {(formData.rssFeeds || []).map((feed, idx) => (
                      <div key={feed.id || idx} className="rss-feed-row">
                        <span className="rss-feed-dot" style={{ background: feed.color }} />
                        <div className="rss-feed-info">
                          <span className="rss-feed-label">{feed.label}</span>
                          <span className="rss-feed-url">{feed.url}</span>
                        </div>
                        <button
                          type="button"
                          className="rss-feed-remove"
                          title="Remove feed"
                          onClick={() => setFormData({
                            ...formData,
                            rssFeeds: formData.rssFeeds.filter((_, i) => i !== idx)
                          })}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="rss-add-feed" style={{ background: 'rgba(255,255,255,0.01)', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="settings-input-row">
                      <div className="input-group">
                        <label>Feed Label / Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Tweakers"
                          value={feedLabel}
                          onChange={e => setFeedLabel(e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label>RSS Feed URL</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={feedUrl}
                          onChange={e => setFeedUrl(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: '100%', marginTop: 8 }}
                      disabled={!feedUrl.trim() || !feedLabel.trim()}
                      onClick={() => {
                        const colors = ['#e63946','#f4a261','#e9c46a','#a8dadc','#c77dff','#06d6a0','#118ab2'];
                        const newFeed = {
                          id: feedLabel.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                          label: feedLabel.trim(),
                          color: colors[(formData.rssFeeds || []).length % colors.length],
                          url: feedUrl.trim(),
                        };
                        setFormData({ ...formData, rssFeeds: [...(formData.rssFeeds || []), newFeed] });
                        setFeedUrl('');
                        setFeedLabel('');
                      }}
                    >
                      + Add RSS Feed
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 🪙 Tab 5: Crypto Tracking */}
            {activeTab === 'crypto' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <div className="settings-pane-title">
                  <Coins size={24} className="text-success" />
                  <span>Crypto Watchlist</span>
                </div>
                <p className="settings-pane-desc">
                  Choose which cryptocurrencies to track and select the time period for sparkline indicators.
                </p>

                <div className="settings-group-card">
                  <div className="settings-group-title">
                    <Coins size={18} className="text-success" /> Selected Cryptocurrencies ({formData.crypto.length})
                  </div>

                  <div className="crypto-selected-section" style={{ marginBottom: 20 }}>
                    <div className="crypto-selection">
                      {formData.crypto.length === 0 ? (
                        <span className="setup-hint" style={{ margin: 0 }}>No coins selected.</span>
                      ) : (
                        formData.crypto.map(coinId => {
                          const coinInfo = POPULAR_COINS.find(c => c.id === coinId) || { name: coinId.charAt(0).toUpperCase() + coinId.slice(1), symbol: coinId.slice(0,4).toUpperCase() };
                          return (
                            <div
                              key={coinId}
                              className="crypto-chip selected"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  crypto: formData.crypto.filter(c => c !== coinId)
                                });
                              }}
                            >
                              <span>{coinInfo.name} ({coinInfo.symbol})</span>
                              <span className="crypto-chip-remove">×</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="settings-input-row">
                    <div className="input-group">
                      <label>Graph & Change Period</label>
                      <select
                        value={formData.cryptoPeriod}
                        onChange={e => setFormData({ ...formData, cryptoPeriod: e.target.value })}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          color: 'white',
                          fontSize: '1rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="1h">1 Hour</option>
                        <option value="6h">6 Hours</option>
                        <option value="24h">24 Hours (1 Day)</option>
                        <option value="48h">48 Hours (2 Days)</option>
                        <option value="7d">7 Days (1 Week)</option>
                      </select>
                    </div>
                  </div>

                  <div className="input-group" style={{ marginTop: 12 }}>
                    <label>Search and add coins</label>
                    <input
                      type="text"
                      placeholder="Search e.g. Bitcoin, Ethereum, Solana..."
                      value={cryptoSearch}
                      onChange={e => setCryptoSearch(e.target.value)}
                    />
                  </div>

                  {query && (
                    <div className="crypto-available-section" style={{ marginTop: '16px' }}>
                      <label className="crypto-section-label">Search Results</label>
                      <div className="crypto-selection" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                        {filteredCoins.map(coin => {
                          const isSelected = formData.crypto.includes(coin.id);
                          return (
                            <div
                              key={coin.id}
                              className={`crypto-chip ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                const newCrypto = isSelected
                                  ? formData.crypto.filter(c => c !== coin.id)
                                  : [...formData.crypto, coin.id];
                                setFormData({ ...formData, crypto: newCrypto });
                              }}
                            >
                              {coin.name} <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>{coin.symbol}</span>
                            </div>
                          );
                        })}
                        {showAddCustom && (
                          <div
                            className="crypto-chip custom-add-chip"
                            style={{ borderStyle: 'dashed', borderColor: 'var(--accent-color)' }}
                            onClick={() => {
                              if (!formData.crypto.includes(query)) {
                                setFormData({
                                  ...formData,
                                  crypto: [...formData.crypto, query]
                                });
                                setCryptoSearch('');
                              }
                            }}
                          >
                            + Add Custom: "{query}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ⚙️ Tab 6: System & Theme */}
            {activeTab === 'system' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <div className="settings-pane-title">
                  <Settings size={24} className="text-accent" />
                  <span>System & Theme</span>
                </div>
                <p className="settings-pane-desc">
                  Customize the theme accent color and configure rotation speeds or widget limits.
                </p>

                <div className="settings-group-card">
                  <div className="settings-group-title">
                    <Shield size={18} className="text-accent" /> Accent & Theme Color
                  </div>
                  <div>
                    <label className="crypto-section-label">Select a theme accent color</label>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
                      {[
                        { label: 'Indigo', value: '#6366f1' },
                        { label: 'Emerald', value: '#10b981' },
                        { label: 'Amber', value: '#f59e0b' },
                        { label: 'Rose', value: '#f43f5e' },
                        { label: 'Sky', value: '#0ea5e9' },
                        { label: 'Violet', value: '#8b5cf6' },
                      ].map(theme => {
                        const isSelected = formData.themeColor === theme.value;
                        return (
                          <button
                            key={theme.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, themeColor: theme.value })}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 8,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: theme.value,
                                border: isSelected ? '3px solid white' : '1px solid rgba(255,255,255,0.2)',
                                boxShadow: isSelected ? `0 0 14px ${theme.value}` : 'none',
                                transition: 'all 0.25s',
                              }}
                            />
                            <span style={{ fontSize: '0.8rem', color: isSelected ? 'white' : 'var(--text-secondary)' }}>
                              {theme.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="settings-group-card">
                  <div className="settings-group-title">
                    <Rss size={18} className="text-purple" /> News Ticker Settings
                  </div>
                  <div className="settings-input-row">
                    <div className="input-group">
                      <label>News Rotation Interval (seconds)</label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        value={formData.newsRotationSpeed}
                        onChange={e => setFormData({ ...formData, newsRotationSpeed: parseInt(e.target.value, 10) || 30 })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Max Articles per Feed</label>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={formData.newsLimit}
                        onChange={e => setFormData({ ...formData, newsLimit: parseInt(e.target.value, 10) || 25 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-group-card">
                  <div className="settings-group-title">
                    <Tv size={18} className="text-purple" /> Entertainment Calendar
                  </div>
                  <div className="settings-input-row">
                    <div className="input-group">
                      <label>Lookahead Days (Trakt.tv)</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={formData.showLookaheadDays}
                        onChange={e => setFormData({ ...formData, showLookaheadDays: parseInt(e.target.value, 10) || 4 })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Max Shows Displayed</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.maxShows}
                        onChange={e => setFormData({ ...formData, maxShows: parseInt(e.target.value, 10) || 5 })}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
