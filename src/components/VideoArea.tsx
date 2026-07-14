import React from 'react';
import YouTube from 'react-youtube';
import type { YouTubeProps } from 'react-youtube';
import { AlertCircle, Clock, Scissors, Flag, Activity } from 'lucide-react';
import type { Move } from 'chess.js';

interface VideoAreaProps {
  videoId: string;
  setPlayer: (player: any) => void;
  isSyncMode: boolean;
  updateStartTimeAnchor: () => void;
  history: Move[];
  onOpenTruncateModal: () => void;
  layoutMode: 'sync' | 'study' | 'overlay';
  onOpenGameResultModal: () => void;
}

export const VideoArea: React.FC<VideoAreaProps> = ({
  videoId,
  setPlayer,
  isSyncMode,
  updateStartTimeAnchor,
  history,
  onOpenTruncateModal,
  layoutMode,
  onOpenGameResultModal,
}) => {
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    setPlayer(event.target);
  };

  React.useEffect(() => {
    if (!videoId) {
      setPlayer(null);
    }
  }, [videoId, setPlayer]);

  return (
    <div className={`flex flex-col z-10 ${
      layoutMode === 'overlay'
        ? 'w-full h-full'
        : 'flex-none lg:flex-1 p-2 lg:p-4 gap-2 lg:gap-4 overflow-visible lg:overflow-y-auto border-b lg:border-b-0 border-slate-700/50 bg-slate-900/90 lg:bg-transparent backdrop-blur-sm'
    }`}>
      <div className={`mx-auto bg-black relative flex-shrink-0 ${
        layoutMode === 'overlay'
          ? 'w-full h-full'
          : 'w-full aspect-video rounded-lg lg:rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10'
      }`}>
        {videoId ? (
          <YouTube
            videoId={videoId}
            opts={{ width: '100%', height: '100%', playerVars: { playsinline: 1 } }}
            className="w-full h-full absolute inset-0"
            onReady={onPlayerReady}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <AlertCircle className="w-8 h-8 lg:w-12 lg:h-12 mb-2 opacity-50" />
            <p className="text-sm lg:text-base">Please set YouTube Video ID</p>
          </div>
        )}
      </div>

      {isSyncMode && layoutMode !== 'overlay' && (
        <div className="p-3 lg:p-4 bg-slate-800/80 border border-slate-700/80 rounded-lg flex flex-col xl:flex-row gap-3 xl:gap-4 justify-between flex-shrink-0 shadow-lg mt-2 items-start xl:items-center">
          <div className="hidden sm:flex flex-col gap-1">
            <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Recording / Editing Mode
            </div>
            <div className="text-xs lg:text-sm text-slate-400">
              Drag pieces directly on the board, or press Spacebar when a move is made in the video.
            </div>
          </div>
          <div className="flex flex-row flex-wrap gap-2 overflow-visible">
            <button
              onClick={updateStartTimeAnchor}
              className="flex-shrink-0 flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/80 text-slate-300 rounded border border-slate-600 transition-colors text-xs lg:text-sm whitespace-nowrap"
            >
              <Clock className="w-3.5 lg:w-4 h-3.5 lg:h-4 text-blue-400" />
              Mark current time as start
            </button>
            <button
              onClick={onOpenGameResultModal}
              className="flex-shrink-0 flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/80 text-slate-300 rounded border border-slate-600 transition-colors text-xs lg:text-sm whitespace-nowrap"
            >
              <Flag className="w-3.5 lg:w-4 h-3.5 lg:h-4 text-blue-400" />
              Set Game Result
            </button>
            {history.length > 0 && (
              <button
                onClick={onOpenTruncateModal}
                className="flex-shrink-0 flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded border border-red-800/50 transition-colors text-xs lg:text-sm whitespace-nowrap"
              >
                <Scissors className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
                Clear this and subsequent moves
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
