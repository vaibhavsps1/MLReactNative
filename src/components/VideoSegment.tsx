// // VideoSegment.tsx
// import React from 'react';
// import {View, StyleSheet, ScrollView} from 'react-native';
// import Animated, {
//   useAnimatedStyle,
//   useAnimatedGestureHandler,
//   runOnJS,
//   useSharedValue,
// } from 'react-native-reanimated';
// import {PanGestureHandler} from 'react-native-gesture-handler';
// import {Frame} from '../types';
// import {Image} from 'react-native-svg';

// interface Props {
//   frames: Frame[];
//   startIndex: number;
//   endIndex: number;
//   onUpdateBoundaries: (start: number, end: number) => void;
//   totalFrames: number;
// }

// interface DragHandlerProps {
//   segmentTimes: number[][]; // 2D array of start/end times
//   duration: number;
//   onSegmentUpdate: (index: number, start: number, end: number) => void;
// }

// const FRAME_WIDTH = 50;
// const FRAME_HEIGHT = 50;
// const HANDLE_WIDTH = 20;

// export const VideoSegment = ({
//   frames,
//   startIndex,
//   endIndex,
//   onUpdateBoundaries,
//   totalFrames,
// }: Props) => {
//   const leftHandle = useAnimatedGestureHandler({
//     onStart: (_, ctx: any) => {
//       ctx.startX = startIndex * FRAME_WIDTH;
//     },
//     onActive: (event, ctx) => {
//       const newPosition = Math.max(
//         0,
//         Math.min(ctx.startX + event.translationX, (endIndex - 1) * FRAME_WIDTH),
//       );
//       runOnJS(onUpdateBoundaries)(
//         Math.floor(newPosition / FRAME_WIDTH),
//         endIndex,
//       );
//     },
//   });

//   const DragHandlers = ({segmentTimes, duration, onSegmentUpdate}) => {
//     const handlers = segmentTimes.map((segment, index) => {
//       const [start, end] = segment;
//       const leftPos = useSharedValue(start);
//       const rightPos = useSharedValue(end);

//       const leftGesture = useAnimatedGestureHandler({
//         onStart: (_, ctx) => {
//           ctx.startX = leftPos.value;
//         },
//         onActive: (event, ctx) => {
//           const newPos = Math.max(
//             0,
//             Math.min(ctx.startX + event.translationX, rightPos.value - 1),
//           );
//           leftPos.value = newPos;
//         },
//         onEnd: () => {
//           runOnJS(onSegmentUpdate)(index, leftPos.value, rightPos.value);
//         },
//       });

//       const rightGesture = useAnimatedGestureHandler({
//         onStart: (_, ctx) => {
//           ctx.startX = rightPos.value;
//         },
//         onActive: (event, ctx) => {
//           const newPos = Math.max(
//             leftPos.value + 1,
//             Math.min(ctx.startX + event.translationX, duration),
//           );
//           rightPos.value = newPos;
//         },
//         onEnd: () => {
//           runOnJS(onSegmentUpdate)(index, leftPos.value, rightPos.value);
//         },
//       });

//       return (
//         <View key={index} style={styles.segmentContainer}>
//           <PanGestureHandler onGestureEvent={leftGesture}>
//             <Animated.View style={[styles.handle, styles.leftHandle]} />
//           </PanGestureHandler>

//           <PanGestureHandler onGestureEvent={rightGesture}>
//             <Animated.View style={[styles.handle, styles.rightHandle]} />
//           </PanGestureHandler>
//         </View>
//       );
//     });

//     return <>{handlers}</>;
//   };
// };

