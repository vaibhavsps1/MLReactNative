// import React, {useState, useCallback, useEffect} from 'react';
// import {
//   StyleSheet,
//   View,
//   Image,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';
// import {VideoUtils} from '../services/VideoUtils';
// import AudioTrimTimelineFun from './AudioTrimTimelineFun';
// import {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   withTiming,
// } from 'react-native-reanimated';

// interface Frame {
//   uri: string;
// }

// interface SplitPoint {
//   id: string;
//   time: number;
//   frameIndex: number;
// }

// // Add new interfaces for segment tracking
// interface SegmentState {
//   originalStart: number;
//   originalEnd: number;
//   currentStart: number;
//   currentEnd: number;
//   lastModified: number;
// }

// interface SegmentHistory {
//   [key: number]: SegmentState;
// }

// interface SegmentState {
//   originalStart: number;
//   originalEnd: number;
//   currentStart: number;
//   currentEnd: number;
//   lastModified: number;
// }

// // interface FramePicksProps {
// //   data: Frame[];
// //   splitPoints?: SplitPoint[];
// //   onAddSplit?: (frameIndex: number) => void;
// //   onRemoveSplit?: (id: string) => void;
// //   formatTime?: (time: number) => string;
// //   canSplit?: boolean;
// //   isCropping?: boolean;
// //   value?: {min: number; max: number};
// //   duration?: number;
// //   selectedSegmentIndex?: number | null;
// //   onSegmentSelect?: (index: number) => void;
// //   onSegmentAdjust?: (
// //     segmentIndex: number,
// //     newStartFrame: number,
// //     newEndFrame: number,
// //   ) => void;
// //   isMainHandleVisible?: boolean;
// //   isCompressed: boolean;
// //   onCompress?: () => void;
// //   onExpand?: () => void;
// // }

// interface FramePicksProps {
//   data: Frame[];
//   splitPoints?: SplitPoint[];
//   onRemoveSplit?: (id: string) => void;
//   formatTime?: (time: number) => string;
//   isCropping?: boolean;
//   value?: {min: number; max: number};
//   duration?: number;
//   selectedSegmentIndex?: number | null;
//   onSegmentSelect?: (index: number) => void;
//   onSegmentAdjust?: (
//     segmentIndex: number,
//     newStartFrame: number,
//     newEndFrame: number,
//   ) => void;
//   isMainHandleVisible?: boolean;
// }

// const FRAME_BAR_HEIGHT = 50;
// const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
// const SEGMENT_GAP = 2;
// const SCREEN_WIDTH = Dimensions.get('screen').width;

// const FramePicks: React.FC<FramePicksProps> = React.memo(
//   ({
//     data,
//     splitPoints = [],
//     isCompressed,
//     onAddSplit,
//     onRemoveSplit,
//     canSplit = true,
//     isCropping = false,
//     value,
//     duration = 0,
//     selectedSegmentIndex,
//     onSegmentSelect,
//     onSegmentAdjust,
//     isMainHandleVisible = true,
//   }) => {
//     const [segmentHistory, setSegmentHistory] = useState<SegmentHistory>({});
//     const compressedWidth = useSharedValue(SCREEN_WIDTH);
//     const inactiveOpacity = useSharedValue(1);

//     const segmentStyle = useAnimatedStyle(() => {
//       return {
//         width: isCompressed
//           ? withSpring(compressedWidth.value)
//           : withSpring(totalWidth),
//         opacity: 1,
//       };
//     });

//     const inactiveStyle = useAnimatedStyle(() => {
//       return {
//         opacity: withTiming(isCompressed ? 0 : 1, {duration: 300}),
//         height: withSpring(isCompressed ? 0 : FRAME_BAR_HEIGHT),
//       };
//     });

