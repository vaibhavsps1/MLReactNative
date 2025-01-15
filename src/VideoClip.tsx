// // VideoClip.tsx
// import * as React from 'react';
// import {
//   StyleSheet,
//   View,
//   Text,
//   TouchableOpacity,
//   Dimensions,
//   ScrollView,
//   Image,
//   ActivityIndicator,
//   Animated,
//   PanResponder,
//   Alert,
// } from 'react-native';
// import {
//   launchImageLibrary,
//   type ImagePickerResponse,
// } from 'react-native-image-picker';
// import Video from 'react-native-video';
// import {useEffect, useState, useRef} from 'react';
// import {VideoUtils} from './services/VideoUtils';
// import RNFS from 'react-native-fs';
// import {FFmpegKit} from 'ffmpeg-kit-react-native';

// const {width: SCREEN_WIDTH} = Dimensions.get('window');
// const FRAME_BAR_HEIGHT = 80;
// const TIMELINE_CENTER = SCREEN_WIDTH / 2;
// const FRAME_STATUS = {
//   READY: {name: {description: 'ready'}},
// };

// interface Frame {
//   uri: string;
//   status: string;
//   timestamp?: number;
// }

// interface TimeRange {
//   start: number;
//   end: number;
// }

// // Add these constants at the top
// const FRAME_WIDTH = VideoUtils.FRAME_WIDTH + 2; // Including margin
// const TIME_BAR_HEIGHT = 20;

// export default function VideoClip() {
//   const [videoUri, setVideoUri] = useState<string | null>(null);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [currentTime, setCurrentTime] = useState(0);
//   const [duration, setDuration] = useState(0);
//   const [frames, setFrames] = useState<Frame[]>([]);
//   const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);
//   const [isSplitting, setIsSplitting] = useState(false);
//   const leftHandlePosition = useRef(new Animated.Value(0)).current;
//   const rightHandlePosition = useRef(new Animated.Value(0)).current;

//   const videoRef = useRef<Video>(null);
//   const scrollViewRef = useRef<ScrollView>(null);
//   const scrollOffset = useRef(0);

//   useEffect(() => {
//     return () => {
//       // Cleanup frames on unmount
//       VideoUtils.cleanFrames().then(() => {
//         VideoUtils.verifyFramesCleanup().then(cleaned => {
//           if (!cleaned) {
//             console.warn('Some frames might not have been cleaned up properly');
//           }
//         });
//       });
//     };
//   }, []);

//   const TimeBar = ({duration, currentTime, width}) => {
//     const progress = (currentTime / duration) * 100;

//     return (
//       <View style={[styles.timeBar, {width}]}>
//         <View style={[styles.timeBarProgress, {width: `${progress}%`}]} />
//         <Text style={styles.timeText}>
//           {`${Math.floor(currentTime / 60)}:${String(
//             Math.floor(currentTime % 60),
//           ).padStart(2, '0')} / ${Math.floor(duration / 60)}:${String(
//             Math.floor(duration % 60),
//           ).padStart(2, '0')}`}
//         </Text>
//       </View>
//     );
//   };

//   const generateFrames = async (uri: string, videoDuration: number) => {
//     const numberOfFrames = Math.ceil(videoDuration * VideoUtils.FRAME_PER_SEC);
//     const timestamp = new Date().getTime(); // Add timestamp
//     setIsGeneratingFrames(true);

//     try {
//       await VideoUtils.getFrames(
//         `frame_${timestamp}`, // Add timestamp to filename
//         uri,
//         numberOfFrames,
//         (outputPath: string) => {
//           const _framesURI = [];
//           for (let i = 0; i < numberOfFrames; i++) {
//             _framesURI.push(
//               `${outputPath.replace('%4d', String(i + 1).padStart(4, '0'))}`,
//             );
//           }
//           const _frames = _framesURI.map(_frameURI => ({
//             uri: _frameURI,
//             status: FRAME_STATUS.READY.name.description,
//             timestamp: timestamp, // Add timestamp to frame data
//           }));
//           setFrames(_frames);
//           setIsGeneratingFrames(false);
//         },
//         () => {
//           console.error('Failed to generate frames');
//           setIsGeneratingFrames(false);
//         },
//         (frameUri, processedFrames, totalFrames) => {
//           console.log(`Generated frame ${processedFrames}/${totalFrames}`);
//         },
//       );
//     } catch (error) {
//       console.error('Error generating frames:', error);
//       setIsGeneratingFrames(false);
//     }
//   };

//   const onMediaLoaded = async (response: ImagePickerResponse) => {
//     if (response.assets?.[0]?.uri) {
//       await VideoUtils.cleanFrames();
//       setFrames([]);
//       setIsGeneratingFrames(false);
//       setVideoUri(response.assets[0].uri);
//     }
//   };