// const styles = StyleSheet.create({
//   handle: {
//     width: 20,
//     height: FRAME_HEIGHT,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   leftHandle: {
//     borderTopLeftRadius: 8,
//     borderBottomLeftRadius: 8,
//     left: 0,
//   },
//   rightHandle: {
//     borderTopRightRadius: 8,
//     borderBottomRightRadius: 8,
//     right: 0,
//   },
//   segmentContainer: {
//     position: 'relative',
//     height: FRAME_HEIGHT,
//   },
//   // segmentContainer: {
//   //   position: 'absolute',
//   //   height: FRAME_HEIGHT,
//   //   backgroundColor: '#2a2a2a',
//   //   borderRadius: 8,
//   //   overflow: 'hidden',
//   // },
//   framesScroll: {
//     flex: 1,
//   },
//   framesContainer: {
//     flexDirection: 'row',
//     height: '100%',
//   },
//   frameWrapper: {
//     width: FRAME_WIDTH,
//     height: FRAME_HEIGHT,
//   },
//   frame: {
//     width: '100%',
//     height: '100%',
//     backgroundColor: '#333',
//   },
//   // handle: {
//   //   position: 'absolute',
//   //   top: 0,
//   //   width: HANDLE_WIDTH,
//   //   height: '100%',
//   //   backgroundColor: 'rgba(0, 0, 0, 0.5)',
//   //   justifyContent: 'center',
//   //   alignItems: 'center',
//   // },
//   // leftHandle: {
//   //   left: 0,
//   //   borderTopLeftRadius: 8,
//   //   borderBottomLeftRadius: 8,
//   // },
//   // rightHandle: {
//   //   right: 0,
//   //   borderTopRightRadius: 8,
//   //   borderBottomRightRadius: 8,
//   // },
//   handleBar: {
//     width: 4,
//     height: '50%',
//     backgroundColor: '#fff',
//     borderRadius: 2,
//   },
// });

// // export default VideoSegment;

// VideoSegment.tsx
import React from 'react';
import {View, StyleSheet, Image} from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import {PanGestureHandler} from 'react-native-gesture-handler';
import {Frame} from '../types';

interface Props {
  frames: Frame[];
  startIndex: number;
  endIndex: number;
  onUpdateBoundaries: (start: number, end: number) => void;
  totalFrames: number;
}


const FRAME_WIDTH = 50;
const FRAME_HEIGHT = 50;
const HANDLE_WIDTH = 20;

const VideoSegment: React.FC<Props> = ({
  frames,
  startIndex,
  endIndex,
  onUpdateBoundaries,
  totalFrames,
}) => {
  const leftPos = useSharedValue(startIndex * FRAME_WIDTH);
  const rightPos = useSharedValue(endIndex * FRAME_WIDTH);

  const leftGesture = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = leftPos.value;
    },
    onActive: (event, ctx) => {
      const newPosition = Math.max(
        0,
        Math.min(ctx.startX + event.translationX, rightPos.value - FRAME_WIDTH),
      );
      leftPos.value = newPosition;
    },
    onEnd: () => {
      runOnJS(onUpdateBoundaries)(
        Math.floor(leftPos.value / FRAME_WIDTH),
        Math.floor(rightPos.value / FRAME_WIDTH),
      );
    },
  });

  const rightGesture = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = rightPos.value;
    },
    onActive: (event, ctx) => {
      const newPosition = Math.max(
        leftPos.value + FRAME_WIDTH,
        Math.min(ctx.startX + event.translationX, totalFrames * FRAME_WIDTH),
      );
      rightPos.value = newPosition;
    },
    onEnd: () => {
      runOnJS(onUpdateBoundaries)(
        Math.floor(leftPos.value / FRAME_WIDTH),
        Math.floor(rightPos.value / FRAME_WIDTH),
      );
    },
  });

  const leftHandleStyle = useAnimatedStyle(() => ({
    transform: [{translateX: leftPos.value}],
  }));

  const rightHandleStyle = useAnimatedStyle(() => ({
    transform: [{translateX: rightPos.value - HANDLE_WIDTH-5}],
  }));

  return (
    <View
      style={[styles.segment, {width: (endIndex - startIndex) * FRAME_WIDTH}]}>
      {frames.slice(startIndex, endIndex).map((frame, index) => (
        <View key={index} style={styles.frameWrapper}>
          <Image
            source={{uri: frame.uri}}
            style={styles.frame}
            resizeMode="cover"
          />
        </View>
      ))}

      <PanGestureHandler onGestureEvent={leftGesture}>
        <Animated.View
          style={[styles.handle, styles.leftHandle, leftHandleStyle]}>
          <View style={styles.handleBar} />
        </Animated.View>
      </PanGestureHandler>

      <PanGestureHandler onGestureEvent={rightGesture}>
        <Animated.View
          style={[styles.handle, styles.rightHandle, rightHandleStyle]}>
          <View style={styles.handleBar} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  segment: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#444',
    height: FRAME_HEIGHT,
  },
  frameWrapper: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  },
  frame: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_WIDTH,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  leftHandle: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  rightHandle: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  handleBar: {
    width: 4,
    height: '50%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
});

export default VideoSegment;