//     // Add a segment initialization effect
//     useEffect(() => {
//       if (
//         selectedSegmentIndex !== null &&
//         !segmentHistory[selectedSegmentIndex]
//       ) {
//         // Initialize history for newly selected segments
//         const segment = segments[selectedSegmentIndex];
//         setSegmentHistory(prev => ({
//           ...prev,
//           [selectedSegmentIndex]: {
//             originalStart: segment.start,
//             originalEnd: segment.end,
//             currentStart: segment.start,
//             currentEnd: segment.end,
//             lastModified: Date.now(),
//           },
//         }));
//       }
//     }, [selectedSegmentIndex, segments]);

//     const frameToTimestamp = useCallback(
//       (frameIndex: number) => {
//         return (frameIndex / data.length) * duration;
//       },
//       [data.length, duration],
//     );

//     const formatTime = useCallback((time: number): string => {
//       const minutes = Math.floor(time / 60);
//       const seconds = Math.floor(time % 60);
//       const milliseconds = Math.floor((time % 1) * 100);
//       return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
//         .toString()
//         .padStart(2, '0')}`;
//     }, []);

//     useEffect(() => {
//       if (
//         selectedSegmentIndex !== null &&
//         segmentHistory[selectedSegmentIndex]
//       ) {
//         const history = segmentHistory[selectedSegmentIndex];
//         const originalStartTime = frameToTimestamp(history.originalStart);
//         const originalEndTime = frameToTimestamp(history.originalEnd);
//         const currentStartTime = frameToTimestamp(history.currentStart);
//         const currentEndTime = frameToTimestamp(history.currentEnd);

//         console.log(
//           `
//         Loading Segment ${selectedSegmentIndex + 1} History:
//         ====================================
//         Original Boundaries:
//         - Start: ${formatTime(originalStartTime)}
//         - End: ${formatTime(originalEndTime)}
//         Current State:
//         - Start: ${formatTime(currentStartTime)}
//         - End: ${formatTime(currentEndTime)}
//       `.replace(/^\s+/gm, ''),
//         );
//       }
//     }, [selectedSegmentIndex, segmentHistory, frameToTimestamp, formatTime]);

//     const segments = React.useMemo(() => {
//       if (splitPoints.length === 0) {
//         return [
//           {
//             start: 0,
//             end: data.length - 1,
//             isFullTimeline: true,
//           },
//         ];
//       }

//       const points = [...splitPoints].sort(
//         (a, b) => a.frameIndex - b.frameIndex,
//       );
//       let segments = [];
//       let startIndex = 0;

//       for (let point of points) {
//         const endIndex = Math.min(point.frameIndex - 1, data.length - 1);
//         segments.push({
//           start: startIndex,
//           end: endIndex,
//           isFullTimeline: false,
//         });
//         startIndex = point.frameIndex;
//       }
//       segments.push({
//         start: startIndex,
//         end: data.length - 1,
//         isFullTimeline: false,
//       });
//       return segments;
//     }, [data.length, splitPoints]);

//     // const handleSegmentPress = (
//     //   segmentIndex: number,
//     //   isFullTimeline: boolean,
//     // ) => {
//     //   if (onSegmentSelect) {
//     //     if (isFullTimeline && splitPoints.length === 0) {
//     //       onSegmentSelect(segmentIndex);
//     //     } else if (!isFullTimeline && splitPoints.length > 0) {
//     //       onSegmentSelect(segmentIndex);
//     //     }
//     //   }
//     // };

//     // Update handleSegmentPress to ensure proper position restoration
//     const handleSegmentPress = (
//       segmentIndex: number,
//       isFullTimeline: boolean,
//     ) => {
//       if (onSegmentSelect) {
//         if (
//           (isFullTimeline && splitPoints.length === 0) ||
//           (!isFullTimeline && splitPoints.length > 0)
//         ) {
//           // Load the segment's saved position
//           const historyData = segmentHistory[segmentIndex];
//           if (historyData) {
//             console.log(
//               `
//               Restoring Segment ${segmentIndex + 1} Position:
//               =====================================
//               Original Range: ${formatTime(
//                 frameToTimestamp(historyData.originalStart),
//               )} - ${formatTime(frameToTimestamp(historyData.originalEnd))}
//               Restored Range: ${formatTime(
//                 frameToTimestamp(historyData.currentStart),
//               )} - ${formatTime(frameToTimestamp(historyData.currentEnd))}
//             `.replace(/^\s+/gm, ''),
//             );
//           }
//           onSegmentSelect(segmentIndex);
//         }
//       }
//     };

