// import React, {useState} from 'react';
// import {StyleSheet, View, Image, TouchableOpacity, Text} from 'react-native';
// import {VideoUtils} from '../services/VideoUtils';

// interface Frame {
//   uri: string;
// }

// interface SplitPoint {
//   id: string;
//   time: number;
//   frameIndex: number;
// }

// interface TimeRulerProps {
//   index: number;
//   duration: number;
//   totalFrames: number;
// }

// interface FramePicksProps {
//   data: Frame[];
//   splitPoints?: SplitPoint[];
//   onAddSplit?: (frameIndex: number) => void;
//   onRemoveSplit?: (id: string) => void;
//   formatTime?: (time: number) => string;
//   canSplit?: boolean;
//   isCropping?: boolean;
//   value?: {min: number; max: number};
//   duration?: number;
// }

// const FRAME_BAR_HEIGHT = 50;
// const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
// const SEGMENT_GAP = 7.5;

// const FramePicks: React.FC<FramePicksProps> = React.memo(
//   ({
//     data,
//     splitPoints = [],
//     onAddSplit,
//     onRemoveSplit,
//     canSplit = true,
//     isCropping = false,
//     value,
//     duration = 0,
//   }) => {
//     const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

//     const segments = React.useMemo(() => {
//       if (splitPoints.length === 0) {
//         return [{start: 0, end: data.length - 1}];
//       }
//       const points = [...splitPoints]
//         .sort((a, b) => a.frameIndex - b.frameIndex);
//       let segments = [];
//       let startIndex = 0;
//       for (let point of points) {
//         segments.push({
//           start: startIndex,
//           end: point.frameIndex - 1
//         });
//         startIndex = point.frameIndex;
//       }
//       segments.push({
//         start: startIndex,
//         end: data.length - 1
//       });
//       return segments;
//     }, [data.length, splitPoints]);

//     const handleFramePress = (index: number) => {
//       if (canSplit) {
//         setSelectedIndex(index === selectedIndex ? null : index);
//       } else {
//         const existingSplitPoint = splitPoints.find(
//           point => point.frameIndex === index,
//         );
//         if (existingSplitPoint) {
//           onRemoveSplit?.(existingSplitPoint.id);
//         } else {
//           onAddSplit?.(index);
//         }
//       }
//     };

//     const TimeRulerMark: React.FC<TimeRulerProps> = ({index}) => {
//       const formatTimeForRuler = (seconds: number) => {
//         return `${Math.floor(seconds / 60)}:${(seconds % 60)
//           .toString()
//           .padStart(2, '0')}`;
//       };
//       return (
//         <View style={styles.timeRulerMark}>
//           <Text style={styles.timeRulerText}>
//             {formatTimeForRuler(Math.floor(index))}
//           </Text>
//         </View>
//       );
//     };

//     return (
//       <View style={styles.framePicksContainer}>
//         {segments.map((segment, segmentIndex) => (
//           <View
//             key={segmentIndex}
//             style={[
//               styles.segmentContainer,
//               {
//                 marginRight: segmentIndex < segments.length - 1 ? SEGMENT_GAP : 0,
//                 width: (segment.end - segment.start + 1) * FRAME_WIDTH,
//               },
//             ]}>
//             {data.slice(segment.start, segment.end + 1).map((frame, frameIndex) => {
//               const absoluteIndex = segment.start + frameIndex;
//               return (
//                 <View key={frameIndex} style={styles.frameWrapper}>
//                   <Image
//                     source={{uri: `file://${frame.uri}`}}
//                     style={[
//                       styles.frameImage,
//                       absoluteIndex === selectedIndex && canSplit && styles.selectedFrame,
//                       splitPoints.some(point => point.frameIndex === absoluteIndex) &&
//                         !canSplit &&
//                         styles.disabledFrame,
//                       isCropping &&
//                         value &&
//                         (absoluteIndex < value.min || absoluteIndex > value.max) &&
//                         styles.inactiveOverlay,
//                     ]}
//                     resizeMode="cover"
//                   />
//                   <View style={styles.timeRulerContainer}>
//                     <TimeRulerMark
//                       index={absoluteIndex}
//                       duration={duration}
//                       totalFrames={data.length}
//                     />
//                   </View>
//                 </View>
//               );
//             })}
//             <View style={styles.segmentBorder} />
//           </View>
//         ))}
//       </View>
//     );
//   },
// );

