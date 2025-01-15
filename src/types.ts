// types.ts
export interface Frame {
    uri: string;
    status: string;
    timestamp?: number;
  }
  
  export interface TimeRange {
    start: number;
    end: number;
  }
  
  export const FRAME_STATUS = {
    READY: { name: { description: 'ready' } },
  };