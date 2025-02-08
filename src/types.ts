// types/index.ts
// export interface Frame {
//   uri: string;
//   status: 'loading' | 'ready' | 'error';
//   timestamp: number;
// }

export interface TrimRange {
  start: number;
  end: number;
}

export interface VideoProgress {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export interface SplitPoint {
  id: string;
  time: number;
  frameIndex: number;
}

export interface ProcessingProgress {
  segment: number;
  total: number;
  progress: number;
}

export interface ScrollingTimelineProps {
  frames: Frame[];
  splitPoints: SplitPoint[];
  duration: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onSplitPointsChange: (points: SplitPoint[]) => void;
  onAddSplit?: () => void;
  isPlaying: boolean;
}


export interface Frame {
  uri: string;
  status?: 'ready' | 'loading' | 'error';
  timestamp?: number;
}

export interface SegmentBounds {
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
}

export interface SegmentValidation {
  isValid: boolean;
  error?: string;
  adjustedBounds?: SegmentBounds;
}

export interface VideoSegment {
  id: string;
  bounds: SegmentBounds;
  frames: Frame[];
  isSelected?: boolean;
}

export interface HandleDragEvent {
  edge: 'left' | 'right';
  frameIndex: number;
  time: number;
}

export interface PreviewState {
  isActive: boolean;
  time: number;
  loading: boolean;
}