// const styles = StyleSheet.create({
//   framePicksContainer: {
//     flexDirection: 'row',
//     height: FRAME_BAR_HEIGHT,
//     alignItems: 'center',
//   },
//   segmentContainer: {
//     flexDirection: 'row',
//     borderRadius: 8,
//     overflow: 'hidden',
//     backgroundColor: '#2A2A2A',
//     borderWidth: 2,
//     borderColor: '#444',
//     height: FRAME_BAR_HEIGHT,
//     position: 'relative',
//   },
//   segmentBorder: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     borderRadius: 8,
//     borderWidth: 2,
//     borderColor: '#444',
//     backgroundColor: 'transparent',
//     zIndex: 1,
//   },
//   frameWrapper: {
//     width: FRAME_WIDTH,
//     height: FRAME_BAR_HEIGHT,
//     position: 'relative',
//   },
//   frameImage: {
//     width: FRAME_WIDTH,
//     height: FRAME_BAR_HEIGHT,
//     backgroundColor: '#333',
//   },
//   selectedFrame: {
//     borderWidth: 2,
//     borderColor: '#fff',
//   },
//   disabledFrame: {
//     opacity: 0.5,
//   },
//   inactiveOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: '#151414',
//     opacity: 0.85,
//   },
//   splitMarker: {
//     position: 'absolute',
//     left: 0,
//     width: '100%',
//     height: '100%',
//     alignItems: 'center',
//     zIndex: 100,
//   },
//   markerLine: {
//     height: '100%',
//     width: 8, // Increased width
//     backgroundColor: '#ff4444',
//     position: 'relative',
//     borderRadius: 4,
//   },
//   marker: {
//     position: 'absolute',
//     top: 0,
//     left: -2,
//     width: 12, // Increased width
//     height: '100%',
//     backgroundColor: '#ff4444',
//     borderRadius: 6,
//   },
//   removeButton: {
//     position: 'absolute',
//     top: -25,
//     width: 24, // Increased size
//     height: 24, // Increased size
//     borderRadius: 12,
//     backgroundColor: '#ff4444',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 101,
//   },
//   removeText: {
//     color: '#fff',
//     fontSize: 14, // Increased size
//     fontWeight: 'bold',
//   },
//   markerTime: {
//     position: 'absolute',
//     bottom: -20,
//     color: '#fff',
//     fontSize: 12, // Increased size
//     width: 60,
//     textAlign: 'center',
//     marginLeft: -30,
//     fontWeight: '500',
//   },
//   timeRulerContainer: {
//     position: 'absolute',
//     top: FRAME_BAR_HEIGHT,
//     left: 0,
//     right: 0,
//     height: 30,
//     flexDirection: 'row',
//   },
//   timeRulerMark: {
//     width: FRAME_WIDTH,
//     height: 30,
//     alignItems: 'flex-start',
//   },
//   timeRulerText: {
//     color: 'white',
//     fontSize: 10,
//     marginTop: 10,
//     textAlign: 'center',
//   },
// });

// export default FramePicks;

// import React, {useState} from 'react';
// import {StyleSheet, View, Image, TouchableOpacity, Text} from 'react-native';
// import {VideoUtils} from '../services/VideoUtils';

// interface Frame {
//   uri: string;
// }

// interface SplitPoint {
//   id: string;
//   time: number;
//   frameIndex: number;
// }

// interface TimeRulerProps {
//   index: number;
//   duration: number;
//   totalFrames: number;
// }

// interface FramePicksProps {
//   data: Frame[];
//   splitPoints?: SplitPoint[];
//   onAddSplit?: (frameIndex: number) => void;
//   onRemoveSplit?: (id: string) => void;
//   formatTime?: (time: number) => string;
//   canSplit?: boolean;
//   isCropping?: boolean;
//   value?: {min: number; max: number};
//   duration?: number;
//   selectedSegmentIndex?: number | null;
//   onSegmentSelect?: (index: number) => void;
// }

