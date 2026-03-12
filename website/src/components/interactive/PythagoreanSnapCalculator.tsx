import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

interface Triangle {
  a: number;
  b: number;
  c: number;
  angleA: number;
  angleB: number;
  area: number;
}

const PYTHAGOREAN_TRIPLES = [
  { name: '3-4-5', a: 3, b: 4, c: 5, description: 'The classic Pythagorean triple' },
  { name: '5-12-13', a: 5, b: 12, c: 13, description: 'Perfect for construction' },
  { name: '7-24-25', a: 7, b: 24, c: 25, description: 'Larger scale measurements' },
  { name: '8-15-17', a: 8, b: 15, c: 17, description: 'Engineering applications' },
  { name: '9-12-15', a: 9, b: 12, c: 15, description: 'Scaled 3-4-5 (×3)' },
  { name: '10-24-26', a: 10, b: 24, c: 26, description: 'Scaled 5-12-13 (×2)' }
];

const SCALES = [
  { value: 1, name: '1:1 (Natural)' },
  { value: 2, name: '1:2 (Half)' },
  { value: 3, name: '1:3 (Third)' },
  { value: 5, name: '1:5 (Fifth)' },
  { value: 10, name: '1:10 (Tenth)' }
];

export function PythagoreanSnapCalculator() {
  const [selectedTriple, setSelectedTriple] = useState(PYTHAGOREAN_TRIPLES[0]);
  const [scale, setScale] = useState(1);
  const [customA, setCustomA] = useState('');
  const [customB, setCustomB] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [svgSize, setSvgSize] = useState({ width: 400, height: 300 });
  const svgRef = useRef<SVGSVGElement>(null);

  const triangle = useState(() => {
    if (useCustom) {
      const a = parseFloat(customA) || 3;
      const b = parseFloat(customB) || 4;
      const c = Math.sqrt(a * a + b * b);
      return {
        a: a * scale,
        b: b * scale,
        c: c * scale,
        angleA: Math.atan(a / b) * (180 / Math.PI),
        angleB: Math.atan(b / a) * (180 / Math.PI),
        area: (a * b) / 2 * scale * scale
      };
    }
    return {
      a: selectedTriple.a * scale,
      b: selectedTriple.b * scale,
      c: selectedTriple.c * scale,
      angleA: Math.atan(selectedTriple.a / selectedTriple.b) * (180 / Math.PI),
      angleB: Math.atan(selectedTriple.b / selectedTriple.a) * (180 / Math.PI),
      area: (selectedTriple.a * selectedTriple.b * scale * scale) / 2
    };
  })[0];

  useEffect(() => {
    const updateSize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setSvgSize({ width: Math.max(400, rect.width), height: Math.max(300, rect.height) });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const padding = 40;
  const maxSide = Math.max(triangle.a, triangle.b, triangle.c) * 10;
  const scaleFactor = Math.min(
    (svgSize.width - 2 * padding) / maxSide,
    (svgSize.height - 2 * padding) / maxSide
  );

  // Calculate triangle vertices
  const vertices = {
    A: { x: padding, y: svgSize.height - padding }, // Origin
    B: { x: padding + triangle.b * scaleFactor, y: svgSize.height - padding }, // On x-axis
    C: { x: padding, y: svgSize.height - padding - triangle.a * scaleFactor } // On y-axis
  };

  const rightAngleIndicator = {
    x: vertices.A.x + 20,
    y: vertices.A.y - 20,
    size: 15
  };

  const calculateHypotenuse = (a: number, b: number) => Math.sqrt(a * a + b * b);

  const verifyPythagorean = () => {
    const a2 = Math.pow(triangle.a, 2);
    const b2 = Math.pow(triangle.b, 2);
    const c2 = Math.pow(triangle.c, 2);
    return Math.abs(a2 + b2 - c2) < 0.01;
  };

  const snapToPythagorean = () => {
    if (customA) {
      const a = parseFloat(customA);
      const b = Math.sqrt(Math.pow(selectNearestTriplet(a, 'a').c, 2) - Math.pow(a, 2));
      setCustomB(b.toFixed(1));
    }
  };

  const selectNearestTriplet = (value: number, side: 'a' | 'b') => {
    return PYTHAGOREAN_TRIPLES.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev[side] - value);
      const currDiff = Math.abs(curr[side] - value);
      return currDiff < prevDiff ? curr : prev;
    });
  };

  const generateGCode = () => {
    const gcode = []
    gcode.push('; Pythagorean Triangle G-Code');
    gcode.push(`; ${triangle.a.toFixed(2)}-${triangle.b.toFixed(2)}-${triangle.c.toFixed(2)} triangle`);
    gcode.push('G21 ; Set units to mm');
    gcode.push('G90 ; Absolute positioning');
    gcode.push('G0 Z5 ; Lift pen');
    gcode.push(`G0 X0 Y0 ; Move to origin`);
    gcode.push('G1 Z0 F100 ; Lower pen');
    gcode.push(`G1 X${triangle.b.toFixed(2)} Y0 F300 ; Draw base`);
    gcode.push(`G1 X${triangle.b.toFixed(2)} Y${triangle.a.toFixed(2)} ; Draw height`);
    gcode.push('G1 X0 Y0 ; Draw hypotenuse');
    gcode.push('G0 Z5 ; Lift pen');
    return gcode.join('\n');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pythagorean Snap Calculator</CardTitle>
          <CardDescription>
            Explore perfect right triangles with Pythagorean triples - the "easy snaps" of mathematics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Triangle Selection</h3>
              <div>
                <label className="block text-sm font-medium mb-2">Pre-defined Triples</label>
                <Select
                  value={selectedTriple.name}
                  onValueChange={(value) => {
                    const triple = PYTHAGOREAN_TRIPLES.find(t => t.name === value);
                    if (triple) {
                      setSelectedTriple(triple);
                      setUseCustom(false);
                      setCustomA('');
                      setCustomB('');
                    }
                  }}
                  disabled={useCustom}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PYTHAGOREAN_TRIPLES.map(triple => (
                      <SelectItem key={triple.name} value={triple.name}>
                        <div>
                          <div className="font-medium">{triple.name}</div>
                          <div className="text-xs text-gray-600">{triple.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customMode"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                />
                <label htmlFor="customMode" className="text-sm font-medium">Use Custom Values</label>
              </div>

              {useCustom && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Side A</label>
                      <input
                        type="number"
                        value={customA}
                        onChange={(e) => setCustomA(e.target.value)}
                        placeholder="3"
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Side B</label>
                      <input
                        type="number"
                        value={customB}
                        onChange={(e) => setCustomB(e.target.value)}
                        placeholder="4"
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                  <Button onClick={snapToPythagorean} size="sm" variant="ghost">
                    Snap to Nearest Pythagorean
                  </Button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Scale</label>
                <Select
                  value={scale.toString()}
                  onValueChange={(value) => setScale(parseFloat(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCALES.map(s => (
                      <SelectItem key={s.value} value={s.value.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Properties</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="font-medium">Side A</div>
                    <div className="text-lg">{triangle.a.toFixed(2)}</div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="font-medium">Side B</div>
                    <div className="text-lg">{triangle.b.toFixed(2)}</div>
                  </div>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <div className="font-medium">Hypotenuse</div>
                  <div className="text-xl">{triangle.c.toFixed(2)}</div>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <div className="font-medium">Area</div>
                  <div className="text-lg">{triangle.area.toFixed(2)}</div>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <div className="font-medium">Angle A</div>
                  <div className="text-lg">{triangle.angleA.toFixed(1)}°</div>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <div className="font-medium">Angle B</div>
                  <div className="text-lg">{triangle.angleB.toFixed(1)}°</div>
                </div>
                <div className={`p-2 rounded text-center ${verifyPythagorean() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <div className="font-medium">√
                    {verifyPythagorean() ? '✓' : '✗'} Pythagorean Theorem
                  </div>
                  <div className="text-xs">{a² + b² = c²}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Visual Triangle</h3>
              <div className="flex gap-2">
                <Button onClick={() => navigator.clipboard.writeText(generateGCode())} size="sm" variant="outline">
                  Copy G-Code
                </Button>
              </div>
            </div>

            <svg
              ref={svgRef}
              width={svgSize.width}
              height={svgSize.height}
              className="w-full h-auto border rounded bg-white"
            >
              {/* Grid */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Triangle */}
              <polygon
                points={`${vertices.A.x},${vertices.A.y} ${vertices.B.x},${vertices.B.y} ${vertices.C.x},${vertices.C.y}`}
                fill="rgba(59, 130, 246, 0.2)"
                stroke="#3b82f6"
                strokeWidth="2"
              />

              {/* Right angle indicator */}
              <polygon
                points={`${rightAngleIndicator.x},${vertices.A.y} ${rightAngleIndicator.x},${rightAngleIndicator.y} ${vertices.A.x},${rightAngleIndicator.y}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="2,2"
              />

              {/* Side labels */}
              <g fill="#6b7280" fontSize="14" textAnchor="middle">
                {/* Side A */}
                <text x={(vertices.A.x + vertices.C.x) / 2 - 10} y={(vertices.A.y + vertices.C.y) / 2}>
                  A: {triangle.a.toFixed(1)}
                </text>
                {/* Side B */}
                <text x={(vertices.A.x + vertices.B.x) / 2} y={vertices.A.y + 20}>
                  B: {triangle.b.toFixed(1)}
                </text>
                {/* Hypotenuse */}
                <text x={(vertices.B.x + vertices.C.x) / 2 + 10} y={(vertices.B.y + vertices.C.y) / 2}>
                  C: {triangle.c.toFixed(1)}
                </text>
              </g>

              {/* Angle labels */}
              <g fill="#8b5cf6" fontSize="12" textAnchor="middle">
                <text x={vertices.A.x - 15} y={vertices.A.y - 5}>90°</text>
                <text x={vertices.B.x + 10} y={vertices.B.y + 5}>{triangle.angleB.toFixed(0)}°</text>
                <text x={vertices.C.x} y={vertices.C.y - 10}>{triangle.angleA.toFixed(0)}°</text>
              </g>

              {/* Vertices */}
              <g>
                <circle cx={vertices.A.x} cy={vertices.A.y} r="4" fill="#ef4444" />
                <circle cx={vertices.B.x} cy={vertices.B.y} r="4" fill="#ef4444" />
                <circle cx={vertices.C.x} cy={vertices.C.y} r="4" fill="#ef4444" />
                <g fontSize="12" fill="#1f2937" textAnchor="start" dx="8" dy="-8">
                  <text x={vertices.A.x} y={vertices.A.y}>A</text>
                  <text x={vertices.B.x} y={vertices.B.y}>B</text>
                  <text x={vertices.C.x} y={vertices.C.y}>C</text>
                </g>
              </g>

              {/* Animation glow */}
              <aanimate
                attributeName="opacity"
                values="0.5;1;0.5"
                dur="2s"
                repeatCount="indefinite"
              />
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}