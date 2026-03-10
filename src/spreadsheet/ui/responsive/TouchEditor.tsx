/**
 * POLLN Spreadsheet - TouchEditor Component
 *
 * Mobile-optimized cell editor with large touch targets and virtual keyboard handling.
 * Features formula builder UI and context-aware input modes.
 *
 * Accessibility:
 * - Full keyboard navigation support
 * - ARIA labels for screen readers
 * - Focus management
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type {
  Breakpoint,
  TouchEditorProps,
  TouchEditorConfig,
  FormulaBuilderConfig,
} from './types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TouchEditorConfig = {
  keyboardMode: 'auto',
  showFormulaBuilder: true,
  showSuggestions: true,
  maxSuggestions: 5,
  autoFocus: true,
  placeholder: 'Enter value or formula',
};

/**
 * Common functions for formula builder
 */
const COMMON_FUNCTIONS: FormulaBuilderConfig['functions'] = [
  {
    name: 'SUM',
    category: 'Math',
    syntax: 'SUM(range)',
    description: 'Adds all numbers in a range',
    examples: ['SUM(A1:A10)', 'SUM(A1, B1, C1)'],
    parameters: [
      { name: 'range', type: 'range', required: true, description: 'Range to sum' },
    ],
  },
  {
    name: 'AVERAGE',
    category: 'Math',
    syntax: 'AVERAGE(range)',
    description: 'Calculates the average of numbers',
    examples: ['AVERAGE(A1:A10)', 'AVERAGE(A1, B1, C1)'],
    parameters: [
      { name: 'range', type: 'range', required: true, description: 'Range to average' },
    ],
  },
  {
    name: 'IF',
    category: 'Logical',
    syntax: 'IF(condition, true_value, false_value)',
    description: 'Returns one value if condition is true, another if false',
    examples: ['IF(A1>10, "High", "Low")'],
    parameters: [
      { name: 'condition', type: 'boolean', required: true, description: 'Condition to test' },
      { name: 'true_value', type: 'any', required: true, description: 'Value if true' },
      { name: 'false_value', type: 'any', required: true, description: 'Value if false' },
    ],
  },
  {
    name: 'COUNT',
    category: 'Math',
    syntax: 'COUNT(range)',
    description: 'Counts the number of cells containing numbers',
    examples: ['COUNT(A1:A10)'],
    parameters: [
      { name: 'range', type: 'range', required: true, description: 'Range to count' },
    ],
  },
  {
    name: 'CONCATENATE',
    category: 'Text',
    syntax: 'CONCATENATE(text1, text2, ...)',
    description: 'Joins text strings together',
    examples: ['CONCATENATE(A1, " ", B1)'],
    parameters: [
      { name: 'text1', type: 'string', required: true, description: 'First text string' },
      { name: 'text2', type: 'string', required: true, description: 'Second text string' },
    ],
  },
];

/**
 * Function categories
 */
const FUNCTION_CATEGORIES = ['Math', 'Logical', 'Text', 'Date', 'Lookup'];

/**
 * TouchEditor - Mobile-optimized cell editor
 *
 * Features:
 * - Large touch targets (min 44x44px)
 * - Virtual keyboard handling
 * - Formula builder UI
 * - Auto-suggestions
 * - Input validation
 */
