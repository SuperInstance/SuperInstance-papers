/**
 * Cell Theater - Main Component
 *
 * Provides animated replay of cell decision-making processes.
 * Shows sensations flowing in, reasoning steps, and outputs being produced.
 *
 * "Every decision is a story worth watching."
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlaybackState,
  ConsciousnessRecording,
  PlaybackSession,
  AnimationState,
  TheaterConfig,
  ExportOptions,
  ConsciousnessEvent,
  TheaterEventType,
} from './types';
import { StageRenderer } from './StageRenderer';
import { ReplayPlayer } from './ReplayPlayer';
import { Timeline } from './Timeline';

interface CellTheaterProps {
  recording: ConsciousnessRecording | null;
  onClose?: () => void;
  onExport?: (options: ExportOptions) => void;
  config?: Partial<TheaterConfig>;
}

/**
 * CellTheater - Main theater component
 */
export const CellTheater: React.FC<CellTheaterProps> = ({
  recording,
  onClose,
  onExport,
  config: userConfig,
}) => {
  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>(PlaybackState.IDLE);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [loopStart, setLoopStart] = useState<number>(0);
  const [loopEnd, setLoopEnd] = useState<number>(0);

  // Animation state
  const [animationState, setAnimationState] = useState<AnimationState>({
    currentTime: 0,
    progress: 0,
    activeEvent: null,
    confidence: { current: 0, target: 0, animating: false },
    sensations: [],
    reasoningSteps: [],
    outputs: [],
    effects: [],
  });

  // Refs
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  // Update animation state based on current time
  const updateAnimationState = useCallback((time: number) => {
    if (!recording) return;

    const progress = recording.duration > 0 ? time / recording.duration : 0;

    // Find current and nearby events
    const currentEventIndex = recording.events.findIndex(
      (e) => e.timestamp >= time
    );
    const activeEvent = currentEventIndex >= 0
      ? recording.events[currentEventIndex]
      : recording.events[recording.events.length - 1] || null;

    // Get recent events for animation
    const recentEvents = recording.events.filter(
      (e) => e.timestamp >= time - 2000 && e.timestamp <= time + 500
    );

    // Extract sensation animations
    const sensations = recentEvents
      .filter(e => e.type === TheaterEventType.SENSATION_RECEIVED)
      .map(e => ({
        id: e.id,
        source: e.data.source || 'unknown',
        type: e.data.sensationType || 'absolute',
        value: e.data.sensationValue || 0,
        progress: Math.min(1, (time - e.timestamp) / 1000),
        color: e.data.visualization?.color || '#666',
      }))
      .filter(s => s.progress >= 0 && s.progress <= 1);

    // Extract reasoning step animations
    const reasoningSteps = recentEvents
      .filter(e => e.type === TheaterEventType.REASONING_STEP)
      .map(e => ({
        id: e.id,
        type: e.data.reasoningType || 'observation',
        description: e.data.description,
        progress: Math.min(1, (time - e.timestamp) / 1500),
        highlighted: Math.abs(time - e.timestamp) < 200,
      }))
      .filter(r => r.progress >= 0 && r.progress <= 1.5);

    // Extract output animations
    const outputs = recentEvents
      .filter(e => e.type === TheaterEventType.OUTPUT_READY)
      .map(e => ({
        id: e.id,
        target: e.data.target || 'unknown',
        value: e.data.value,
        progress: Math.min(1, (time - e.timestamp) / 1000),
        color: e.data.visualization?.color || '#4CAF50',
      }))
      .filter(o => o.progress >= 0 && o.progress <= 1);

    // Visual effects
    const effects = recentEvents
      .filter(e => Math.abs(time - e.timestamp) < 300)
      .map(e => ({
        id: e.id,
        type: 'pulse' as const,
        x: Math.random() * 100,
        y: Math.random() * 100,
        intensity: 1 - Math.abs(time - e.timestamp) / 300,
        color: e.data.visualization?.color || '#666',
      }));

    setAnimationState({
      currentTime: time,
      progress,
      activeEvent,
      confidence: {
        current: activeEvent?.data.confidence || 0,
        target: activeEvent?.data.confidence || 0,
        animating: activeEvent?.type === TheaterEventType.CONFIDENCE_UPDATED,
      },
      sensations,
      reasoningSteps,
      outputs,
      effects,
    });
  }, [recording]);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (playbackState !== PlaybackState.PLAYING) {
      animationFrameRef.current = undefined;
      return;
    }

    const deltaTime = timestamp - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = timestamp;

    // Update current time based on playback rate
    setCurrentTime(prevTime => {
      let newTime = prevTime + deltaTime * playbackRate;

      // Handle loop
      if (loopEnabled && loopEnd > 0) {
        if (newTime >= loopEnd) {
          newTime = loopStart;
        }
      } else if (recording && newTime >= recording.duration) {
        // End of recording
        setPlaybackState(PlaybackState.IDLE);
        newTime = recording.duration;
      }

      return newTime;
    });

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [playbackState, playbackRate, loopEnabled, loopStart, loopEnd, recording]);

  // Start/stop animation
  useEffect(() => {
    if (playbackState === PlaybackState.PLAYING) {
      lastUpdateTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playbackState, animate]);

  // Update animation state when time changes
  useEffect(() => {
    updateAnimationState(currentTime);
  }, [currentTime, updateAnimationState]);

  // Playback controls
  const handlePlay = () => {
    if (playbackState === PlaybackState.PLAYING) {
      setPlaybackState(PlaybackState.PAUSED);
    } else {
      setPlaybackState(PlaybackState.PLAYING);
    }
  };

  const handleStop = () => {
    setPlaybackState(PlaybackState.IDLE);
    setCurrentTime(0);
  };

  const handleSkipBackward = () => {
    setCurrentTime(prev => Math.max(0, prev - 5000));
  };

  const handleSkipForward = () => {
    if (recording) {
      setCurrentTime(prev => Math.min(recording.duration, prev + 5000));
    }
  };

  const handleStepBackward = () => {
    if (!recording) return;
    const currentIndex = recording.events.findIndex(
      e => e.timestamp >= currentTime
    );
    if (currentIndex > 0) {
      setCurrentTime(recording.events[currentIndex - 1].timestamp);
    } else {
      setCurrentTime(0);
    }
  };

  const handleStepForward = () => {
    if (!recording) return;
    const currentIndex = recording.events.findIndex(
      e => e.timestamp >= currentTime
    );
    if (currentIndex < recording.events.length - 1) {
      setCurrentTime(recording.events[currentIndex + 1].timestamp);
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    setPlaybackState(PlaybackState.SEEKING);
    setTimeout(() => {
      if (playbackState === PlaybackState.SEEKING) {
        setPlaybackState(PlaybackState.PAUSED);
      }
    }, 100);
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  const handleLoopToggle = () => {
    setLoopEnabled(!loopEnabled);
    if (!loopEnabled) {
      setLoopStart(currentTime);
      setLoopEnd(recording?.duration || currentTime + 5000);
    }
  };

  const handleExport = () => {
    if (onExport && recording) {
      onExport({
        format: 'video',
        quality: 'medium',
        startTime: 0,
        endTime: recording.duration,
        includeAnnotations: true,
      });
    }
  };

  // Reset when recording changes
  useEffect(() => {
    setPlaybackState(PlaybackState.IDLE);
    setCurrentTime(0);
    setPlaybackRate(1);
    setLoopEnabled(false);
  }, [recording?.id]);

  if (!recording) {
    return (
      <div className="cell-theater-empty" style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E1E1E',
        color: '#666',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ fontSize: '48px' }}>🎭</div>
        <div style={{ fontSize: '14px' }}>No recording selected</div>
        <div style={{ fontSize: '12px', color: '#444' }}>
          Select a cell with a recorded consciousness to replay
        </div>
      </div>
    );
  }

  return (
    <div className="cell-theater" style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#121212',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🎭</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFF' }}>
              Cell Theater
            </div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              {recording.cellId} • {(recording.duration / 1000).toFixed(1)}s
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Stage - Main visualization area */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <StageRenderer
          animationState={animationState}
          recording={recording}
        />
      </div>

      {/* Timeline */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#1E1E1E',
        borderTop: '1px solid #333',
      }}>
        <Timeline
          recording={recording}
          currentTime={currentTime}
          onSeek={handleSeek}
          loopEnabled={loopEnabled}
          loopStart={loopStart}
          loopEnd={loopEnd}
        />
      </div>

      {/* Playback Controls */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#1E1E1E',
        borderTop: '1px solid #333',
      }}>
        <ReplayPlayer
          playbackState={playbackState}
          playbackRate={playbackRate}
          currentTime={currentTime}
          duration={recording.duration}
          loopEnabled={loopEnabled}
          onPlay={handlePlay}
          onStop={handleStop}
          onSkipBackward={handleSkipBackward}
          onSkipForward={handleSkipForward}
          onStepBackward={handleStepBackward}
          onStepForward={handleStepForward}
          onSpeedChange={handleSpeedChange}
          onLoopToggle={handleLoopToggle}
          onExport={handleExport}
        />
      </div>

      {/* Event Info - Current event details */}
      {animationState.activeEvent && (
        <div style={{
          position: 'absolute',
          bottom: '140px',
          left: '16px',
          right: '16px',
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          borderRadius: '8px',
          padding: '12px',
          border: `1px solid ${animationState.activeEvent.data.visualization?.color || '#333'}`,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>
              {animationState.activeEvent.data.visualization?.icon || '●'}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#FFF' }}>
              {animationState.activeEvent.data.description}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#888' }}>
              {(animationState.confidence.current * 100).toFixed(0)}% conf
            </span>
          </div>
          {animationState.activeEvent.data.reasoningStep && (
            <div style={{ fontSize: '11px', color: '#AAA', marginTop: '4px' }}>
              {animationState.activeEvent.data.reasoningStep}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CellTheater;
