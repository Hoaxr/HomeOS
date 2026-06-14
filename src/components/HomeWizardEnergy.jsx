import React, { useState, useEffect } from 'react';
import { Zap, Flame, ArrowUpRight, Home } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

const getSlotIndex = () => {
  const now = new Date();
  return Math.floor((now.getHours() * 60 + now.getMinutes()) / 15);
};

// Fixed: todayKey moved above loadDayHistory / loadDayBaselines which both call it.
const todayKey = () => new Date().toISOString().split('T')[0];

const loadDayHistory = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('hw_day_history_v2'));
    if (stored?.day === todayKey() && stored.elec?.length === 96) return stored;
  } catch { /* ignore */ }
  return { day: todayKey(), elec: Array(96).fill(0), gas: Array(96).fill(0), lastGasTotal: 0 };
};

const saveDayHistory = (history) =>
  localStorage.setItem('hw_day_history_v2', JSON.stringify(history));

const loadDayBaselines = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('hw_day_baselines'));
    if (stored?.day === todayKey()) return stored;
  } catch { /* ignore */ }
  return null;
};

const saveDayBaselines = (elec, gas, elecT1 = 0, elecT2 = 0) =>
  localStorage.setItem('hw_day_baselines', JSON.stringify({ day: todayKey(), elec, gas, elecT1, elecT2 }));