export const TouchEditor: React.FC<TouchEditorProps> = ({
  cellId,
  initialValue = '',
  mode,
  config = {},
  onSave,
  onCancel,
  onValidate,
  className = '',
  style = {},
}) => {
  // State
  const [value, setValue] = useState(initialValue);
  const [isFormula, setIsFormula] = useState(false);
  const [showFormulaBuilder, setShowFormulaBuilder] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'numeric' | 'formula'>('text');

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const formulaBuilderRef = useRef<HTMLDivElement>(null);

  // Effective configuration
  const effectiveConfig = useMemo<TouchEditorConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...config,
  }), [config]);

  // Initialize input mode based on initial value
  useEffect(() => {
    if (typeof initialValue === 'string' && initialValue.startsWith('=')) {
      setIsFormula(true);
      setInputMode('formula');
    } else if (typeof initialValue === 'number') {
      setInputMode('numeric');
    }
  }, [initialValue]);

  // Auto-focus input on mount
  useEffect(() => {
    if (effectiveConfig.autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [effectiveConfig.autoFocus]);

  // Validate input
  useEffect(() => {
    if (onValidate) {
      const valid = onValidate(value);
      setIsValid(valid);
      if (!valid) {
        setErrorMessage('Invalid input');
      } else {
        setErrorMessage('');
      }
    }
  }, [value, onValidate]);

  // Update suggestions based on input
  useEffect(() => {
    if (!effectiveConfig.showSuggestions || !isFormula) {
      setSuggestions([]);
      return;
    }

    // Extract function name from formula
    const match = value.match(/=([A-Z]+)$/);
    if (match) {
      const functionName = match[1];
      const matchingFunctions = COMMON_FUNCTIONS
        .filter(f => f.name.startsWith(functionName))
        .map(f => f.name)
        .slice(0, effectiveConfig.maxSuggestions);
      setSuggestions(matchingFunctions);
    } else {
      setSuggestions([]);
    }
  }, [value, isFormula, effectiveConfig.showSuggestions, effectiveConfig.maxSuggestions]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Check if it's a formula
    if (newValue.startsWith('=')) {
      setIsFormula(true);
      setInputMode('formula');
    } else if (!isNaN(Number(newValue))) {
      setInputMode('numeric');
    } else {
      setIsFormula(false);
      setInputMode('text');
    }

    setValue(newValue);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (isValid || !onValidate) {
      // Parse value
      let parsedValue: any = value;

      if (isFormula) {
        parsedValue = value; // Keep formula as string
      } else if (inputMode === 'numeric') {
        parsedValue = Number(value);
      }

      onSave?.(parsedValue);
    }
  }, [value, isFormula, inputMode, isValid, onValidate, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (suggestions.length > 0) {
          // Apply suggestion
          setValue('=' + suggestions[selectedSuggestionIndex]);
          setSuggestions([]);
        } else {
          handleSave();
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleCancel();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestionIndex(prev =>
            Math.min(prev + 1, suggestions.length - 1)
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestionIndex(prev =>
            Math.max(prev - 1, 0)
          );
        }
        break;
    }
  }, [suggestions, selectedSuggestionIndex, handleSave, handleCancel]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setValue('=' + suggestion);
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  // Handle function click from formula builder
  const handleFunctionClick = useCallback((func: typeof COMMON_FUNCTIONS[0]) => {
    setValue(prev => prev + func.name + '(');
    setShowFormulaBuilder(false);
    inputRef.current?.focus();
  }, []);

  // Get input mode for virtual keyboard
  const getInputMode = (): React.InputHTMLAttributes<HTMLInputElement>['inputMode'] => {
    switch (effectiveConfig.keyboardMode) {
      case 'numeric':
        return 'numeric';
      case 'text':
        return 'text';
      case 'formula':
        return 'none'; // Prevent default keyboard
      case 'auto':
        if (inputMode === 'numeric') return 'numeric';
        return 'text';
      default:
        return 'text';
    }
  };

  // Render input
  const renderInput = () => (
    <div style={styles.inputContainer}>
      <input
        ref={inputRef}
        type="text"
        inputMode={getInputMode()}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        placeholder={effectiveConfig.placeholder}
        aria-label={`Edit cell ${cellId}`}
        aria-invalid={!isValid}
        aria-describedby={errorMessage ? 'error-message' : undefined}
        style={{
          ...styles.input,
          ...(!isValid ? styles.inputInvalid : {}),
        }}
      />

      {/* Formula indicator */}
      {isFormula && (
        <div style={styles.formulaIndicator}>
          fx
        </div>
      )}

      {/* Formula builder toggle */}
      {effectiveConfig.showFormulaBuilder && (
        <button
          onClick={() => setShowFormulaBuilder(!showFormulaBuilder)}
          style={styles.formulaBuilderToggle}
          aria-label="Toggle formula builder"
          aria-expanded={showFormulaBuilder}
        >
          ƒx
        </button>
      )}
    </div>
  );

  // Render suggestions
  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;

    return (
      <div
        role="listbox"
        style={styles.suggestions}
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion}
            role="option"
            aria-selected={index === selectedSuggestionIndex}
            onClick={() => handleSuggestionClick(suggestion)}
            style={{
              ...styles.suggestionItem,
              ...(index === selectedSuggestionIndex ? styles.suggestionItemSelected : {}),
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  };

  // Render formula builder
  const renderFormulaBuilder = () => {
    if (!showFormulaBuilder) return null;

    return (
      <div
        ref={formulaBuilderRef}
        role="dialog"
        aria-label="Formula builder"
        style={styles.formulaBuilder}
      >
        <div style={styles.formulaBuilderHeader}>
          <h3 style={styles.formulaBuilderTitle}>Functions</h3>
          <button
            onClick={() => setShowFormulaBuilder(false)}
            style={styles.closeButton}
            aria-label="Close formula builder"
          >
            ×
          </button>
        </div>

        {/* Category tabs */}
        <div style={styles.categoryTabs}>
          {FUNCTION_CATEGORIES.map(category => (
            <button
              key={category}
              style={styles.categoryTab}
              aria-label={`Show ${category} functions`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Function list */}
        <div style={styles.functionList}>
          {COMMON_FUNCTIONS.map(func => (
            <button
              key={func.name}
              onClick={() => handleFunctionClick(func)}
              style={styles.functionItem}
              aria-label={`Insert ${func.name} function`}
            >
              <div style={styles.functionName}>{func.name}</div>
              <div style={styles.functionSyntax}>{func.syntax}</div>
              <div style={styles.functionDescription}>{func.description}</div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render error message
  const renderError = () => {
    if (!errorMessage) return null;

    return (
      <div
        id="error-message"
        role="alert"
        aria-live="polite"
        style={styles.errorMessage}
      >
        {errorMessage}
      </div>
    );
  };

  // Render action buttons
  const renderActions = () => (
    <div style={styles.actions}>
      <button
        onClick={handleCancel}
        style={styles.cancelButton}
        aria-label="Cancel editing"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={!isValid}
        style={{
          ...styles.saveButton,
          ...(!isValid ? styles.saveButtonDisabled : {}),
        }}
        aria-label="Save changes"
      >
        Save
      </button>
    </div>
  );

  return (
    <div
      className={`touch-editor touch-editor-${mode} ${className}`}
      style={{ ...styles.container, ...style }}
      role="dialog"
      aria-modal
      aria-label={`Edit cell ${cellId}`}
    >
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Edit Cell</h2>
        <div style={styles.cellId}>{cellId}</div>
      </div>

      {/* Input */}
      {renderInput()}

      {/* Suggestions */}
      {renderSuggestions()}

      {/* Formula builder */}
      {renderFormulaBuilder()}

      {/* Error message */}
      {renderError()}

      {/* Actions */}
      {renderActions()}
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '16px',
    zIndex: 1000,
  },

  // Header
  header: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    margin: 0,
    marginBottom: '4px',
  },
  cellId: {
    fontSize: '14px',
    color: '#666',
  },

  // Input
  inputContainer: {
    position: 'relative' as const,
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    height: '48px',
    fontSize: '16px',
    padding: '12px 48px 12px 12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputInvalid: {
    borderColor: '#f44336',
  },
  formulaIndicator: {
    position: 'absolute' as const,
    right: '48px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '12px',
    fontWeight: 600,
    color: '#2196F3',
  },
  formulaBuilderToggle: {
    position: 'absolute' as const,
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Suggestions
  suggestions: {
    maxHeight: '200px',
    overflowY: 'auto',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  suggestionItem: {
    width: '100%',
    padding: '12px 16px',
    textAlign: 'left' as const,
    backgroundColor: '#fff',
    border: 'none',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    fontSize: '14px',
  },
  suggestionItemSelected: {
    backgroundColor: '#e3f2fd',
  },

  // Formula builder
  formulaBuilder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  formulaBuilderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
  },
  formulaBuilderTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  closeButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
  },
  categoryTabs: {
    display: 'flex',
    gap: '4px',
    padding: '8px 16px',
    borderBottom: '1px solid #e0e0e0',
    overflowX: 'auto',
  },
  categoryTab: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
  },
  functionList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  functionItem: {
    width: '100%',
    padding: '12px',
    textAlign: 'left' as const,
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
  },
  functionName: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  functionSyntax: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
    fontFamily: 'monospace',
  },
  functionDescription: {
    fontSize: '12px',
    color: '#999',
  },

  // Error message
  errorMessage: {
    padding: '8px 12px',
    backgroundColor: '#ffebee',
    color: '#f44336',
    borderRadius: '4px',
    fontSize: '12px',
    marginBottom: '16px',
  },

  // Actions
  actions: {
    display: 'flex',
    gap: '8px',
  },
  cancelButton: {
    flex: 1,
    height: '48px',
    fontSize: '16px',
    backgroundColor: '#f5f5f5',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveButton: {
    flex: 1,
    height: '48px',
    fontSize: '16px',
    backgroundColor: '#2196F3',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default TouchEditor;
