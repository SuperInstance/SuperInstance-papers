/**
 * Claw Cell Editor Component
 *
 * Modal editor for creating/editing Claw cell configurations
 */

import React from 'react';
import { ClawCellEditorProps } from './types';
import { ClawCellConfig } from './ClawCellConfig';

/**
 * ClawCellEditor Component
 */
export const ClawCellEditor: React.FC<ClawCellEditorProps> = ({
  config,
  onConfigChange,
  onSave,
  onCancel,
  readOnly = false,
  showAdvanced = false,
  className = ''
}) => {
  return (
    <div className={`claw-cell-editor-modal ${className}`}>
      <div className="claw-editor-backdrop" onClick={onCancel} />
      <div className="claw-editor-content">
        <ClawCellConfig
          config={config}
          onConfigChange={onConfigChange}
          onSave={onSave}
          onCancel={onCancel}
          readOnly={readOnly}
          showAdvanced={showAdvanced}
        />
      </div>
    </div>
  );
};

export default ClawCellEditor;
