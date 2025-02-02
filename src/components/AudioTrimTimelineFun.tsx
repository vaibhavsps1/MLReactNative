import React, {useCallback} from 'react';
import {FC, useRef} from 'react';
import {NativeScrollEvent, NativeSyntheticEvent} from 'react-native';
import {View, StyleSheet, ScrollView, Text} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface Props {
  min: number;
  max: number;
  step: number;
  timestampStart: string | number;
  timestampEnd: string | number;
  sliderWidth: number;
  renderRails(): JSX.Element;
  onChangeHandler(values: {min: number; max: number}): void;
  data: Frame[];
  isHandlesVisible?: boolean;
  isActive?: boolean;
  onActiveChange?: (active: boolean) => void;
}

interface Frame {
  uri: string;
}

interface ThumbProps {
  side: 'left' | 'right';
}

interface TimeRulerProps {
  index: number;
  totalFrames: number;
}

const Thumb = ({side}: ThumbProps) => {
  const borderRadius =
    side === 'left'
      ? {borderTopLeftRadius: 10, borderBottomLeftRadius: 10}
      : {borderTopRightRadius: 10, borderBottomRightRadius: 10};

  return (
    <View
      style={{
        backgroundColor: 'white',
        height: '100%',
        width: '40%',
        justifyContent: 'center',
        alignItems: 'center',
        ...borderRadius,
      }}>
      <View style={{borderWidth: 2, height: 15, borderRadius: 5}} />
    </View>
  );
};

export const AUDIO_TRIM_SLIDER_HEIGHT = 50;
export const AUDIO_TRIM_SLIDER_PICK_HEIGHT = 50;
const FRAME_WIDTH = 50;

type calculateMinMaxOptions = {
  minPositionValue: number;
  maxPositionValue: number;
  maxSliderWidth: number;
  min: number;
  max: number;
  step: number;
};

const calculateMinMaxValue = (options: calculateMinMaxOptions) => {
  'worklet';
  const {min, max, step, minPositionValue, maxPositionValue, maxSliderWidth} =
    options;
  const minSliderValueNormalized =
    (Math.round(minPositionValue / step) * step) / maxSliderWidth;
  const maxSliderValueNormalized =
    (Math.round(maxPositionValue / step) * step) / maxSliderWidth;
  const stepsInRange = (max - min) / step;
  const minValue =
    min + Math.round(minSliderValueNormalized * stepsInRange) * step;
  const maxValue =
    min + Math.round(maxSliderValueNormalized * stepsInRange) * step;
  return {min: minValue, max: maxValue};
};

const AudioTrimTimelineFun: FC<Props> = ({
  sliderWidth,
  min,
  max,
  step,
  renderRails,
  onChangeHandler,
  data,
  isHandlesVisible = true,
  timestampStart,
  timestampEnd,
  isActive = false,
  onActiveChange,
}) => {
  const minPosition = useSharedValue(0);
  const maxPosition = useSharedValue(sliderWidth);
  const mainScrollRef = useRef<ScrollView>(null);
  const rulerScrollRef = useRef<ScrollView>(null);
  const isMainScrolling = useRef(false);
  const isRulerScrolling = useRef(false);
  // Add shared values for animation
  const opacity = useSharedValue(1);
  const railScale = useSharedValue(1);

  // Add animated styles for inactive segments
  const inactiveRailStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{scaleY: railScale.value}],
    };
  });

  // Update sliderStyle to include visibility animation
  const sliderStyle = useAnimatedStyle(() => {
    return {
      width: maxPosition.value - minPosition.value,
      transform: [
        {translateX: minPosition.value},
        {scaleY: isActive ? 1 : railScale.value},
      ],
      opacity: isActive ? 1 : opacity.value,
    };
  });

  const handleFocusChange = useCallback(
    (focused: boolean) => {
      if (focused) {
        opacity.value = withSpring(1);
        railScale.value = withSpring(1);
      } else {
        opacity.value = withSpring(0.5);
        railScale.value = withSpring(0.8);
      }
      onActiveChange?.(focused);
    },
    [opacity, railScale, onActiveChange],
  );

  const handleMainScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isRulerScrolling.current && rulerScrollRef.current) {
      isMainScrolling.current = true;
      rulerScrollRef.current.scrollTo({
        x: event.nativeEvent.contentOffset.x,
        animated: false,
      });
      setTimeout(() => {
        isMainScrolling.current = false;
      }, 50);
    }
  };

  const handleRulerScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (!isMainScrolling.current && mainScrollRef.current) {
      isRulerScrolling.current = true;
      mainScrollRef.current.scrollTo({
        x: event.nativeEvent.contentOffset.x,
        animated: false,
      });
      setTimeout(() => {
        isRulerScrolling.current = false;
      }, 50);
    }
  };

  // const gestureHandlerMin = useAnimatedGestureHandler({
  //   onStart(evt, ctx: {startX: number}) {
  //     ctx.startX = minPosition.value;
  //   },
  //   onActive(evt, ctx) {
  //     const combinedPosition = ctx.startX + evt.translationX;
  //     const minClamp = 0;
  //     const maxClamp = maxPosition.value - 3; // Update to match thumb width

  //     // Snap to frames
  //     const frameSnap = Math.round(combinedPosition / step) * step;
  //     minPosition.value = Math.max(minClamp, Math.min(frameSnap, maxClamp));
  //   },
  //   onEnd() {
  //     const values = calculateMinMaxValue({
  //       min,
  //       max,
  //       minPositionValue: minPosition.value,
  //       maxPositionValue: maxPosition.value,
  //       step,
  //       maxSliderWidth: sliderWidth,
  //     });
  //     runOnJS(onChangeHandler)(values);
  //   },
  // });

  // const gestureHandlerMax = useAnimatedGestureHandler({
  //   onStart(evt, ctx: {startX: number}) {
  //     ctx.startX = maxPosition.value;
  //   },
  //   onActive(evt, ctx) {
  //     const combinedPosition = ctx.startX + evt.translationX;
  //     const minClamp = minPosition.value + 3;
  //     const maxClamp = sliderWidth;
  //     const frameSnap = Math.round(combinedPosition / step) * step;
  //     maxPosition.value = Math.max(minClamp, Math.min(frameSnap, maxClamp));
  //   },
  //   onEnd() {
  //     const values = calculateMinMaxValue({
  //       min,
  //       max,
  //       minPositionValue: minPosition.value,
  //       maxPositionValue: maxPosition.value,
  //       step,
  //       maxSliderWidth: sliderWidth,
  //     });
  //     runOnJS(onChangeHandler)(values);
  //   },
  // });

  // const gestureHandlerMin = useAnimatedGestureHandler({
  //   onStart(evt, ctx: {startX: number}) {
  //     ctx.startX = minPosition.value;
  //   },
  //   onActive(evt, ctx) {
  //     const combinedPosition = ctx.startX + evt.translationX;
  //     const frameSnap = Math.round(combinedPosition / step) * step;
  //     const minClamp = 0;
  //     const maxClamp = maxPosition.value - 3;

  //     minPosition.value = Math.max(minClamp, Math.min(frameSnap, maxClamp));
  //     runOnJS(logTrimState)(minPosition.value, maxPosition.value);
  //   },
  //   onEnd() {
  //     const values = calculateMinMaxValue({
  //       min,
  //       max,
  //       minPositionValue: minPosition.value,
  //       maxPositionValue: maxPosition.value,
  //       step,
  //       maxSliderWidth: sliderWidth,
  //     });
  //     runOnJS(onChangeHandler)(values);
  //     runOnJS(logTrimState)(minPosition.value, maxPosition.value);
  //   },
  // });

  // const gestureHandlerMax = useAnimatedGestureHandler({
  //   onStart(evt, ctx: {startX: number}) {
  //     ctx.startX = maxPosition.value;
  //   },
  //   onActive(evt, ctx) {
  //     const combinedPosition = ctx.startX + evt.translationX;
  //     const frameSnap = Math.round(combinedPosition / step) * step;
  //     const minClamp = minPosition.value + 3;
  //     const maxClamp = sliderWidth;

  //     maxPosition.value = Math.max(minClamp, Math.min(frameSnap, maxClamp));
  //     runOnJS(logTrimState)(minPosition.value, maxPosition.value);
  //   },
  //   onEnd() {
  //     const values = calculateMinMaxValue({
  //       min,
  //       max,
  //       minPositionValue: minPosition.value,
  //       maxPositionValue: maxPosition.value,
  //       step,
  //       maxSliderWidth: sliderWidth,
  //     });
  //     runOnJS(onChangeHandler)(values);
  //     runOnJS(logTrimState)(minPosition.value, maxPosition.value);
  //   },
  // });

  const animatedStyleMin = useAnimatedStyle(() => {
    return {
      transform: [{translateX: minPosition.value - 15}],
    };
  });

  const animatedStyleMax = useAnimatedStyle(() => {
    return {
      transform: [{translateX: maxPosition.value + 15}],
    };
  });

  // const sliderStyle = useAnimatedStyle(() => {
  //   return {
  //     width: maxPosition.value - minPosition.value,
  //     transform: [{translateX: minPosition.value}],
  //   };
  // });

  const innerSliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{translateX: -minPosition.value}],
    };
  });

  // Safe time formatting function
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }, []);

  // Helper function to calculate position in time
  const calculateTimePosition = useCallback(
    (position: number): number => {
      const segmentLength = Number(timestampEnd) - Number(timestampStart);
      return Number(timestampStart) + (position / sliderWidth) * segmentLength;
    },
    [timestampStart, timestampEnd, sliderWidth],
  );

  const logTrimState = useCallback(
    (leftPos: number, rightPos: number) => {
      const startTime = calculateTimePosition(leftPos);
      const endTime = calculateTimePosition(rightPos);
      const segmentStartTime = Number(timestampStart);
      const segmentEndTime = Number(timestampEnd);
      const startTrim = startTime - segmentStartTime;
      const endTrim = segmentEndTime - endTime;
      const activeDuration = endTime - startTime;
      const totalTrimmed = startTrim + endTrim;

      console.log(`
      📏 Trim State
      ============
      Full Segment:
      - Start: ${formatTime(segmentStartTime)}
      - End: ${formatTime(segmentEndTime)}
      - Duration: ${formatTime(segmentEndTime - segmentStartTime)}

      Active Region:
      - Start: ${formatTime(startTime)}
      - End: ${formatTime(endTime)}
      - Duration: ${formatTime(activeDuration)}

      Trimmed Portions:
      - Start Trim: ${formatTime(startTrim)}
      - End Trim: ${formatTime(endTrim)}
      - Total Trimmed: ${formatTime(totalTrimmed)}
    `);
    },
    [calculateTimePosition, formatTime, timestampStart, timestampEnd],
  );

  const gestureHandlerMin = useAnimatedGestureHandler({
    onStart(evt, ctx: {startX: number}) {
      ctx.startX = minPosition.value;
    },
    onActive(evt, ctx) {
      const combinedPosition = ctx.startX + evt.translationX;
      const frameSnap = Math.round(combinedPosition / step) * step;
      const minClamp = 0;
      const maxClamp = maxPosition.value - 3;
      minPosition.value = Math.max(minClamp, Math.min(frameSnap, maxClamp));
    },
    onEnd() {
      const values = calculateMinMaxValue({
        min,
        max,
        minPositionValue: minPosition.value,
        maxPositionValue: maxPosition.value,
        step,
        maxSliderWidth: sliderWidth,
      });
      runOnJS(onChangeHandler)(values);
      runOnJS(logTrimState)(minPosition.value, maxPosition.value);
    },
  });

  const gestureHandlerMax = useAnimatedGestureHandler({
    onStart(evt, ctx: {startX: number}) {
      ctx.startX = maxPosition.value;
    },
    onActive(evt, ctx) {
      const combinedPosition = ctx.startX + evt.translationX;
      const frameSnap = Math.round(combinedPosition / step) * step;
      const minClamp = minPosition.value + 3;
      const maxClamp = sliderWidth;
      maxPosition.value = Math.max(minClamp, Math.min(frameSnap, maxClamp));
    },
    onEnd() {
      const values = calculateMinMaxValue({
        min,
        max,
        minPositionValue: minPosition.value,
        maxPositionValue: maxPosition.value,
        step,
        maxSliderWidth: sliderWidth,
      });
      runOnJS(onChangeHandler)(values);
      runOnJS(logTrimState)(minPosition.value, maxPosition.value);
    },
  });

  const TimeRulerMark: React.FC<TimeRulerProps> = ({index}) => {
    const formatTimeForRuler = (seconds: number) => {
      return `${Math.floor(seconds / 60)}:${(seconds % 60)
        .toString()
        .padStart(2, '0')}`;
    };
    return (
      <View style={styles.timeRulerMark}>
        <Text style={styles.timeRulerText}>
          {formatTimeForRuler(Math.floor(index))}
        </Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        ref={mainScrollRef}
        onScroll={handleMainScroll}>
        <View style={[styles.inactiveRailSlider, {width: sliderWidth}]}>
          {renderRails()}
        </View>
        <Animated.View style={[sliderStyle, styles.activeRailSlider]}>
          <Animated.View style={[innerSliderStyle, styles.trimmedArea]}>
            {renderRails()}
          </Animated.View>
        </Animated.View>
        {isHandlesVisible && (
          <>
            <PanGestureHandler onGestureEvent={gestureHandlerMin}>
              <Animated.View style={[animatedStyleMin, styles.thumb]}>
                <Thumb side="left" />
              </Animated.View>
            </PanGestureHandler>
            <PanGestureHandler onGestureEvent={gestureHandlerMax}>
              <Animated.View style={[styles.thumb2, animatedStyleMax]}>
                <Thumb side="right" />
              </Animated.View>
            </PanGestureHandler>
          </>
        )}
      </ScrollView>
      <ScrollView
        ref={rulerScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleRulerScroll}
        scrollEventThrottle={16}
        style={styles.timeRulerScroll}>
        <View style={[styles.timeRulerContainer, {width: sliderWidth}]}>
          {data.map((_, index) => (
            <View style={styles.timeRulerContainer}>
              <TimeRulerMark
                key={index}
                index={index}
                totalFrames={data.length}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const THUMB_SIZE = 50;

const styles = StyleSheet.create({
  timeRulerScroll: {
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'pink',
  },
  timeRulerContainer: {
    flexDirection: 'row',
    height: 30,
  },
  container: {flex: 1, backgroundColor: 'red'},
  inactiveRailSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: AUDIO_TRIM_SLIDER_HEIGHT,
    backgroundColor: '#DFEAFB',
    opacity: 0.3,
  },
  timeRulerMark: {
    width: FRAME_WIDTH,
    height: 30,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  timeRulerText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
  trimmedArea: {
    flexDirection: 'row',
    alignItems: 'center',
    height: AUDIO_TRIM_SLIDER_HEIGHT,
    position: 'absolute',
  },
  activeRailSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: AUDIO_TRIM_SLIDER_HEIGHT,
    // backgroundColor: 'rgba(0, 0, 200, 0.2)',
    position: 'absolute',
    width: '50%',
    overflow: 'hidden',
  },
  thumb: {
    left: -0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb2: {
    left: -50,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timestampContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timestamps: {
    fontWeight: '600',
    color: 'white',
  },
});

export default AudioTrimTimelineFun;
