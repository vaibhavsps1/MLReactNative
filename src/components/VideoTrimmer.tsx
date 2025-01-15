// VideoTrimmer.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  PanResponder,
  Animated,
  Text,
} from 'react-native';
import Video from 'react-native-video';

interface Frame {
  uri: string;
  status: string;
}

interface VideoTrimmerProps {
  frames: Frame[];
  videoDuration: number;
  videoUri: string;
  onLoad: (data: { duration: number }) => void;
  onTrimChanged: (startTime: number, endTime: number) => void;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({
  frames,
  videoDuration,
  videoUri,
  onLoad,
  onTrimChanged,
}) => {
  const [trimmerWidth, setTrimmerWidth] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const leftHandlePos = useRef(new Animated.Value(0)).current;
  const rightHandlePos = useRef(new Animated.Value(0)).current;
  const frameWidth = 50; // Should match VideoUtils.FRAME_WIDTH

  useEffect(() => {
    if (trimmerWidth > 0) {
      rightHandlePos.setValue(trimmerWidth);
    }
  }, [trimmerWidth]);

  const createPanResponder = (isLeft: boolean) => {
    const handlePos = isLeft ? leftHandlePos : rightHandlePos;
    const otherHandlePos = isLeft ? rightHandlePos : leftHandlePos;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newPos = gestureState.moveX;
        const otherPos = otherHandlePos._value;

        if (
          (isLeft && newPos < otherPos && newPos >= 0) ||
          (!isLeft && newPos > otherPos && newPos <= trimmerWidth)
        ) {
          handlePos.setValue(newPos);
          updateTrimTimes(isLeft ? newPos : otherPos, isLeft ? otherPos : newPos);
        }
      },
    });
  };

  const leftPanResponder = createPanResponder(true);
  const rightPanResponder = createPanResponder(false);

  const updateTrimTimes = (left: number, right: number) => {
    const startTime = (left / trimmerWidth) * videoDuration;
    const endTime = (right / trimmerWidth) * videoDuration;
    onTrimChanged(startTime, endTime);
  };

  return (
    <View style={styles.container}>
      {videoUri ? (
        <Video
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode="contain"
          onLoad={(data) => onLoad({ duration: data.duration })}
          paused={true}
        />
      ) : null}
      <View
        style={styles.trimmerContainer}
        onLayout={(event) => setTrimmerWidth(event.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          style={styles.framesContainer}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.framesRow}>
            {frames.map((frame, index) => (
              <Image
                key={index}
                source={{ uri: frame.uri }}
                style={[styles.frame, { width: frameWidth }]}
                resizeMode="cover"
              />
            ))}
          </View>
        </ScrollView>
        <Animated.View
          style={[
            styles.handle,
            styles.leftHandle,
            { transform: [{ translateX: leftHandlePos }] },
          ]}
          {...leftPanResponder.panHandlers}
        />
        <Animated.View
          style={[
            styles.handle,
            styles.rightHandle,
            { transform: [{ translateX: rightHandlePos }] },
          ]}
          {...rightPanResponder.panHandlers}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  trimmerContainer: {
    height: 70,
    marginTop: 20,
  },
  framesContainer: {
    height: 60,
    backgroundColor: '#222',
  },
  framesRow: {
    flexDirection: 'row',
    height: '100%',
  },
  frame: {
    height: '100%',
    marginHorizontal: 1,
  },
  handle: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftHandle: {
    left: 0,
  },
  rightHandle: {
    right: 0,
  },
});