import React, { useState } from 'react';
import { Flag } from 'lucide-react';

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (result: string, termination: string, recordEndTime: boolean) => void;
  initialResult?: string;
  initialTermination?: string;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialResult = '*',
  initialTermination = 'Normal',
}) => {
  const [result, setResult] = useState(initialResult);
  const [termination, setTermination] = useState(initialTermination);
  const [recordEndTime, setRecordEndTime] = useState(true);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(result, termination, recordEndTime);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl ring-1 ring-white/10">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <Flag className="w-5 h-5 text-blue-400" />
          Set Game Result
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Result</label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="*">* (Unfinished / Unknown)</option>
              <option value="1-0">1-0 (White wins)</option>
              <option value="0-1">0-1 (Black wins)</option>
              <option value="1/2-1/2">1/2-1/2 (Draw)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Termination / Reason</label>
            <select
              value={termination}
              onChange={(e) => setTermination(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Normal">Normal (Checkmate, Resignation, Draw agreed)</option>
              <option value="Time forfeit">Time forfeit (Flag fall)</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Rules infraction">Rules infraction</option>
              <option value="Unterminated">Unterminated</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recordEndTime}
                onChange={(e) => setRecordEndTime(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-300">
                Record current video time as end time
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-700/50 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-900/20"
          >
            Save Result
          </button>
        </div>
      </div>
    </div>
  );
};
