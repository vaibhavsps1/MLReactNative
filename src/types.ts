// types/index.ts
export interface Frame {
  uri: string;
  status: 'loading' | 'ready' | 'error';
  timestamp: number;
}

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
