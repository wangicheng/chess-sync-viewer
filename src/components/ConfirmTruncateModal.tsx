import React from 'react';
import { AlertTriangle, Scissors } from 'lucide-react';

interface ConfirmTruncateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  movesToDeleteCount: number;
}

export const ConfirmTruncateModal: React.FC<ConfirmTruncateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  movesToDeleteCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl ring-1 ring-white/10">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          Confirm Deletion
        </h2>

        <div className="text-slate-300 space-y-4 mb-6">
          <p>
            Are you sure you want to delete this move and all subsequent moves?
          </p>
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 text-red-200 flex items-center gap-3">
            <Scissors className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="font-medium text-sm">
              You are about to delete <span className="text-red-400 font-bold text-base px-1">{movesToDeleteCount}</span> moves. This action cannot be undone.
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-2 shadow-lg shadow-red-900/50"
          >
            <Scissors className="w-4 h-4" />
            Delete {movesToDeleteCount} Moves
          </button>
        </div>
      </div>
    </div>
  );
};
