import React, {useState, useCallback, useEffect} from 'react';
import {StyleSheet, View, Image, TouchableOpacity} from 'react-native';
import {VideoUtils} from '../services/VideoUtils';
import AudioTrimTimelineFun from './AudioTrimTimelineFun';

interface Frame {
  uri: string;
}

interface SplitPoint {
  id: string;
  time: number;
  frameIndex: number;
}

// Add new interfaces for segment tracking
interface SegmentState {
  originalStart: number;
  originalEnd: number;
  currentStart: number;
  currentEnd: number;
  lastModified: number;
}

interface SegmentHistory {
  [key: number]: SegmentState;
}

interface SegmentState {
  originalStart: number;
  originalEnd: number;
  currentStart: number;
  currentEnd: number;
  lastModified: number;
}

interface FramePicksProps {
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
}

const FRAME_BAR_HEIGHT = 50;
const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
const SEGMENT_GAP = 4;

const FramePicks: React.FC<FramePicksProps> = React.memo(
  ({
    data,
    splitPoints = [],
    onAddSplit,
    onRemoveSplit,
    canSplit = true,
    isCropping = false,
    value,
    duration = 0,
    selectedSegmentIndex,
    onSegmentSelect,
    onSegmentAdjust,
    isMainHandleVisible = true,
  }) => {
    const [segmentHistory, setSegmentHistory] = useState<SegmentHistory>({});

  // Add a segment initialization effect
useEffect(() => {
  if (selectedSegmentIndex !== null && !segmentHistory[selectedSegmentIndex]) {
    // Initialize history for newly selected segments
    const segment = segments[selectedSegmentIndex];
    setSegmentHistory(prev => ({
      ...prev,
      [selectedSegmentIndex]: {
        originalStart: segment.start,
        originalEnd: segment.end,
        currentStart: segment.start,
        currentEnd: segment.end,
        lastModified: Date.now()
      }
    }));
  }
}, [selectedSegmentIndex, segments]);

    const frameToTimestamp = useCallback(
      (frameIndex: number) => {
        return (frameIndex / data.length) * duration;
      },
      [data.length, duration],
    );

    const formatTime = useCallback((time: number): string => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      const milliseconds = Math.floor((time % 1) * 100);
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
        .toString()
        .padStart(2, '0')}`;
    }, []);

    useEffect(() => {
      if (
        selectedSegmentIndex !== null &&
        segmentHistory[selectedSegmentIndex]
      ) {
        const history = segmentHistory[selectedSegmentIndex];
        const originalStartTime = frameToTimestamp(history.originalStart);
        const originalEndTime = frameToTimestamp(history.originalEnd);
        const currentStartTime = frameToTimestamp(history.currentStart);
        const currentEndTime = frameToTimestamp(history.currentEnd);

        console.log(
          `
        Loading Segment ${selectedSegmentIndex + 1} History:
        ====================================
        Original Boundaries:
        - Start: ${formatTime(originalStartTime)}
        - End: ${formatTime(originalEndTime)}
        Current State:
        - Start: ${formatTime(currentStartTime)}
        - End: ${formatTime(currentEndTime)}
      `.replace(/^\s+/gm, ''),
        );
      }
    }, [selectedSegmentIndex, segmentHistory, frameToTimestamp, formatTime]);

    const segments = React.useMemo(() => {
      if (splitPoints.length === 0) {
        return [
          {
            start: 0,
            end: data.length - 1,
            isFullTimeline: true,
          },
        ];
      }

      const points = [...splitPoints].sort(
        (a, b) => a.frameIndex - b.frameIndex,
      );
      let segments = [];
      let startIndex = 0;

      for (let point of points) {
        const endIndex = Math.min(point.frameIndex - 1, data.length - 1);
        segments.push({
          start: startIndex,
          end: endIndex,
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

    // const handleSegmentPress = (
    //   segmentIndex: number,
    //   isFullTimeline: boolean,
    // ) => {
    //   if (onSegmentSelect) {
    //     if (isFullTimeline && splitPoints.length === 0) {
    //       onSegmentSelect(segmentIndex);
    //     } else if (!isFullTimeline && splitPoints.length > 0) {
    //       onSegmentSelect(segmentIndex);
    //     }
    //   }
    // };

    // Update handleSegmentPress to ensure proper position restoration
    const handleSegmentPress = (segmentIndex: number, isFullTimeline: boolean) => {
      if (onSegmentSelect) {
        if ((isFullTimeline && splitPoints.length === 0) || 
            (!isFullTimeline && splitPoints.length > 0)) {
          // Load the segment's saved position
          const historyData = segmentHistory[segmentIndex];
          if (historyData) {
            console.log(`
              Restoring Segment ${segmentIndex + 1} Position:
              =====================================
              Original Range: ${formatTime(frameToTimestamp(historyData.originalStart))} - ${formatTime(frameToTimestamp(historyData.originalEnd))}
              Restored Range: ${formatTime(frameToTimestamp(historyData.currentStart))} - ${formatTime(frameToTimestamp(historyData.currentEnd))}
            `.replace(/^\s+/gm, ''));
          }
          
          onSegmentSelect(segmentIndex);
        }
      }
    };

    // Enhanced handleValueChange with detailed tracking
    const handleValueChange = useCallback(
      (values: {min: number; max: number}) => {
        if (!onSegmentAdjust || selectedSegmentIndex === null) return;

        const segment = segments[selectedSegmentIndex];
        const newStartFrame = values.min;
        const newEndFrame = values.max;

        // Update segment history
        setSegmentHistory(prev => {
          const currentHistory = prev[selectedSegmentIndex] || {
            originalStart: segment.start,
            originalEnd: segment.end,
            currentStart: segment.start,
            currentEnd: segment.end,
            lastModified: Date.now(),
          };

          // Calculate timestamps for logging
          const startTime = frameToTimestamp(newStartFrame);
          const endTime = frameToTimestamp(newEndFrame);
          const originalStartTime = frameToTimestamp(
            currentHistory.originalStart,
          );
          const originalEndTime = frameToTimestamp(currentHistory.originalEnd);

          // Log the changes
          console.log(
            `
        Segment ${selectedSegmentIndex + 1} Adjustment:
        ================================
        Original Segment:
        - Start: ${formatTime(originalStartTime)}
        - End: ${formatTime(originalEndTime)}
        - Duration: ${formatTime(originalEndTime - originalStartTime)}

        New Active Region:
        - Start: ${formatTime(startTime)}
        - End: ${formatTime(endTime)}
        - Duration: ${formatTime(endTime - startTime)}

        Changes:
        - Start Offset: ${formatTime(startTime - originalStartTime)}
        - End Offset: ${formatTime(originalEndTime - endTime)}
        - Total Trimmed: ${formatTime(
          originalEndTime - originalStartTime - (endTime - startTime),
        )}
      `.replace(/^\s+/gm, ''),
          );
          return {
            ...prev,
            [selectedSegmentIndex]: {
              ...currentHistory,
              currentStart: newStartFrame,
              currentEnd: newEndFrame,
              lastModified: Date.now(),
            },
          };
        });

        // Call the parent's onSegmentAdjust
        onSegmentAdjust(selectedSegmentIndex, newStartFrame, newEndFrame);
      },
      [selectedSegmentIndex, segments, onSegmentAdjust, frameToTimestamp],
    );

    const totalWidth = React.useMemo(() => {
      const baseWidth = data.length * FRAME_WIDTH;
      const gapsWidth =
        splitPoints.length > 0 ? splitPoints.length * SEGMENT_GAP : 0;
      const extraPadding = 50;
      return baseWidth + gapsWidth + extraPadding;
    }, [data.length, splitPoints.length]);

   const renderSegment = (segment: any, segmentIndex: number) => {
  const segmentWidth = (segment.end - segment.start + 1) * FRAME_WIDTH;
  const isSelected = selectedSegmentIndex === segmentIndex;
  
  // Get the history for this segment if it exists
  const segmentHistoryData = segmentHistory[segmentIndex];
  
  // Calculate relative positions within the segment
  const initialStart = segmentHistoryData 
    ? segmentHistoryData.currentStart - segment.start 
    : 0;
  const initialEnd = segmentHistoryData 
    ? segmentHistoryData.currentEnd - segment.start 
    : segment.end - segment.start;

  return (
    <TouchableOpacity
          key={segmentIndex}
          onPress={() => handleSegmentPress(segmentIndex, segment.isFullTimeline)}
          style={[
            styles.segmentContainer,
            {
              marginRight: segmentIndex < segments.length - 1 ? SEGMENT_GAP : 0,
              width: segmentWidth,
            },
            isSelected && styles.selectedSegment,
          ]}>
          {/* Render base frames */}
          {data
            .slice(segment.start, segment.end + 1)
            .map((frame, frameIndex) => (
              <View key={frameIndex} style={styles.frameWrapper}>
                <Image
                  source={{uri: `file://${frame.uri}`}}
                  style={styles.frameImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          {isSelected && !segment.isFullTimeline && (
            <View style={styles.trimmerContainer}>
              <AudioTrimTimelineFun
                data={data.slice(segment.start, segment.end + 1)}
                min={initialStart}         // Use history-based initial position
                max={initialEnd}           // Use history-based initial position
                step={1}
                timestampStart={segment.start}
                timestampEnd={segment.end}
                sliderWidth={segmentWidth}
                onChangeHandler={handleValueChange}
                isHandlesVisible={isMainHandleVisible}
                renderRails={() => (
                  <View style={styles.railsContainer}>
                    {data
                      .slice(segment.start, segment.end + 1)
                      .map((frame, idx) => (
                        <View key={idx} style={styles.frameWrapper}>
                          <Image
                            source={{uri: `file://${frame.uri}`}}
                            style={styles.frameImage}
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                  </View>
                )}
              />
            </View>
          )}
          
          <View
            style={[
              styles.segmentBorder,
              isSelected && styles.selectedSegmentBorder,
            ]}
          />
        </TouchableOpacity>
      );
    };
    
    return (
      <View style={[styles.framePicksContainer, {width: totalWidth}]}>
        {segments.map((segment, index) => renderSegment(segment, index))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  framePicksContainer: {
    flexDirection: 'row',
    height: FRAME_BAR_HEIGHT,
    alignItems: 'center',
    paddingRight: 15,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'black',
    borderWidth: 2,
    borderColor: '#444',
    height: FRAME_BAR_HEIGHT,
    position: 'relative',
  },
  selectedSegment: {
    backgroundColor: '#3A3A3A',
  },
  segmentBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#444',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  selectedSegmentBorder: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  frameWrapper: {
    width: FRAME_WIDTH,
    height: FRAME_BAR_HEIGHT,
    position: 'relative',
  },
  frameImage: {
    width: FRAME_WIDTH,
    height: FRAME_BAR_HEIGHT,
    backgroundColor: '#333',
  },
  trimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'rgba(221, 27, 27, 0.84)',
  },
  railsContainer: {
    flexDirection: 'row',
    height: FRAME_BAR_HEIGHT,
    backgroundColor: 'red',
  },
});

export default FramePicks;
