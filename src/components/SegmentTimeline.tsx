import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Animated} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import VideoSegment from './VideoSegment';
import {Frame} from '../types';
import {
  runOnJS,
  useAnimatedGestureHandler,
  useSharedValue,
} from 'react-native-reanimated';

interface Props {
  frames: Frame[];
  splitPoints: {time: number; frameIndex: number}[];
  onUpdateSegment: (
    index: number,
    startFrame: number,
    endFrame: number,
  ) => void;
  duration?: number;
}

interface DragHandlerProps {
  segmentTimes: number[][]; // 2D array of start/end times
  duration: number;
  onSegmentUpdate: (index: number, start: number, end: number) => void;
}

export const SegmentTimeline: React.FC<Props> = ({
  frames,
  splitPoints,
  onUpdateSegment,
  duration,
}) => {
  const [segmentTimes, setSegmentTimes] = useState<any>();
  const segments = React.useMemo(() => {
    const points = [...splitPoints].sort((a, b) => a.frameIndex - b.frameIndex);
    console.log('this is frames007', frames);
    return points.reduce((acc, point, index, array) => {
      const startIndex = index === 0 ? 0 : array[index - 1].frameIndex;
      const endIndex = point.frameIndex;
      if (endIndex > startIndex) {
        acc.push({
          startIndex,
          endIndex,
        });
      }
      if (index === array.length - 1 && endIndex < frames.length) {
        acc.push({
          startIndex: endIndex,
          endIndex: frames.length,
        });
      }
      return acc;
    }, [] as {startIndex: number; endIndex: number}[]);
  }, [frames.length, splitPoints]);

  const handleSegmentUpdate = (index: number, start: number, end: number) => {
    const newSegmentTimes = [...segmentTimes];
    newSegmentTimes[index] = [start, end];
    console.log('this is segment', newSegmentTimes);
    setSegmentTimes(newSegmentTimes);
  };

  const DragHandlers = ({segmentTimes, duration, onSegmentUpdate}:any) => {
    const handlers = segmentTimes.map((segment, index) => {
      const [start, end] = segment;
      const leftPos = useSharedValue(start);
      const rightPos = useSharedValue(end);

      const leftGesture = useAnimatedGestureHandler({
        onStart: (_, ctx) => {
          ctx.startX = leftPos.value;
        },
        onActive: (event, ctx) => {
          const newPos = Math.max(
            0,
            Math.min(ctx.startX + event.translationX, rightPos.value - 1),
          );
          leftPos.value = newPos;
        },
        onEnd: () => {
          runOnJS(onSegmentUpdate)(index, leftPos.value, rightPos.value);
        },
      });

      const rightGesture = useAnimatedGestureHandler({
        onStart: (_, ctx) => {
          ctx.startX = rightPos.value;
        },
        onActive: (event, ctx) => {
          const newPos = Math.max(
            leftPos.value + 1,
            Math.min(ctx.startX + event.translationX, duration),
          );
          rightPos.value = newPos;
        },
        onEnd: () => {
          runOnJS(onSegmentUpdate)(index, leftPos.value, rightPos.value);
        },
      });

      return (
        <View key={index} style={styles.segmentContainer}>
          <PanGestureHandler onGestureEvent={leftGesture}>
            <Animated.View style={[styles.handle, styles.leftHandle]} />
          </PanGestureHandler>
          <PanGestureHandler onGestureEvent={rightGesture}>
            <Animated.View style={[styles.handle, styles.rightHandle]} />
          </PanGestureHandler>
        </View>
      );
    });

    return <>{handlers}</>;
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}>
        <View style={styles.timeline}>
          {segments.map((segment, index) => (
            <VideoSegment
              key={index}
              frames={frames}
              startIndex={segment.startIndex}
              endIndex={segment.endIndex}
              totalFrames={frames.length}
              onUpdateBoundaries={(start, end) => {
                onUpdateSegment(index, start, end);
              }}
            />
          ))}
        </View>
        <DragHandlers
          segmentTimes={segmentTimes}
          duration={duration}
          onSegmentUpdate={handleSegmentUpdate}
        />
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  handle: {
    width: 20,
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',

  },
  leftHandle: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    left: -10,
  },
  rightHandle: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    right: 0,
  },
  segmentContainer: {
    position: 'relative',
    height: 50,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  timeline: {
    height: 50,
    position: 'relative',
    marginVertical: 20,
  },
});

export default SegmentTimeline;
