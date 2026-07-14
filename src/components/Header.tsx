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
  gameResult?: string;
  gameTermination?: string;
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
  gameResult,
  gameTermination,
}) => {
  return (
    <header className="flex items-center justify-start gap-4 px-3 py-1.5 bg-slate-800 border-b border-slate-700 shadow-sm z-10 select-none">
      <div className="flex items-center gap-2 pr-2 border-r border-slate-700/50">
        <img src={`${import.meta.env.BASE_URL}favicon.png`} alt="logo" className="w-4 h-4" />
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 hidden sm:block whitespace-nowrap">
            ChessSync Viewer
          </h1>
          {gameResult && gameResult !== '*' && (
            <span className="text-xs font-medium text-slate-400 hidden md:block whitespace-nowrap">
              {gameResult} {gameTermination && gameTermination !== 'Normal' ? `(${gameTermination})` : ''}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
        <div className="flex bg-slate-900/80 p-0.5 rounded-md border border-slate-700/50 shadow-inner items-center">
          <button
            onClick={() => setLayoutMode('sync')}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-all ${
              layoutMode === 'sync' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Sync Mode"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <button
            onClick={() => setLayoutMode('study')}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-all ${
              layoutMode === 'study' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Study Mode"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Study</span>
          </button>
          <button
            onClick={() => setLayoutMode('overlay')}
            className={`hidden lg:flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-all ${
              layoutMode === 'overlay' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Overlay Mode"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Overlay</span>
          </button>
        </div>

        <button
          onClick={() => updateEngineSettings({ enabled: !engineSettings.enabled })}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-all shadow-sm ${
            engineSettings.enabled
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200 shadow-none'
          }`}
          title="Engine Analysis"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Engine</span>
        </button>

        <button
          onClick={toggleSyncMode}
          disabled={!player}
          className={`hidden md:flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-all shadow-sm ${
            isSyncMode
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none'
          }`}
        >
          {isSyncMode ? <Check className="w-3.5 h-3.5" /> : <PlaySquare className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isSyncMode ? 'Finish Editing' : 'Edit Mode'}</span>
        </button>

        <button
          onClick={() => setIsUrlModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-slate-700 hover:bg-slate-600 transition-colors shadow-sm text-slate-200"
          title="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
    </header>
  );
};