// const FRAME_BAR_HEIGHT = 50;
// const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
// const SEGMENT_GAP = 7.5;

// const FramePicks: React.FC<FramePicksProps> = React.memo(
//   ({
//     data,
//     splitPoints = [],
//     onAddSplit,
//     onRemoveSplit,
//     canSplit = true,
//     isCropping = false,
//     value,
//     duration = 0,
//     selectedSegmentIndex = null,
//     onSegmentSelect,
//   }) => {
//     const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

//     const segments = React.useMemo(() => {
//       // If there are no split points, return a single segment for the entire timeline
//       if (splitPoints.length === 0) {
//         return [{
//           start: 0,
//           end: data.length - 1,
//           isFullTimeline: true
//         }];
//       }

//       // If there are split points, create multiple segments
//       const points = [...splitPoints].sort((a, b) => a.frameIndex - b.frameIndex);
//       let segments = [];
//       let startIndex = 0;

//       for (let point of points) {
//         segments.push({
//           start: startIndex,
//           end: point.frameIndex - 1,
//           isFullTimeline: false
//         });
//         startIndex = point.frameIndex;
//       }
//       segments.push({
//         start: startIndex,
//         end: data.length - 1,
//         isFullTimeline: false
//       });
//       return segments;
//     }, [data.length, splitPoints]);

//     const handleSegmentPress = (segmentIndex: number, isFullTimeline: boolean) => {
//       if (onSegmentSelect) {
//         // If it's the full timeline, only allow selection if there are no split points
//         if (isFullTimeline && splitPoints.length === 0) {
//           onSegmentSelect(segmentIndex);
//         }
//         // If there are split points, only allow selection of individual segments
//         else if (!isFullTimeline && splitPoints.length > 0) {
//           onSegmentSelect(segmentIndex);
//         }
//       }
//     };

//     const handleFramePress = (index: number) => {
//       if (canSplit) {
//         setSelectedIndex(index === selectedIndex ? null : index);
//       } else {
//         const existingSplitPoint = splitPoints.find(
//           point => point.frameIndex === index,
//         );
//         if (existingSplitPoint) {
//           onRemoveSplit?.(existingSplitPoint.id);
//         } else {
//           onAddSplit?.(index);
//         }
//       }
//     };

//     return (
//       <View style={styles.framePicksContainer}>
//         {segments.map((segment, segmentIndex) => (
//           <TouchableOpacity
//             key={segmentIndex}
//             onPress={() => handleSegmentPress(segmentIndex, segment.isFullTimeline)}
//             style={[
//               styles.segmentContainer,
//               {
//                 marginRight: segmentIndex < segments.length - 1 ? SEGMENT_GAP : 0,
//                 width: (segment.end - segment.start + 1) * FRAME_WIDTH,
//               },
//               selectedSegmentIndex === segmentIndex && styles.selectedSegment,
//             ]}>
//             {data.slice(segment.start, segment.end + 1).map((frame, frameIndex) => {
//               const absoluteIndex = segment.start + frameIndex;
//               return (
//                 <View key={frameIndex} style={styles.frameWrapper}>
//                   <Image
//                     source={{uri: `file://${frame.uri}`}}
//                     style={[
//                       styles.frameImage,
//                       absoluteIndex === selectedIndex && canSplit && styles.selectedFrame,
//                       splitPoints.some(point => point.frameIndex === absoluteIndex) &&
//                         !canSplit &&
//                         styles.disabledFrame,
//                       isCropping &&
//                         value &&
//                         (absoluteIndex < value.min || absoluteIndex > value.max) &&
//                         styles.inactiveOverlay,
//                     ]}
//                     resizeMode="cover"
//                   />
//                 </View>
//               );
//             })}
//             <View
//               style={[
//                 styles.segmentBorder,
//                 selectedSegmentIndex === segmentIndex && styles.selectedSegmentBorder,
//               ]}
//             />
//           </TouchableOpacity>
//         ))}
//       </View>
//     );
//   },
// );