//     const handleValueChange = useCallback(
//       (values: {min: number; max: number}) => {
//         if (!onSegmentAdjust || selectedSegmentIndex === null) return;

//         const segment = segments[selectedSegmentIndex];
//         const newStartFrame = values.min;
//         const newEndFrame = values.max;

//         setSegmentHistory(prev => {
//           const currentHistory = prev[selectedSegmentIndex] || {
//             originalStart: segment.start,
//             originalEnd: segment.end,
//             currentStart: segment.start,
//             currentEnd: segment.end,
//             lastModified: Date.now(),
//           };
//           const segmentStartTime = frameToTimestamp(segment.start);
//           const segmentEndTime = frameToTimestamp(segment.end);
//           const segmentDuration = segmentEndTime - segmentStartTime;
//           const activeStartTime = frameToTimestamp(
//             segment.start + newStartFrame,
//           );
//           const activeEndTime = frameToTimestamp(segment.start + newEndFrame);
//           const activeDuration = activeEndTime - activeStartTime;
//           const startTrim = activeStartTime - segmentStartTime;
//           const endTrim = segmentEndTime - activeEndTime;
//           const totalTrimmed = startTrim + endTrim;

//           console.log(
//             `
//         Segment ${selectedSegmentIndex + 1} Adjustment:
//         ================================
//         Full Segment Boundaries:
//         - Start: ${formatTime(segmentStartTime)}
//         - End: ${formatTime(segmentEndTime)}
//         - Total Duration: ${formatTime(segmentDuration)}

//         Active Region (Between Handles):
//         - Start: ${formatTime(activeStartTime)}
//         - End: ${formatTime(activeEndTime)}
//         - Active Duration: ${formatTime(activeDuration)}

//         Trimmed Portions:
//         - Start Trim: ${formatTime(startTrim)}
//         - End Trim: ${formatTime(endTrim)}
//         - Total Trimmed: ${formatTime(totalTrimmed)}

//         Relative Changes:
//         - Active Portion: ${((activeDuration / segmentDuration) * 100).toFixed(
//           1,
//         )}%
//         - Trimmed Portion: ${((totalTrimmed / segmentDuration) * 100).toFixed(
//           1,
//         )}%
//       `.replace(/^\s+/gm, ''),
//           );

//           return {
//             ...prev,
//             [selectedSegmentIndex]: {
//               ...currentHistory,
//               currentStart: segment.start + newStartFrame,
//               currentEnd: segment.start + newEndFrame,
//               lastModified: Date.now(),
//             },
//           };
//         });

//         onSegmentAdjust(selectedSegmentIndex, values.min, values.max);
//       },
//       [selectedSegmentIndex, onSegmentAdjust],
//     );

//     const totalWidth = React.useMemo(() => {
//       const baseWidth = data.length * FRAME_WIDTH;
//       const gapsWidth =
//         splitPoints.length > 0 ? splitPoints.length * SEGMENT_GAP : 0;
//       const extraPadding = 50;
//       return baseWidth + gapsWidth + extraPadding;
//     }, [data.length, splitPoints.length]);

//     // const renderSegment = (segment: any, segmentIndex: number) => {
//     //   const segmentWidth = (segment.end - segment.start + 1) * FRAME_WIDTH;
//     //   const isSelected = selectedSegmentIndex === segmentIndex;
//     //   const segmentHistoryData = segmentHistory[segmentIndex];
//     //   const initialStart = segmentHistoryData
//     //     ? segmentHistoryData.currentStart - segment.start
//     //     : 0;
//     //   const initialEnd = segmentHistoryData
//     //     ? segmentHistoryData.currentEnd - segment.start
//     //     : segment.end - segment.start;

