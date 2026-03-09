/**
 * Cell Theater - Replay Player
 *
 * Playback controls for the Cell Theater.
 * Play/pause, skip, step, speed control, loop, and export.
 */

import React from 'react';
import { PlaybackState } from './types';

interface ReplayPlayerProps {
  playbackState: PlaybackState;
  playbackRate: number;
  currentTime: number;
  duration: number;
  loopEnabled: boolean;
  onPlay: () => void;
  onStop: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onSpeedChange: (rate: number) => void;
  onLoopToggle: () => void;
  onExport: () => void;
}

/**
 * ReplayPlayer - Playback controls
 */
export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  playbackState,
  playbackRate,
  currentTime,
  duration,
  loopEnabled,
  onPlay,
  onStop,
  onSkipBackward,
  onSkipForward,
  onStepBackward,
  onStepForward,
  onSpeedChange,
  onLoopToggle,
  onExport,
}) => {
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.5, 1, 1.5, 2];

  return (
    <div className="replay-player" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      {/* Play/Pause button */}
      <button
        onClick={onPlay}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: playbackState === PlaybackState.PLAYING ? '#FF9800' : '#4CAF50',
          border: 'none',
          color: '#FFF',
          fontSize: '16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {playbackState === PlaybackState.PLAYING ? '⏸' : '▶'}
      </button>

      {/* Stop button */}
      <button
        onClick={onStop}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#333',
          border: 'none',
          color: '#FFF',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Stop"
      >
        ⏹
      </button>

      {/* Skip backward */}
      <button
        onClick={onSkipBackward}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          backgroundColor: '#2A2A2A',
          border: 'none',
          color: '#FFF',
          fontSize: '14px',
          cursor: 'pointer',
        }}
        title="Skip back 5s"
      >
        ⏪
      </button>

      {/* Skip forward */}
      <button
        onClick={onSkipForward}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          backgroundColor: '#2A2A2A',
          border: 'none',
          color: '#FFF',
          fontSize: '14px',
          cursor: 'pointer',
        }}
        title="Skip forward 5s"
      >
        ⏩
      </button>

      {/* Step backward */}
      <button
        onClick={onStepBackward}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          backgroundColor: '#2A2A2A',
          border: 'none',
          color: '#FFF',
          fontSize: '14px',
          cursor: 'pointer',
        }}
        title="Step back"
      >
        ⏮
      </button>

      {/* Step forward */}
      <button
        onClick={onStepForward}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          backgroundColor: '#2A2A2A',
          border: 'none',
          color: '#FFF',
          fontSize: '14px',
          cursor: 'pointer',
        }}
        title="Step forward"
      >
        ⏭
      </button>

      {/* Time display */}
      <div style={{
        padding: '0 12px',
        fontSize: '12px',
        color: '#FFF',
        fontFamily: 'monospace',
        minWidth: '100px',
        textAlign: 'center',
      }}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Speed control */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginLeft: '8px',
      }}>
        <span style={{ fontSize: '11px', color: '#888' }}>Speed:</span>
        {speedOptions.map(rate => (
          <button
            key={rate}
            onClick={() => onSpeedChange(rate)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: playbackRate === rate ? '#2196F3' : '#2A2A2A',
              border: 'none',
              color: '#FFF',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {rate}x
          </button>
        ))}
      </div>

      {/* Loop toggle */}
      <button
        onClick={onLoopToggle}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: loopEnabled ? '#9C27B0' : '#2A2A2A',
          border: 'none',
          color: '#FFF',
          fontSize: '11px',
          cursor: 'pointer',
          marginLeft: '8px',
        }}
        title={loopEnabled ? 'Loop enabled' : 'Loop disabled'}
      >
        🔁 Loop
      </button>

      {/* Export button */}
      <button
        onClick={onExport}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: '#2A2A2A',
          border: 'none',
          color: '#FFF',
          fontSize: '11px',
          cursor: 'pointer',
          marginLeft: 'auto',
        }}
        title="Export recording"
      >
        📥 Export
      </button>
    </div>
  );
};

export default ReplayPlayer;
