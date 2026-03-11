import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';

interface Cell {
  id: string;
  value: string;
  formula?: string;
  type: 'number' | 'text' | 'formula' | 'superinstance';
  confidence?: number;
  color?: string;
}

interface SpreadsheetDemoProps {
  title?: string;
  description?: string;
}

const SpreadsheetDemo: React.FC<SpreadsheetDemoProps> = ({
  title = "SuperInstance Spreadsheet Demo",
  description = "Experience the future of AI-powered spreadsheets"
}) => {
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [inputValue, setInputValue] = useState('');
  const [showConfidence, setShowConfidence] = useState(false);
  const [autoType, setAutoType] = useState(true);

  // Initialize demo data
  const initializeDemo = useCallback(() => {
    setCells({
      A1: { id: 'A1', value: "Hello World", type: 'text', color: '#3B82F6' },
      A2: { id: 'A2', value: '42', type: 'number', confidence: 0.98, color: '#4B5563' },
      A3: { id: 'A3', value: '64', type: 'formula', formula: '=8*8', confidence: 1.0, color: '#10B981' },
      B1: { id: 'B1', value: 'SuperInstance', type: 'superinstance', confidence: 0.85, color: '#8B5CF6' },
      B2: { id: 'B2', value: 'AI Formula', type: 'formula', formula: '=AI(A1,A2)', confidence: 0.92, color: '#EF4444' }
    });
  }, []);

  // Handle cell selection
  const handleCellClick = (cellId: string) => {
    setSelectedCell(cellId);
    setInputValue(cells[cellId]?.value || '');
  };

  // Handle input change
  const handleInputChange = (value: string) => {
    setInputValue(value);

    if (autoType) {
      // Auto-detect type
      let type: Cell['type'] = 'text';
      let confidence = 0.8;

      if (value.startsWith('=')) {
        type = 'formula';
        confidence = 0.95;
      } else if (/^\d+(\.\d+)?$/.test(value)) {
        type = 'number';
        confidence = 0.99;
      } else if (value.includes('super') || value.includes('SuperInstance')) {
        type = 'superinstance';
        confidence = 0.85;
      }

      setCells(prev => ({
        ...prev,
        [selectedCell]: {
          id: selectedCell,
          value,
          type,
          confidence,
          color: getColorForType(type)
        }
      }));
    }
  };

  // Get color based on cell type
  const getColorForType = (type: Cell['type']) => {
    switch (type) {
      case 'number': return '#4B5563';
      case 'formula': return '#10B981';
      case 'superinstance': return '#8B5CF6';
      default: return '#3B82F6';
    }
  };

  // Render cell with appropriate styling
  const renderCell = (cellId: string) => {
    const cell = cells[cellId];
    const isSelected = cellId === selectedCell;

    return (
      <div
        key={cellId}
        className={`
          w-20 h-12 border border-gray-300 cursor-pointer flex items-center justify-center
          ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-gray-50'}
          transition-all duration-200
        `}
        onClick={() => handleCellClick(cellId)}
      >
        {cell && (
          <div className="text-xs text-center font-mono">
            <div style={{ color: cell.color }}>{cell.value.substr(0, 6)}</div>
            {showConfidence && cell.confidence && (
              <div className="text-xs text-gray-500">{Math.round(cell.confidence * 100)}%</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Initialize on mount
  React.useEffect(() => {
    initializeDemo();
  }, [initializeDemo]);

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Spreadsheet Grid */}
        <div className="mb-6 overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Column Headers */}
            <div className="flex">
              <div className="w-20 h-8"></div>
              {['A', 'B', 'C', 'D', 'E'].map(col => (
                <div key={col} className="w-20 h-8 bg-gray-100 flex items-center justify-center font-semibold">
                  {col}
                </div>
              ))}
            </div>

            {/* Rows */}
            {[1, 2, 3, 4].map(row => (
              <div key={row} className="flex">
                <div className="w-20 h-12 bg-gray-100 flex items-center justify-center font-semibold">
                  {row}
                </div>
                {['A', 'B', 'C', 'D', 'E'].map(col => (
                  renderCell(`${col}${row}`)
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Cell {selectedCell}:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter value or formula..."
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => setShowConfidence(!showConfidence)}
            variant={showConfidence ? 'primary' : 'outline'}
            size="sm"
          >
            {showConfidence ? 'Hide' : 'Show'} Confidence
          </Button>
          <Button
            onClick={() => setAutoType(!autoType)}
            variant={autoType ? 'primary' : 'outline'}
            size="sm"
          >
            Auto-Type: {autoType ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={initializeDemo} variant="outline" size="sm">
            Reset Demo
          </Button>
        </div>

        {/* Cell Type Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4B5563' }}></div>
            <span>Number</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
            <span>Formula</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
            <span>SuperInstance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
            <span>Text</span>
          </div>
        </div>

        {/* Feature Explanation */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">SuperInstance Features Demo:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Cell Types: Text, Number, Formula, and SuperInstance cells</li>
            <li>Confidence Scoring: AI-powered certainty levels</li>
            <li>Auto-Type Detection: Automatic cell type recognition</li>
            <li>Color Coding: Visual representation of different cell types</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpreadsheetDemo;