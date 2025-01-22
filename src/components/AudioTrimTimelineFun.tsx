import {FC} from 'react';
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
}

interface ThumbProps {
  side: 'left' | 'right';
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
        // transform: [{translateX: side === 'left' ? -10 : 10}],
        ...borderRadius,
      }}>
      <View style={{borderWidth: 1.2, height: 15, borderRadius: 5}} />
    </View>
  );
};

export const AUDIO_TRIM_SLIDER_HEIGHT = 50;
export const AUDIO_TRIM_SLIDER_PICK_HEIGHT = 50;
const THUMB_WIDTH = 3;
const FRAME_SNAP_THRESHOLD = 1;

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
  const {min, max, step, minPositionValue, maxPositionValue, maxSliderWidth} = options;
  
  // Round to nearest frame
  const minSliderValueNormalized = Math.round(minPositionValue / step) * step / maxSliderWidth;
  const maxSliderValueNormalized = Math.round(maxPositionValue / step) * step / maxSliderWidth;

  const stepsInRange = (max - min) / step;
  const minValue = min + Math.round(minSliderValueNormalized * stepsInRange) * step;
  const maxValue = min + Math.round(maxSliderValueNormalized * stepsInRange) * step;

  return {min: minValue, max: maxValue};
};

const AudioTrimTimelineFun: FC<Props> = ({
  sliderWidth,
  min,
  max,
  step,
  timestampEnd,
  timestampStart,
  renderRails,
  onChangeHandler,
}) => {
  const minPosition = useSharedValue(0);
  const maxPosition = useSharedValue(sliderWidth);

  const gestureHandlerMin = useAnimatedGestureHandler({
    onStart(evt, ctx: {startX: number}) {
      ctx.startX = minPosition.value;
    },
    onActive(evt, ctx) {
      const combinedPosition = ctx.startX + evt.translationX;
      const minClamp = 0;
      const maxClamp = maxPosition.value - 3; // Update to match thumb width

      // Snap to frames
      const frameSnap = Math.round(combinedPosition / step) * step;
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
    },
  });

  const gestureHandlerMax = useAnimatedGestureHandler({
    onStart(evt, ctx: {startX: number}) {
      ctx.startX = maxPosition.value;
    },
    onActive(evt, ctx) {
      const combinedPosition = ctx.startX + evt.translationX;
      const minClamp = minPosition.value + 3; // Update to match thumb width
      const maxClamp = sliderWidth;

      // Snap to frames
      const frameSnap = Math.round(combinedPosition / step) * step;
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
    },
  });

  const animatedStyleMin = useAnimatedStyle(() => {
    return {
      transform: [{translateX: minPosition.value}],
    };
  });

  const animatedStyleMax = useAnimatedStyle(() => {
    return {
      transform: [{translateX: maxPosition.value}],
    };
  });

  const sliderStyle = useAnimatedStyle(() => {
    return {
      width: maxPosition.value - minPosition.value,
      transform: [{translateX: minPosition.value}],
    };
  });

  const innerSliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{translateX: -minPosition.value}],
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.inactiveRailSlider, {width: sliderWidth}]}>
          {renderRails()}
        </View>

        <Animated.View style={[sliderStyle, styles.activeRailSlider]}>
          <Animated.View style={[innerSliderStyle, styles.trimmedArea]}>
            {renderRails()}
          </Animated.View>
        </Animated.View>

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
      </ScrollView>
      {/* <View style={styles.timestampContainer}>
        <Text style={styles.timestamps}>{timestampStart}</Text>
        <Text style={styles.timestamps}>{timestampEnd}</Text>
      </View> */}
    </GestureHandlerRootView>
  );
};

const THUMB_SIZE = 50;

const styles = StyleSheet.create({
  container: {flex: 1},
  inactiveRailSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: AUDIO_TRIM_SLIDER_HEIGHT,
    backgroundColor: '#DFEAFB',
    opacity: 0.3,
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
    backgroundColor: 'rgba(0, 0, 200, 0.2)',
    position: 'absolute',
    width: '50%',
    overflow: 'hidden',
    borderTopColor: 'white',
    borderTopWidth: 2,
    borderBottomColor: 'white',
    borderBottomWidth: 2,
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
