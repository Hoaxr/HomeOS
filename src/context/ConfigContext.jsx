import React, { createContext, useContext, useState, useEffect } from 'react';

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const saveConfigToServer = async (newConfig) => {
    try {
      const res = await fetch('/api/config', {
        method: newConfig === null ? 'DELETE' : 'POST',
        headers: newConfig !== null ? { 'Content-Type': 'application/json' } : {},
        body: newConfig !== null ? JSON.stringify(newConfig) : undefined,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
    } catch (err) {
      console.error('Failed to save config to server:', err);
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setConfig(data);
          } else {
            // Check localStorage for legacy/migration config
            const legacy = localStorage.getItem('home_dashboard_config');
            if (legacy) {
              const parsed = JSON.parse(legacy);
              setConfig(parsed);
              // Migrate it to the server
              await saveConfigToServer(parsed);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load server config:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('home_dashboard_config', JSON.stringify(newConfig));
    await saveConfigToServer(newConfig);
  };

  const clearConfig = async () => {
    setConfig(null);
    localStorage.removeItem('home_dashboard_config');
    // Fixed: use DELETE instead of POST(null) so the server actually removes
    // the file rather than writing a literal `null` JSON value.
    await saveConfigToServer(null);
  };

  return (
    <ConfigContext.Provider value={{ config, saveConfig, clearConfig, isLoaded }}>
      {children}
    </ConfigContext.Provider>
  );
};
