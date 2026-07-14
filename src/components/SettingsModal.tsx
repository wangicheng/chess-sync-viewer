import React from 'react';
import { Settings } from 'lucide-react';
import type { ClockSettings, EngineSettings, BoardSettings } from '../hooks/useSettings';
import type { Move } from 'chess.js';
import { VideoExport } from './VideoExport';

interface SettingsModalProps {
  isUrlModalOpen: boolean;
  setIsUrlModalOpen: (open: boolean) => void;
  activeTab: 'source' | 'clock' | 'engine' | 'board' | 'export';
  setActiveTab: (tab: 'source' | 'clock' | 'engine' | 'board' | 'export') => void;
  inputVideoId: string;
  setInputVideoId: (id: string) => void;
  inputRawPgn: string;
  setInputRawPgn: (pgn: string) => void;
  clockSettings: ClockSettings;
  updateClockSettings: (settings: Partial<ClockSettings>) => void;
  engineSettings: EngineSettings;
  updateEngineSettings: (settings: Partial<EngineSettings>) => void;
  boardSettings: BoardSettings;
  updateBoardSettings: (settings: Partial<BoardSettings>) => void;
  videoId: string;
  pgnString: string;
  handleApplyUrl: () => void;
  history: Move[];
  timeMap: Record<number, number>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isUrlModalOpen,
  setIsUrlModalOpen,
  activeTab,
  setActiveTab,
  inputVideoId,
  setInputVideoId,
  inputRawPgn,
  setInputRawPgn,
  clockSettings,
  updateClockSettings,
  engineSettings,
  updateEngineSettings,
  boardSettings,
  updateBoardSettings,
  videoId,
  pgnString,
  handleApplyUrl,
  history,
  timeMap,
}) => {
  if (!isUrlModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl ring-1 ring-white/10 h-[600px] max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Settings
        </h2>
        <div className="flex border-b border-slate-700 mb-6 overflow-x-auto flex-nowrap hide-scrollbar">
          <button
            onClick={() => setActiveTab('source')}
            className={`pb-2 px-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'source' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            Video & Source
          </button>
          <button
            onClick={() => setActiveTab('clock')}
            className={`pb-2 px-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'clock' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            Clock
          </button>
          <button
            onClick={() => setActiveTab('engine')}
            className={`pb-2 px-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'engine' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            Engine Analysis
          </button>
          <button
            onClick={() => setActiveTab('board')}
            className={`pb-2 px-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'board' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2 px-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'export' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
            }`}
          >
            Export
          </button>
        </div>

        <div className="py-2 flex-1 overflow-y-auto flex flex-col">
          <div className="space-y-6 flex-1">
          {activeTab === 'source' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">YouTube Video ID or URL</label>
                <input
                  type="text"
                  value={inputVideoId}
                  onChange={(e) => setInputVideoId(e.target.value)}
                  placeholder="e.g. dQw4w9WgXcQ or full URL"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <hr className="border-slate-700" />

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">PGN Record</label>
                <textarea
                  value={inputRawPgn}
                  onChange={(e) => setInputRawPgn(e.target.value)}
                  placeholder="Paste PGN here, leave blank to start recording from scratch..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none custom-scrollbar font-mono text-sm"
                />
              </div>
            </div>
          )}

          {activeTab === 'clock' && (
            <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clockSettings.enabled}
                  onChange={(e) => updateClockSettings({ enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-300">Show and calculate remaining time</span>
              </label>

              <div className={`transition-opacity duration-200 ${clockSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700/50">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {clockSettings.useDifferentForBlack ? 'White ' : ''}Initial Time (minutes)
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={Math.round((clockSettings.initial / 60) * 10) / 10}
                      onChange={(e) => updateClockSettings({ initial: Math.max(0.5, parseFloat(e.target.value) || 1) * 60 })}
                      disabled={!clockSettings.enabled}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {clockSettings.useDifferentForBlack ? 'White ' : ''}Increment (seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={clockSettings.increment}
                      onChange={(e) => updateClockSettings({ increment: Math.max(0, parseInt(e.target.value) || 0) })}
                      disabled={!clockSettings.enabled}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 transition-colors w-max">
                    <input
                      type="checkbox"
                      checked={clockSettings.useDifferentForBlack || false}
                      onChange={(e) =>
                        updateClockSettings({
                          useDifferentForBlack: e.target.checked,
                          bInitial: e.target.checked ? clockSettings.initial : undefined,
                          bIncrement: e.target.checked ? clockSettings.increment : undefined,
                        })
                      }
                      disabled={!clockSettings.enabled}
                      className="w-3.5 h-3.5 text-slate-500 bg-slate-800 border-slate-600 rounded focus:ring-slate-500"
                    />
                    <span className="text-xs font-medium">Set different time for Black</span>
                  </label>
                </div>

                {clockSettings.useDifferentForBlack && (
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700/50">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Black Initial Time (minutes)</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={Math.round(((clockSettings.bInitial !== undefined ? clockSettings.bInitial : clockSettings.initial) / 60) * 10) / 10}
                        onChange={(e) => updateClockSettings({ bInitial: Math.max(0.5, parseFloat(e.target.value) || 1) * 60 })}
                        disabled={!clockSettings.enabled}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Black Increment (seconds)</label>
                      <input
                        type="number"
                        min="0"
                        value={clockSettings.bIncrement !== undefined ? clockSettings.bIncrement : clockSettings.increment}
                        onChange={(e) => updateClockSettings({ bIncrement: Math.max(0, parseInt(e.target.value) || 0) })}
                        disabled={!clockSettings.enabled}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'engine' && (
            <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={engineSettings.enabled}
                  onChange={(e) => updateEngineSettings({ enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-300">Enable Engine Analysis (Show Evaluation Bar)</span>
              </label>

              <div className={`transition-opacity duration-200 ${engineSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <label className="flex items-center gap-3 cursor-pointer mt-3 pt-3 border-t border-slate-700/50">
                  <input
                    type="checkbox"
                    checked={engineSettings.showArrow}
                    onChange={(e) => updateEngineSettings({ showArrow: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-300">Show best move arrow on board</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'board' && (
            <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300 mb-2">Board Orientation</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="boardOrientation"
                    value="white"
                    checked={boardSettings.orientation === 'white'}
                    onChange={() => updateBoardSettings({ orientation: 'white' })}
                    className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-300">White at bottom</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="boardOrientation"
                    value="black"
                    checked={boardSettings.orientation === 'black'}
                    onChange={() => updateBoardSettings({ orientation: 'black' })}
                    className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-300">Black at bottom</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <VideoExport history={history} boardSettings={boardSettings} timeMap={timeMap} />
          )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-700/50 mt-6 shrink-0">
            {(videoId || pgnString) && (
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleApplyUrl}
              className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-900/20"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
