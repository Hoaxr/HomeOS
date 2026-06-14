import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Coins } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

// Draws a simple SVG sparkline path from an array of prices
const drawSparkline = (prices, width = 80, height = 30) => {
  if (!prices || prices.length === 0) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min === 0 ? 1 : max - min;
  
  return prices
    .map((price, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((price - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
};

const Sparkline = ({ prices, isUp }) => {
  const pathData = drawSparkline(prices, 120, 24);
  if (!pathData) return null;
  const strokeColor = isUp ? 'var(--success)' : 'var(--danger)';
  return (
    <svg viewBox="0 0 120 24" preserveAspectRatio="none" style={{ width: '100%', height: '24px', display: 'block' }} className="sparkline-svg">
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const MOCK_FALLBACKS = {
  bitcoin: {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 55034.00,
    price_change_percentage_24h: -3.9,
    sparkline_in_7d: { price: [57000, 56500, 56000, 55500, 55800, 55200, 55034] }
  },
  ethereum: {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    current_price: 1529.82,
    price_change_percentage_24h: -4.5,
    sparkline_in_7d: { price: [1600, 1580, 1550, 1560, 1540, 1530, 1529.82] }
  },
  solana: {
    id: 'solana',
    symbol: 'sol',
    name: 'Solana',
    current_price: 60.30,
    price_change_percentage_24h: -5.6,
    sparkline_in_7d: { price: [64, 63, 62, 61.5, 62.1, 60.8, 60.3] }
  },
  ripple: {
    id: 'ripple',
    symbol: 'xrp',
    name: 'XRP',
    current_price: 1.01,
    price_change_percentage_24h: -4.3,
    sparkline_in_7d: { price: [1.06, 1.05, 1.04, 1.03, 1.025, 1.015, 1.01] }
  }
};

// Map period to CoinGecko response field name & sparkline slice size
// CoinGecko sparkline_in_7d has 168 data points (1 per hour over 7 days)
const PERIOD_CONFIG = {
  '1h':  { field: 'price_change_percentage_1h_in_currency',  label: '1h',  slice: 1 },
  '6h':  { field: 'price_change_percentage_24h',             label: '6h',  slice: 6 },   // CoinGecko free tier has no 6h field; use 24h % but slice 6 hours of chart
  '24h': { field: 'price_change_percentage_24h',             label: '24h', slice: 24 },
  '48h': { field: 'price_change_percentage_24h',             label: '48h', slice: 48 },  // no 48h field; approximate
  '7d':  { field: 'price_change_percentage_7d_in_currency',  label: '7d',  slice: 168 },
};

const COMPACT_FMT = new Intl.NumberFormat('en-GB', { notation: "compact", compactDisplay: "short" });

const CryptoItem = ({ id, data, period }) => {
  if (!data) return null;

  const cfg = PERIOD_CONFIG[period] || PERIOD_CONFIG['7d'];
  const pctChange = data[cfg.field] ?? data.price_change_percentage_24h;
  const isUp = pctChange >= 0;

  // Slice the sparkline to the requested window
  const rawPrices = data.sparkline_in_7d?.price || [];
  const displayPrices = rawPrices.slice(-cfg.slice);

  return (
    <div className="crypto-item">
      <div className="crypto-info-group">
        {data.image ? (
          <img src={data.image} alt={data.name} className="crypto-icon" />
        ) : (
          <div className="crypto-icon-fallback">{data.symbol?.toUpperCase().slice(0, 2)}</div>
        )}
        <div className="crypto-info">
          <span className="crypto-symbol">{data.symbol?.toUpperCase()}</span>
          <span className="crypto-name">{data.name}</span>
        </div>
      </div>

      <div className="crypto-sparkline">
        <Sparkline prices={displayPrices} isUp={isUp} />
      </div>

      <div className="crypto-value">
        <span className="price">
          €{data.current_price.toLocaleString(undefined, { minimumFractionDigits: data.current_price < 10 ? 3 : 2, maximumFractionDigits: data.current_price < 10 ? 4 : 2 })}
        </span>
        <div className="crypto-metrics">
          <span className={`change ${isUp ? 'up' : 'down'}`}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(pctChange).toFixed(1)}% ({cfg.label})
          </span>
          <span className="volume">Vol: {COMPACT_FMT.format(data.total_volume)}</span>
        </div>
      </div>
    </div>
  );
};

const CryptoStats = () => {
  const { config } = useConfig();
  const [prices, setPrices] = useState({});
  const [fgi, setFgi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedCoins = React.useMemo(
    () => config?.crypto || ['bitcoin', 'ethereum', 'solana', 'ripple'],
    [config?.crypto]
  );
  const cryptoPeriod = config?.cryptoPeriod || '7d';
  const coinsKey = selectedCoins.join(',');

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        // Request 1h, 24h and 7d change percentages from the markets endpoint
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=${coinsKey}&sparkline=true&price_change_percentage=1h,24h,7d`);
        
        if (!res.ok) throw new Error('CoinGecko API error: ' + res.status);
        
        const data = await res.json();
        
        // Map list into an object keyed by coin id to preserve config ordering
        const mapped = {};
        data.forEach(coin => {
          mapped[coin.id] = coin;
        });
        
        setPrices(mapped);
        setError(null);
      } catch (e) {
        console.warn("Crypto fetch failed, using fallback/cached data:", e);
        
        // If we don't have any prices loaded yet, load mock fallbacks
        setPrices(prev => {
          if (Object.keys(prev).length > 0) return prev;
          
          const fallbacks = {};
          selectedCoins.forEach(id => {
            if (MOCK_FALLBACKS[id]) {
              fallbacks[id] = MOCK_FALLBACKS[id];
            } else {
              fallbacks[id] = {
                id,
                symbol: id.slice(0, 3),
                name: id.charAt(0).toUpperCase() + id.slice(1),
                current_price: 1.0,
                price_change_percentage_24h: 0.0,
                sparkline_in_7d: { price: [1, 1, 1, 1, 1, 1, 1] }
              };
            }
          });
          return fallbacks;
        });
        
        setError("CoinGecko API unavailable");
      }
      
      try {
        // Fetch Fear & Greed index independently
        const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
        if (fgRes.ok) {
          const fgData = await fgRes.json();
          if (fgData.data?.[0]) {
            setFgi({
              value: parseInt(fgData.data[0].value),
              label: fgData.data[0].value_classification
            });
          }
        }
      } catch (e) {
        console.warn("Fear & Greed fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [coinsKey]);

  const getFgiEmoji = (val) => {
    if (val >= 75) return '🤑'; // Extreme Greed
    if (val >= 55) return '😊'; // Greed
    if (val >= 45) return '😐'; // Neutral
    if (val >= 25) return '😨'; // Fear
    return '😱'; // Extreme Fear
  };

  const getFgiColor = (val) => {
    if (val >= 75) return '#22c55e'; // Green
    if (val >= 55) return '#84cc16'; // Light Green
    if (val >= 45) return '#eab308'; // Yellow
    if (val >= 25) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getRecommendation = (val) => {
    if (val <= 25) return " (Strong Buy)";
    if (val <= 45) return " (Buy)";
    if (val >= 75) return " (Strong Sell)";
    if (val >= 55) return " (Sell)";
    return " (Hold)";
  };

  return (
    <div className="glass-card crypto-card">
      <div className="card-header">
        <div className="title">
          <Coins size={20} className="icon" />
          <span>Crypto Market</span>
        </div>
        {fgi && (
          <div className="fgi-badge" style={{ color: getFgiColor(fgi.value), borderColor: getFgiColor(fgi.value) + '40', backgroundColor: getFgiColor(fgi.value) + '15' }}>
            {fgi.label} {fgi.value} {getRecommendation(fgi.value)}
          </div>
        )}
        {loading && !fgi && <div className="loading-small" />}
      </div>
      <div className="crypto-list">
        {!loading && Object.keys(prices).length === 0 && !error && (
          <p className="status-msg">No coins selected.</p>
        )}
        {error && <p className="status-msg error">{error}</p>}
        {loading && Object.keys(prices).length === 0 && (
          <p className="status-msg">Loading market data...</p>
        )}
        {selectedCoins.map(id => (
          <CryptoItem key={id} id={id} data={prices[id]} period={cryptoPeriod} />
        ))}
      </div>
    </div>
  );
};

export default CryptoStats;
