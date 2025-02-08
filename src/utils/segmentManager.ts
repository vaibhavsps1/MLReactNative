import { VideoSegment, SegmentBounds, SegmentValidation } from './types';

export const CONSTRAINTS = {
  MIN_DURATION: 0.5, // seconds
  MIN_FRAMES: 15,    // minimum frames per segment
  FRAME_RATE: 30,    // frames per second
  SNAP_THRESHOLD: 5, // pixels
  PREVIEW_THROTTLE: 100, // ms
  SEEK_DELAY: 50,    // ms
  PREVIEW_BUFFER: 200 // ms
};

export class SegmentManager {
  private videoDuration: number;
  private totalFrames: number;
  private frameWidth: number;

  constructor(duration: number, frames: number, frameWidth: number) {
    this.videoDuration = duration;
    this.totalFrames = frames;
    this.frameWidth = frameWidth;
  }

  frameToTime(frameIndex: number): number {
    return (frameIndex / this.totalFrames) * this.videoDuration;
  }

  timeToFrame(time: number): number {
    return Math.round((time / this.videoDuration) * this.totalFrames);
  }

  validateSegmentBounds(
    currentSegment: SegmentBounds,
    adjacentSegments: { prev?: SegmentBounds; next?: SegmentBounds }
  ): SegmentValidation {
    const duration = currentSegment.endTime - currentSegment.startTime;
    
    // Check minimum duration
    if (duration < CONSTRAINTS.MIN_DURATION) {
      return {
        isValid: false,
        error: `Segment must be at least ${CONSTRAINTS.MIN_DURATION} seconds`,
        adjustedBounds: this.getAdjustedBounds(currentSegment, 'min_duration')
      };
    }

    const frameCount = currentSegment.endFrame - currentSegment.startFrame;
    if (frameCount < CONSTRAINTS.MIN_FRAMES) {
      return {
        isValid: false,
        error: 'Not enough frames in segment',
        adjustedBounds: this.getAdjustedBounds(currentSegment, 'min_frames')
      };
    }

    // Check collisions
    if (adjacentSegments.prev && currentSegment.startTime < adjacentSegments.prev.endTime) {
      return {
        isValid: false,
        error: 'Overlapping with previous segment',
        adjustedBounds: {
          ...currentSegment,
          startFrame: adjacentSegments.prev.endFrame,
          startTime: adjacentSegments.prev.endTime
        }
      };
    }

    return { isValid: true };
  }

  private getAdjustedBounds(segment: SegmentBounds, violation: string): SegmentBounds {
    switch (violation) {
      case 'min_duration':
        return {
          ...segment,
          endFrame: segment.startFrame + this.timeToFrame(CONSTRAINTS.MIN_DURATION),
          endTime: segment.startTime + CONSTRAINTS.MIN_DURATION
        };
      case 'min_frames':
        return {
          ...segment,
          endFrame: segment.startFrame + CONSTRAINTS.MIN_FRAMES,
          endTime: this.frameToTime(segment.startFrame + CONSTRAINTS.MIN_FRAMES)
        };
      default:
        return segment;
    }
  }

  calculateSegmentBounds(frameIndex: number, edge: 'left' | 'right', currentSegment: SegmentBounds): SegmentBounds {
    const time = this.frameToTime(frameIndex);
    
    return edge === 'left' ? {
      ...currentSegment,
      startFrame: frameIndex,
      startTime: time
    } : {
      ...currentSegment,
      endFrame: frameIndex,
      endTime: time
    };
  }
}

export const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const milliseconds = Math.floor((time % 1) * 100);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};