// const styles = StyleSheet.create({
//   framePicksContainer: {
//     flexDirection: 'row',
//     height: FRAME_BAR_HEIGHT,
//     alignItems: 'center',
//   },
//   segmentContainer: {
//     flexDirection: 'row',
//     borderRadius: 8,
//     overflow: 'hidden',
//     backgroundColor: '#2A2A2A',
//     borderWidth: 2,
//     borderColor: '#444',
//     height: FRAME_BAR_HEIGHT,
//     position: 'relative',
//   },
//   selectedSegment: {
//     backgroundColor: '#3A3A3A',
//   },
//   segmentBorder: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     borderRadius: 8,
//     borderWidth: 2,
//     borderColor: '#444',
//     backgroundColor: 'transparent',
//     zIndex: 1,
//   },
//   selectedSegmentBorder: {
//     borderColor: '#007AFF',
//     borderWidth: 3,
//   },
//   frameWrapper: {
//     width: FRAME_WIDTH,
//     height: FRAME_BAR_HEIGHT,
//     position: 'relative',
//   },
//   frameImage: {
//     width: FRAME_WIDTH,
//     height: FRAME_BAR_HEIGHT,
//     backgroundColor: '#333',
//   },
//   selectedFrame: {
//     borderWidth: 2,
//     borderColor: '#fff',
//   },
//   disabledFrame: {
//     opacity: 0.5,
//   },
//   inactiveOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: '#151414',
//     opacity: 0.85,
//   },
// });

// export default FramePicks;

import React, {useState} from 'react';
import {StyleSheet, View, Image, TouchableOpacity, Text} from 'react-native';
import {VideoUtils} from '../services/VideoUtils';
import {PanGestureHandler} from 'react-native-gesture-handler';
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

// const SegmentHandle = ({
//   position,
//   onDrag,
//   side,
//   minBound,
//   maxBound,
// }: {
//   position: number;
//   onDrag: (newPosition: number) => void;
//   side: 'left' | 'right';
//   minBound: number;
//   maxBound: number;
// }) => {
//   const translateX = useSharedValue(position);

//   const gestureHandler = useAnimatedGestureHandler({
//     onStart: (_, ctx: any) => {
//       ctx.startX = translateX.value;
//     },
//     onActive: (event, ctx) => {
//       const newPosition = Math.max(
//         minBound,
//         Math.min(maxBound, ctx.startX + event.translationX),
//       );
//       translateX.value = newPosition;
//       runOnJS(onDrag)(newPosition);
//     },
//     onEnd: () => {
//       translateX.value = withSpring(translateX.value);
//     },
//   });

//   const animatedStyle = useAnimatedStyle(() => ({
//     transform: [{translateX: translateX.value}],
//   }));

