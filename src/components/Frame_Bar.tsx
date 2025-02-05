import React, {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  PanResponder,
  ScrollView,
} from 'react-native';
import {VideoUtils} from '../services/VideoUtils';

interface Frame {
  uri: string;
}

interface SplitPoint {
  id: string;
  time: number;
  frameIndex: number;
}

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

const FRAME_BAR_HEIGHT = 40;
const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
const HANDLE_WIDTH = 20;

const Frame_Bar: React.FC<FramePicksProps> = React.memo(
  ({
    data,
    splitPoints = [],
    selectedSegmentIndex,
    onSegmentSelect,
    onSegmentAdjust,
  }) => {
    const [segmentHistory, setSegmentHistory] = useState<SegmentHistory>({});
    const [activeHandle, setActiveHandle] = useState<'left' | 'right' | null>(
      null,
    );
    const [segmentStyles, setSegmentStyles] = useState<{[key: number]: any}>(
      {},
    );
    const scrollViewRef = useRef<ScrollView>(null);
    const [contentWidth, setContentWidth] = useState(0);

    useEffect(() => {
      if (
        selectedSegmentIndex !== null &&
        !segmentHistory[selectedSegmentIndex]
      ) {
        const segment = segments[selectedSegmentIndex];
        setSegmentHistory(prev => ({
          ...prev,
          [selectedSegmentIndex]: {
            originalStart: segment.start,
            originalEnd: segment.end,
            currentStart: segment.start,
            currentEnd: segment.end,
            lastModified: Date.now(),
          },
        }));
      }
    }, [selectedSegmentIndex, segments]);

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

    // const handleSegmentPress = (
    //   segmentIndex: number,
    //   isFullTimeline: boolean,
    // ) => {
    //   if (onSegmentSelect) {
    //     if (
    //       (isFullTimeline && splitPoints.length === 0) ||
    //       (!isFullTimeline && splitPoints.length > 0)
    //     ) {
    //       onSegmentSelect(segmentIndex);
    //     }
    //   }
    // };

    const updateSegmentStyle = (segmentIndex: number, style: any) => {
      setSegmentStyles(prev => ({
        ...prev,
        [segmentIndex]: {
          ...prev[segmentIndex],
          ...style,
        },
      }));
    };

    const createEdgePanResponder = useCallback(
      (edge: 'left' | 'right') => {
        return PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: () => {
            setActiveHandle(edge);
          },
          onPanResponderMove: (_, gestureState) => {
            if (selectedSegmentIndex === null) return;

            const segment = segments[selectedSegmentIndex];
            const dx = gestureState.dx;
            const frameShift = Math.floor(dx / FRAME_WIDTH);
            const MIN_SEGMENT_WIDTH = FRAME_WIDTH; // Minimum 1 frame width

            if (edge === 'left') {
              const newStart = Math.max(
                0,
                Math.min(segment.end - 1, segment.start + frameShift),
              );
              const newWidth = (segment.end - newStart + 1) * FRAME_WIDTH;
              onSegmentAdjust?.(selectedSegmentIndex, newStart, segment.end);
              updateSegmentStyle(selectedSegmentIndex, {width: newWidth});
            } else {
              const newEnd = Math.max(
                segment.start + 1,
                Math.min(data.length - 1, segment.end + frameShift),
              );
              const newWidth = (newEnd - segment.start + 1) * FRAME_WIDTH;
              onSegmentAdjust?.(selectedSegmentIndex, segment.start, newEnd);
              updateSegmentStyle(selectedSegmentIndex, {width: newWidth});
            }
          },
          onPanResponderRelease: () => {
            setActiveHandle(null);
          },
        });
      },
      [selectedSegmentIndex, segments, data.length, onSegmentAdjust],
    );
    const leftHandlePanResponder = useMemo(
      () => createEdgePanResponder('left'),
      [createEdgePanResponder],
    );

    const rightHandlePanResponder = useMemo(
      () => createEdgePanResponder('right'),
      [createEdgePanResponder],
    );

    const renderHandle = useCallback(
      (position: 'left' | 'right', segment: any) => {
        const isActive = activeHandle === position;
        const panResponder =
          position === 'left'
            ? leftHandlePanResponder
            : rightHandlePanResponder;

        return (
          <View
            {...panResponder.panHandlers}
            style={[
              styles.trimHandle,
              position === 'left' ? styles.leftHandle : styles.rightHandle,
              isActive && styles.activeHandle,
              {zIndex: isActive ? 200 : 100},
            ]}>
            <View style={styles.handleGripContainer}>
              <View style={styles.gripLine} />
            </View>
          </View>
        );
      },
      [activeHandle, leftHandlePanResponder, rightHandlePanResponder],
    );

    const renderSegment = useCallback(
      (segment: any, segmentIndex: number) => {
        const segmentWidth = (segment.end - segment.start + 1) * FRAME_WIDTH;
        const isSelected = selectedSegmentIndex === segmentIndex;
        const baseWidth = (segment.end - segment.start + 1) * FRAME_WIDTH;
        const dynamicWidth = segmentStyles[segmentIndex]?.width ?? baseWidth;

        console.log(`
          Rendering Segment ${segmentIndex}:
          Start: ${segment.start}
          End: ${segment.end}
          Calculated Width: ${segmentWidth}
          Is Selected: ${isSelected}
        `);

        return (
          <TouchableOpacity
            key={segmentIndex}
            onPress={() => onSegmentSelect?.(segmentIndex)}
            style={[
              styles.segmentContainer,
              {
                width: dynamicWidth,
              },
              isSelected && styles.selectedSegment,
            ]}>
            {data
              .slice(segment.start, segment.end + 1)
              .map((frame, frameIndex) => (
                <View
                  key={frameIndex}
                  style={[styles.frameWrapper, {width: FRAME_WIDTH}]}>
                  <Image
                    source={{uri: `file://${frame.uri}`}}
                    style={[styles.frameImage, {width: FRAME_WIDTH}]}
                    resizeMode="cover"
                  />
                </View>
              ))}

            {isSelected && (
              <>
                {renderHandle('left', segment)}
                {renderHandle('right', segment)}
              </>
            )}

            <View
              style={[
                styles.segmentBorder,
                isSelected && styles.selectedSegmentBorder,
              ]}
            />
          </TouchableOpacity>
        );
      },
      [selectedSegmentIndex, data, renderHandle, onSegmentSelect],
    );

    useEffect(() => {
      console.log(`
        === Frame Bar State Update ===
        Selected Segment: ${selectedSegmentIndex}
        Active Handle: ${activeHandle}
        Total Segments: ${segments.length}
        Split Points: ${splitPoints.length}
        ==========================
      `);
    }, [selectedSegmentIndex, activeHandle, segments, splitPoints]);

    return (
      <View style={styles.framePicksContainer}>
        {segments.map((segment, index) => renderSegment(segment, index))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  activeHandle: {
    backgroundColor: '#E1E1E1',
    transform: [{scale: 1.1}],
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  framePicksContainer: {
    flexDirection: 'row',
    height: FRAME_BAR_HEIGHT,
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'visible',
    backgroundColor: 'black',
    borderColor: '#444',
    height: FRAME_BAR_HEIGHT,
    position: 'relative',
    flexGrow: 0,
    flexShrink: 1,
  },
  frameWrapper: {
    height: FRAME_BAR_HEIGHT,
    position: 'relative',
    flexGrow: 0,
    flexShrink: 0,
  },
  frameImage: {
    height: FRAME_BAR_HEIGHT,
    backgroundColor: '#333',
    flexGrow: 0,
    flexShrink: 0,
  },
  selectedSegment: {
    backgroundColor: '#3A3A3A',
    zIndex: 1,
  },
  segmentBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#a6a6a6',
    backgroundColor: 'transparent',
  },
  selectedSegmentBorder: {
    borderColor: 'white',
    borderWidth: 2.5,
  },
  trimHandle: {
    position: 'absolute',
    width: 16,
    height: FRAME_BAR_HEIGHT,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  leftHandle: {
    left: -HANDLE_WIDTH / 2,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  rightHandle: {
    right: -HANDLE_WIDTH / 2,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  handleGripContainer: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gripLine: {
    width: 2,
    height: 14,
    backgroundColor: 'black',
    borderRadius: 1,
    marginVertical: 2,
  },
  edgeHighlight: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: 3,
  },
  leftEdge: {
    right: 0,
  },
  rightEdge: {
    left: 0,
  },
  handleGrip: {
    width: 3,
    height: '50%',
    backgroundColor: '#007AFF',
    borderRadius: 1.5,
  },
  activeTrimHandle: {
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  },
  frameMarker: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
  },
  markerLine: {
    width: 1,
    height: 4,
    backgroundColor: '#007AFF',
  },
});

export default Frame_Bar;