//     //   return (
//     //     <TouchableOpacity
//     //       key={segmentIndex}
//     //       onPress={() =>
//     //         handleSegmentPress(segmentIndex, segment.isFullTimeline)
//     //       }
//     //       style={[
//     //         styles.segmentContainer,
//     //         {
//     //           marginRight: segmentIndex < segments.length - 1 ? SEGMENT_GAP : 0,
//     //           width: segmentWidth,
//     //         },
//     //         isSelected && styles.selectedSegment,
//     //       ]}>
//     //       {/* Render base frames */}
//     //       {data
//     //         .slice(segment.start, segment.end + 1)
//     //         .map((frame, frameIndex) => (
//     //           <View key={frameIndex} style={styles.frameWrapper}>
//     //             <Image
//     //               source={{uri: `file://${frame.uri}`}}
//     //               style={styles.frameImage}
//     //               resizeMode="cover"
//     //             />
//     //           </View>
//     //         ))}
//     //       {isSelected && !segment.isFullTimeline && (
//     //         <View style={styles.trimmerContainer}>
//     //           <AudioTrimTimelineFun
//     //             data={data.slice(segment.start, segment.end + 1)}
//     //             min={initialStart}
//     //             max={initialEnd}
//     //             step={1}
//     //             timestampStart={segment.start}
//     //             timestampEnd={segment.end}
//     //             sliderWidth={segmentWidth}
//     //             onChangeHandler={handleValueChange}
//     //             isHandlesVisible={isMainHandleVisible}
//     //             renderRails={() => (
//     //               <View style={styles.railsContainer}>
//     //                 {data
//     //                   .slice(segment.start, segment.end + 1)
//     //                   .map((frame, idx) => (
//     //                     <View key={idx} style={styles.frameWrapper}>
//     //                       <Image
//     //                         source={{uri: `file://${frame.uri}`}}
//     //                         style={styles.frameImage}
//     //                         resizeMode="cover"
//     //                       />
//     //                     </View>
//     //                   ))}
//     //               </View>
//     //             )}
//     //           />
//     //         </View>
//     //       )}

//     //       <View
//     //         style={[
//     //           styles.segmentBorder,
//     //           isSelected && styles.selectedSegmentBorder,
//     //         ]}
//     //       />
//     //     </TouchableOpacity>
//     //   );
//     // };

//     const renderSegment = (segment: any, segmentIndex: number) => {
//       const segmentWidth = (segment.end - segment.start + 1) * FRAME_WIDTH;
//       const isSelected = selectedSegmentIndex === segmentIndex;

//       return (
//         <TouchableOpacity
//           key={segmentIndex}
//           onPress={() =>
//             handleSegmentPress(segmentIndex, segment.isFullTimeline)
//           }
//           style={[
//             styles.segmentContainer,
//             {
//               marginRight: segmentIndex < segments.length - 1 ? SEGMENT_GAP : 0,
//               width: segmentWidth,
//             },
//             isSelected && styles.selectedSegment,
//           ]}>
//           {/* Base frames */}
//           {data
//             .slice(segment.start, segment.end + 1)
//             .map((frame, frameIndex) => (
//               <View key={frameIndex} style={styles.frameWrapper}>
//                 <Image
//                   source={{uri: `file://${frame.uri}`}}
//                   style={styles.frameImage}
//                   resizeMode="cover"
//                 />
//               </View>
//             ))}

