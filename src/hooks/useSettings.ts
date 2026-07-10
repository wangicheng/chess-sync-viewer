import { useState, useCallback } from 'react';

export interface ClockSettings {
  enabled: boolean;
  initial: number;
  increment: number;
  useDifferentForBlack?: boolean;
  bInitial?: number;
  bIncrement?: number;
}

export interface EngineSettings {
  enabled: boolean;
  showArrow: boolean;
}

export interface BoardSettings {
  orientation: 'white' | 'black';
}

export function useSettings() {
  const [clockSettings, setClockSettings] = useState<ClockSettings>(() => {
    const saved = localStorage.getItem('chessSyncClockSettings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.warn('Failed to parse clock settings', e); }
    }
    return { enabled: false, initial: 300, increment: 5 };
  });

  const updateClockSettings = useCallback((newSettings: Partial<ClockSettings>) => {
    setClockSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('chessSyncClockSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const [engineSettings, setEngineSettings] = useState<EngineSettings>(() => {
    const saved = localStorage.getItem('chessSyncEngineSettings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.warn('Failed to parse engine settings', e); }
    }
    return { enabled: false, showArrow: false };
  });

  const updateEngineSettings = useCallback((newSettings: Partial<EngineSettings>) => {
    setEngineSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('chessSyncEngineSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const [boardSettings, setBoardSettings] = useState<BoardSettings>(() => {
    const saved = localStorage.getItem('chessSyncBoardSettings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.warn('Failed to parse board settings', e); }
    }
    return { orientation: 'white' };
  });

  const updateBoardSettings = useCallback((newSettings: Partial<BoardSettings>) => {
    setBoardSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('chessSyncBoardSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    clockSettings, updateClockSettings,
    engineSettings, updateEngineSettings,
    boardSettings, updateBoardSettings
  };
}