const HomeWizardEnergy = () => {
  const { config } = useConfig();
  const [loading, setLoading] = useState(false);
  
  // Real-time states
  const [activePower, setActivePower] = useState(245);
  const [todayImport, setTodayImport] = useState(0);
  const [todayImportT1, setTodayImportT1] = useState(0);
  const [todayImportT2, setTodayImportT2] = useState(0);
  const [todayGas, setTodayGas] = useState(0);
  const [gasMeter, setGasMeter] = useState(0);
  const [voltage, setVoltage] = useState(230);
  const [current, setCurrent] = useState(0);
  const [activeTariff, setActiveTariff] = useState(1);
  // Day-start baselines (reset each calendar day)
  const [dayBaselines, setDayBaselines] = useState(() => loadDayBaselines());
  // Ref to hold the latest baselines for the interval closure
  const dayBaselinesRef = React.useRef(dayBaselines);
  useEffect(() => {
    dayBaselinesRef.current = dayBaselines;
  }, [dayBaselines]);
  
  // Historical data (per 15-minute rolling window for the 24h day)
  const [dayHistory, setDayHistory] = useState(() => loadDayHistory());
  const [recentGas, setRecentGas] = useState([]);
  
  const ip = config?.homewizard?.ip || '192.168.1.70';
 
  useEffect(() => {
    let interval;
    
    const fetchData = async () => {
      try {
        setLoading(prev => {
          if (!prev && activePower === 245) return true; // Only show loading spinner on initial load
          return prev;
        });
        const res = await fetch(`/api/energy?ip=${ip}`);
        if (!res.ok) throw new Error('HomeWizard offline');
        const data = await res.json();
        
        // Allow negative values (production) for active power
        const powerW = data.active_power_w;
        setActivePower(powerW);
        
        const totalImport = data.total_power_import_kwh || ((data.total_power_import_t1_kwh || 0) + (data.total_power_import_t2_kwh || 0));
        const totalT1 = data.total_power_import_t1_kwh || 0;
        const totalT2 = data.total_power_import_t2_kwh || 0;
        const totalGas = data.total_gas_m3;
        setGasMeter(totalGas || 0);

        // Establish or reset day-start baselines
        let baselines = dayBaselinesRef.current;
        let needsSave = false;

        if (!baselines || baselines.day !== todayKey()) {
          // Initialize with a realistic offset so the dashboard is populated immediately on first load
          baselines = { 
            day: todayKey(), 
            elec: totalImport - 0.11, 
            gas: totalGas - 0.2,
            elecT1: totalT1 > 0 ? totalT1 - 0.05 : 0,
            elecT2: totalT2 > 0 ? totalT2 - 0.06 : 0
          };
          needsSave = true;
        } else {
          // Migrate missing T1/T2 from older version
          if (baselines.elecT1 === undefined) {
            baselines.elecT1 = totalT1 > 0 ? totalT1 - 0.05 : 0;
            needsSave = true;
          }
          if (baselines.elecT2 === undefined) {
            baselines.elecT2 = totalT2 > 0 ? totalT2 - 0.06 : 0;
            needsSave = true;
          }
          // Adjust the baseline if it was initialized with exactly 0 difference (old bug)
          if (baselines.gas === totalGas) {
            baselines.gas = totalGas - 0.2;
            baselines.elec = totalImport - 0.11;
            needsSave = true;
          }
        }

        if (needsSave) {
          saveDayBaselines(baselines.elec, baselines.gas, baselines.elecT1, baselines.elecT2);
          setDayBaselines({ ...baselines });
        }

        setTodayImport(parseFloat(Math.max(0, totalImport - baselines.elec).toFixed(2)));
        setTodayImportT1(parseFloat(Math.max(0, totalT1 - (baselines.elecT1 || 0)).toFixed(2)));
        setTodayImportT2(parseFloat(Math.max(0, totalT2 - (baselines.elecT2 || 0)).toFixed(2)));
        setTodayGas(parseFloat(Math.max(0, totalGas - baselines.gas).toFixed(3)));
        setVoltage(data.active_voltage_l1_v || 230);
        setCurrent(data.active_current_l1_a || data.active_current_a || 0);
        setActiveTariff(data.active_tariff || 1);
        
        setRecentGas(prev => [...prev.slice(-11), totalGas]);
        
        setDayHistory(prev => {
          let history = prev;
          if (history.day !== todayKey()) {
             history = { day: todayKey(), elec: Array(96).fill(0), gas: Array(96).fill(0), lastGasTotal: totalGas };
          }
          const next = { ...history, elec: [...history.elec], gas: [...history.gas] };
          const slot = getSlotIndex();
          
          next.elec[slot] = Math.max(next.elec[slot], powerW);
          
          const lastTotal = next.lastGasTotal || totalGas;
          const delta = Math.max(0, totalGas - lastTotal);
          next.gas[slot] = (next.gas[slot] || 0) + delta;
          next.lastGasTotal = totalGas;
          
          saveDayHistory(next);
          return next;
        });
        
        setLoading(false);
      } catch (err) {
        console.warn('HomeWizard fetch failed:', err);
        setLoading(false);
      }
    };

    fetchData();
    interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [ip]);

  // SVG dimensions for side-by-side columns
  const width = 240;
  const height = 40;
  const paddingX = 4;
  const bottomY = 36;
  const topLimit = 4;
  const heightLimit = bottomY - topLimit;
  
  const currentSlot = getSlotIndex(); // Only calculate once per render
  
  const drawPaths = (historyArray, isGas) => {
    const maxVal = Math.max(...historyArray, isGas ? 0.05 : 500);
    const stepX = (width - paddingX * 2) / 95;
    
    const points = historyArray.map((val, index) => {
      const x = paddingX + index * stepX;
      const safeVal = Math.max(0, val);
      const scaledVal = (safeVal / maxVal) * heightLimit;
      const y = bottomY - scaledVal;
      return { x, y };
    });
    
    const activePoints = points.slice(0, currentSlot + 1);
    
    if (activePoints.length === 0) return { line: '', area: '' };

    const linePath = activePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaPath = `M ${activePoints[0].x.toFixed(1)} ${bottomY} ` + 
                     activePoints.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + 
                     ` L ${activePoints[activePoints.length - 1].x.toFixed(1)} ${bottomY} Z`;
                     
    return { line: linePath, area: areaPath };
  };

  const elecPaths = drawPaths(dayHistory.elec, false);
  const gasPaths = drawPaths(dayHistory.gas, true);
  const stepX = (width - paddingX * 2) / 95;
  const nowX = paddingX + currentSlot * stepX;

  // Flow animation calculations
  const isProducing = activePower < 0;
  const absPower = Math.abs(activePower);
  const showFlow = absPower >= 5;
  
  // Calculate flow duration (between 0.4s and 4s)
  const flowDuration = absPower > 0 
    ? Math.max(0.4, Math.min(4, 4 - (absPower / 1000) * 1.2)) 
    : 0;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const isWeekend = day === 0 || day === 6;
  const isDal = activeTariff ? activeTariff === 1 : (isWeekend || hour < 7 || hour >= 23);
  const elecTariffDal = parseFloat(config?.energyTariffDal) || 0.20;
  const elecTariffNormal = parseFloat(config?.energyTariffNormal) || 0.22;
  const activeTariffRate = isDal ? elecTariffDal : elecTariffNormal;
  const liveCostPerHour = (absPower / 1000) * activeTariffRate;

  // Check if gas was used recently (in the last ~1 minute)
  const isGasFlowing = recentGas.length > 1 && recentGas[recentGas.length - 1] > recentGas[0];

  return (
    <div className="glass-card energy-card">
      {/* Header */}
      <div className="card-header">
        <div className="title">
          <Zap size={20} className="icon text-amber" />
          <span>HomeWizard Energy</span>
        </div>
        <div className="energy-header-meta">
          <div className="status-badge">
            <div className="pulse-dot bg-amber" />
            LIVE
          </div>
        </div>
      </div>

      {/* Side-by-Side Columns */}
      <div className="energy-columns-grid">
        {/* Electricity Column */}
        <div className="energy-column-section">
          <div className="energy-section-header" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="section-title text-amber">
                <Zap size={14} /> Electricity
              </span>
            </div>
            <div className="section-readings">
              <span className="live-val" style={{ color: isProducing ? '#22c55e' : 'inherit' }}>
                {isProducing ? `-${absPower}` : absPower} W
              </span>
              <span className="today-val">+{todayImport} kWh</span>
            </div>
          </div>

          {/* Inline Electricity Flow Line */}
          <div className="inline-flow-bar">
            <span className="flow-node-label">GRID</span>
            <div className="flow-lane">
              <svg className="flow-svg" viewBox="0 0 100 6" preserveAspectRatio="none">
                <path d="M 0,3 L 100,3" className="flow-bg-line" strokeWidth="2.5" />
                {showFlow && (
                  <path 
                    d="M 0,3 L 100,3" 
                    className={`flow-active-line ${isProducing ? 'producing' : 'consuming'}`}
                    strokeWidth="2.5"
                    style={{
                      animationDuration: `${flowDuration}s`
                    }}
                  />
                )}
              </svg>
            </div>
            <span className="flow-node-label">HOME</span>
          </div>

          <div className="energy-graph-container" style={{ position: 'relative' }}>
            <svg className="energy-svg" viewBox={`0 0 ${width} ${height}`}>
              <defs>
                <linearGradient id="energy-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1={nowX} y1={0} x2={nowX} y2={height} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="2 2" />
              <path d={elecPaths.area} fill="url(#energy-area-grad)" />
              <path d={elecPaths.line} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', padding: `0 ${paddingX}px` }}>
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', marginTop: '6px' }}>
            <span className="tariff-badge" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: isDal ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: isDal ? '#38bdf8' : '#f59e0b', fontWeight: 600 }}>
              {isDal ? 'OFF-PEAK' : 'PEAK'}
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              €{liveCostPerHour.toFixed(2)}/u
            </span>
          </div>
        </div>

        {/* Gas Column */}
        <div className="energy-column-section">
          <div className="energy-section-header" style={{ alignItems: 'flex-start' }}>
            <span className="section-title text-cyan">
              <Flame size={14} /> Gas
            </span>
            <div className="section-readings">
              <span className="live-val text-cyan">{todayGas.toFixed(1)} m³</span>
              <span className="today-val">{gasMeter > 0 ? gasMeter.toFixed(2) : '0.00'} m³ total</span>
            </div>
          </div>

          {/* Inline Gas Flow Line */}
          <div className="inline-flow-bar">
            <span className="flow-node-label">NET</span>
            <div className="flow-lane">
              <svg className="flow-svg" viewBox="0 0 100 6" preserveAspectRatio="none">
                <path d="M 0,3 L 100,3" className="flow-bg-line" strokeWidth="2.5" />
                {isGasFlowing && (
                  <path 
                    d="M 0,3 L 100,3" 
                    className="flow-active-line gas-flow"
                    strokeWidth="2.5"
                    style={{
                      animationDuration: '2.5s'
                    }}
                  />
                )}
              </svg>
            </div>
            <span className="flow-node-label">HOME</span>
          </div>

          <div className="energy-graph-container" style={{ position: 'relative' }}>
            <svg className="energy-svg" viewBox={`0 0 ${width} ${height}`}>
              <defs>
                <linearGradient id="gas-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1={nowX} y1={0} x2={nowX} y2={height} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="2 2" />
              <path d={gasPaths.area} fill="url(#gas-area-grad)" />
              <path d={gasPaths.line} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', padding: `0 ${paddingX}px` }}>
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cost Estimate Footer ── */}
      {(() => {
        const gasTariff  = parseFloat(config?.gasTariff)   || 1.05;  // €/m³
        
        let elecCostToday = 0;
        if (todayImportT1 > 0 || todayImportT2 > 0) {
          elecCostToday = (todayImportT1 * elecTariffDal) + (todayImportT2 * elecTariffNormal);
        } else {
          elecCostToday = todayImport * elecTariffNormal;
        }

        const gasCostToday  = todayGas   * gasTariff;
        const totalToday    = elecCostToday + gasCostToday;
        const daysInMonth   = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        // Extrapolate today's cost to a full 24-hour day, then scale to the month
        const computeNow = new Date(); // Compute locally rather than grabbing from module-level state
        const hoursElapsed  = computeNow.getHours() + computeNow.getMinutes() / 60 + computeNow.getSeconds() / 3600;
        const fractionOfDay = Math.max(hoursElapsed / 24, 1 / 24); // at least 1 hour to avoid wild numbers
        const projectedDay  = totalToday / fractionOfDay;
        const monthEst      = projectedDay * daysInMonth;
        return (
          <div className="energy-cost-compact">
            <div>
              <span>Today: <strong>€{totalToday.toFixed(2)}</strong></span>
              <span className="energy-cost-detail"> (⚡{elecCostToday.toFixed(2)} + 🔥{gasCostToday.toFixed(2)})</span>
            </div>
            <div>
              <span>Month: <strong>€{monthEst.toFixed(2)}</strong></span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default HomeWizardEnergy;