//           {isSelected && !segment.isFullTimeline && (
//             <View style={styles.trimmerContainer}>
//               <AudioTrimTimelineFun
//                 data={data.slice(segment.start, segment.end + 1)}
//                 sliderWidth={segmentWidth}
//                 min={0}
//                 max={segment.end - segment.start}
//                 step={1}
//                 onChangeHandler={values => handleValueChange(values)}
//                 renderRails={() => (
//                   <View style={styles.railsContainer}>
//                     {data
//                       .slice(segment.start, segment.end + 1)
//                       .map((frame, idx) => (
//                         <View key={idx} style={styles.frameWrapper}>
//                           <Image
//                             source={{uri: `file://${frame.uri}`}}
//                             style={styles.frameImage}
//                             resizeMode="cover"
//                           />
//                         </View>
//                       ))}
//                   </View>
//                 )}
//               />
//             </View>
//           )}

//           <View
//             style={[
//               styles.segmentBorder,
//               isSelected && styles.selectedSegmentBorder,
//             ]}
//           />
//         </TouchableOpacity>
//       );
//     };

//     return (
//       <View style={[styles.framePicksContainer, {width: totalWidth}]}>
//         {segments.map((segment, index) => renderSegment(segment, index))}
//       </View>
//     );
//   },
// );

// const styles = StyleSheet.create({
//   framePicksContainer: {
//     flexDirection: 'row',
//     height: FRAME_BAR_HEIGHT,
//     alignItems: 'center',
//     paddingRight: 15,
//   },
//   segmentContainer: {
//     flexDirection: 'row',
//     borderRadius: 8,
//     overflow: 'hidden',
//     backgroundColor: 'black',
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
//   trimmerContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     zIndex: 10,
//   },
//   railsContainer: {
//     flexDirection: 'row',
//     height: FRAME_BAR_HEIGHT,
//     backgroundColor: 'red',
//   },
// });

// export default FramePicks;

import React, {useState, useCallback} from 'react';
import {StyleSheet, View, Image, TouchableOpacity} from 'react-native';
import {VideoUtils} from '../services/VideoUtils';
import AudioTrimTimelineFun from './AudioTrimTimelineFun';

interface Frame {
  uri: string;
}

interface SplitPoint {
  id: string;
  time: number;
  frameIndex: number;
}

interface SegmentState {
  lastTime: number;
  isAdjusting: boolean;
  startFrame: number;
  endFrame: number;
}

interface FramePicksProps {
  data: Frame[];
  splitPoints?: SplitPoint[];
  onRemoveSplit?: (id: string) => void;
  formatTime?: (time: number) => string;
  isCropping?: boolean;
  value?: {min: number; max: number};
  duration?: number;
  selectedSegmentIndex?: number | null;
  onSegmentSelect?: (index: number) => void;
  onSegmentAdjust?: (
    segmentIndex: number,
    startFrame: number,
    endFrame: number,
  ) => void;
  isMainHandleVisible?: boolean;
}

const FRAME_BAR_HEIGHT = 50;
const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
const SEGMENT_GAP = 2;

