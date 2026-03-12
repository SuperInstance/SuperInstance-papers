import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

export function OptimizedPythagoreanSnapCalculator() {
  const [selectedTriple, setSelectedTriple] = useState(PYTHAGOREAN_TRIPLES[0]);
  const [scale, setScale] = useState(1);
  const [customA, setCustomA] = useState('');
  const [customB, setCustomB] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [svgSize, setSvgSize] = useState({ width: 400, height: 300 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);

  // Memoized triangle calculations
  const triangle = useMemo((): Triangle => {
    let a, b, c;

    if (useCustom && customA && customB) {
      a = parseFloat(customA) || 3;
      b = parseFloat(customB) || 4;
      c = Math.sqrt(a * a + b * b);
    } else {
      a = selectedTriple.a;
      b = selectedTriple.b;
      c = selectedTriple.c;
    }

    return {
      a: a * scale,
      b: b * scale,
      c: c * scale,
      angleA: Math.atan(a / b) * (180 / Math.PI),
      angleB: Math.atan(b / a) * (180 / Math.PI),
      area: (a * b) / 2 * scale * scale
    };
  }, [selectedTriple, scale, useCustom, customA, customB]);

  // Responsive SVG sizing
  useEffect(() => {
    setIsClient(true);

    const updateSize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          const containerWidth = container.clientWidth;
          setSvgSize({
            width: Math.max(400, containerWidth - 32),
            height: Math.max(300, containerWidth * 0.6)
          });
        }
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);

    if (svgRef.current?.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Memoized vertex calculations
  const renderData = useMemo(() => {
    const padding = 40;
    const maxSide = Math.max(triangle.a, triangle.b, triangle.c) * 10;
    const availableWidth = svgSize.width - 2 * padding;
    const availableHeight = svgSize.height - 2 * padding;
    const scaleFactor = Math.min(
      availableWidth / maxSide,
      availableHeight / maxSide
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

    // Calculate hypotenuse
    const hypotenuse = Math.sqrt(
      Math.pow(vertices.B.x - vertices.C.x, 2) +
      Math.pow(vertices.B.y - vertices.C.y, 2)
    );

    return {
      vertices,
      rightAngleIndicator,
      scaleFactor,
      hypotenuse
    };
  }, [triangle, svgSize]);

  // Utility functions
  const calculateHypotenuse = useCallback((a: number, b: number) =>
    Math.sqrt(a * a + b * b), []);

  const verifyPythagorean = useCallback(() => {
    const a2 = Math.pow(triangle.a, 2);
    const b2 = Math.pow(triangle.b, 2);
    const c2 = Math.pow(triangle.c, 2);
    return Math.abs(a2 + b2 - c2) < 0.01;
  }, [triangle]);

  const selectNearestTriplet = useCallback((value: number, side: 'a' | 'b') => {
    return PYTHAGOREAN_TRIPLES.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev[side] - value);
      const currDiff = Math.abs(curr[side] - value);
      return currDiff < prevDiff ? curr : prev;
    });
  }, []);

  const snapToPythagorean = useCallback(() => {
    if (customA) {
      const a = parseFloat(customA);
      const nearestTriple = selectNearestTriplet(a, 'a');
      const b = Math.sqrt(Math.pow(nearestTriple.c, 2) - Math.pow(a, 2));
      setCustomB(b.toFixed(1));
    }
  }, [customA, selectNearestTriplet]);

  const generateGCode = useCallback(() => {
    const scaleFactor = 10; // Scale to a reasonable size for CNC
    const scaledA = triangle.a * scaleFactor;
    const scaledB = triangle.b * scaleFactor;

    const gcode = [];
    gcode.push('; Pythagorean Triangle G-Code');
    gcode.push(`; ${triangle.a.toFixed(2)}-${triangle.b.toFixed(2)}-${triangle.c.toFixed(2)} triangle`);
    gcode.push('G21 ; Set units to mm');
    gcode.push('G90 ; Absolute positioning');
    gcode.push('G0 Z5 ; Lift pen');
    gcode.push(`G0 X0 Y0 ; Move to origin`);
    gcode.push('G1 Z0 F100 ; Lower pen');
    gcode.push(`G1 X${scaledB.toFixed(2)} Y0 F300 ; Draw base`);
    gcode.push(`G1 X${scaledB.toFixed(2)} Y${scaledA.toFixed(2)} ; Draw height`);
    gcode.push('G1 X0 Y0 ; Draw hypotenuse');
    gcode.push('G0 Z5 ; Lift pen');
    return gcode.join('\n');
  }, [triangle]);

  const copyGCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateGCode());
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy G-code:', err);
    }
  }, [generateGCode]);

  // ARIA descriptions
  const triangleDescription = useMemo(() => {
    const pythagorean = verifyPythagorean();
    return `Right triangle with sides ${triangle.a.toFixed(1)}, ${triangle.b.toFixed(1)}, and hypotenuse ${triangle.c.toFixed(1)}. Area is ${triangle.area.toFixed(1)} square units. Angles are ${triangle.angleA.toFixed(1)}°, ${triangle.angleB.toFixed(1)}°, and 90°. ${pythagorean ? 'This is a valid Pythagorean triple.' : 'Custom triangle.'}`;
  }, [triangle, verifyPythagorean]);

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
          <!-- Controls -->
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 id="triangle-selection" className="font-semibold">Triangle Selection</h3>
              <div>
                <label htmlFor="preset-triples" className="block text-sm font-medium mb-2">
                  Pre-defined Triples
                </label>
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
                  aria-label="Select pre-defined Pythagorean triple"
                  aria-describedby="preset-triples-desc"
                >
                  <SelectTrigger id="preset-triples">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PYTHAGOREAN_TRIPLES.map(triple => (
                      <SelectItem key={triple.name} value={triple.name}>
                        <div className="space-y-1">
                          <div className="font-medium">{triple.name}</div>
                          <div id="preset-triples-desc" className="text-xs text-gray-600">
                            {triple.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="custom-mode"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="custom-mode" className="text-sm font-medium">
                  Use Custom Values
                </label>
              </div>

              {useCustom && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg" role="group" aria-label="Custom triangle values">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="side-a" className="block text-sm font-medium mb-1">
                        Side A
                      </label>
                      <input
                        id="side-a"
                        type="number"
                        value={customA}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) > 0)) {
                            setCustomA(value);
                          }
                        }}
                        placeholder="3"
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        min="0.1"
                        step="0.1"
                        aria-label="Custom side A value"
                      />
                    </div>
                    <div>
                      <label htmlFor="side-b" className="block text-sm font-medium mb-1">
                        Side B
                      </label>
                      <input
                        id="side-b"
                        type="number"
                        value={customB}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) > 0)) {
                            setCustomB(value);
                          }
                        }}
                        placeholder="4"
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        min="0.1"
                        step="0.1"
                        aria-label="Custom side B value"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={snapToPythagorean} size="sm" variant="outline">
                      Snap to Nearest Pythagorean
                    </Button>
                    <Button
                      onClick={() => {
                        setCustomA('3');
                        setCustomB('4');
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Reset to 3-4-5
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="scale" className="block text-sm font-medium mb-2">Scale</label>
                <Select
                  value={scale.toString()}
                  onValueChange={(value) => setScale(parseFloat(value))}
                  aria-label="Select scale multiplier"
                >
                  <SelectTrigger id="scale">
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
              <h3 id="properties" className="font-semibold">Properties</h3>
              <div className="space-y-2" role="group" aria-labelledby="properties">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium" id="side-a-label">Side A</div>
                    <output htmlFor="side-a preset-triples" className="text-lg font-semibold" >
                      {isClient ? triangle.a.toFixed(2) : '..'}
                    </output>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium" id="side-b-label">Side B</div>
                    <output htmlFor="side-b preset-triples" className="text-lg font-semibold">
                      {isClient ? triangle.b.toFixed(2) : '..'}
                    </output>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium">Hypotenuse</div>
                  <output className="text-xl font-semibold text-lg text-blue-700">
                    {isClient ? triangle.c.toFixed(2) : '..'}
                  </output>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium">Area</div>
                  <output className="text-lg font-semibold">
                    {isClient ? triangle.area.toFixed(2) : '..'}
                  </output>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-medium">Angle A</div>
                    <output className="text-lg font-semibold">
                      {isClient ? `${triangle.angleA.toFixed(1)}°` : '..'}
                    </output>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-medium">Angle B</div>
                    <output className="text-lg font-semibold">
                      {isClient ? `${triangle.angleB.toFixed(1)}°` : '..'}
                    </output>
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg text-center ${
                    verifyPythagorean()
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  <output className="font-medium text-lg">
                    {isClient ? verifyPythagorean() ? '✓ Valid Pythagorean' : '? Custom Triangle' : 'Loading...'}
                  </output>
                  <div className="text-xs mt-1">A² + B² = C²</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Visualization -->
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 id="visual-triangle" className="font-semibold">Visual Triangle</h3>
              <Button
                onClick={copyGCode}
                size="sm"
                variant="outline"
                aria-label="Copy G-code for CNC machining"
              >
                Copy G-Code
              </Button>
            </div>

            <div
              className="border rounded bg-white overflow-hidden"
              role="img"
              aria-label={triangleDescription}
            >
              <svg
                ref={svgRef}
                width="100%"
                height={svgSize.height}
                viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Grid - simplified for performance */}
                <defs>
                  <pattern id="grid-small" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f3f4f6" strokeWidth="0.5" />
                  </pattern>
                  <pattern id="grid-large" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-small)" aria-hidden="true" />
                <rect width="100%" height="100%" fill="url(#grid-large)" aria-hidden="true" />

                {/* Triangle */}
                <g>
                  <polygon
                    points={`${renderData.vertices.A.x},${renderData.vertices.A.y} ${renderData.vertices.B.x},${renderData.vertices.B.y} ${renderData.vertices.C.x},${renderData.vertices.C.y}`}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    shapeRendering="geometricPrecision"
                  />

                  {/* Right angle indicator */}
                  <polygon
                    points={`${renderData.rightAngleIndicator.x},${renderData.vertices.A.y} ${renderData.rightAngleIndicator.x},${renderData.rightAngleIndicator.y} ${renderData.vertices.A.x},${renderData.rightAngleIndicator.y}`}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    shapeRendering="geometricPrecision"
                  />

                  {/* Side labels */}
                  <g fill="#6b7280" fontSize="14" textAnchor="middle" aria-label="Side measurements">
                    {/* Side A */}
                    <text x={(renderData.vertices.A.x + renderData.vertices.C.x) / 2 - 10} y={(renderData.vertices.A.y + renderData.vertices.C.y) / 2}>
                      A: {isClient ? triangle.a.toFixed(1) : ''}
                    </text>
                    {/* Side B */}
                    <text x={(renderData.vertices.A.x + renderData.vertices.B.x) / 2} y={renderData.vertices.A.y + 20}>
                      B: {isClient ? triangle.b.toFixed(1) : ''}
                    </text>
                    {/* Hypotenuse */}
                    <text x={(renderData.vertices.B.x + renderData.vertices.C.x) / 2 + 10} y={(renderData.vertices.B.y + renderData.vertices.C.y) / 2}>
                      C: {isClient ? triangle.c.toFixed(1) : ''}
                    </text>
                  </g>

                  {/* Angle labels */}
                  <g fill="#8b5cf6" fontSize="12" textAnchor="middle" aria-label="Angle measurements">
                    <text x={renderData.vertices.A.x - 15} y={renderData.vertices.A.y - 5}>90°</text>
                    <text x={renderData.vertices.B.x + 10} y={renderData.vertices.B.y + 5}>
                      {isClient ? `${triangle.angleB.toFixed(0)}°` : ''}
                    </text>
                    <text x={renderData.vertices.C.x} y={renderData.vertices.C.y - 10}>
                      {isClient ? `${triangle.angleA.toFixed(0)}°` : ''}
                    </text>
                  </g>

                  {/* Vertices */}
                  <g>
                    <circle cx={renderData.vertices.A.x} cy={renderData.vertices.A.y} r="4" fill="#ef4444" >
                      <title>Vertex A - Origin</title>
                    </circle>
                    <circle cx={renderData.vertices.B.x} cy={renderData.vertices.B.y} r="4" fill="#ef4444" >
                      <title>Vertex B</title>
                    </circle>
                    <circle cx={renderData.vertices.C.x} cy={renderData.vertices.C.y} r="4" fill="#ef4444" >
                      <title>Vertex C</title>
                    </circle>
                    <g fontSize="12" fill="#1f2937" textAnchor="start" dx="8" dy="-8" aria-label="Vertex labels">
                      <text x={renderData.vertices.A.x} y={renderData.vertices.A.y}>A</text>
                      <text x={renderData.vertices.B.x} y={renderData.vertices.B.y}>B</text>
                      <text x={renderData.vertices.C.x} y={renderData.vertices.C.y}>C</text>
                    </g>
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OptimizedPythagoreanSnapCalculator;