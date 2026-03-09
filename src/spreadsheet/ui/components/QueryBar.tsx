/**
 * Query Bar Component
 *
 * Natural language input component for querying cells.
 * Provides text input, voice input, and query suggestions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { VoiceCommand, VoiceState } from '../../nl/VoiceCommand.js';
import { NLQueryEngine, QueryResult, QueryContext } from '../../nl/NLQueryEngine.js';

/**
 * QueryBar props
 */
export interface QueryBarProps {
  onQuery: (query: string) => Promise<QueryResult>;
  onVoiceTranscript?: (transcript: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  showVoiceButton?: boolean;
  showSuggestions?: boolean;
  maxSuggestions?: number;
}

/**
 * QueryBar component
 */
export const QueryBar: React.FC<QueryBarProps> = ({
  onQuery,
  onVoiceTranscript,
  placeholder = 'Ask about your cells... (e.g., "Show me cells with value > 100")',
  className = '',
  disabled = false,
  autoFocus = false,
  showVoiceButton = true,
  showSuggestions = true,
  maxSuggestions = 5,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const voiceCommandRef = useRef<VoiceCommand | null>(null);
  const queryEngineRef = useRef<NLQueryEngine | null>(null);

  // Initialize voice command and query engine
  useEffect(() => {
    queryEngineRef.current = new NLQueryEngine();

    if (showVoiceButton) {
      const voiceCommand = new VoiceCommand({
        onStateChange: (event) => {
          setVoiceState(event.state);
          if (event.error) {
            setVoiceError(event.error);
          }
        },
        onTranscript: (transcript) => {
          setQuery(transcript);
          if (onVoiceTranscript) {
            onVoiceTranscript(transcript);
          }
          handleSubmit(transcript);
        },
        onError: (error) => {
          setVoiceError(error);
        },
      });

      voiceCommandRef.current = voiceCommand;
    }

    return () => {
      if (voiceCommandRef.current) {
        voiceCommandRef.current.abortListening();
      }
    };
  }, [showVoiceButton, onVoiceTranscript]);

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Update suggestions based on query
  useEffect(() => {
    if (showSuggestions && queryEngineRef.current) {
      const newSuggestions = queryEngineRef.current.getSuggestions(query);
      setSuggestions(newSuggestions.slice(0, maxSuggestions));
      setShowSuggestionsList(newSuggestions.length > 0 && query.length > 0);
    }
  }, [query, showSuggestions, maxSuggestions]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setVoiceError(null);
  };

  // Handle form submission
  const handleSubmit = async (queryText?: string) => {
    const queryToExecute = queryText || query;

    if (!queryToExecute.trim() || isExecuting) {
      return;
    }

    setIsExecuting(true);
    setShowSuggestionsList(false);

    try {
      await onQuery(queryToExecute);
    } catch (error) {
      console.error('Query error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setShowSuggestionsList(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestionsList(false);
    handleSubmit(suggestion);
  };

  // Handle voice button click
  const handleVoiceClick = () => {
    if (!voiceCommandRef.current) {
      return;
    }

    const currentState = voiceCommandRef.current.getState();

    if (currentState === VoiceState.LISTENING) {
      voiceCommandRef.current.stopListening();
    } else {
      setVoiceError(null);
      voiceCommandRef.current.startListening();
    }
  };

  // Handle clear button
  const handleClear = () => {
    setQuery('');
    setVoiceError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Voice state indicator
  const getVoiceIndicator = () => {
    switch (voiceState) {
      case VoiceState.LISTENING:
        return '🎤 Listening...';
      case VoiceState.PROCESSING:
        return '⏳ Processing...';
      case VoiceState.ERROR:
        return '❌ Error';
      default:
        return '🎤';
    }
  };

  // Example queries
  const exampleQueries = [
    'Show me cells with value > 100',
    'Which cells are trending up?',
    'Explain why A1 shows an error',
    'Highlight all prediction cells',
    'What\'s the average of column B?',
  ];

  return (
    <div className={`query-bar-container ${className}`}>
      <div className="query-bar-wrapper">
        {/* Input container */}
        <div className="query-input-container">
          {/* Query input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isExecuting}
            className="query-input"
            aria-label="Query input"
            autoComplete="off"
          />

          {/* Action buttons */}
          <div className="query-actions">
            {/* Clear button */}
            {query && !isExecuting && (
              <button
                type="button"
                onClick={handleClear}
                className="query-clear-button"
                aria-label="Clear query"
                title="Clear"
              >
                ✕
              </button>
            )}

            {/* Voice button */}
            {showVoiceButton && voiceCommandRef.current?.isVoiceSupported() && (
              <button
                type="button"
                onClick={handleVoiceClick}
                disabled={disabled || isExecuting}
                className={`query-voice-button ${
                  voiceState === VoiceState.LISTENING ? 'listening' : ''
                }`}
                aria-label="Voice input"
                title={voiceState === VoiceState.LISTENING ? 'Stop listening' : 'Start voice input'}
              >
                {getVoiceIndicator()}
              </button>
            )}

            {/* Submit button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={disabled || isExecuting || !query.trim()}
              className="query-submit-button"
              aria-label="Submit query"
            >
              {isExecuting ? '⏳' : '🔍'}
            </button>
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestionsList && suggestions.length > 0 && (
          <ul
            ref={suggestionsRef}
            className="query-suggestions"
            role="listbox"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="query-suggestion-item"
                role="option"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}

        {/* Voice error */}
        {voiceError && (
          <div className="query-voice-error" role="alert">
            {voiceError}
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="query-error-dismiss"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Example queries */}
      {!query && !isExecuting && (
        <div className="query-examples">
          <span className="query-examples-label">Try:</span>
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSubmit(example)}
              className="query-example-button"
              disabled={disabled}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * QueryBar styles (inline for portability)
 */
export const queryBarStyles = `
.query-bar-container {
  width: 100%;
  margin-bottom: 16px;
}

.query-bar-wrapper {
  position: relative;
  width: 100%;
}

.query-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.query-input-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.query-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  font-family: inherit;
  background: transparent;
}

.query-input::placeholder {
  color: #9ca3af;
}

.query-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.query-clear-button,
.query-voice-button,
.query-submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.query-clear-button:hover,
.query-voice-button:hover,
.query-submit-button:hover {
  background-color: #f3f4f6;
}

.query-voice-button.listening {
  background-color: #fef2f2;
  color: #dc2626;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.query-submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.query-suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 8px 0;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  list-style: none;
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.query-suggestion-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.query-suggestion-item:hover {
  background-color: #f3f4f6;
}

.query-voice-error {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.query-error-dismiss {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #dc2626;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.query-examples {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.query-examples-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.query-example-button {
  padding: 6px 12px;
  background: #f3f4f6;
  border: none;
  border-radius: 16px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.2s;
}

.query-example-button:hover {
  background: #e5e7eb;
}

.query-example-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`;
