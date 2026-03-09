/**
 * Cell Theater - Stage Renderer
 *
 * Animated visualization of cell consciousness.
 * Shows the cell with head (inputs), body (processing), and tail (outputs).
 *
 * "Watch the mind of a cell unfold in real-time."
 */

import React, { useEffect, useRef } from 'react';
import { AnimationState, ConsciousnessRecording, TheaterEventType } from './types';

interface StageRendererProps {
  animationState: AnimationState;
  recording: ConsciousnessRecording;
}

/**
 * StageRenderer - Main visualization stage
 */
export const StageRenderer: React.FC<StageRendererProps> = ({
  animationState,
  recording,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the stage
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stage
    drawStage(ctx, canvas.width, canvas.height, animationState, recording);

  }, [animationState, recording]);

  const drawStage = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: AnimationState,
    recording: ConsciousnessRecording
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw background effects
    drawEffects(ctx, state.effects, width, height);

    // Draw cell structure
    drawCellStructure(ctx, centerX, centerY, state);

    // Draw input sensations flowing in
    drawSensations(ctx, centerX, centerY, state.sensations);

    // Draw reasoning steps in body
    drawReasoningSteps(ctx, centerX, centerY, state.reasoningSteps);

    // Draw outputs flowing out
    drawOutputs(ctx, centerX, centerY, state.outputs);

    // Draw confidence meter
    drawConfidenceMeter(ctx, width, height, state.confidence);

    // Draw active event indicator
    if (state.activeEvent) {
      drawActiveEvent(ctx, width, height, state.activeEvent);
    }
  };

  const drawCellStructure = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    state: AnimationState
  ) => {
    const cellSize = 120;

    // Draw cell outline (head/body/tail structure)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    // Head (input area) - left side
    ctx.beginPath();
    ctx.arc(centerX - 60, centerY, 40, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
    ctx.fill();
    ctx.stroke();

    // Body (processing area) - center
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
    ctx.fill();
    ctx.stroke();

    // Tail (output area) - right side
    ctx.beginPath();
    ctx.arc(centerX + 60, centerY, 40, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 152, 0, 0.1)';
    ctx.fill();
    ctx.stroke();

    // Connect them
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX - 50, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + 50, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HEAD', centerX - 60, centerY + 55);
    ctx.fillText('BODY', centerX, centerY + 65);
    ctx.fillText('TAIL', centerX + 60, centerY + 55);
  };

  const drawSensations = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    sensations: AnimationState['sensations']
  ) => {
    sensations.forEach((sensation, index) => {
      const angle = (Math.PI * 2 * index) / sensations.length - Math.PI / 2;
      const distance = 150 + sensation.progress * 100;

      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      // Draw sensation particle
      const alpha = 1 - sensation.progress;
      ctx.beginPath();
      ctx.arc(x, y, 8 * (1 - sensation.progress * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = sensation.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();

      // Draw trail
      ctx.beginPath();
      ctx.moveTo(x, y);
      const trailX = centerX + Math.cos(angle) * (distance - 30);
      const trailY = centerY + Math.sin(angle) * (distance - 30);
      ctx.lineTo(trailX, trailY);
      ctx.strokeStyle = sensation.color + '40';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw sensation type
      ctx.fillStyle = '#888';
      ctx.font = '9px monospace';
      ctx.fillText(sensation.type, x, y - 15);
    });
  };

  const drawReasoningSteps = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    steps: AnimationState['reasoningSteps']
  ) => {
    const boxWidth = 140;
    const boxHeight = 80;
    const boxX = centerX - boxWidth / 2;
    const boxY = centerY + 80;

    // Draw reasoning container
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    steps.forEach((step, index) => {
      const yPos = boxY + 10 + index * 18;
      const alpha = Math.min(1, step.progress * 2);

      // Highlight active step
      if (step.highlighted) {
        ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
        ctx.fillRect(boxX, yPos - 8, boxWidth, 16);
      }

      // Draw step text
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';

      const truncatedDesc =
        step.description.length > 18
          ? step.description.substring(0, 15) + '...'
          : step.description;

      ctx.fillText(`${index + 1}. ${truncatedDesc}`, boxX + 5, yPos + 4);
    });
  };

  const drawOutputs = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    outputs: AnimationState['outputs']
  ) => {
    outputs.forEach((output, index) => {
      const angle = (Math.PI * 2 * index) / outputs.length + Math.PI / 2;
      const distance = 100 + output.progress * 100;

      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;

      // Draw output particle
      const alpha = output.progress;
      ctx.beginPath();
      ctx.arc(x, y, 6 * output.progress, 0, Math.PI * 2);
      ctx.fillStyle = output.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();

      // Draw connection line
      ctx.beginPath();
      ctx.moveTo(centerX + 50, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = output.color + '40';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  const drawConfidenceMeter = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    confidence: AnimationState['confidence']
  ) => {
    const meterWidth = 200;
    const meterHeight = 8;
    const x = (width - meterWidth) / 2;
    const y = height - 40;

    // Draw background
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(x, y, meterWidth, meterHeight);

    // Draw confidence level
    const confidenceWidth = meterWidth * confidence.current;
    const gradient = ctx.createLinearGradient(x, y, x + meterWidth, y);
    gradient.addColorStop(0, '#F44336');
    gradient.addColorStop(0.5, '#FF9800');
    gradient.addColorStop(1, '#4CAF50');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, confidenceWidth, meterHeight);

    // Draw percentage
    ctx.fillStyle = '#FFF';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Confidence: ${(confidence.current * 100).toFixed(0)}%`,
      width / 2,
      y - 8
    );
  };

  const drawEffects = (
    ctx: CanvasRenderingContext2D,
    effects: AnimationState['effects'],
    width: number,
    height: number
  ) => {
    effects.forEach((effect) => {
      ctx.beginPath();
      ctx.arc(
        (effect.x / 100) * width,
        (effect.y / 100) * height,
        20 * effect.intensity,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = effect.color + Math.floor(effect.intensity * 50).toString(16).padStart(2, '0');
      ctx.fill();
    });
  };

  const drawActiveEvent = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    event: any
  ) => {
    const text = event.data.description;
    const color = event.data.visualization?.color || '#666';

    ctx.fillStyle = color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, 30);
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
};

export default StageRenderer;
