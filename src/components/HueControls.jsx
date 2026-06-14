import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, AlertCircle } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

const HueControls = () => {
  const { config } = useConfig();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const pendingTimeouts = useRef({});
  const roomsRef = useRef(rooms);

  // Keep ref up to date for polling comparison
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  const hueConfig = config?.hue;
  const isConfigured = hueConfig?.ip && hueConfig?.username;

  const fetchRooms = React.useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/hue/groups');
      if (!res.ok) {
        throw new Error('Could not connect to the Hue Bridge');
      }
      const data = await res.json();

      if (Array.isArray(data) && data[0]?.error) {
        throw new Error(data[0].error.description || 'Hue Bridge error');
      }

      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid data received from Hue Bridge');
      }

      const groups = Object.entries(data);
      let filteredGroups = groups.filter(([_, g]) => g.type === 'Room');
      if (filteredGroups.length === 0) {
        // Fallback to all groups if no specific Room groups exist
        filteredGroups = groups;
      }

      const roomsArray = filteredGroups.map(([id, g]) => {
        // If there is a pending timeout for this room, preserve its current local state
        const existingRoom = roomsRef.current.find(item => item.id === id);
        if (existingRoom && pendingTimeouts.current[id]) {
          return existingRoom;
        }

        return {
          id,
          name: g.name,
          on: g.state.any_on ?? g.state.all_on ?? false,
          brightness: g.action.bri ? Math.round((g.action.bri / 254) * 100) : 0,
          reachable: true, // Groups themselves are always reachable addresses
        };
      });

      setRooms(roomsArray);
      setError(null);
    } catch (err) {
      console.error('Fetch rooms error:', err);
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) return;

    fetchRooms(true);

    const anyLightOn = roomsRef.current.some(r => r.on);
    const pollInterval = anyLightOn ? 5000 : 30000; // Backoff when everything is off

    const interval = setInterval(() => {
      fetchRooms(false);
    }, pollInterval);

    return () => {
      clearInterval(interval);
      // Clean up any pending debounced updates on unmount
      Object.values(pendingTimeouts.current).forEach(clearTimeout);
    };
  }, [isConfigured, fetchRooms]);

  const toggleRoom = async (id) => {
    const target = rooms.find(r => r.id === id);
    if (!target) return;

    const nextOn = !target.on;
    const previousState = { ...target };

    // Optimistic UI update
    setRooms(prev => prev.map(r => 
      r.id === id 
        ? { ...r, on: nextOn, brightness: nextOn && r.brightness === 0 ? 50 : r.brightness }
        : r
    ));

    try {
      const body = { on: nextOn };
      if (nextOn && target.brightness === 0) {
        body.bri = 127; // 50%
      }
      
      const res = await fetch(`/api/hue/groups/${id}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (Array.isArray(data) && data[0]?.error) {
        throw new Error(data[0].error.description || 'Error toggling light');
      }
    } catch (err) {
      console.error('Failed to toggle room:', err);
      // Revert state
      setRooms(prev => prev.map(r => r.id === id ? previousState : r));
    }
  };

  const changeBrightness = (id, percent) => {
    // Optimistic local state update
    setRooms(prev => prev.map(r =>
      r.id === id ? { ...r, brightness: percent, on: percent > 0 } : r
    ));

    if (pendingTimeouts.current[id]) {
      clearTimeout(pendingTimeouts.current[id]);
    }

    pendingTimeouts.current[id] = setTimeout(async () => {
      try {
        const briValue = Math.round((percent / 100) * 254);
        const body = {
          on: percent > 0,
          ...(percent > 0 ? { bri: briValue } : {})
        };
        
        const res = await fetch(`/api/hue/groups/${id}/action`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        
        if (Array.isArray(data) && data[0]?.error) {
          throw new Error(data[0].error.description || 'Error adjusting brightness');
        }
      } catch (err) {
        console.error('Failed to change brightness:', err);
      } finally {
        delete pendingTimeouts.current[id];
      }
    }, 250);
  };

  if (!isConfigured) {
    return (
      <div className="glass-card hue-card">
        <div className="card-header">
          <div className="title">
            <Lightbulb size={20} className="icon text-amber" />
            <span>Hue Lights</span>
          </div>
        </div>
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center' }}>
          <Lightbulb size={32} className="text-amber" style={{ opacity: 0.3, marginBottom: 4 }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Philips Hue is not configured yet.<br />
            Enter your Hue Bridge IP and Token in the <strong>System Settings</strong> (gear icon top right).
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card hue-card">
      <div className="card-header">
        <div className="title">
          <Lightbulb size={20} className="icon" />
          <span>Hue Lights</span>
        </div>

      </div>

      {error ? (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', color: 'var(--danger)' }}>
          <AlertCircle size={24} />
          <span style={{ fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.4 }}>
            {error}
          </span>
          <button 
            className="btn-primary" 
            style={{ padding: '6px 12px', fontSize: '0.8rem', marginTop: 4 }} 
            onClick={() => fetchRooms(true)}
          >
            Try again
          </button>
        </div>
      ) : loading && rooms.length === 0 ? (
        <div style={{ padding: '32px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="loading-small" />
        </div>
      ) : rooms.length === 0 ? (
        <div style={{ padding: '24px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '0.85rem' }}>No rooms found on your Hue Bridge.</span>
        </div>
      ) : (
        <div className="hue-lights-list">
          {rooms.map(room => (
            <div key={room.id} className={`hue-light-row ${room.on ? 'active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <button
                  className="hue-light-toggle"
                  onClick={() => toggleRoom(room.id)}
                  title={`Toggle ${room.name}`}
                >
                  <Lightbulb
                    size={16}
                    fill={room.on ? '#fde047' : 'transparent'}
                    stroke={room.on ? '#fde047' : 'currentColor'}
                  />
                </button>
                <span className="hue-light-name">
                  {room.name}
                </span>
                <span className="header-hue-val" style={{ marginLeft: 'auto' }}>
                  {room.on ? `${room.brightness}%` : 'Off'}
                </span>
              </div>
              {room.on && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={room.brightness}
                  onChange={e => changeBrightness(room.id, parseInt(e.target.value, 10))}
                  className="header-hue-slider"
                  style={{ width: '100%' }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HueControls;
