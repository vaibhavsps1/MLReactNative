import React, {FC} from 'react';
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
import Icon from 'react-native-vector-icons/Entypo';

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

const Thumb: FC<{side: 'left' | 'right'}> = ({side}) => (
  <View
    style={[
      styles.thumbContainer,
      side === 'left' 
        ? styles.thumbLeft
        : styles.thumbRight
    ]}>
    <Icon 
      name={side === 'left' ? 'chevron-left' : 'chevron-right'} 
      size={24} 
      color="white" 
    />
  </View>
);

const calculateMinMaxValue = ({
  min,
  max,
  step,
  minPositionValue,
  maxPositionValue,
  maxSliderWidth,
}: {
  minPositionValue: number;
  maxPositionValue: number;
  maxSliderWidth: number;
  min: number;
  max: number;
  step: number;
}) => {
  'worklet';
  const minSliderValueNormalized = minPositionValue / maxSliderWidth;
  const maxSliderValueNormalized = maxPositionValue / maxSliderWidth;
  const stepsInRange = (max - min) / step;
  
  const minValue = min + Math.floor(minSliderValueNormalized * stepsInRange) * step;
  const maxValue = min + Math.floor(maxSliderValueNormalized * stepsInRange) * step;
  
  return {min: minValue, max: maxValue};
};

const VideoTrimTimelineFun: FC<Props> = ({
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
    onStart: (_, ctx: {startX: number}) => {
      ctx.startX = minPosition.value;
    },
    onActive: (event, ctx) => {
      const newPosition = ctx.startX + event.translationX;
      minPosition.value = Math.max(0, Math.min(newPosition, maxPosition.value - 50));
    },
    onEnd: () => {
      runOnJS(onChangeHandler)(
        calculateMinMaxValue({
          min,
          max,
          minPositionValue: minPosition.value,
          maxPositionValue: maxPosition.value,
          step,
          maxSliderWidth: sliderWidth,
        })
      );
    },
  });

  const gestureHandlerMax = useAnimatedGestureHandler({
    onStart: (_, ctx: {startX: number}) => {
      ctx.startX = maxPosition.value;
    },
    onActive: (event, ctx) => {
      const newPosition = ctx.startX + event.translationX;
      maxPosition.value = Math.max(minPosition.value + 50, Math.min(newPosition, sliderWidth));
    },
    onEnd: () => {
      runOnJS(onChangeHandler)(
        calculateMinMaxValue({
          min,
          max,
          minPositionValue: minPosition.value,
          maxPositionValue: maxPosition.value,
          step,
          maxSliderWidth: sliderWidth,
        })
      );
    },
  });

  const animatedStyleMin = useAnimatedStyle(() => ({
    transform: [{translateX: minPosition.value}],
  }));

  const animatedStyleMax = useAnimatedStyle(() => ({
    transform: [{translateX: maxPosition.value}],
  }));

  const sliderStyle = useAnimatedStyle(() => ({
    width: maxPosition.value - minPosition.value,
    transform: [{translateX: minPosition.value}],
  }));

  const innerSliderStyle = useAnimatedStyle(() => ({
    transform: [{translateX: -minPosition.value}],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.timelineContainer}>
          <View style={[styles.inactiveRailSlider, {width: sliderWidth}]}>
            {renderRails()}
          </View>

          <Animated.View style={[sliderStyle, styles.activeRailSlider]}>
            <Animated.View style={[innerSliderStyle, styles.trimmedArea]}>
              {renderRails()}
            </Animated.View>
          </Animated.View>

          <PanGestureHandler onGestureEvent={gestureHandlerMin}>
            <Animated.View style={[styles.thumbWrapper, animatedStyleMin]}>
              <Thumb side="left" />
            </Animated.View>
          </PanGestureHandler>

          <PanGestureHandler onGestureEvent={gestureHandlerMax}>
            <Animated.View style={[styles.thumbWrapper, animatedStyleMax]}>
              <Thumb side="right" />
            </Animated.View>
          </PanGestureHandler>
        </View>
      </ScrollView>
      
      <View style={styles.timestampContainer}>
        <Text style={styles.timestamp}>{timestampStart}</Text>
        <Text style={styles.timestamp}>{timestampEnd}</Text>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  timelineContainer: {
    height: 40,
    marginVertical: 10,
  },
  inactiveRailSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: '#DFEAFB',
    opacity: 0.3,
    position: 'absolute',
  },
  activeRailSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: 'rgba(0, 0, 200, 0.2)',
    position: 'absolute',
    overflow: 'hidden',
  },
  trimmedArea: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    position: 'absolute',
  },
  thumbWrapper: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbContainer: {
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    position: 'absolute',
  },
  thumbLeft: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    transform: [{translateX: -10}],
  },
  thumbRight: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    transform: [{translateX: 10}],
  },
  timestampContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: 5,
  },
  timestamp: {
    fontWeight: '600',
    color: 'black',
  },
});

export default VideoTrimTimelineFun;