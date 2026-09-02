import React, { useState, useMemo } from "react";
import {
  ZoomIn,
  Sliders,
  Layers,
  Sparkles,
  Search,
  Eye,
  Info,
  Maximize2,
  RefreshCw,
  Tag,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import AccessiblePolarChart from "./components/AccessiblePolarChart";
import { SAMPLE_DATASETS } from "./data/sampleDatasets";
import { AccessiblePolarChartItem, LensConfig } from "./types";

export default function App() {
  // Selected dataset preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>("dense-skills");
  const [sliceCount, setSliceCount] = useState<number>(28);
  
  // Custom fisheye lens zoom settings
  const [lensEnabled, setLensEnabled] = useState<boolean>(true);
  const [magnification, setMagnification] = useState<number>(3.2);
  const [angularSpan, setAngularSpan] = useState<number>(0.75); // radians (~43 deg)
  const [lensRadius, setLensRadius] = useState<number>(100);
  const [smoothInterpolation, setSmoothInterpolation] = useState<boolean>(true);
  const [showCrosshairs, setShowCrosshairs] = useState<boolean>(true);
  const [showLensStats, setShowLensStats] = useState<boolean>(true);
  
  // Chart visual configuration
  const [labelPosition, setLabelPosition] = useState<"outer-radial" | "inside-radial">("outer-radial");
  const [recencyToneCount, setRecencyToneCount] = useState<number>(3);
  const [recencyGradientMode, setRecencyGradientMode] = useState<"single" | "gradient">("single");
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [showRadialLines, setShowRadialLines] = useState<boolean>(true);
  
  // Active hovered sector state
  const [hoveredItem, setHoveredItem] = useState<AccessiblePolarChartItem | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Active dataset
  const activePreset = useMemo(() => {
    return SAMPLE_DATASETS.find((d) => d.id === selectedPresetId) || SAMPLE_DATASETS[0];
  }, [selectedPresetId]);

  // Sliced data based on slice count slider
  const chartData = useMemo(() => {
    return activePreset.items.slice(0, sliceCount);
  }, [activePreset, sliceCount]);

  const lensConfig: Partial<LensConfig> = useMemo(() => ({
    enabled: lensEnabled,
    magnification,
    angularSpan,
    lensRadius,
    smoothInterpolation,
    showCrosshairs,
    showLensStats,
  }), [lensEnabled, magnification, angularSpan, lensRadius, smoothInterpolation, showCrosshairs, showLensStats]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col">
      {/* Top Header */}
      <header id="main-header" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <ZoomIn className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  AccessiblePolarChart Lens Zoom
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  Fisheye Magnifier
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Smooth angular magnification for dense polar pie slices with continuous hover tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="toggle-lens-btn"
              onClick={() => setLensEnabled(!lensEnabled)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                lensEnabled
                  ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Lens Zoom: {lensEnabled ? "Active" : "Disabled"}
            </button>

            <button
              id="reset-lens-btn"
              onClick={() => {
                setMagnification(3.0);
                setAngularSpan(0.7);
                setSmoothInterpolation(true);
                setShowCrosshairs(true);
                setLensEnabled(true);
              }}
              title="Reset Zoom Parameters"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dataset Switcher Tabs */}
        <div id="dataset-selector" className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase px-2">Preset Data:</span>
            {SAMPLE_DATASETS.map((preset) => (
              <button
                key={preset.id}
                id={`preset-btn-${preset.id}`}
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  setSliceCount(preset.items.length);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedPresetId === preset.id
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            <span>Active Slices: <strong className="text-slate-800 font-mono">{chartData.length}</strong></span>
          </div>
        </div>

        {/* 2-Column Workstation: Chart Canvas & Inspector/Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Chart Display Area (Center Stage) */}
          <div id="chart-viewport-card" className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center min-h-[580px] relative overflow-hidden">
            
            {/* Top Bar inside Canvas */}
            <div className="w-full flex items-center justify-between mb-2 text-xs text-slate-500 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-medium text-slate-700">Interactive Canvas Stage</span>
                <span className="text-slate-300">•</span>
                <span>Hover around circle to observe smooth lens expansion</span>
              </div>

              <div className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {lensEnabled ? `Zoom ×${magnification.toFixed(1)} | Spread ${(angularSpan * (180 / Math.PI)).toFixed(0)}°` : "Standard Grid"}
              </div>
            </div>

            {/* The Accessible Polar Chart Component */}
            <div className="w-full flex items-center justify-center py-2">
              <AccessiblePolarChart
                data={chartData}
                width={500}
                height={500}
                backgroundColor="#ffffff"
                labelPosition={labelPosition}
                recencyToneCount={recencyToneCount}
                recencyGradientMode={recencyGradientMode}
                showBorders={showBorders}
                showRadialLines={showRadialLines}
                lensConfig={lensConfig}
                onActiveSectorChange={(item, index) => {
                  setHoveredItem(item);
                  setHoveredIndex(index);
                }}
              />
            </div>

            {/* Bottom Tip */}
            <div className="w-full mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                <span>
                  <strong>Lens Behavior:</strong> Slices right under the cursor expand the most; adjacent slices smoothly scale down; distant slices compress uniformly to preserve total 360°.
                </span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Lens Zoom Controls & Live Inspector */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            
            {/* Live Hover Sector Inspection Card */}
            <div id="inspector-card" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-bold text-slate-900">Current Focused Sector</h2>
                </div>
                {hoveredItem ? (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full font-mono">
                    Index #{hoveredIndex}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Hover chart</span>
                )}
              </div>

              {hoveredItem ? (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      {hoveredItem.label}
                    </h3>
                    {hoveredItem.category && (
                      <span className="inline-block mt-0.5 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium">
                        {hoveredItem.category}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-mono font-medium">Prevalence / Value</span>
                      <span className="text-lg font-bold text-slate-800 font-mono">{hoveredItem.value}%</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-mono font-medium">Recency Value</span>
                      <span className="text-lg font-bold text-slate-800 font-mono">
                        {hoveredItem.recency === -1 ? "Exception" : hoveredItem.recency !== undefined ? `${hoveredItem.recency}` : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Syntactic / Semantic Variant Matches */}
                  {hoveredItem.isVariant && (
                    <div className="p-2.5 bg-purple-50/70 rounded-lg border border-purple-100 space-y-1.5 text-xs">
                      <div className="font-semibold text-purple-900 flex items-center gap-1.5 text-[11px]">
                        <Tag className="w-3 h-3 text-purple-600" />
                        <span>Candidate Skill Match Variants</span>
                      </div>
                      {hoveredItem.synMatch && (
                        <div className="text-[11px] text-slate-700 pl-2 border-l-2 border-purple-400">
                          <strong className="text-purple-900">Syntactic:</strong> {hoveredItem.synMatch}
                        </div>
                      )}
                      {hoveredItem.semMatch && (
                        <div className="text-[11px] text-slate-700 pl-2 border-l-2 border-pink-400">
                          <strong className="text-pink-900">Semantic:</strong> {hoveredItem.semMatch}
                        </div>
                      )}
                    </div>
                  )}

                  {hoveredItem.description && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      {hoveredItem.description}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                  <Search className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                  <p>Move mouse over any slice to inspect</p>
                  <p className="text-[11px] text-slate-400">The sector and its adjacent neighbors will zoom smoothly</p>
                </div>
              )}
            </div>

            {/* Lens Zoom Parameters Customizer */}
            <div id="lens-controls-card" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-bold text-slate-900">Lens Zoom Controls</h2>
                </div>
                <span className="text-xs font-mono text-purple-600 font-semibold">
                  {lensEnabled ? "ACTIVE" : "OFF"}
                </span>
              </div>

              {/* Magnification Multiplier */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label htmlFor="magnification-slider" className="font-medium text-slate-700">
                    Peak Magnification:
                  </label>
                  <span className="font-mono font-bold text-purple-700">{magnification.toFixed(1)}×</span>
                </div>
                <input
                  id="magnification-slider"
                  type="range"
                  min="1.2"
                  max="4.5"
                  step="0.1"
                  value={magnification}
                  onChange={(e) => setMagnification(parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Subtle (1.2×)</span>
                  <span>Standard (3.0×)</span>
                  <span>Ultra (4.5×)</span>
                </div>
              </div>

              {/* Angular Lens Spread (Breadth of adjacent slice zooming) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label htmlFor="spread-slider" className="font-medium text-slate-700">
                    Adjacent Spread Breadth (σ):
                  </label>
                  <span className="font-mono font-bold text-purple-700">
                    {(angularSpan * (180 / Math.PI)).toFixed(0)}°
                  </span>
                </div>
                <input
                  id="spread-slider"
                  type="range"
                  min="0.3"
                  max="1.3"
                  step="0.05"
                  value={angularSpan}
                  onChange={(e) => setAngularSpan(parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Pinpoint (~17°)</span>
                  <span>Balanced (~43°)</span>
                  <span>Broad (~75°)</span>
                </div>
              </div>

              {/* Optical Fisheye Glass Radius */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label htmlFor="radius-slider" className="font-medium text-slate-700">
                    Fisheye Glass Radius:
                  </label>
                  <span className="font-mono font-bold text-purple-700">{lensRadius}px</span>
                </div>
                <input
                  id="radius-slider"
                  type="range"
                  min="60"
                  max="160"
                  step="5"
                  value={lensRadius}
                  onChange={(e) => setLensRadius(parseInt(e.target.value, 10))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Compact (60px)</span>
                  <span>Standard (100px)</span>
                  <span>Wide (160px)</span>
                </div>
              </div>

              {/* Slice Count Slider for Density Stress Test */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-xs">
                  <label htmlFor="slice-count-slider" className="font-medium text-slate-700">
                    Dataset Slice Density:
                  </label>
                  <span className="font-mono font-bold text-slate-900">{sliceCount} slices</span>
                </div>
                <input
                  id="slice-count-slider"
                  type="range"
                  min="8"
                  max={activePreset.items.length}
                  step="1"
                  value={sliceCount}
                  onChange={(e) => setSliceCount(parseInt(e.target.value, 10))}
                  className="w-full accent-slate-800 cursor-pointer"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">Smooth Angle Interpolation (Lerp)</span>
                  <input
                    type="checkbox"
                    checked={smoothInterpolation}
                    onChange={(e) => setSmoothInterpolation(e.target.checked)}
                    className="accent-purple-600 w-4 h-4 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">Radial Angle Guide Line</span>
                  <input
                    type="checkbox"
                    checked={showCrosshairs}
                    onChange={(e) => setShowCrosshairs(e.target.checked)}
                    className="accent-purple-600 w-4 h-4 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 font-medium">Slice Borders</span>
                  <input
                    type="checkbox"
                    checked={showBorders}
                    onChange={(e) => setShowBorders(e.target.checked)}
                    className="accent-purple-600 w-4 h-4 rounded"
                  />
                </label>
              </div>

              {/* Label Position Selector */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="block text-xs font-medium text-slate-700">Curved Label Placement:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLabelPosition("outer-radial")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition ${
                      labelPosition === "outer-radial"
                        ? "bg-purple-50 border-purple-300 text-purple-900 font-bold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Outer Arc
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabelPosition("inside-radial")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition ${
                      labelPosition === "inside-radial"
                        ? "bg-purple-50 border-purple-300 text-purple-900 font-bold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Inside Spoke
                  </button>
                </div>
              </div>

              {/* Recency Tone Count */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="block text-xs font-medium text-slate-700">Recency Stage Buckets:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setRecencyToneCount(count)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border text-center transition ${
                        recencyToneCount === count
                          ? "bg-slate-900 text-white font-bold border-slate-900"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {count} Tones
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
