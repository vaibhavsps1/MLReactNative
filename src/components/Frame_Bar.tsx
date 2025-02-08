import React, { useCallback, useState, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { VideoUtils } from '../services/VideoUtils';
import VideoSegment from './VideoSegment';
import { BreakpointMarker } from './BreakpointMarker';
import { SegmentManager, CONSTRAINTS } from '../utils/segmentManager';
import { Frame, SplitPoint, SegmentBounds } from '../types';

interface FrameBarProps {
  data: Frame[];
  splitPoints?: SplitPoint[];
  onAddSplit?: (frameIndex: number) => void;
  onRemoveSplit?: (id: string) => void;
  formatTime?: (time: number) => string;
  canSplit?: boolean;
  isCropping?: boolean;
  value?: {min: number; max: number};
  duration?: number;
  selectedSegmentIndex?: number | null;
  onSegmentSelect?: (index: number) => void;
  onSegmentAdjust?: (
    segmentIndex: number,
    newStartFrame: number,
    newEndFrame: number,
  ) => void;
  isMainHandleVisible?: boolean;
  onPreview?: (time: number) => void;
}

const FRAME_BAR_HEIGHT = 40;
const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;

const Frame_Bar: React.FC<FrameBarProps> = React.memo(({
  data,
  splitPoints = [],
  selectedSegmentIndex,
  onSegmentSelect,
  onSegmentAdjust,
  duration = 0,
  onPreview,
}) => {
  const [segmentHistory, setSegmentHistory] = useState<{[key: number]: SegmentBounds}>({});
  const [activeHandle, setActiveHandle] = useState<'left' | 'right' | null>(null);
  const segmentManager = useRef<SegmentManager>(
    new SegmentManager(duration, data.length, FRAME_WIDTH)
  ).current;
  const segments = React.useMemo(() => {
    if (splitPoints.length === 0) {
      return [{
        start: 0,
        end: data.length - 1,
        isFullTimeline: true,
      }];
    }
    const points = [...splitPoints].sort((a, b) => a.frameIndex - b.frameIndex);
    let segments = [];
    let startIndex = 0;
    for (let point of points) {
      segments.push({
        start: startIndex,
        end: Math.min(point.frameIndex - 1, data.length - 1),
        isFullTimeline: false,
      });
      startIndex = point.frameIndex;
    }
    segments.push({
      start: startIndex,
      end: data.length - 1,
      isFullTimeline: false,
    });
    return segments;
  }, [data.length, splitPoints]);

  const handleSegmentChange = useCallback((
    segmentIndex: number,
    newBounds: SegmentBounds
  ) => {
    const adjacentSegments = {
      prev: segmentIndex > 0 ? segmentHistory[segmentIndex - 1] : undefined,
      next: segmentIndex < segments.length - 1 ? segmentHistory[segmentIndex + 1] : undefined,
    };
    const validation = segmentManager.validateSegmentBounds(newBounds, adjacentSegments);
    if (validation.isValid) {
      setSegmentHistory(prev => ({
        ...prev,
        [segmentIndex]: newBounds
      }));
      onSegmentAdjust?.(
        segmentIndex,
        newBounds.startFrame,
        newBounds.endFrame
      );
    } else if (validation.adjustedBounds) {
      setSegmentHistory(prev => ({
        ...prev,
        [segmentIndex]: validation.adjustedBounds!
      }));
      onSegmentAdjust?.(
        segmentIndex,
        validation.adjustedBounds.startFrame,
        validation.adjustedBounds.endFrame
      );
    }
  }, [segments.length, segmentManager, onSegmentAdjust]);

  const handlePreview = useCallback((time: number) => {
    onPreview?.(time);
  }, [onPreview]);

  const renderBreakpoints = useCallback(() => {
    return splitPoints.map((point, index) => (
      <BreakpointMarker
        key={point.id}
        position={point.frameIndex * FRAME_WIDTH}
        barHeight={FRAME_BAR_HEIGHT}
        isActive={selectedSegmentIndex === index}
      />
    ));
  }, [splitPoints, selectedSegmentIndex]);

  useEffect(() => {
    if (selectedSegmentIndex !== null && !segmentHistory[selectedSegmentIndex]) {
      const segment = segments[selectedSegmentIndex];
      const bounds: SegmentBounds = {
        startFrame: segment.start,
        endFrame: segment.end,
        startTime: segmentManager.frameToTime(segment.start),
        endTime: segmentManager.frameToTime(segment.end)
      };
      setSegmentHistory(prev => ({
        ...prev,
        [selectedSegmentIndex]: bounds
      }));
    }
  }, [selectedSegmentIndex, segments, segmentManager]);

  return (
    <View style={styles.frameBarContainer}>
      {segments.map((segment, index) => (
        <VideoSegment
          key={index}
          segment={segment}
          frames={data}
          isSelected={selectedSegmentIndex === index}
          frameWidth={FRAME_WIDTH}
          barHeight={FRAME_BAR_HEIGHT}
          segmentIndex={index}
          activeHandle={activeHandle}
          dynamicWidth={
            segmentHistory[index]
              ? (segmentHistory[index].endFrame - segmentHistory[index].startFrame + 1) * FRAME_WIDTH
              : undefined
          }
          onSelect={onSegmentSelect!}
          onPreview={handlePreview}
          onSegmentChange={handleSegmentChange}
        />
      ))}
      {renderBreakpoints()}
    </View>
  );
});

const styles = StyleSheet.create({
  frameBarContainer: {
    flexDirection: 'row',
    height: FRAME_BAR_HEIGHT,
    alignItems: 'center',
    backgroundColor: 'black',
  }
});

export default Frame_Bar;