/**
 * Cell Theater - Timeline
 *
 * Scrubable timeline showing events and key moments.
 * Drag to seek, click on events to jump to them.
 */

import React, { useRef, useState, useEffect } from 'react';
import { ConsciousnessRecording, TheaterEventType } from './types';

interface TimelineProps {
  recording: ConsciousnessRecording;
  currentTime: number;
  onSeek: (time: number) => void;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
}

/**
 * Timeline - Scrubable timeline with event markers
 */
export const Timeline: React.FC<TimelineProps> = ({
  recording,
  currentTime,
  onSeek,
  loopEnabled,
  loopStart,
  loopEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const getTimeFromPosition = (clientX: number): number => {
    if (!containerRef.current) return 0;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * recording.duration;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const time = getTimeFromPosition(e.clientX);
    onSeek(time);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const time = getTimeFromPosition(e.clientX);
    setHoverTime(time);

    if (isDragging) {
      onSeek(time);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverTime(null);
  };

  const getEventColor = (type: TheaterEventType): string => {
    const colors: Record<TheaterEventType, string> = {
      [TheaterEventType.SENSATION_RECEIVED]: '#4CAF50',
      [TheaterEventType.INPUT_VALIDATED]: '#8BC34A',
      [TheaterEventType.INPUT_TRANSFORMED]: '#CDDC39',
      [TheaterEventType.PROCESSING_STARTED]: '#2196F3',
      [TheaterEventType.REASONING_STEP]: '#9C27B0',
      [TheaterEventType.PATTERN_MATCHED]: '#673AB7',
      [TheaterEventType.INFERENCE_MADE]: '#3F51B5',
      [TheaterEventType.DECISION_MADE]: '#00BCD4',
      [TheaterEventType.CONFIDENCE_UPDATED]: '#FF9800',
      [TheaterEventType.OUTPUT_READY]: '#FFC107',
      [TheaterEventType.EFFECT_TRIGGERED]: '#FF5722',
      [TheaterEventType.NOTIFICATION_SENT]: '#795548',
      [TheaterEventType.STATE_CHANGED]: '#607D8B',
    };
    return colors[type] || '#666';
  };

  const progress = recording.duration > 0 ? currentTime / recording.duration : 0;

  return (
    <div className="timeline-container" style={{ width: '100%' }}>
      {/* Timeline track */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          height: '40px',
          backgroundColor: '#2A2A2A',
          borderRadius: '6px',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {/* Loop region indicator */}
        {loopEnabled && loopEnd > loopStart && (
          <div
            style={{
              position: 'absolute',
              left: `${(loopStart / recording.duration) * 100}%`,
              width: `${((loopEnd - loopStart) / recording.duration) * 100}%`,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(156, 39, 176, 0.2)',
              border: '1px dashed #9C27B0',
            }}
          />
        )}

        {/* Event markers */}
        {recording.events.map((event, index) => {
          const eventProgress = event.timestamp / recording.duration;
          const isActive = Math.abs(currentTime - event.timestamp) < 100;

          return (
            <div
              key={event.id}
              style={{
                position: 'absolute',
                left: `${eventProgress * 100}%`,
                top: 0,
                bottom: 0,
                width: isActive ? '3px' : '2px',
                backgroundColor: getEventColor(event.type),
                opacity: isActive ? 1 : 0.5,
                transform: 'translateX(-50%)',
              }}
              title={event.data.description}
            />
          );
        })}

        {/* Key moment markers */}
        {recording.keyMoments.firstInput !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: `${(recording.keyMoments.firstInput / recording.duration) * 100}%`,
              top: '8px',
              bottom: '8px',
              width: '4px',
              backgroundColor: '#4CAF50',
              transform: 'translateX(-50%)',
            }}
            title="First input"
          />
        )}
        {recording.keyMoments.processingStarted !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: `${(recording.keyMoments.processingStarted / recording.duration) * 100}%`,
              top: '8px',
              bottom: '8px',
              width: '4px',
              backgroundColor: '#2196F3',
              transform: 'translateX(-50%)',
            }}
            title="Processing started"
          />
        )}
        {recording.keyMoments.decisionMade !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: `${(recording.keyMoments.decisionMade / recording.duration) * 100}%`,
              top: '8px',
              bottom: '8px',
              width: '4px',
              backgroundColor: '#00BCD4',
              transform: 'translateX(-50%)',
            }}
            title="Decision made"
          />
        )}
        {recording.keyMoments.outputProduced !== undefined && (
          <div
            style={{
              position: 'absolute',
              left: `${(recording.keyMoments.outputProduced / recording.duration) * 100}%`,
              top: '8px',
              bottom: '8px',
              width: '4px',
              backgroundColor: '#FFC107',
              transform: 'translateX(-50%)',
            }}
            title="Output produced"
          />
        )}

        {/* Progress fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, rgba(33, 150, 243, 0.3), rgba(33, 150, 243, 0.1))',
          }}
        />

        {/* Playhead */}
        <div
          style={{
            position: 'absolute',
            left: `${progress * 100}%`,
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: '#FFF',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
          }}
        />

        {/* Hover indicator */}
        {hoverTime !== null && !isDragging && (
          <div
            style={{
              position: 'absolute',
              left: `${(hoverTime / recording.duration) * 100}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>

      {/* Time labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '10px',
          color: '#888',
        }}
      >
        <span>{formatTime(0)}</span>
        <span style={{ color: '#FFF' }}>
          {isDragging ? formatTime(hoverTime || currentTime) : formatTime(currentTime)}
        </span>
        <span>{formatTime(recording.duration)}</span>
      </div>

      {/* Event count */}
      <div
        style={{
          marginTop: '4px',
          fontSize: '10px',
          color: '#666',
          textAlign: 'center',
        }}
      >
        {recording.stats.totalEvents} events • {recording.stats.reasoningSteps}{' '}
        reasoning steps • Peak confidence:{' '}
        {(recording.stats.confidencePeak * 100).toFixed(0)}%
      </div>
    </div>
  );
};

export default Timeline;