const FramePicks: React.FC<FramePicksProps> = React.memo(
  ({
    data,
    splitPoints = [],
    onRemoveSplit,
    formatTime,
    isCropping = false,
    value,
    duration = 0,
    selectedSegmentIndex,
    onSegmentSelect,
    onSegmentAdjust,
    isMainHandleVisible = true,
  }) => {
    // Add state for segment tracking
    const [segmentStates, setSegmentStates] = useState<{
      [key: number]: SegmentState;
    }>({});

    // Calculate segments based on split points
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

    const handleSegmentPress = useCallback(
      (segmentIndex: number, isFullTimeline: boolean) => {
        if (onSegmentSelect) {
          if (
            (isFullTimeline && splitPoints.length === 0) ||
            (!isFullTimeline && splitPoints.length > 0)
          ) {
            const currentState = segmentStates[segmentIndex];
            onSegmentSelect(segmentIndex);

            if (currentState) {
              console.log(`
            Restoring Segment ${segmentIndex + 1} State:
            Start Frame: ${currentState.startFrame}
            End Frame: ${currentState.endFrame}
            Last Adjusted: ${new Date(
              currentState.lastTime,
            ).toLocaleTimeString()}
          `);
            }
          }
        }
      },
      [onSegmentSelect, splitPoints.length, segmentStates],
    );

    const handleValueChange = useCallback(
      (values: {min: number; max: number}, segmentIndex: number) => {
        if (!onSegmentAdjust) return;

        const segment = segments[segmentIndex];
        const startFrame = Math.floor(values.min);
        const endFrame = Math.ceil(values.max);

        // Update segment state
        setSegmentStates(prev => ({
          ...prev,
          [segmentIndex]: {
            lastTime: Date.now(),
            isAdjusting: true,
            startFrame: startFrame + segment.start,
            endFrame: endFrame + segment.start,
          },
        }));

        onSegmentAdjust(
          segmentIndex,
          startFrame + segment.start,
          endFrame + segment.start,
        );
      },
      [segments, onSegmentAdjust],
    );

    const renderSegment = (segment: any, segmentIndex: number) => {
      const segmentWidth = (segment.end - segment.start + 1) * FRAME_WIDTH;
      const isSelected = selectedSegmentIndex === segmentIndex;
      const segmentState = segmentStates[segmentIndex];

      return (
        <TouchableOpacity
          key={segmentIndex}
          onPress={() =>
            handleSegmentPress(segmentIndex, segment.isFullTimeline)
          }
          style={[
            styles.segmentContainer,
            {
              marginRight: segmentIndex < segments.length - 1 ? SEGMENT_GAP : 0,
              width: segmentWidth,
            },
            isSelected && styles.selectedSegment,
          ]}>
          {/* Base frames */}
          {data
            .slice(segment.start, segment.end + 1)
            .map((frame, frameIndex) => (
              <View key={frameIndex} style={styles.frameWrapper}>
                <Image
                  source={{uri: `file://${frame.uri}`}}
                  style={[
                    styles.frameImage,
                    segmentState?.isAdjusting && styles.frameAdjusting,
                  ]}
                  resizeMode="cover"
                />
              </View>
            ))}

          {isSelected && !segment.isFullTimeline && (
            <View style={styles.trimmerContainer}>
              <AudioTrimTimelineFun
                data={data.slice(segment.start, segment.end + 1)}
                sliderWidth={segmentWidth}
                min={0}
                max={segment.end - segment.start}
                step={1}
                duration={duration}
                onChangeHandler={values =>
                  handleValueChange(values, segmentIndex)
                }
                renderRails={() => (
                  <View style={styles.railsContainer}>
                    {data
                      .slice(segment.start, segment.end + 1)
                      .map((frame, idx) => (
                        <View key={idx} style={styles.frameWrapper}>
                          <Image
                            source={{uri: `file://${frame.uri}`}}
                            style={styles.frameImage}
                            resizeMode="cover"
                          />
                        </View>
                      ))}
                  </View>
                )}
              />
            </View>
          )}

          <View
            style={[
              styles.segmentBorder,
              isSelected && styles.selectedSegmentBorder,
              segmentState?.isAdjusting && styles.adjustingBorder,
            ]}
          />
        </TouchableOpacity>
      );
    };

    return (
      <View
        style={[
          styles.framePicksContainer,
          {width: data.length * FRAME_WIDTH + splitPoints.length * SEGMENT_GAP},
        ]}>
        {segments.map((segment, index) => renderSegment(segment, index))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  framePicksContainer: {
    flexDirection: 'row',
    height: FRAME_BAR_HEIGHT,
    alignItems: 'center',
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
  selectedSegment: {
    backgroundColor: 'rgba(58, 58, 58, 0.8)',
    transform: [{scale: 1.02}],
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
  frameAdjusting: {
    opacity: 0.8,
  },
  trimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  railsContainer: {
    flexDirection: 'row',
    height: FRAME_BAR_HEIGHT,
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
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  adjustingBorder: {
    borderColor: '#00FF00',
    shadowColor: '#00FF00',
  },
});

export default FramePicks;
