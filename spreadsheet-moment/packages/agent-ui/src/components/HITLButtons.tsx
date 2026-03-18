/**
 * Human-in-the-Loop (HITL) Buttons Component
 *
 * Approval workflow controls for agent actions:
 * - Approve/Reject buttons
 * - Confirmation dialogs
 * - Action preview
 * - Undo/Redo support
 *
 * @packageDocumentation
 */

import React, { useState } from 'react';
import { IAgentCellData, AgentCellState } from '@spreadsheet-moment/agent-core';

interface HITLButtonsProps {
  /** Agent cell data requiring approval */
  agentCell: IAgentCellData;

  /** Callback when action is approved */
  onApprove?: (cellData: IAgentCellData) => void;

  /** Callback when action is rejected */
  onReject?: (cellData: IAgentCellData) => void;

  /** Callback when more details requested */
  onViewDetails?: () => void;

  /** Show confirmation dialog before approving */
  requireConfirmation?: boolean;

  /** Custom approval button label */
  approveLabel?: string;

  /** Custom reject button label */
  rejectLabel?: string;

  /** Enable undo/redo */
  allowUndo?: boolean;

  /** Custom class name */
  className?: string;
}

interface ActionPreview {
  type: 'set_value' | 'format_cell' | 'insert_row' | 'delete_row' | 'custom';
  description: string;
  target?: string;
  value?: any;
}

/**
 * HITLButtons Component
 *
 * Provides approve/reject controls for agent actions
 */
export const HITLButtons: React.FC<HITLButtonsProps> = ({
  agentCell,
  onApprove,
  onReject,
  onViewDetails,
  requireConfirmation = true,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  allowUndo = true,
  className = ''
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionPreview, setActionPreview] = useState<ActionPreview | null>(null);

  /**
   * Handle approve button click
   */
  const handleApproveClick = () => {
    if (requireConfirmation) {
      setShowConfirm(true);
      generateActionPreview();
    } else {
      onApprove?.(agentCell);
    }
  };

  /**
   * Confirm approval
   */
  const handleConfirmApprove = () => {
    setShowConfirm(false);
    onApprove?.(agentCell);
  };

  /**
   * Cancel approval
   */
  const handleCancelApprove = () => {
    setShowConfirm(false);
    setActionPreview(null);
  };

  /**
   * Handle reject button click
   */
  const handleRejectClick = () => {
    setShowRejectDialog(true);
  };

  /**
   * Confirm rejection
   */
  const handleConfirmReject = () => {
    const updated = {
      ...agentCell,
      error: rejectionReason || 'Action rejected by user'
    };
    setShowRejectDialog(false);
    setRejectionReason('');
    onReject?.(updated);
  };

  /**
   * Cancel rejection
   */
  const handleCancelReject = () => {
    setShowRejectDialog(false);
    setRejectionReason('');
  };

  /**
   * Generate action preview from agent cell
   */
  const generateActionPreview = () => {
    // Try to infer action from agent cell properties
    const preview: ActionPreview = {
      type: 'custom',
      description: 'Agent action',
      target: 'Current cell'
    };

    if (agentCell.v !== undefined) {
      preview.type = 'set_value';
      preview.description = `Set value to ${agentCell.v}`;
    } else if (agentCell.f) {
      preview.type = 'set_value';
      preview.description = `Set formula: ${agentCell.f}`;
    }

    // Add reasoning summary if available
    if (agentCell.reasoning && agentCell.reasoning.length > 0) {
      const lastStep = agentCell.reasoning[agentCell.reasoning.length - 1];
      preview.description += `\n\nReasoning: ${lastStep}`;
    }

    setActionPreview(preview);
  };

  /**
   * Render confirmation dialog
   */
  const renderConfirmDialog = () => {
    if (!showConfirm) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          minWidth: '400px',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#1e293b'
          }}>
            Confirm Agent Action
          </h3>

          {actionPreview && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#64748b',
                marginBottom: '4px'
              }}>
                Action Preview:
              </div>
              <pre style={{
                margin: 0,
                fontSize: '13px',
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace'
              }}>
                {actionPreview.description}
              </pre>
            </div>
          )}

          {agentCell.reasoning && agentCell.reasoning.length > 0 && (
            <div style={{
              padding: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#1d4ed8',
                marginBottom: '4px'
              }}>
                Latest Reasoning:
              </div>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#1e40af'
              }}>
                {agentCell.reasoning[agentCell.reasoning.length - 1]}
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleCancelApprove}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#64748b',
                backgroundColor: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmApprove}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#ffffff',
                backgroundColor: '#10b981',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              {approveLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render rejection dialog
   */
  const renderRejectDialog = () => {
    if (!showRejectDialog) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          minWidth: '400px',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#1e293b'
          }}>
            Reject Agent Action
          </h3>

          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: '#64748b'
          }}>
            Optionally provide a reason for rejection to help the agent learn.
          </p>

          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Why are you rejecting this action? (optional)"
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              fontSize: '14px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
          />

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '16px'
          }}>
            <button
              onClick={handleCancelReject}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#64748b',
                backgroundColor: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#ffffff',
                backgroundColor: '#ef4444',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {rejectLabel}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render main buttons
   */
  const renderButtons = () => {
    // Only show buttons when cell needs review
    if (agentCell.state !== AgentCellState.NEEDS_REVIEW) {
      return null;
    }

    return (
      <div
        className={`hitl-buttons ${className}`}
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        {/* View Details Button */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#64748b',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="View full reasoning and context"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Details
          </button>
        )}

        {/* Reject Button */}
        <button
          onClick={handleRejectClick}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#ffffff',
            backgroundColor: '#ef4444',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
          title="Reject this action"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {rejectLabel}
        </button>

        {/* Approve Button */}
        <button
          onClick={handleApproveClick}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#ffffff',
            backgroundColor: '#10b981',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          title="Approve and execute this action"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {approveLabel}
        </button>
      </div>
    );
  };

  return (
    <>
      {renderButtons()}
      {renderConfirmDialog()}
      {renderRejectDialog()}
    </>
  );
};

export default HITLButtons;