//   const onVideoLoad = (data: any) => {
//     setDuration(data.duration);
//     if (videoUri) {
//       generateFrames(videoUri, data.duration);
//       if (scrollViewRef.current) {
//         scrollViewRef.current.scrollTo({
//           x: 0,
//           animated: false,
//         });
//       }
//     }
//   };

//   const onProgress = (data: any) => {
//     setCurrentTime(data.currentTime);

//     if (scrollViewRef.current && frames.length > 0) {
//       const totalContentWidth = frames.length * FRAME_WIDTH;
//       const maxScroll = totalContentWidth - SCREEN_WIDTH + 2 * TIMELINE_CENTER;
//       const scrollProgress = (data.currentTime / duration) * maxScroll;

//       requestAnimationFrame(() => {
//         scrollViewRef.current?.scrollTo({
//           x: scrollProgress,
//           animated: false,
//         });
//       });
//     }
//   };

//   const onFramePress = (frameIndex: number) => {
//     const seekTime = (frameIndex / frames.length) * duration;
//     if (videoRef.current) {
//       videoRef.current.seek(seekTime);
//     }
//   };

//   const togglePlayPause = () => {
//     setIsPlaying(!isPlaying);
//   };

//   const resetVideoState = async () => {
//     setIsPlaying(false);
//     await VideoUtils.cleanFrames();
//     setFrames([]);
//     setVideoUri(null);
//     setCurrentTime(0);
//     setDuration(0);
//     setIsGeneratingFrames(false);
//   };
//   const createPanResponder = (isLeft: boolean) => {
//     const handlePosition = isLeft ? leftHandlePosition : rightHandlePosition;

//     return PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onMoveShouldSetPanResponder: () => true,

//       onPanResponderGrant: () => {
//         handlePosition.setOffset(handlePosition.__getValue());
//         handlePosition.setValue(0);
//       },

//       onPanResponderMove: (_, gesture) => {
//         const currentScrollOffset = scrollOffset.current || 0;
//         const totalWidth = frames.length * FRAME_WIDTH;
//         const handleX = gesture.moveX;

//         const rawPosition = gesture.moveX + currentScrollOffset;
//         const minPosition = isLeft ? TIMELINE_CENTER : leftHandlePosition.__getValue() + FRAME_WIDTH;
//         const maxPosition = isLeft
//           ? rightHandlePosition.__getValue() - FRAME_WIDTH
//           : totalWidth;

//         const newPosition = Math.max(minPosition, Math.min(maxPosition, rawPosition));
//         if (!isLeft && scrollViewRef.current) { // Only for right handle
//           if (handleX > SCREEN_WIDTH - 100) { // Near right edge of viewport
//             const maxScroll = totalWidth - SCREEN_WIDTH + (2 * TIMELINE_CENTER);
//             const newOffset = Math.min(maxScroll, currentScrollOffset + 20);
//             scrollViewRef.current.scrollTo({
//               x: newOffset,
//               animated: false
//             });
//           }
//         }
//         handlePosition.setValue(newPosition - handlePosition._offset);
//         if (isLeft && videoRef.current) {
//           const adjustedPosition = newPosition - TIMELINE_CENTER;
//           const time = (adjustedPosition / totalWidth) * duration;
//           videoRef.current.seek(Math.max(0, Math.min(duration, time)));
//         }
//       },
//       onPanResponderRelease: () => {
//         handlePosition.flattenOffset();
//       }
//     });
//   };
//   const leftPanResponder = useRef(createPanResponder(true)).current;
//   const rightPanResponder = useRef(createPanResponder(false)).current;

//   const handleSplitPress = async () => {
//     if (!isSplitting) {
//       setIsPlaying(false);
//       setIsSplitting(true);

//       leftHandlePosition.setValue(TIMELINE_CENTER);
//       rightHandlePosition.setValue(TIMELINE_CENTER + (FRAME_WIDTH * 3));

//       if (scrollViewRef.current) {
//         scrollViewRef.current.scrollTo({
//           x: 0,
//           animated: true
//         });
//       }
//     } else {
//       const totalWidth = frames.length * FRAME_WIDTH;
//       const leftPos = Math.max(
//         0,
//         leftHandlePosition.__getValue() - TIMELINE_CENTER,
//       );
//       const rightPos = rightHandlePosition.__getValue() - TIMELINE_CENTER;

//       const startTime = (leftPos / totalWidth) * duration;
//       const endTime = (rightPos / totalWidth) * duration;
//       const clipDuration = endTime - startTime;

//       Alert.alert(
//         'Save Split Section',
//         'Do you want to save this section of the video?',
//         [
//           {
//             text: 'Cancel',
//             style: 'cancel',
//             onPress: () => {
//               setIsSplitting(false);c
//             },
//           },
//           {
//             text: 'Save',
// onPress: async () => {
//   try {
//     const outputPath = `${
//       RNFS.DownloadDirectoryPath
//     }/split_${Date.now()}.mp4`;
//     const command = `-i "${videoUri}" -ss ${startTime.toFixed(
//       3,
//     )} -t ${clipDuration.toFixed(
//       3,
//     )} -c:v copy -c:a copy "${outputPath}"`;

