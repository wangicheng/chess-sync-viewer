import React from 'react';
import YouTube from 'react-youtube';
import type { YouTubeProps } from 'react-youtube';
import { AlertCircle, Clock, Scissors } from 'lucide-react';
import type { Move } from 'chess.js';

interface VideoAreaProps {
  videoId: string;
  setPlayer: (player: any) => void;
  isSyncMode: boolean;
  updateStartTimeAnchor: () => void;
  history: Move[];
  truncateHistory: () => void;
  layoutMode: 'sync' | 'study' | 'overlay';
}

export const VideoArea: React.FC<VideoAreaProps> = ({
  videoId,
  setPlayer,
  isSyncMode,
  updateStartTimeAnchor,
  history,
  truncateHistory,
  layoutMode,
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
        <div className="p-3 lg:p-4 bg-indigo-950/80 border border-indigo-800/80 rounded-lg flex flex-col xl:flex-row gap-3 xl:gap-4 justify-between flex-shrink-0 shadow-lg ring-1 ring-indigo-500/50 mt-2">
          <div className="hidden sm:block">
            <div className="text-sm text-indigo-300 mb-1">Recording/Editing...</div>
            <div className="text-xs lg:text-sm text-indigo-100 flex items-center gap-2">
              You can drag pieces directly on the board, or press Spacebar when a move is made in the video.
            </div>
          </div>
          <div className="flex flex-row xl:flex-col gap-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={updateStartTimeAnchor}
              className="flex-shrink-0 flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800/80 text-indigo-300 rounded border border-indigo-800 transition-colors text-xs lg:text-sm whitespace-nowrap"
            >
              <Clock className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
              Mark current time as start
            </button>
            {history.length > 0 && (
              <button
                onClick={truncateHistory}
                className="flex-shrink-0 flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 bg-red-900/50 hover:bg-red-800/80 text-red-300 rounded border border-red-800 transition-colors text-xs lg:text-sm whitespace-nowrap"
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
