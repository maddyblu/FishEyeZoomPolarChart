export type AccessiblePolarChartItem = {
  label: string;
  value: number;
  recency?: number;
  category?: string;
  // Set when this slice's duration data came from a candidate skill that only
  // matched the required skill via a syntactic/semantic variant, not an exact
  // name match — surfaced in the tooltip so it's clear what actually matched.
  isVariant?: boolean;
  variantType?: "syn" | "sem" | "both";
  rawMatch?: string;
  synMatch?: string;
  semMatch?: string;
  description?: string;
  meta?: {
    hiddenItems?: AccessiblePolarChartItem[];
    [key: string]: any;
  };
};

export type LensMode = "dual" | "fisheye" | "loupe" | "none";

export interface LensConfig {
  enabled: boolean;
  mode: LensMode;
  magnification: number; // e.g. 1.5 - 3.5
  lensRadius: number; // e.g. 60 - 140px for loupe
  angularSpan: number; // angular breadth of fisheye in radians (e.g. 0.4 - 1.2)
  smoothInterpolation: boolean;
  showCrosshairs: boolean;
  showLensStats: boolean;
}

export interface AccessiblePolarChartProps {
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
  // Lens Zoom Config
  lensConfig?: Partial<LensConfig>;
  onActiveSectorChange?: (item: AccessiblePolarChartItem | null, index: number | null) => void;
}
