import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, Globe, Cpu, CheckCircle, Coins, Camera, Zap, Lightbulb } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { POPULAR_COINS } from '../utils/coins';
import { useLocationSearch } from '../hooks/useLocationSearch';

const SetupWizard = ({ onClose }) => {
  const { config, saveConfig } = useConfig();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(() => {
    const base = config || {};
    return {
      hue: base.hue || { ip: '', username: '' },
      reolink: base.reolink || { ip: '', username: '', password: '' },
      homewizard: base.homewizard || { ip: '192.168.1.70' },
      trakt: base.trakt || { clientId: '', clientSecret: '' },
      location: base.location || { city: 'Papendrecht', lat: 51.83, lon: 4.68 },
      crypto: base.crypto || ['bitcoin', 'ethereum'],
    };
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);
  const finish = () => {
    saveConfig({ ...formData, isConfigured: true });
    if (onClose) onClose();
  };

  const [cryptoSearch, setCryptoSearch] = useState('');
  
  const {
    locationSearch,
    setLocationSearch,
    locationSuggestions,
    setLocationSuggestions,
    locationLoading
  } = useLocationSearch(formData.location.city || '');

  // Memoize steps array so step 4 and 5 contents don't rebuild/recalculate on every minor state change unless their specific dependencies change
  const renderLocationStep = () => {
    return (
      <div className="setup-form">
        <div className="input-group" style={{ position: 'relative' }}>
          <label>City Name</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. Papendrecht"
              value={locationSearch}
              onFocus={e => e.target.select()}
              onChange={e => {
                setLocationSearch(e.target.value);
                setFormData(prev => ({
                  ...prev,
                  location: { ...prev.location, city: e.target.value }
                }));
              }}
              style={{ width: '100%' }}
            />
            {locationLoading && (
              <div className="pulse-dot" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'var(--accent-color)' }} />
            )}
          </div>
          
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
        <div className="location-row">
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
    );
  };

  const renderCryptoStep = () => {
    const query = cryptoSearch.toLowerCase().trim();
    const filtered = POPULAR_COINS.filter(coin => 
      coin.name.toLowerCase().includes(query) || 
      coin.symbol.toLowerCase().includes(query) || 
      coin.id.toLowerCase().includes(query)
    );

    const hasExactMatch = POPULAR_COINS.some(coin => coin.id.toLowerCase() === query || coin.symbol.toLowerCase() === query);
    const showAddCustom = query.length > 0 && !hasExactMatch;

    return (
      <div className="setup-form">
        <div className="crypto-selected-section">
          <label className="crypto-section-label">Selected ({formData.crypto.length})</label>
          <div className="crypto-selection">
            {formData.crypto.length === 0 ? (
              <span className="setup-hint" style={{ margin: 0, padding: '4px 0' }}>No coins selected. Search or click below to select.</span>
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

        <div className="input-group">
          <label>Search Coins</label>
          <input
            type="text"
            placeholder="Search by name, symbol, or CoinGecko ID..."
            value={cryptoSearch}
            onFocus={e => e.target.select()}
            onChange={e => setCryptoSearch(e.target.value)}
          />
        </div>

        <div className="crypto-available-section">
          <label className="crypto-section-label">
            {query ? 'Search Results' : 'Popular Coins'}
          </label>
          <div className="crypto-selection" style={{ maxHeight: '180px', overflowY: 'auto', paddingBottom: '4px' }}>
            {filtered.map(coin => {
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
                + Add CoinGecko ID: "{query}"
              </div>
            )}
            
            {filtered.length === 0 && !showAddCustom && (
              <span className="setup-hint" style={{ margin: 0 }}>No coins found. Type a CoinGecko ID to add it manually.</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const steps = [
    // ── 0. Welcome ──────────────────────────────────────────────
    {
      title: 'Welcome to HomeOS',
      desc: "Let's get your premium dashboard configured. This will take about 2 minutes.",
      icon: <Settings size={40} className="text-accent" />,
      content: (
        <div className="setup-intro">
          <p>Your dashboard needs a few connections to bring your home to life.</p>
          <p className="note">All data is stored locally in your browser.</p>
        </div>
      ),
    },

    // ── 1. Hue Bridge ────────────────────────────────────────────
    {
      title: 'Philips Hue',
      desc: 'Connect your Hue Bridge to control lights from the dashboard.',
      icon: <Lightbulb size={40} className="text-accent" />,
      content: (
        <div className="setup-form">
          <div className="input-group">
            <label>Hue Bridge IP</label>
            <input
              type="text"
              placeholder="192.168.1..."
              value={formData.hue.ip}
              onFocus={e => e.target.select()}
              onChange={e => setFormData({ ...formData, hue: { ...formData.hue, ip: e.target.value } })}
            />
          </div>
          <div className="input-group">
            <label>Hue Username / API Token</label>
            <input
              type="text"
              placeholder="Generated token from your bridge"
              value={formData.hue.username}
              onFocus={e => e.target.select()}
              onChange={e => setFormData({ ...formData, hue: { ...formData.hue, username: e.target.value } })}
            />
          </div>
          <p className="setup-hint">
            Find your token at <code>http://&lt;bridge-ip&gt;/debug/clip.html</code>
          </p>
        </div>
      ),
    },

    // ── 2. Reolink ───────────────────────────────────────────────
    {
      title: 'Reolink Doorbell',
      desc: 'Connect your Reolink camera for a live doorbell feed.',
      icon: <Camera size={40} className="text-accent" />,
      content: (
        <div className="setup-form">
          <div className="input-group">
            <label>Reolink IP (+ port if needed)</label>
            <input
              type="text"
              placeholder="192.168.1.66:554"
              value={formData.reolink.ip}
              onFocus={e => e.target.select()}
              onChange={e => setFormData({ ...formData, reolink: { ...formData.reolink, ip: e.target.value } })}
            />
          </div>
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="admin"
              value={formData.reolink.username}
              onFocus={e => e.target.select()}
              onChange={e => setFormData({ ...formData, reolink: { ...formData.reolink, username: e.target.value } })}
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={formData.reolink.password}
              onFocus={e => e.target.select()}
              onChange={e => setFormData({ ...formData, reolink: { ...formData.reolink, password: e.target.value } })}
            />
          </div>
        </div>
      ),
    },

    // ── 3. HomeWizard ────────────────────────────────────────────
    {
      title: 'HomeWizard Energy',
      desc: 'Connect your P1 meter to see real-time electricity and gas usage.',
      icon: <Zap size={40} className="text-accent" />,
      content: (
        <div className="setup-form">
          <div className="input-group">
            <label>HomeWizard P1 IP</label>
            <input
              type="text"
              placeholder="192.168.1.70"
              value={formData.homewizard.ip}
              onFocus={e => e.target.select()}
              onChange={e => setFormData({ ...formData, homewizard: { ...formData.homewizard, ip: e.target.value } })}
            />
          </div>
          <p className="setup-hint">
            Find the IP in your HomeWizard app under <strong>Settings → Meters</strong>.
          </p>
        </div>
      ),
    },

    // ── 4. Location ──────────────────────────────────────────────
    {
      title: 'Your Location',
      desc: 'Used for accurate weather, sunrise/sunset and moon data.',
      icon: <Globe size={40} className="text-accent" />,
      content: renderLocationStep(),
    },

    // ── 5. Crypto ────────────────────────────────────────────────
    {
      title: 'Crypto Tracking',
      desc: 'Select the coins you want to track on your dashboard.',
      icon: <Coins size={40} className="text-accent" />,
      content: renderCryptoStep(),
    },

    // ── 6. Trakt ─────────────────────────────────────────────────
    {
      title: 'Trakt TV Shows',
      desc: 'Sync your watchlist to see upcoming episodes.',
      icon: <Shield size={40} className="text-accent" />,
      content: (
        <div className="setup-form">
          <div className="input-group">
            <label>Client ID</label>
            <input
              type="password"
              placeholder="Your Client ID"
              value={formData.trakt.clientId}
              onFocus={e => e.target.select()}
              onChange={e => setFormData({ ...formData, trakt: { ...formData.trakt, clientId: e.target.value } })}
            />
          </div>
          <div className="input-group">
            <label>Client Secret</label>
            <input
              type="password"
              placeholder="Your Client Secret"
              value={formData.trakt.clientSecret || ''}
              onFocus={e => e.target.select()}
              onChange={e => setFormData({ ...formData, trakt: { ...formData.trakt, clientSecret: e.target.value } })}
            />
          </div>
          <p className="setup-hint">
            Both are required. Create an app at <strong>trakt.tv/oauth/applications</strong>.
          </p>
        </div>
      ),
    },

    // ── 7. Done ──────────────────────────────────────────────────
    {
      title: 'All Ready!',
      desc: 'Your dashboard is configured and ready to go.',
      icon: <CheckCircle size={40} className="text-success" />,
      content: (
        <div className="setup-finish">
          <p>Click finish to launch your personalized dashboard.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="setup-overlay">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="glass-card setup-card"
        >
          <div className="setup-header">
            <div className="setup-icon">{steps[step].icon}</div>
            <h2>{steps[step].title}</h2>
            <p>{steps[step].desc}</p>
          </div>

          <div className="setup-content">
            {steps[step].content}
          </div>

          <div className="setup-actions">
            {step > 0 ? (
              <button className="btn-secondary" onClick={prevStep}>Back</button>
            ) : (
              config?.isConfigured && onClose && <button className="btn-secondary" onClick={onClose}>Cancel</button>
            )}
            <div className="spacer" />
            {step < steps.length - 1 ? (
              <button className="btn-primary" onClick={nextStep}>Continue</button>
            ) : (
              <button className="btn-primary" onClick={finish}>Finish Setup</button>
            )}
          </div>

          <div className="setup-progress">
            {steps.map((_, i) => (
              <div key={i} className={`dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SetupWizard;
