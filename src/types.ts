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