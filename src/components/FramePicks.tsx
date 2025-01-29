import React, {useState} from 'react';
import {StyleSheet, View, Image, TouchableOpacity, Text} from 'react-native';
import {VideoUtils} from '../services/VideoUtils';
import {
  PanGestureHandler,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';

interface Frame {
  uri: string;
}

interface SplitPoint {
  id: string;
  time: number;
  frameIndex: number;
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
const HANDLE_WIDTH = 20;

const LeftSegmentHandle = ({
  onDrag,
  minBound,
  maxBound,
}: {
  onDrag: (newPosition: number) => void;
  minBound: number;
  maxBound: number;
}) => {
  const translateX = useSharedValue(0);
  console.log('this is Active translateX', translateX);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
      console.log('this is start ctx', ctx);
    },
    onActive: (event, ctx) => {
      const newPosition = Math.max(
        minBound,
        Math.min(maxBound, ctx.startX + event.translationX),
      );
      translateX.value = newPosition;
      console.log('this is Active ctx', ctx);
      runOnJS(onDrag)(newPosition);
    },
    onEnd: () => {
      translateX.value = withSpring(translateX.value);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.handle, styles.leftHandle, animatedStyle]}>
        <View style={styles.handleBar} />
      </Animated.View>
    </PanGestureHandler>
  );
};

const RightSegmentHandle = ({
  segmentWidth,
  onDrag,
  minBound,
  maxBound,
}: {
  segmentWidth: number;
  onDrag: (newPosition: number) => void;
  minBound: number;
  maxBound: number;
}) => {
  // Initialize the handle at the right edge of the segment
  // We multiply by FRAME_WIDTH because segmentWidth is in number of frames
  const translateX = useSharedValue(segmentWidth);
  console.log('this is Active translateX', translateX);

  const panGesture = Gesture.Pan()
    .onStart((event, ctx: any) => {
      console.log('Active event:', event);
      // ctx.startX = translateX.value;
    })
    .onUpdate((event) => {
      console.log('Active event onUpdate:', event);
      const newPosition = Math.max(
        minBound * FRAME_WIDTH,
        Math.min(
          maxBound * FRAME_WIDTH - HANDLE_WIDTH,
          // ctx.startX + event.translationX,
        ),
      );

      // Snap to frame boundaries
      const frameSnap = Math.round(newPosition / FRAME_WIDTH) * FRAME_WIDTH;
      translateX.value = frameSnap;
      console.log('Snapped position:', frameSnap, newPosition);
      runOnJS(onDrag)(frameSnap);
    })
    .onEnd(() => {
      translateX.value = withSpring(translateX.value, {
        damping: 20,
        stiffness: 300,
      });
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.handle, styles.rightHandle,{transform: [{translateX}]}]}>
        <View style={styles.handleBar} />
      </Animated.View>
    </GestureDetector>
  );
};

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
    const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

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

    const handleSegmentPress = (
      segmentIndex: number,
      isFullTimeline: boolean,
    ) => {
      if (onSegmentSelect) {
        if (isFullTimeline && splitPoints.length === 0) {
          onSegmentSelect(segmentIndex);
        } else if (!isFullTimeline && splitPoints.length > 0) {
          onSegmentSelect(segmentIndex);
        }
      }
    };

    const handleDrag = (
      side: 'left' | 'right',
      segmentIndex: number,
      newPosition: number,
    ) => {
      if (!onSegmentAdjust) return;

      const segment = segments[segmentIndex];
      const frameIndex = Math.round(newPosition / FRAME_WIDTH);

      let newStartFrame = segment.start;
      let newEndFrame = segment.end;

      if (side === 'right') {
        const minFrame = segment.start + 1;
        const maxFrame =
          segmentIndex < segments.length - 1
            ? segments[segmentIndex + 1].start - 1
            : data.length - 1;

        newEndFrame = Math.max(minFrame, Math.min(maxFrame, frameIndex));

        console.log('Right handle drag:', {
          position: newPosition,
          frameIndex,
          minFrame,
          maxFrame,
          newEndFrame,
        });
      }

      onSegmentAdjust(segmentIndex, newStartFrame, newEndFrame);
    };

    const totalWidth = React.useMemo(() => {
      const baseWidth = data.length * FRAME_WIDTH;
      const gapsWidth =
        splitPoints.length > 0 ? splitPoints.length * SEGMENT_GAP : 0;
      const extraPadding = 50;
      return baseWidth + gapsWidth + extraPadding;
    }, [data.length, splitPoints.length]);

    return (
      <View style={[styles.framePicksContainer, {width: totalWidth}]}>
        {segments.map((segment, segmentIndex) => {
          const segmentWidth = (segment.end - segment.start + 1) * FRAME_WIDTH;
          console.log('Segment width:', segmentWidth, segment);
          return (
            <TouchableOpacity
              key={segmentIndex}
              onPress={() =>
                handleSegmentPress(segmentIndex, segment.isFullTimeline)
              }
              style={[
                styles.segmentContainer,
                {
                  marginRight:
                    segmentIndex < segments.length - 1 ? SEGMENT_GAP : 0,
                  width: segmentWidth,
                },
                selectedSegmentIndex === segmentIndex && styles.selectedSegment,
              ]}>
              {data
                .slice(segment.start, segment.end + 1)
                .map((frame, frameIndex) => (
                  <View key={frameIndex} style={styles.frameWrapper}>
                    <Image
                      source={{uri: `file://${frame.uri}`}}
                      style={[styles.frameImage]}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              {selectedSegmentIndex === segmentIndex &&
                !segment.isFullTimeline && (
                  <>
                    <LeftSegmentHandle
                      onDrag={newPosition =>
                        handleDrag('left', segmentIndex, newPosition)
                      }
                      minBound={0}
                      maxBound={segment.end * FRAME_WIDTH - HANDLE_WIDTH}
                    />
                    <RightSegmentHandle
                      segmentWidth={segmentWidth} // This gives us the width in number of frames
                      onDrag={newPosition =>
                        handleDrag('right', segmentIndex, newPosition)
                      }
                      minBound={segment.start} // Minimum bound is the start of the segment
                      maxBound={segmentWidth} // Maximum bound includes the end frame
                    />
                  </>
                )}
              <View
                style={[
                  styles.segmentBorder,
                  selectedSegmentIndex === segmentIndex &&
                    styles.selectedSegmentBorder,
                ]}
              />
            </TouchableOpacity>
          );
        })}
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
  handle: {
    position: 'absolute',
    width: HANDLE_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.96)',
    zIndex: 99, // Increased z-index
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
  leftHandle: {
    left: 0,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  rightHandle: {
    right: 0,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  handleBar: {
    width: 4,
    height: '50%',
    backgroundColor: '#fff',
    borderRadius: 2,
    zIndex: 99,
  },
});

export default FramePicks;
