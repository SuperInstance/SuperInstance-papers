/**
 * ExperimentReport - A/B test results visualization
 *
 * Provides:
 * - Experiment overview
 * - Variant performance comparison
 * - Statistical significance display
 * - Conversion tracking
 * - Winner recommendation
 */

import React from 'react';
import {
  ExperimentResults,
  VariantResult
} from '../../backend/features/ExperimentTracker.js';

/**
 * ExperimentReport props
 */
interface ExperimentReportProps {
  results: ExperimentResults;
  onWinnerSelect?: (variantId: string) => void;
  onExport?: () => void;
}

/**
 * Main ExperimentReport component
 */
export const ExperimentReport: React.FC<ExperimentReportProps> = ({
  results,
  onWinnerSelect,
  onExport
}) => {
  const {
    experimentId,
    state,
    totalParticipants,
    totalConversions,
    variantResults,
    statisticalSignificance,
    recommendation,
    generatedAt
  } = results;

  const control = variantResults.find(r => r.isControl);
  const treatments = variantResults.filter(r => !r.isControl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Experiment Report</h2>
          <p className="text-sm text-gray-600">ID: {experimentId}</p>
        </div>
        <div className="flex items-center gap-3">
          {onWinnerSelect && statisticalSignificance?.winner && (
            <button
              onClick={() => onWinnerSelect(statisticalSignificance.winner!)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Select Winner
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export
            </button>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-sm text-gray-600">State</div>
          <div className="text-2xl font-bold capitalize">{state.toLowerCase()}</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-sm text-gray-600">Participants</div>
          <div className="text-2xl font-bold">{totalParticipants.toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-sm text-gray-600">Conversions</div>
          <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-sm text-gray-600">Conversion Rate</div>
          <div className="text-2xl font-bold">
            {totalParticipants > 0
              ? ((totalConversions / totalParticipants) * 100).toFixed(2)
              : '0'}
            %
          </div>
        </div>
      </div>

      {/* Statistical Significance */}
      {statisticalSignificance && (
        <div className={`p-4 border rounded-lg ${
          statisticalSignificance.isSignificant
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Statistical Significance</h3>
              <p className="text-sm text-gray-600 mt-1">
                {statisticalSignificance.testUsed} at {(statisticalSignificance.confidence * 100).toFixed(0)}% confidence
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {statisticalSignificance.isSignificant ? '✓ Significant' : 'Not Significant'}
              </div>
              <div className="text-sm text-gray-600">
                p-value: {statisticalSignificance.pValue?.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Recommendation</h3>
          <p className="text-gray-700">{recommendation}</p>
        </div>
      )}

      {/* Variant Comparison */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Variant Comparison</h3>
        <div className="space-y-4">
          {variantResults.map((variant) => (
            <VariantCard
              key={variant.variantId}
              variant={variant}
              control={control}
              isWinner={statisticalSignificance?.winner === variant.variantId}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-sm text-gray-500">
        Generated at {generatedAt.toLocaleString()}
      </div>
    </div>
  );
};

/**
 * VariantCard component
 */
interface VariantCardProps {
  variant: VariantResult;
  control?: VariantResult;
  isWinner?: boolean;
}

const VariantCard: React.FC<VariantCardProps> = ({ variant, control, isWinner }) => {
  const improvement = variant.improvementPercentage;
  const isImprovement = improvement !== undefined && improvement > 0;

  return (
    <div className={`p-4 border rounded-lg ${
      isWinner ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">{variant.variantName}</h4>
            {variant.isControl && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                Control
              </span>
            )}
            {isWinner && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                Winner
              </span>
            )}
            {variant.isSignificant && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                Significant
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Participants</div>
              <div className="text-lg font-semibold">{variant.participants.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Conversions</div>
              <div className="text-lg font-semibold">{variant.conversions.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Conversion Rate</div>
              <div className="text-lg font-semibold">
                {(variant.conversionRate * 100).toFixed(2)}%
              </div>
            </div>
            {variant.avgValue !== undefined && (
              <div>
                <div className="text-sm text-gray-600">Avg Value</div>
                <div className="text-lg font-semibold">
                  ${variant.avgValue.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {improvement !== undefined && control && (
            <div className="mt-4">
              <div className="text-sm text-gray-600">Improvement vs Control</div>
              <div className={`text-lg font-semibold ${
                isImprovement ? 'text-green-600' : 'text-red-600'
              }`}>
                {isImprovement ? '+' : ''}{improvement.toFixed(2)}%
              </div>
            </div>
          )}

          {variant.confidenceInterval && (
            <div className="mt-4">
              <div className="text-sm text-gray-600">
                {(variant.confidenceInterval.lower * 100).toFixed(2)}% - {(variant.confidenceInterval.upper * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500">95% Confidence Interval</div>
            </div>
          )}

          {variant.pValue !== undefined && (
            <div className="mt-4">
              <div className="text-sm text-gray-600">p-value: {variant.pValue.toFixed(4)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * MiniExperimentCard - Compact variant display
 */
interface MiniExperimentCardProps {
  name: string;
  state: string;
  participants: number;
  conversionRate: number;
  isSignificant?: boolean;
  onClick?: () => void;
}

export const MiniExperimentCard: React.FC<MiniExperimentCardProps> = ({
  name,
  state,
  participants,
  conversionRate,
  isSignificant,
  onClick
}) => {
  return (
    <div
      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">{name}</h4>
          <div className="text-sm text-gray-600 capitalize">{state.toLowerCase()}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{participants.toLocaleString()}</div>
          <div className="text-sm text-gray-600">
            {(conversionRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>
      {isSignificant && (
        <div className="mt-2">
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
            Significant
          </span>
        </div>
      )}
    </div>
  );
};