//     const result = await FFmpegKit.execute(command);
//     const returnCode = await result.getReturnCode();

//     if (returnCode.isValueSuccess()) {
//       Alert.alert('Success', 'Video section saved successfully!');
//     } else {
//       const output = await result.getOutput();
//       console.error('FFmpeg error output:', output);
//       Alert.alert(
//         'Error',
//         'Failed to save video section. Please try again.',
//       );
//     }
//   } catch (error) {
//     console.error('Split failed:', error);
//     Alert.alert('Error', 'Failed to save video section');
//   }
//   setIsSplitting(false);
// },
//           },
//         ],
//       );
//     }
//   };

//   return (
//     <View style={styles.container}>
//       {videoUri && (
//         <View style={styles.videoContainer}>
//           <TouchableOpacity
//             style={styles.crossButton}
//             onPress={resetVideoState}>
//             <Text>❌</Text>
//           </TouchableOpacity>
//           <Video
//             ref={videoRef}
//             source={{uri: videoUri}}
//             style={styles.video}
//             resizeMode="contain"
//             paused={!isPlaying}
//             onLoad={onVideoLoad}
//             onProgress={onProgress}
//             repeat={true}
//           />
//           <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
//             <Text style={styles.playButtonText}>{isPlaying ? '⏸️' : '▶️'}</Text>
//           </TouchableOpacity>
//           <View style={styles.frameBarSection}>
//             <TimeBar
//               duration={duration}
//               currentTime={currentTime}
//               width={SCREEN_WIDTH}
//             />
//             <View style={styles.frameBarContainer}>
//               <View style={styles.centerIndicator} />
//               <ScrollView
//                 ref={scrollViewRef}
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={styles.frameBarContent}
//                 onScroll={event => {
//                   scrollOffset.current = event.nativeEvent.contentOffset.x;
//                 }}
//                 scrollEventThrottle={16}
//                 removeClippedSubviews={true}
//                 // scrollEnabled={!isSplitting}
//                 scrollEnabled={true}>
//                 <View style={{width: TIMELINE_CENTER}} />
//                 {isGeneratingFrames ? (
//                   <View style={styles.loadingContainer}>
//                     <ActivityIndicator color="#007AFF" />
//                     <Text style={styles.loadingText}>Generating frames...</Text>
//                   </View>
//                 ) : (
//                   frames.map((frame, index) => (
//                     <TouchableOpacity
//                       key={`frame-${index}`}
//                       onPress={() => onFramePress(index)}
//                       style={styles.frameItem}>
//                       <Image
//                         key={`frame-image-${frame.uri}-${index}`}
//                         source={{
//                           uri: `file:///${frame.uri}`,
//                           cache: 'reload',
//                         }}
//                         style={styles.frameImage}
//                         resizeMode="cover"
//                       />
//                     </TouchableOpacity>
//                   ))
//                 )}
//                 <View style={{width: TIMELINE_CENTER}} />
//                 {isSplitting && (
//                   <>
//                     <Animated.View
//                       {...leftPanResponder.panHandlers}
//                       style={[
//                         styles.handleBar,
//                         styles.leftHandle,
//                         {
//                           transform: [{translateX: leftHandlePosition}],
//                         },
//                       ]}
//                     />
//                     <Animated.View
//                       {...rightPanResponder.panHandlers}
//                       style={[
//                         styles.handleBar,
//                         styles.rightHandle,
//                         {
//                           transform: [{translateX: rightHandlePosition}],
//                         },
//                       ]}
//                     />
//                     <Animated.View
//                       style={[
//                         styles.selectionOverlay,
//                         {
//                           left: leftHandlePosition,
//                           width: Animated.subtract(
//                             rightHandlePosition,
//                             leftHandlePosition,
//                           ),
//                         },
//                       ]}
//                     />
//                   </>
//                 )}
//               </ScrollView>
//             </View>
//           </View>
//           <View style={styles.toolsContainer}>
//             <TouchableOpacity style={styles.tool} onPress={handleSplitPress}>
//               <Text style={styles.toolText}>Split</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.tool}>
//               <Text style={styles.toolText}>Trim</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.tool}>
//               <Text style={styles.toolText}>Delete</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       )}
//       {(!videoUri || (videoUri && frames.length === 0)) && (
//         <TouchableOpacity
//           onPress={() => {
//             launchImageLibrary(
//               {
//                 mediaType: 'video',
//                 includeExtra: true,
//                 assetRepresentationMode: 'current',
//               },
//               onMediaLoaded,
//             );
//           }}
//           style={[
//             styles.selectButton,
//             videoUri && styles.selectButtonWithVideo,
//           ]}>
//           <Text style={styles.buttonText}>Select Video</Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#000',
//   },
//   videoContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   video: {
//     width: '90%',
//     height: '60%',
//     position: 'absolute',
//     top: '10%',
//   },
//   playButton: {
//     position: 'absolute',
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     justifyContent: 'center',
//     alignItems: 'center',
//     bottom: 200,
//   },
//   playButtonText: {
//     color: 'white',
//     fontSize: 24,
//   },
//   centerIndicator: {
//     position: 'absolute',
//     left: '50%',
//     width: 2,
//     height: FRAME_BAR_HEIGHT,
//     backgroundColor: '#007AFF',
//     zIndex: 10,
//   },
//   frameBarContent: {
//     height: FRAME_BAR_HEIGHT,
//     alignItems: 'center',
//   },
//   frameImage: {
//     width: '100%',
//     height: '100%',
//   },
//   loadingContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   loadingText: {
//     color: 'white',
//     marginLeft: 10,
//   },
//   toolsContainer: {
//     position: 'absolute',
//     bottom: 0,
//     flexDirection: 'row',
//     width: '100%',
//     height: 80,
//     backgroundColor: '#222',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//   },
//   tool: {
//     padding: 10,
//   },
//   toolText: {
//     color: 'white',
//     fontSize: 16,
//   },
//   selectButton: {
//     position: 'absolute',
//     bottom: 20,
//     alignSelf: 'center',
//     backgroundColor: '#007AFF',
//     padding: 15,
//     borderRadius: 8,
//   },
//   selectButtonWithVideo: {
//     bottom: 100,
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 16,
//   },
//   crossButton: {
//     position: 'absolute',
//     top: 20,
//     left: 20,
//     zIndex: 10,
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   frameBarSection: {
//     position: 'absolute',
//     bottom: 80,
//     width: '100%',
//     height: FRAME_BAR_HEIGHT + TIME_BAR_HEIGHT,
//   },
//   timeBar: {
//     height: TIME_BAR_HEIGHT,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 10,
//   },
//   timeBarProgress: {
//     position: 'absolute',
//     left: 0,
//     top: 0,
//     height: '10%',
//     backgroundColor: 'rgb(255, 255, 255)',
//   },
//   timeText: {
//     color: 'white',
//     fontSize: 12,
//     position: 'absolute',
//     right: 10,
//   },
//   frameBarContainer: {
//     height: FRAME_BAR_HEIGHT,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//   },
//   frameItem: {
//     width: FRAME_WIDTH - 2, // Subtract margin
//     height: FRAME_BAR_HEIGHT - 20,
//     // marginHorizontal: 1,
//     backgroundColor: '#666',
//     // borderRadius: 4,
//     overflow: 'hidden',
//   },
//   handleBar: {
//     position: 'absolute',
//     width: 20,
//     height: FRAME_BAR_HEIGHT,
//     backgroundColor: 'rgba(255, 255, 255, 0.3)',
//     zIndex: 100,
//   },
//   leftHandle: {
//     borderLeftWidth: 3,
//     borderLeftColor: '#007AFF',
//   },
//   rightHandle: {
//     borderRightWidth: 3,
//     borderRightColor: '#007AFF',
//   },
//   selectionOverlay: {
//     position: 'absolute',
//     height: FRAME_BAR_HEIGHT,
//     backgroundColor: 'rgba(0, 122, 255, 0.2)',
//     zIndex: 50,
//   },
// });

// WORKING CODE - without split - ALL good
// import * as React from 'react';
// import {
//   StyleSheet,
//   View,
//   Text,
//   TouchableOpacity,
//   Dimensions,
//   ScrollView,
//   Image,
//   ActivityIndicator,
// } from 'react-native';
// import {
//   launchImageLibrary,
//   type ImagePickerResponse,
// } from 'react-native-image-picker';
// import Video from 'react-native-video';
// import {useState, useRef} from 'react';
// import {VideoUtils} from './services/VideoUtils';
// import {Frame} from './types';

// // Constants for layout and dimensions
// const {width: SCREEN_WIDTH} = Dimensions.get('window');
// const FRAME_BAR_HEIGHT = 60;
// const TIMELINE_CENTER = SCREEN_WIDTH / 2;
// const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
// const TIME_INDICATOR_HEIGHT = 25;
// const FRAME_STATUS = {
//   READY: {name: {description: 'ready'}},
// };

// export default function VideoClip() {
//   // State management
//   const [videoUri, setVideoUri] = useState<string | null>(null);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [currentTime, setCurrentTime] = useState(0);
//   const [duration, setDuration] = useState(0);
//   const [frames, setFrames] = useState<Frame[]>([]);
//   const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);

//   // Refs for components and scroll state
//   const videoRef = useRef<Video>(null);
//   const scrollViewRef = useRef<ScrollView>(null);
//   const scrollOffset = useRef(0);
//   const isUserScrolling = useRef(false);

//   // Time formatting helper
//   const formatTime = (time: number) => {
//     const minutes = Math.floor(time / 60);
//     const seconds = Math.floor(time % 60);
//     return `${minutes}:${seconds.toString().padStart(2, '0')}`;
//   };

//   // Frame generation logic
//   const generateFrames = async (uri: string, videoDuration: number) => {
//     const numberOfFrames = Math.ceil(videoDuration * VideoUtils.FRAME_PER_SEC);
//     const timestamp = new Date().getTime();
//     setIsGeneratingFrames(true);

//     try {
//       await VideoUtils.getFrames(
//         `frame_${timestamp}`,
//         uri,
//         numberOfFrames,
//         (outputPath: string) => {
//           const _framesURI = Array.from({length: numberOfFrames}, (_, i) =>
//             outputPath.replace('%4d', String(i + 1).padStart(4, '0'))
//           );

//           const _frames = _framesURI.map(_frameURI => ({
//             uri: _frameURI,
//             status: FRAME_STATUS.READY.name.description,
//             timestamp: timestamp,
//           }));

//           setFrames(_frames);
//           setIsGeneratingFrames(false);
//         },
//         () => {
//           console.error('Failed to generate frames');
//           setIsGeneratingFrames(false);
//         },
//         (frameUri, processedFrames, totalFrames) => {
//           console.log(`Generated frame ${processedFrames}/${totalFrames}`);
//         },
//       );
//     } catch (error) {
//       console.error('Error generating frames:', error);
//       setIsGeneratingFrames(false);
//     }
//   };

//   // Scroll handling for manual frame navigation
//   const handleScroll = (event: any) => {
//     const offsetX = event.nativeEvent.contentOffset.x;
//     scrollOffset.current = offsetX;

//     if (isUserScrolling.current) {
//       // Calculate frame index and corresponding time
//       const frameIndex = Math.floor(offsetX / FRAME_WIDTH);
//       const newTime = Math.max(0, Math.min(duration, (frameIndex / frames.length) * duration));

//       // Update video position and time display
//       setCurrentTime(newTime);
//       if (videoRef.current) {
//         videoRef.current.seek(newTime);
//       }
//     }
//   };

//   // Video playback progress handler
//   const onProgress = (data: any) => {
//     if (!isUserScrolling.current) {
//       setCurrentTime(data.currentTime);

//       // Scroll frame bar during playback
//       if (isPlaying && scrollViewRef.current && frames.length > 0) {
//         const progress = data.currentTime / duration;
//         const scrollX = Math.floor(progress * (frames.length * FRAME_WIDTH));

//         scrollViewRef.current.scrollTo({
//           x: scrollX,
//           animated: false
//         });
//       }
//     }
//   };

//   // Video loading handler
//   const onVideoLoad = (data: any) => {
//     setDuration(data.duration);
//     if (videoUri) {
//       generateFrames(videoUri, data.duration);
//       scrollViewRef.current?.scrollTo({x: 0, animated: false});
//     }
//   };

//   // Playback controls
//   const togglePlayPause = () => {
//     setIsPlaying(!isPlaying);
//   };

//   // Media selection handler
//   const onMediaLoaded = async (response: ImagePickerResponse) => {
//     if (response.assets?.[0]?.uri) {
//       await VideoUtils.cleanFrames();
//       setFrames([]);
//       setIsGeneratingFrames(false);
//       setVideoUri(response.assets[0].uri);
//     }
//   };

//   // Reset state
//   const resetVideoState = async () => {
//     setIsPlaying(false);
//     await VideoUtils.cleanFrames();
//     setFrames([]);
//     setVideoUri(null);
//     setCurrentTime(0);
//     setDuration(0);
//     setIsGeneratingFrames(false);
//   };

//   return (
//     <View style={styles.container}>
//       {videoUri ? (
//         <View style={styles.videoContainer}>
//           {/* Navigation buttons */}
//           <TouchableOpacity style={styles.backButton} onPress={resetVideoState}>
//             <Text style={styles.backButtonText}>←</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.nextButton}>
//             <Text style={styles.nextButtonText}>Next</Text>
//           </TouchableOpacity>

//           {/* Video player */}
//           <Video
//             ref={videoRef}
//             source={{uri: videoUri}}
//             style={styles.video}
//             resizeMode="contain"
//             paused={!isPlaying || isUserScrolling.current}
//             onLoad={onVideoLoad}
//             onProgress={onProgress}
//             repeat={false}
//           />

//           {/* Playback control */}
//           <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
//             <Text style={styles.playButtonText}>{isPlaying ? '⏸️' : '▶️'}</Text>
//           </TouchableOpacity>

//           {/* Timeline section */}
//           <View style={styles.timelineContainer}>
//             <View style={styles.timeIndicator}>
//               <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
//             </View>

//             <View style={styles.centerLine} />

//             {/* Frame strip */}
//             <ScrollView
//               ref={scrollViewRef}
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={styles.framesContainer}
//               onScroll={handleScroll}
//               onScrollBeginDrag={() => {
//                 setIsPlaying(false);
//                 isUserScrolling.current = true;
//               }}
//               onScrollEndDrag={() => {
//                 setTimeout(() => {
//                   isUserScrolling.current = false;
//                 }, 50);
//               }}
//               onMomentumScrollEnd={() => {
//                 isUserScrolling.current = false;
//               }}
//               scrollEventThrottle={16}
//               removeClippedSubviews={true}
//               decelerationRate="fast">
//               <View style={{width: TIMELINE_CENTER}} />
//               {isGeneratingFrames ? (
//                 <View style={styles.loadingContainer}>
//                   <ActivityIndicator color="#fff" />
//                   <Text style={styles.loadingText}>Generating frames...</Text>
//                 </View>
//               ) : (
//                 frames.map((frame, index) => (
//                   <Image
//                     key={`frame-${index}`}
//                     source={{uri: `file:///${frame.uri}`}}
//                     style={styles.frameImage}
//                     resizeMode="cover"
//                   />
//                 ))
//               )}
//               <View style={{width: TIMELINE_CENTER}} />
//             </ScrollView>
//           </View>

//           {/* Tools section */}
//           <View style={styles.toolsContainer}>
//             <TouchableOpacity style={styles.tool}>
//               <Text style={styles.toolText}>Split</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.tool}>
//               <Text style={styles.toolText}>Trim</Text>
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.tool}>
//               <Text style={styles.toolText}>Delete</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       ) : (
//         <TouchableOpacity
//           style={styles.selectButton}
//           onPress={() => {
//             launchImageLibrary(
//               {
//                 mediaType: 'video',
//                 includeExtra: true,
//                 assetRepresentationMode: 'current',
//               },
//               onMediaLoaded,
//             );
//           }}>
//           <Text style={styles.buttonText}>Select Video</Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// }

