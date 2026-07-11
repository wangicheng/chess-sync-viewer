import React from 'react';
import { Activity, PlaySquare, Check, Settings, Monitor, Maximize, Layers } from 'lucide-react';

export type LayoutMode = 'sync' | 'study' | 'overlay';

interface HeaderProps {
  engineSettings: { enabled: boolean };
  updateEngineSettings: (settings: { enabled: boolean }) => void;
  isSyncMode: boolean;
  toggleSyncMode: () => void;
  player: any;
  setIsUrlModalOpen: (open: boolean) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  engineSettings,
  updateEngineSettings,
  isSyncMode,
  toggleSyncMode,
  player,
  setIsUrlModalOpen,
  layoutMode,
  setLayoutMode,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shadow-md z-10">
      <div className="flex items-center gap-3">
        <img src={`${import.meta.env.BASE_URL}favicon.png`} alt="logo" className="w-8 h-8" />
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 hidden sm:block">
          ChessSync Viewer
        </h1>
      </div>
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="hidden md:flex bg-slate-900/80 p-1 rounded-lg border border-slate-700/50 shadow-inner items-center">
          <button
            onClick={() => setLayoutMode('sync')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              layoutMode === 'sync' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Sync Mode (Default)"
          >
            <Monitor className="w-4 h-4" />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setLayoutMode('study')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              layoutMode === 'study' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Study Mode (Analysis only)"
          >
            <Maximize className="w-4 h-4" />
            <span>Study</span>
          </button>
          <button
            onClick={() => setLayoutMode('overlay')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              layoutMode === 'overlay' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Overlay Mode (For Creators)"
          >
            <Layers className="w-4 h-4" />
            <span>Overlay</span>
          </button>
        </div>

        <button
          onClick={() => updateEngineSettings({ enabled: !engineSettings.enabled })}
          className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2 text-sm font-medium rounded-md transition-all shadow-sm ${
            engineSettings.enabled
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-none'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="hidden sm:inline">Engine Analysis</span>
          <span className="sm:hidden">Engine</span>
        </button>

        <button
          onClick={toggleSyncMode}
          disabled={!player}
          className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2 text-sm font-medium rounded-md transition-all shadow-sm ${
            isSyncMode
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none'
          }`}
        >
          {isSyncMode ? <Check className="w-4 h-4" /> : <PlaySquare className="w-4 h-4" />}
          <span className="hidden sm:inline">{isSyncMode ? 'Finish Editing' : 'Edit Mode'}</span>
          <span className="sm:hidden">{isSyncMode ? 'Finish' : 'Edit'}</span>
        </button>

        <button
          onClick={() => setIsUrlModalOpen(true)}
          className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2 text-sm font-medium rounded-md bg-slate-700 hover:bg-slate-600 transition-colors shadow-sm"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
};