//   return (
//     <PanGestureHandler onGestureEvent={gestureHandler}>
//       <Animated.View
//         style={[
//           styles.handle,
//           side === 'left' ? styles.leftHandle : styles.rightHandle,
//           animatedStyle,
//         ]}>
//         <View style={styles.handleBar} />
//       </Animated.View>
//     </PanGestureHandler>
//   );
// };

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

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      const newPosition = Math.max(
        minBound,
        Math.min(maxBound, ctx.startX + event.translationX),
      );
      translateX.value = newPosition;
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
  const translateX = useSharedValue(segmentWidth / 50);
  console.log('segmentWidth:', translateX);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      // Ensure the handle stays within the segment bounds
      const newPosition = Math.max(
        minBound,
        Math.min(maxBound - HANDLE_WIDTH, ctx.startX + event.translationX),
      );
      translateX.value = newPosition;
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
      <Animated.View style={[styles.handle, styles.rightHandle, animatedStyle]}>
        <View style={styles.handleBar} />
      </Animated.View>
    </PanGestureHandler>
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
    // const segments = React.useMemo(() => {
    //   if (splitPoints.length === 0) {
    //     return [
    //       {
    //         start: 0,
    //         end: data.length - 1,
    //         isFullTimeline: true,
    //       },
    //     ];
    //   }

    //   const points = [...splitPoints].sort(
    //     (a, b) => a.frameIndex - b.frameIndex,
    //   );
    //   let segments = [];
    //   let startIndex = 0;

    //   for (let point of points) {
    //     segments.push({
    //       start: startIndex,
    //       end: point.frameIndex - 1,
    //       isFullTimeline: false,
    //     });
    //     startIndex = point.frameIndex;
    //   }
    //   segments.push({
    //     start: startIndex,
    //     end: data.length - 1,
    //     isFullTimeline: false,
    //   });
    //   return segments;
    // }, [data.length, splitPoints]);

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

    // const handleDrag = (
    //   side: 'left' | 'right',
    //   segmentIndex: number,
    //   newPosition: number,
    // ) => {
    //   if (!onSegmentAdjust) return;

    //   const segment = segments[segmentIndex];
    //   const frameIndex = Math.round(newPosition / FRAME_WIDTH);

    //   let newStartFrame = segment.start;
    //   let newEndFrame = segment.end;

    //   if (side === 'left') {
    //     // Calculate bounds for left handle
    //     const minFrame =
    //       segmentIndex > 0 ? segments[segmentIndex - 1].end + 1 : 0;
    //     const maxFrame = segment.end - 1; // Prevent overlap with right side
    //     newStartFrame = Math.max(minFrame, Math.min(maxFrame, frameIndex));
    //   } else {
    //     // Calculate bounds for right handle
    //     const minFrame = segment.start + 1; // Prevent overlap with left side
    //     const maxFrame =
    //       segmentIndex < segments.length - 1
    //         ? segments[segmentIndex + 1].start - 1
    //         : data.length - 1;
    //     newEndFrame = Math.max(minFrame, Math.min(maxFrame, frameIndex));
    //   }

    //   onSegmentAdjust(segmentIndex, newStartFrame, newEndFrame);
    // };

    // const handleDrag = (
    //   side: 'left' | 'right',
    //   segmentIndex: number,
    //   newPosition: number,
    // ) => {
    //   if (!onSegmentAdjust) return;

    //   const segment = segments[segmentIndex];
    //   const frameIndex = Math.floor(newPosition / FRAME_WIDTH);

    //   let newStartFrame = segment.start;
    //   let newEndFrame = segment.end;

    //   if (side === 'left') {
    //     // Calculate bounds for left handle
    //     const minFrame =
    //       segmentIndex > 0 ? segments[segmentIndex - 1].end + 1 : 0;
    //     const maxFrame = segment.end - 1;
    //     newStartFrame = Math.max(minFrame, Math.min(maxFrame, frameIndex));
    //   }
    //   if (side === 'right') {
    //     // Calculate bounds for right handle
    //     const minFrame = segment.start + 1;
    //     const maxFrame =
    //       segmentIndex < segments.length - 1
    //         ? segments[segmentIndex + 1].start - 1
    //         : data.length - 1;
    //     newEndFrame = Math.max(minFrame, Math.min(maxFrame, frameIndex));
    //     console.log('Right handle drag:', {
    //       minFrame,
    //       maxFrame,
    //       frameIndex,
    //       newEndFrame,
    //     });
    //   }

    //   // Add logging to debug segment calculations
    //   console.log('Drag details:', {
    //     side,
    //     segmentIndex,
    //     newPosition,
    //     frameIndex,
    //     segmentStart: segment.start,
    //     segmentEnd: segment.end,
    //     newStartFrame,
    //     newEndFrame,
    //     totalFrames: data.length,
    //   });

    //   onSegmentAdjust(segmentIndex, newStartFrame, newEndFrame);
    // };

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

    // const calculateRightHandlePosition = (
    //   segment: any,
    //   segmentIndex: number,
    // ) => {
    //   const basePosition = segment.end;
    //   const gapOffset = segmentIndex * SEGMENT_GAP;
    //   return basePosition - SEGMENT_GAP;
    // };

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
                      maxBound={segment.end*FRAME_WIDTH - HANDLE_WIDTH}
                    />
                    <RightSegmentHandle
                      segmentWidth={segment.end*FRAME_WIDTH}
                      onDrag={newPosition =>
                        handleDrag('right', segmentIndex, newPosition)
                      }
                      minBound={0}
                      maxBound={segmentWidth / FRAME_WIDTH}
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
