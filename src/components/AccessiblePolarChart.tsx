import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { AccessiblePolarChartItem, LensConfig } from "../types";

/* ========================================================
   HELPER UTILITIES & MATH
======================================================== */

// Check if angle is within start and end angles, wrapping around 2PI correctly
export function isAngleBetween(target: number, start: number, end: number): boolean {
  const twoPi = Math.PI * 2;
  const startNorm = ((start % twoPi) + twoPi) % twoPi;
  let endNorm = ((end % twoPi) + twoPi) % twoPi;
  let targetNorm = ((target % twoPi) + twoPi) % twoPi;

  if (endNorm <= startNorm) {
    endNorm += twoPi;
  }
  if (targetNorm < startNorm) {
    targetNorm += twoPi;
  }
  return targetNorm >= startNorm && targetNorm <= endNorm;
}

// Angular distance considering 2PI wrapping [-PI, PI]
export function angularDistance(a: number, b: number): number {
  const twoPi = Math.PI * 2;
  let diff = (a - b) % twoPi;
  if (diff < -Math.PI) diff += twoPi;
  if (diff > Math.PI) diff -= twoPi;
  return Math.abs(diff);
}

// Convert a recency numerical value into a descriptive string label matching the active toneCount config
export function getRecencyLabel(recency: number | undefined, toneCount: number): string {
  if (recency === undefined) return "N/A";
  if (recency === -1) return "Exception";

  const recV = Math.max(0, Math.min(100, recency));
  const toneIndex = Math.min(toneCount - 1, Math.floor(recV / (100 / toneCount)));

  if (toneCount === 3) {
    if (toneIndex === 0) return "Most Recent";
    if (toneIndex === 1) return "Mid Career";
    return "Early Career";
  }

  const step = 100 / toneCount;
  const startRange = Math.round(toneIndex * step);
  const endRange = toneIndex === toneCount - 1 ? 100 : Math.round((toneIndex + 1) * step) - 1;
  return `${startRange}–${endRange}`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ========================================================
   FISHEYE OPTICAL WARPING ENGINE
======================================================== */

export interface WarpedSlice {
  index: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  baseMidAngle: number;
  baseFlip: boolean;
  angleSpan: number;
  zoomWeight: number;
  item: AccessiblePolarChartItem;
}

/**
 * Computes warped slice boundaries for N slices given a target mouse angle.
 * Slices directly at mouseAngle receive max magnification, adjacent slices receive
 * smoothly tapering Gaussian zoom, and distant slices compress so total sum is 2PI.
 */
export function computeWarpedSlices(
  items: AccessiblePolarChartItem[],
  mouseAngle: number | null,
  lensActive: boolean,
  magnification: number = 3.2,
  angularSpread: number = 0.75 // in radians (~43 degrees)
): WarpedSlice[] {
  const count = items.length;
  const twoPi = Math.PI * 2;
  const baseSpan = count > 0 ? twoPi / count : twoPi;
  // Polar chart starts at 12 o'clock (-0.5 * PI)
  const baseStartOffset = -0.5 * Math.PI;

  if (!lensActive || mouseAngle === null || count <= 1 || magnification <= 1.01) {
    // Uniform slice angles
    return items.map((item, i) => {
      const start = baseStartOffset + i * baseSpan;
      const end = start + baseSpan;
      const mid = start + baseSpan / 2;
      const midNorm = ((mid % twoPi) + twoPi) % twoPi;
      return {
        index: i,
        startAngle: start,
        endAngle: end,
        midAngle: mid,
        baseMidAngle: mid,
        baseFlip: midNorm >= 0 && midNorm <= Math.PI,
        angleSpan: baseSpan,
        zoomWeight: 1.0,
        item,
      };
    });
  }

  // Calculate magnification weight for each slice based on distance from mouse angle
  const weights: number[] = [];
  let totalWeight = 0;

  for (let i = 0; i < count; i++) {
    const unwarpedMid = baseStartOffset + (i + 0.5) * baseSpan;
    const dist = angularDistance(unwarpedMid, mouseAngle);

    // Smooth Gaussian fisheye falloff curve: w = 1 + (M - 1) * exp(-dist^2 / (2 * spread^2))
    const falloff = Math.exp(-(dist * dist) / (2 * angularSpread * angularSpread));
    const weight = 1.0 + (magnification - 1.0) * falloff;
    weights.push(weight);
    totalWeight += weight;
  }

  // Distribute total 2PI proportionally to weights
  const result: WarpedSlice[] = [];
  let currentAngle = baseStartOffset;

  for (let i = 0; i < count; i++) {
    const span = (weights[i] / totalWeight) * twoPi;
    const start = currentAngle;
    const end = currentAngle + span;
    const mid = start + span / 2;
    const unwarpedMid = baseStartOffset + (i + 0.5) * baseSpan;
    const unwarpedMidNorm = ((unwarpedMid % twoPi) + twoPi) % twoPi;
    result.push({
      index: i,
      startAngle: start,
      endAngle: end,
      midAngle: mid,
      baseMidAngle: unwarpedMid,
      baseFlip: unwarpedMidNorm >= 0 && unwarpedMidNorm <= Math.PI,
      angleSpan: span,
      zoomWeight: weights[i],
      item: items[i],
    });
    currentAngle = end;
  }

  return result;
}

/* ========================================================
   CURVED & RADIAL TEXT RENDERING WITH UNTRUNCATED EXPANSION
======================================================== */

function forceHyphenate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, charPadding: number) {
  const getW = (s: string) => ctx.measureText(s).width + Math.max(0, s.length - 1) * charPadding;

  let i = 1;
  while (i <= text.length && getW(text.slice(0, i) + "-") <= maxWidth) {
    i += 3;
  }
  const splitPoint = Math.max(1, i - 2);

  return {
    head: text.slice(0, splitPoint) + "-",
    tail: text.slice(splitPoint),
  };
}

function drawCurvedLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  r: number,
  middle: number,
  flip: boolean,
  characterPadding: number
) {
  const chars = text.split("");
  const textWidth = ctx.measureText(text).width + (chars.length - 1) * (characterPadding || 0);
  const charAngle = textWidth / r / chars.length;

  let angle = flip
    ? middle + (charAngle * (chars.length - 1)) / 2
    : middle - (charAngle * (chars.length - 1)) / 2;

  chars.forEach((char) => {
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    ctx.save();
    ctx.translate(x, y);

    let rotation = angle + Math.PI / 2;
    if (flip) rotation += Math.PI;

    ctx.rotate(rotation);
    ctx.fillText(char, 0, 0);
    ctx.restore();

    angle += flip ? -charAngle : charAngle;
  });
}

function truncateToFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number = 12,
  fontFamily: string = "Fira Code",
  fontStyle: string = "600",
  characterPadding: number = 0
) {
  ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}, sans-serif`;
  const getWidth = (str: string) => ctx.measureText(str).width + Math.max(0, str.length - 1) * characterPadding;

  if (getWidth(text) <= maxWidth) return text;
  let t = text;
  while (t.length > 3 && getWidth(t + "...") > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "...";
}

/* ========================================================
   DATA PREPARATION & COLOR PALETTE ENGINE
======================================================== */

export function prepareData(data: AccessiblePolarChartItem[], maxVisibleSlices: number, enableOthersSlice: boolean) {
  const sorted = [...data].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" })
  );
  if (!enableOthersSlice || sorted.length <= maxVisibleSlices) return sorted;

  const visible = sorted.slice(0, maxVisibleSlices);
  const hidden = sorted.slice(maxVisibleSlices);

  const hiddenRecencies = hidden
    .map((h) => h.recency)
    .filter((r) => r !== undefined && r !== -1) as number[];
  const avgRecency =
    hiddenRecencies.length > 0 ? hiddenRecencies.reduce((a, b) => a + b, 0) / hiddenRecencies.length : -1;

  visible.push({
    label: `Others (${hidden.length})`,
    value: hidden.reduce((s, x) => s + x.value, 0),
    recency: avgRecency,
    category: "other",
    meta: { hiddenItems: hidden },
  });
  return visible;
}

export function getColorForRecency(
  recency: number | undefined,
  alpha: number = 0.6,
  startHex: string = "#9A19B7",
  endHex: string = "#FBF1D4",
  excHex: string = "#47ADEB",
  mode: "single" | "gradient" = "gradient",
  toneCount: number = 3
) {
  if (recency === undefined) return `rgba(156, 163, 175, ${alpha})`;

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  if (recency === -1) {
    const { r, g, b } = hexToRgb(excHex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const start = hexToRgb(startHex);
  const recV = Math.max(0, Math.min(100, recency));
  const toneIndex = Math.floor(recV / (100 / toneCount));
  const discreteV = toneIndex / Math.max(1, toneCount - 1);

  if (mode === "single") {
    let r1 = start.r / 255,
      g1 = start.g / 255,
      b1 = start.b / 255;
    let max = Math.max(r1, g1, b1),
      min = Math.min(r1, g1, b1);
    let h = 0,
      s = 0,
      l = (max + min) / 2;

    if (max !== min) {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r1) h = (g1 - b1) / d + (g1 < b1 ? 6 : 0);
      else if (max === g1) h = (b1 - r1) / d + 2;
      else h = (r1 - g1) / d + 4;
      h /= 6;
    }

    const newL = l + (0.9 - l) * discreteV * 0.7;
    const newS = s * (1 - 0.55 * discreteV);

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
    let p = 2 * newL - q;
    let resR = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    let resG = Math.round(hue2rgb(p, q, h) * 255);
    let resB = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

    return `rgba(${resR}, ${resG}, ${resB}, ${alpha})`;
  }

  const end = hexToRgb(endHex);
  const r = Math.round(start.r + (end.r - start.r) * discreteV);
  const g = Math.round(start.g + (end.g - start.g) * discreteV);
  const b = Math.round(start.b + (end.b - start.b) * discreteV);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ========================================================
   RECENCY LEGEND COMPONENT
======================================================== */

export function RecencyLegend({
  recencyToneCount,
  recencyColorStart,
  recencyColorEnd,
  recencyColorException,
  recencyGradientMode,
}: {
  recencyToneCount: number;
  recencyColorStart: string;
  recencyColorEnd: string;
  recencyColorException: string;
  recencyGradientMode: "single" | "gradient";
}) {
  const tones = useMemo(() => {
    const items: Array<{ label: string; color: string }> = [];
    const step = 100 / recencyToneCount;

    for (let i = 0; i < recencyToneCount; i++) {
      const startRange = Math.round(i * step);
      const endRange = i === recencyToneCount - 1 ? 100 : Math.round((i + 1) * step) - 1;

      let label = `${startRange}–${endRange}`;
      if (recencyToneCount === 3) {
        if (i === 0) label = `Most Recent`;
        if (i === 1) label = `Mid Career`;
        if (i === 2) label = `Early Career`;
      }

      const mid = (startRange + endRange) / 2;
      const color = getColorForRecency(
        mid,
        0.85,
        recencyColorStart,
        recencyColorEnd,
        recencyColorException,
        recencyGradientMode,
        recencyToneCount
      );

      items.push({ label, color });
    }

    items.push({
      label: "Exception",
      color: getColorForRecency(
        -1,
        0.85,
        recencyColorStart,
        recencyColorEnd,
        recencyColorException,
        recencyGradientMode,
        recencyToneCount
      ),
    });

    return items;
  }, [recencyToneCount, recencyColorStart, recencyColorEnd, recencyColorException, recencyGradientMode]);

  return (
    <div className="flex flex-row items-center justify-center w-full">
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {tones.map((tone, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-300 shadow-xs"
          >
            <div
              className="w-3 h-3 rounded-full shrink-0 border border-black/10"
              style={{ backgroundColor: tone.color }}
            />
            <span className="font-mono font-semibold text-[10px] text-slate-700 uppercase tracking-wider">
              {tone.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================
   MAIN ACCESSIBLE POLAR CHART WITH FISHEYE LENS
======================================================== */

export default function AccessiblePolarChart({
  data,
  width = 540,
  height = 540,
  backgroundColor = "#ffffff",
  outerLabelPadding = 0,
  fontSize = 12,
  labelColor = "#1e293b",
  maxVisibleSlices = 50,
  enableOthersSlice = false,
  showRadialLines = true,
  radialLineColor = "#e2e8f0",
  showBorders = true,
  borderColor = "auto",
  recencyColorStart = "#9A19B7",
  recencyColorEnd = "#FBF1D4",
  recencyColorException = "#47ADEB",
  gridColor = "#f1f5f9",
  labelFontFamily = "Fira Code",
  labelFontStyle = "600",
  recencyGradientMode = "single",
  characterPadding = 0.3,
  labelPosition = "outer-radial",
  recencyToneCount = 3,
  lensConfig = {},
  onActiveSectorChange,
}: {
  data: AccessiblePolarChartItem[];
  width?: number;
  height?: number;
  backgroundColor?: string;
  outerLabelPadding?: number;
  fontSize?: number;
  labelColor?: string;
  maxVisibleSlices?: number;
  enableOthersSlice?: boolean;
  showRadialLines?: boolean;
  radialLineColor?: string;
  showBorders?: boolean;
  borderColor?: string;
  recencyColorStart?: string;
  recencyColorEnd?: string;
  recencyColorException?: string;
  gridColor?: string;
  labelFontFamily?: string;
  labelFontStyle?: string;
  recencyGradientMode?: "single" | "gradient";
  characterPadding?: number;
  labelPosition?: "outside" | "inside-radial" | "outer-radial";
  recencyToneCount?: number;
  lensConfig?: Partial<LensConfig>;
  onActiveSectorChange?: (item: AccessiblePolarChartItem | null, index: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active configuration for lens zoom
  const activeLensConfig: LensConfig = useMemo(
    () => ({
      enabled: lensConfig.enabled ?? true,
      mode: lensConfig.mode ?? "dual",
      magnification: lensConfig.magnification ?? 3.2,
      lensRadius: lensConfig.lensRadius ?? 100,
      angularSpan: lensConfig.angularSpan ?? 0.75, // ~43 deg breadth
      smoothInterpolation: lensConfig.smoothInterpolation ?? true,
      showCrosshairs: lensConfig.showCrosshairs ?? true,
      showLensStats: lensConfig.showLensStats ?? true,
    }),
    [lensConfig]
  );

  const [mousePos, setMousePos] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const currentAngleRef = useRef<number | null>(null);
  const targetAngleRef = useRef<number | null>(null);
  const currentLensWeightRef = useRef<number>(0); // 0 (inactive) -> 1 (fully active)

  const [activeItem, setActiveItem] = useState<AccessiblePolarChartItem | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const prepared = useMemo(
    () => prepareData(data, maxVisibleSlices, enableOthersSlice),
    [data, maxVisibleSlices, enableOthersSlice]
  );

  // Notify parent on active sector change
  useEffect(() => {
    if (onActiveSectorChange) {
      onActiveSectorChange(activeItem, activeIndex);
    }
  }, [activeItem, activeIndex, onActiveSectorChange]);

  // Main Canvas Rendering Routine
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays (Retina)
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = width;
    const canvasHeight = height;

    if (canvas.width !== canvasWidth * dpr || canvas.height !== canvasHeight * dpr) {
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const maxRadius = Math.min(canvasWidth, canvasHeight) / 2 - (outerLabelPadding || 20);

    // 1. Draw Concentric Grid Rings (0%, 20%, 40%, 60%, 80%, 100%)
    const ringLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1.0;
    ringLevels.forEach((level) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius * level, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 2. Compute Fisheye Warped Slices
    const effectiveMag =
      1.0 + (activeLensConfig.magnification - 1.0) * currentLensWeightRef.current;

    const isLensEffectActive =
      activeLensConfig.enabled && currentLensWeightRef.current > 0.01 && currentAngleRef.current !== null;

    const warped = computeWarpedSlices(
      prepared,
      currentAngleRef.current,
      isLensEffectActive,
      effectiveMag,
      activeLensConfig.angularSpan
    );

    // 3. Determine Hovered Sector
    let hoveredIdx: number | null = null;
    if (mousePosRef.current.active && currentAngleRef.current !== null) {
      for (let i = 0; i < warped.length; i++) {
        if (isAngleBetween(currentAngleRef.current, warped[i].startAngle, warped[i].endAngle)) {
          hoveredIdx = i;
          break;
        }
      }
    }

    // Update React hover state
    if (hoveredIdx !== activeIndex) {
      setActiveIndex(hoveredIdx);
      setActiveItem(hoveredIdx !== null ? prepared[hoveredIdx] : null);
    }

    // 4. Render Polar Slices
    warped.forEach((slice, index) => {
      const item = slice.item;
      const normVal = Math.max(0, Math.min(100, item.value));
      const baseOuterR = (normVal / 100) * maxRadius;

      // Tactile Fisheye Radial Elevation on zoomed slices
      const zoomFactor = slice.zoomWeight || 1.0;
      let outerRadius = baseOuterR;
      if (isLensEffectActive && zoomFactor > 1.05) {
        const elevationBonus = Math.min(20, (zoomFactor - 1.0) * 8.5);
        outerRadius = Math.min(maxRadius + 22, baseOuterR + elevationBonus);
      }

      const isHovered = hoveredIdx === index;

      // Slice background fill color
      const fillColor = getColorForRecency(
        item.recency,
        isHovered ? 0.92 : 0.65,
        recencyColorStart,
        recencyColorEnd,
        recencyColorException,
        recencyGradientMode,
        recencyToneCount
      );

      // Slice stroke border color
      const strokeColor = isHovered
        ? "#ffffff"
        : borderColor === "auto"
        ? getColorForRecency(
            item.recency,
            1.0,
            recencyColorStart,
            recencyColorEnd,
            recencyColorException,
            recencyGradientMode,
            recencyToneCount
          )
        : borderColor;

      // Draw Sector Arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, slice.startAngle, slice.endAngle, false);
      ctx.arc(centerX, centerY, 0, slice.endAngle, slice.startAngle, true);
      ctx.closePath();

      ctx.fillStyle = fillColor;
      ctx.fill();

      if (showBorders || isHovered) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isHovered ? 2.8 : 1.2;
        ctx.stroke();
      }

      // Fisheye Highlight Focus Glow for the active slice
      if (isHovered && isLensEffectActive) {
        ctx.save();
        ctx.strokeStyle = "rgba(168, 85, 247, 0.95)";
        ctx.lineWidth = 3.5;
        ctx.shadowColor = "rgba(168, 85, 247, 0.8)";
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.restore();
      }
    });

    // 5. Render Radial Spoke Boundary Lines
    if (showRadialLines) {
      ctx.save();
      ctx.strokeStyle = radialLineColor;
      ctx.lineWidth = 1.0;
      warped.forEach((slice) => {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(slice.startAngle) * maxRadius,
          centerY + Math.sin(slice.startAngle) * maxRadius
        );
        ctx.stroke();
      });
      ctx.restore();
    }

    // 6. Render Curved & Radial Labels with Major Visibility Focus
    if (labelPosition !== "outside") {
      const isOuterRadial = labelPosition === "outer-radial";
      const radiusInitial = isOuterRadial ? maxRadius : maxRadius + outerLabelPadding;

      warped.forEach((slice, index) => {
        const item = slice.item;
        const label = item.label;
        const middle = slice.midAngle;
        const arcAngle = slice.angleSpan;
        // Keep the text direction (flip) completely invariant with and without zoom
        const flip = slice.baseFlip;

        const isHovered = hoveredIdx === index;
        const zoomFactor = slice.zoomWeight || 1.0;

        // Keep label font size constant at the configured size so that fisheye arc expansion
        // provides maximum space to reveal the full untruncated text of the label
        const sliceFontSize = fontSize || 12;

        ctx.font = `${isHovered ? "bold" : labelFontStyle} ${sliceFontSize}px ${labelFontFamily}, sans-serif`;

        const outerR = radiusInitial - sliceFontSize * 0.55;
        const innerR = outerR - sliceFontSize * 1.25;

        // Ensure high contrast label readability
        ctx.fillStyle = isHovered ? "#090d16" : labelColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (labelPosition === "inside-radial") {
          const charSpacing = sliceFontSize * 0.82 + (characterPadding || 0);
          const normVal = Math.max(0, Math.min(100, item.value));
          let r = (normVal / 100) * maxRadius - 8;
          const chars = label.split("");
          chars.forEach((char: string) => {
            if (r < 10) return;
            const x = centerX + Math.cos(middle) * r;
            const y = centerY + Math.sin(middle) * r;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(middle + Math.PI / 2);
            ctx.fillText(char, 0, 0);
            ctx.restore();
            r -= charSpacing;
          });
        } else if (isOuterRadial) {
          const line1R = flip ? innerR : outerR;
          const line2R = flip ? outerR : innerR;
          const limitFactor = 0.98;
          const maxWOuter = arcAngle * outerR * limitFactor;

          const currentW = (str: string) =>
            ctx.measureText(str).width + Math.max(0, str.length - 1) * (characterPadding || 0);

          if (currentW(label) <= maxWOuter) {
            drawCurvedLine(ctx, label, centerX, centerY, outerR, middle, flip, characterPadding);
          } else {
            const splitRegex = /([\s\-&])/;
            const isSplittable = /[\s\-&]/.test(label);
            let line1Text = "";
            let line2Text = "";

            if (!isSplittable) {
              const { head, tail } = forceHyphenate(ctx, label, maxWOuter, characterPadding);
              line1Text = head;
              line2Text = tail;
            } else {
              const segmentsRaw = label.split(splitRegex);
              const segments: string[] = [];
              for (let k = 0; k < segmentsRaw.length; k += 2) {
                segments.push(segmentsRaw[k] + (segmentsRaw[k + 1] || ""));
              }

              let splitIndex = 0;
              for (let i = 1; i <= segments.length; i++) {
                const testLine = segments.slice(0, i).join("").trim();
                if (currentW(testLine) <= maxWOuter) {
                  splitIndex = i;
                } else {
                  break;
                }
              }

              if (splitIndex === 0) {
                const { head, tail } = forceHyphenate(ctx, segments[0].trim(), maxWOuter, characterPadding);
                line1Text = head;
                line2Text =
                  tail + (segments.slice(1).join("").trim() ? " " + segments.slice(1).join("").trim() : "");
              } else {
                line1Text = segments.slice(0, splitIndex).join("").trim();
                line2Text = segments.slice(splitIndex).join("").trim();
              }
            }

            if (line1Text) {
              drawCurvedLine(ctx, line1Text, centerX, centerY, line1R, middle, flip, characterPadding);
            }
            if (line2Text) {
              const finalLine2 = truncateToFit(
                ctx,
                line2Text,
                arcAngle * line2R * limitFactor,
                sliceFontSize,
                labelFontFamily,
                labelFontStyle,
                characterPadding
              );
              drawCurvedLine(ctx, finalLine2, centerX, centerY, line2R, middle, flip, characterPadding);
            }
          }
        }
      });
    }

    // 7. Render 2D Optical Fisheye Glass Loupe Overlay & Focus Pin
    if (
      activeLensConfig.enabled &&
      mousePosRef.current.active &&
      currentAngleRef.current !== null
    ) {
      const mouseX = mousePosRef.current.x;
      const mouseY = mousePosRef.current.y;
      const lensR = activeLensConfig.lensRadius || 100;

      ctx.save();

      // Fisheye Optical Glass Circle
      const lensGradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, lensR);
      lensGradient.addColorStop(0, "rgba(168, 85, 247, 0.04)");
      lensGradient.addColorStop(0.7, "rgba(168, 85, 247, 0.08)");
      lensGradient.addColorStop(1, "rgba(168, 85, 247, 0.22)");

      ctx.beginPath();
      ctx.arc(mouseX, mouseY, lensR, 0, Math.PI * 2);
      ctx.fillStyle = lensGradient;
      ctx.fill();

      // Glass Lens Outer Rim
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, lensR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.55)";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "rgba(168, 85, 247, 0.4)";
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Radial Focus Guide Beam
      if (activeLensConfig.showCrosshairs) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = "rgba(168, 85, 247, 0.75)";
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pointer focus bead
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#9333ea";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }, [
    width,
    height,
    outerLabelPadding,
    gridColor,
    activeLensConfig,
    prepared,
    activeIndex,
    recencyColorStart,
    recencyColorEnd,
    recencyColorException,
    recencyGradientMode,
    recencyToneCount,
    borderColor,
    showBorders,
    showRadialLines,
    radialLineColor,
    labelPosition,
    fontSize,
    labelFontStyle,
    labelFontFamily,
    characterPadding,
    labelColor,
  ]);

  // Smooth continuous requestAnimationFrame loop for fluid lens movement
  useEffect(() => {
    let animId: number;

    const tick = () => {
      let needsRedraw = false;

      // 1. Interpolate lens active weight (fade in/out smoothly)
      const targetWeight = mousePosRef.current.active ? 1.0 : 0.0;
      if (Math.abs(currentLensWeightRef.current - targetWeight) > 0.005) {
        currentLensWeightRef.current += (targetWeight - currentLensWeightRef.current) * 0.25;
        needsRedraw = true;
      } else {
        currentLensWeightRef.current = targetWeight;
      }

      // 2. Interpolate mouse angle
      if (mousePosRef.current.active && targetAngleRef.current !== null) {
        if (currentAngleRef.current === null) {
          currentAngleRef.current = targetAngleRef.current;
          needsRedraw = true;
        } else if (activeLensConfig.smoothInterpolation) {
          let diff = (targetAngleRef.current - currentAngleRef.current) % (Math.PI * 2);
          if (diff < -Math.PI) diff += Math.PI * 2;
          if (diff > Math.PI) diff -= Math.PI * 2;

          if (Math.abs(diff) > 0.001) {
            currentAngleRef.current += diff * 0.32;
            currentAngleRef.current =
              ((currentAngleRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            needsRedraw = true;
          }
        } else {
          currentAngleRef.current = targetAngleRef.current;
          needsRedraw = true;
        }
      } else if (!mousePosRef.current.active && currentAngleRef.current !== null) {
        if (currentLensWeightRef.current < 0.01) {
          currentAngleRef.current = null;
        }
        needsRedraw = true;
      }

      if (needsRedraw) {
        drawChart();
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [drawChart, activeLensConfig.smoothInterpolation]);

  // Initial draw
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Pointer Movement Handlers
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxRadius = Math.min(rect.width, rect.height) / 2 + 25;

      if (dist <= maxRadius) {
        const angle = Math.atan2(dy, dx);
        targetAngleRef.current = angle;
        mousePosRef.current = { x, y, active: true };
        setMousePos({ x, y, active: true });
      } else {
        mousePosRef.current.active = false;
        targetAngleRef.current = null;
        setMousePos((prev) => ({ ...prev, active: false }));
      }
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    mousePosRef.current.active = false;
    targetAngleRef.current = null;
    setMousePos((prev) => ({ ...prev, active: false }));
    setActiveItem(null);
    setActiveIndex(null);
  }, []);

  return (
    <div className="relative flex flex-col items-center w-full max-w-full">
      {/* Chart Canvas Container */}
      <div
        ref={containerRef}
        id="accessible-polar-chart-container"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative flex flex-col items-center justify-center rounded-2xl cursor-crosshair select-none transition-shadow"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: "100%",
          backgroundColor,
        }}
      >
        <canvas ref={canvasRef} className="block" />

        {/* Live Hover Tooltip (Mouse-following Details) */}
        {mousePos.active && activeItem && (
          <div
            id="polar-chart-tooltip"
            className="absolute pointer-events-none bg-slate-900/95 text-white border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs shadow-2xl backdrop-blur-md z-50 transition-transform duration-75"
            style={{
              top: `${mousePos.y + 18}px`,
              left:
                mousePos.x < width / 2
                  ? `${mousePos.x + 16}px`
                  : `${mousePos.x - 16}px`,
              transform: mousePos.x < width / 2 ? "translate(0, 0)" : "translate(-100%, 0)",
            }}
          >
            <div className="flex items-center gap-2 font-bold text-slate-100 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              <span className="text-sm font-extrabold text-white">{activeItem.label}</span>
            </div>

            {activeItem.category && (
              <div className="text-[11px] text-purple-300 mb-1">Category: {activeItem.category}</div>
            )}

            <div className="font-mono text-[11px] text-slate-300">
              Prevalence: <strong className="text-white">{activeItem.value}%</strong> |{" "}
              <span>{getRecencyLabel(activeItem.recency, recencyToneCount)}</span>
            </div>

            {activeItem.isVariant && (
              <div className="mt-2 pt-2 border-t border-slate-700/80 text-[10.5px] space-y-1">
                {activeItem.synMatch && (
                  <div className="text-purple-300 italic">
                    <strong>Syntactic:</strong> {activeItem.synMatch}
                  </div>
                )}
                {activeItem.semMatch && (
                  <div className="text-pink-300 italic">
                    <strong>Semantic:</strong> {activeItem.semMatch}
                  </div>
                )}
              </div>
            )}

            {activeItem.meta?.hiddenItems && (
              <div className="mt-2 pt-2 border-t border-slate-700/80 text-[10px] font-mono text-slate-300 bg-slate-950/60 p-1.5 rounded">
                <div className="text-slate-400 font-bold mb-1">LABEL          PREVALENCE  RECENCY</div>
                {(activeItem.meta.hiddenItems as AccessiblePolarChartItem[]).map((h, idx) => (
                  <div key={idx} className="whitespace-pre">
                    {h.label.slice(0, 12).padEnd(14)} {`${h.value}%`.padEnd(11)} {getRecencyLabel(h.recency, recencyToneCount)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recency Legend */}
      <div className="w-full mt-4">
        <RecencyLegend
          recencyToneCount={recencyToneCount}
          recencyColorStart={recencyColorStart}
          recencyColorEnd={recencyColorEnd}
          recencyColorException={recencyColorException}
          recencyGradientMode={recencyGradientMode}
        />
      </div>
    </div>
  );
}
