// SegmentSlider.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';

interface SegmentSliderProps {
  startFrame: number;
  endFrame: number;
  isActive: boolean;
  onUpdateSegment: (start: number, end: number) => void;
  currentFrame: number;
  frameWidth: number;
}

const HANDLE_WIDTH = 10;

const SegmentSlider: React.FC<SegmentSliderProps> = ({
  startFrame,
  endFrame,
  isActive,
  onUpdateSegment,
  frameWidth,
}) => {
  const leftPosition = useSharedValue(startFrame * frameWidth);
  const rightPosition = useSharedValue(endFrame * frameWidth);

  const leftHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = leftPosition.value;
    },
    onActive: (event, ctx) => {
      const newPosition = Math.max(
        startFrame * frameWidth,
        Math.min(ctx.startX + event.translationX, rightPosition.value - HANDLE_WIDTH)
      );
      leftPosition.value = newPosition;
    },
    onEnd: () => {
      runOnJS(onUpdateSegment)(
        Math.floor(leftPosition.value / frameWidth),
        Math.floor(rightPosition.value / frameWidth)
      );
    },
  });

  const rightHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = rightPosition.value;
    },
    onActive: (event, ctx) => {
      const newPosition = Math.max(
        leftPosition.value + HANDLE_WIDTH,
        Math.min(ctx.startX + event.translationX, endFrame * frameWidth)
      );
      rightPosition.value = newPosition;
    },
    onEnd: () => {
      runOnJS(onUpdateSegment)(
        Math.floor(leftPosition.value / frameWidth),
        Math.floor(rightPosition.value / frameWidth)
      );
    },
  });

  const leftHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftPosition.value }],
  }));

  const rightHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightPosition.value }],
  }));

  const selectedAreaStyle = useAnimatedStyle(() => ({
    left: leftPosition.value,
    width: rightPosition.value - leftPosition.value,
  }));

  if (!isActive) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.selectedArea, selectedAreaStyle]} />
      
      <PanGestureHandler onGestureEvent={leftHandler}>
        <Animated.View style={[styles.handle, styles.leftHandle, leftHandleStyle]}>
          <View style={styles.handleBar} />
        </Animated.View>
      </PanGestureHandler>

      <PanGestureHandler onGestureEvent={rightHandler}>
        <Animated.View style={[styles.handle, styles.rightHandle, rightHandleStyle]}>
          <View style={styles.handleBar} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  selectedArea: {
    position: 'absolute',
    height: '100%',
    borderWidth: 2,
    borderColor: '#4A90E2',
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  leftHandle: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  rightHandle: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  handleBar: {
    width: 4,
    height: '50%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});

export default SegmentSlider;