import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  Animated,
  PanResponder,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import Video from 'react-native-video';
import {useState, useRef} from 'react';
import {VideoUtils} from './services/VideoUtils';
import {Frame} from './types';
import {FFmpegKit} from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';

// Constants for layout and dimensions
const {width: SCREEN_WIDTH} = Dimensions.get('window');
const FRAME_BAR_HEIGHT = 60;
const TIMELINE_CENTER = SCREEN_WIDTH / 2;
const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
const TIME_INDICATOR_HEIGHT = 25;
const FRAME_STATUS = {
  READY: {name: {description: 'ready'}},
};

export default function VideoClip() {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);

  const [isSplitting, setIsSplitting] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const leftHandlePosition = useRef(new Animated.Value(0)).current;
  const rightHandlePosition = useRef(new Animated.Value(0)).current;

  const videoRef = useRef<Video>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const isUserScrolling = useRef(false);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const generateFrames = async (uri: string, videoDuration: number) => {
    const numberOfFrames = Math.ceil(videoDuration * VideoUtils.FRAME_PER_SEC);
    const timestamp = new Date().getTime();
    setIsGeneratingFrames(true);

    try {
      await VideoUtils.getFrames(
        `frame_${timestamp}`,
        uri,
        numberOfFrames,
        (outputPath: string) => {
          const _framesURI = Array.from({length: numberOfFrames}, (_, i) =>
            outputPath.replace('%4d', String(i + 1).padStart(4, '0')),
          );

          const _frames = _framesURI.map(_frameURI => ({
            uri: _frameURI,
            status: FRAME_STATUS.READY.name.description,
            timestamp: timestamp,
          }));
          setFrames(_frames);
          setIsGeneratingFrames(false);
        },
        () => {
          console.error('Failed to generate frames',);
          setIsGeneratingFrames(false);
        },
        (frameUri, processedFrames, totalFrames) => {
          console.log(`Generated frame ${processedFrames}/${totalFrames}`);
        },
      );
    } catch (error) {
      console.error('Error generating frames:', error);
      setIsGeneratingFrames(false);
    }
  };

  const createPanResponder = (isLeft: boolean) => {
    const handlePosition = isLeft ? leftHandlePosition : rightHandlePosition;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        handlePosition.setOffset(handlePosition.__getValue());
        handlePosition.setValue(0);
      },

      onPanResponderMove: (_, gesture) => {
        const currentScrollOffset = scrollOffset.current || 0;
        const totalWidth = frames.length * FRAME_WIDTH;
        console.log('totalWidth', frames.length, FRAME_WIDTH);

        // Calculate position relative to scroll content
        const rawPosition = gesture.moveX + currentScrollOffset;

        // Establish movement boundaries
        const minPosition = isLeft
          ? TIMELINE_CENTER // Left handle can't go before timeline center
          : leftHandlePosition.__getValue() + FRAME_WIDTH;
        const maxPosition = isLeft
          ? rightHandlePosition.__getValue() - FRAME_WIDTH
          : totalWidth;

        // Constrain handle position
        const newPosition = Math.max(
          minPosition,
          Math.min(maxPosition, rawPosition),
        );

        // Update handle position
        handlePosition.setValue(newPosition - handlePosition._offset);

        // Calculate and update video time for left handle
        if (isLeft && videoRef.current) {
          const adjustedPosition = newPosition - TIMELINE_CENTER;
          const time = (adjustedPosition / totalWidth) * duration;
          // Seek to calculated time
          videoRef.current.seek(Math.max(0, Math.min(duration, time)));
          // Update start time for potential saving
          setStartTime(time);
        }
        // Update right handle's end time when moved
        if (!isLeft) {
          const adjustedPosition = newPosition - TIMELINE_CENTER;
          const time = (adjustedPosition / totalWidth) * duration;
          console.log('this is time', adjustedPosition, totalWidth, duration);
          setEndTime(time);
        }
      },
      onPanResponderRelease: () => {
        handlePosition.flattenOffset();
      },
    });
  };

  const leftPanResponder = useRef(createPanResponder(true)).current;
  const rightPanResponder = useRef(createPanResponder(false)).current;

  const handleSplitPress = () => {
    setIsSplitting(true);
    setIsPlaying(false);

    // Calculate current frame position
    const totalWidth = frames.length * FRAME_WIDTH;
    const currentPosition = Math.max(
      TIMELINE_CENTER,
      (currentTime / duration) * totalWidth,
    );

    // Set left handle at first frame (TIMELINE_CENTER)
    leftHandlePosition.setValue(TIMELINE_CENTER);

    // Set right handle at current position or minimum valid position
    rightHandlePosition.setValue(
      Math.max(currentPosition, TIMELINE_CENTER + FRAME_WIDTH),
    );
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollOffset.current = offsetX;

    if (isUserScrolling.current) {
      const frameIndex = Math.floor(offsetX / FRAME_WIDTH);
      const newTime = Math.max(
        0,
        Math.min(duration, (frameIndex / frames.length) * duration),
      );

      setCurrentTime(newTime);
      if (videoRef.current) {
        videoRef.current.seek(newTime);
      }
    }
  };

  const onProgress = (data: any) => {
    if (!isUserScrolling.current) {
      setCurrentTime(data.currentTime);

      if (isPlaying && scrollViewRef.current && frames.length > 0) {
        const progress = data.currentTime / duration;
        const scrollX = Math.floor(progress * (frames.length * FRAME_WIDTH));
        scrollViewRef.current.scrollTo({
          x: scrollX,
          animated: false,
        });
      }
    }
  };

  const onVideoLoad = (data: any) => {
    setDuration(data.duration);
    console.log('this is data', data);
    if (videoUri) {
      generateFrames(videoUri, data.duration);
      scrollViewRef.current?.scrollTo({x: 0, animated: false});
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const onMediaLoaded = async (response: ImagePickerResponse) => {
    if (response.assets?.[0]?.uri) {
      await VideoUtils.cleanFrames();
      setFrames([]);
      setIsGeneratingFrames(false);
      setVideoUri(response.assets[0].uri);
    }
  };

  const resetVideoState = async () => {
    setIsPlaying(false);
    await VideoUtils.cleanFrames();
    setFrames([]);
    setVideoUri(null);
    setCurrentTime(0);
    setDuration(0);
    setIsGeneratingFrames(false);
  };

  const handleSaveVideoSection = async () => {
    console.log('this is save vid', videoUri, startTime, endTime);

    if (!videoUri || !startTime || !endTime) {
      Alert.alert('Error', 'No video section selected');
      return;
    }
    const clipDuration = endTime - startTime;
    // try {
    //   const outputPath = `${
    //     RNFS.DownloadDirectoryPath
    //   }/split_${Date.now()}.mp4`;

    //   const command = `-i "${videoUri}" -ss ${startTime.toFixed(3)} -t ${(
    //     endTime - startTime
    //   ).toFixed(3)} -c:v copy -c:a copy "${outputPath}"`;

    //   const result = await FFmpegKit.execute(command);
    //   const returnCode = await result.getReturnCode();

    //   if (returnCode.isValueSuccess()) {
    //     Alert.alert('Success', 'Video section saved successfully!', [
    //       {
    //         text: 'OK',
    //         onPress: () => {
    //           resetVideoState();
    //         },
    //       },
    //     ]);
    //   } else {
    //     const output = await result.getOutput();
    //     console.error('FFmpeg error output:', output);
    //     Alert.alert('Error', 'Failed to save video section. Please try again.');
    //   }
    // } catch (error) {
    //   console.error('Split failed:', error);
    //   Alert.alert('Error', 'Failed to save video section');
    // }
    try {
      const outputPath = `${
        RNFS.DownloadDirectoryPath
      }/split_${Date.now()}.mp4`;
      const command = `-i "${videoUri}" -ss ${startTime.toFixed(
        3,
      )} -t ${clipDuration.toFixed(3)} -c:v copy -c:a copy "${outputPath}"`;

      const result = await FFmpegKit.execute(command);
      const returnCode = await result.getReturnCode();

      if (returnCode.isValueSuccess()) {
        Alert.alert('Success', 'Video section saved successfully!');
      } else {
        const output = await result.getOutput();
        console.error('FFmpeg error output:', output);
        Alert.alert('Error', 'Failed to save video section. Please try again.');
      }
    } catch (error) {
      console.error('Split failed:', error);
      Alert.alert('Error', 'Failed to save video section');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={resetVideoState}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.nextButton}
        onPress={handleSaveVideoSection}>
        <Text style={styles.nextButtonText}>Save</Text>
      </TouchableOpacity>

      {videoUri ? (
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{uri: videoUri}}
            style={styles.video}
            resizeMode="contain"
            paused={!isPlaying || isUserScrolling.current}
            onLoad={onVideoLoad}
            onProgress={onProgress}
            repeat={false}
          />

          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <Text style={styles.playButtonText}>{isPlaying ? '⏸️' : '▶️'}</Text>
          </TouchableOpacity>

          <View style={styles.timelineContainer}>
            <View style={styles.timeIndicator}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            </View>

            <View style={styles.centerLine} />
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.framesContainer}
              onScroll={handleScroll}
              onScrollBeginDrag={() => {
                setIsPlaying(false);
                isUserScrolling.current = true;
              }}
              onScrollEndDrag={() => {
                setTimeout(() => {
                  isUserScrolling.current = false;
                }, 50);
              }}
              onMomentumScrollEnd={() => {
                isUserScrolling.current = false;
              }}
              scrollEventThrottle={16}
              removeClippedSubviews={true}
              decelerationRate="fast">
              <View style={{width: TIMELINE_CENTER}} />
              {isGeneratingFrames ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loadingText}>Generating frames...</Text>
                </View>
              ) : (
                frames.map((frame, index) => (
                  <Image
                    key={`frame-${index}`}
                    source={{uri: `file:///${frame.uri}`}}
                    style={styles.frameImage}
                    resizeMode="cover"
                  />
                ))
              )}
              <View style={{width: TIMELINE_CENTER}} />

              {isSplitting && (
                <>
                  <Animated.View
                    {...leftPanResponder.panHandlers}
                    style={[
                      styles.handleBar,
                      styles.leftHandle,
                      {
                        transform: [{translateX: leftHandlePosition}],
                      },
                    ]}
                  />
                  <Animated.View
                    {...rightPanResponder.panHandlers}
                    style={[
                      styles.handleBar,
                      styles.rightHandle,
                      {
                        transform: [{translateX: rightHandlePosition}],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.selectionOverlay,
                      {
                        left: leftHandlePosition,
                        width: Animated.subtract(
                          rightHandlePosition,
                          leftHandlePosition,
                        ),
                      },
                    ]}
                  />
                </>
              )}
            </ScrollView>
          </View>
          {/* Tools section */}
          <View style={styles.toolsContainer}>
            <TouchableOpacity style={styles.tool} onPress={handleSplitPress}>
              <Text style={styles.toolText}>Split</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tool}>
              <Text style={styles.toolText}>Trim</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tool}>
              <Text style={styles.toolText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => {
            launchImageLibrary(
              {
                mediaType: 'video',
                includeExtra: true,
                assetRepresentationMode: 'current',
              },
              onMediaLoaded,
            );
          }}>
          <Text style={styles.buttonText}>Select Video</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '75%',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  nextButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playButton: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: [{translateX: -30}, {translateY: -30}],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  timelineContainer: {
    width: '100%',
    flex: 1,
    backgroundColor: 'rgb(118, 118, 118)',
  },
  timeIndicator: {
    position: 'absolute',
    top: 0,
    left: TIMELINE_CENTER - 25,
    width: 50,
    height: TIME_INDICATOR_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  timeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerLine: {
    position: 'absolute',
    left: TIMELINE_CENTER,
    top: TIME_INDICATOR_HEIGHT,
    width: 2,
    height: FRAME_BAR_HEIGHT * 2.25,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  framesContainer: {
    height: FRAME_BAR_HEIGHT,
    marginTop: TIME_INDICATOR_HEIGHT,
    alignSelf: 'center',
  },
  frameImage: {
    width: FRAME_WIDTH,
    height: FRAME_BAR_HEIGHT,
    backgroundColor: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#fff',
    marginLeft: 10,
  },
  selectButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toolsContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 40,
    backgroundColor: '#222',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tool: {
    padding: 10,
  },
  toolText: {
    color: 'white',
    fontSize: 16,
  },
  handleBar: {
    position: 'absolute',
    width: 20,
    height: FRAME_BAR_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 100,
  },
  rightHandle: {
    borderRightWidth: 2,
    borderRightColor: '#FFD700',
  },
  selectionOverlay: {
    position: 'absolute',
    height: FRAME_BAR_HEIGHT,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FFD700',
    zIndex: 50,
  },
  leftHandle: {
    borderLeftWidth: 2,
    borderLeftColor: '#FFD700',
  },
});
