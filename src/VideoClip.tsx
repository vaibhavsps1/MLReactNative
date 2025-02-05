import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useState, useRef, useCallback, useEffect} from 'react';
import {launchImageLibrary} from 'react-native-image-picker';
import Video from 'react-native-video';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {useSharedValue} from 'react-native-reanimated';
import rnfs from 'react-native-fs';
import {FFmpegKit} from 'ffmpeg-kit-react-native';
import Icon from 'react-native-vector-icons/Entypo';
import AntIcon from 'react-native-vector-icons/AntDesign';
import {formatVideoTime, VideoUtils} from './services/VideoUtils';
import {Frame} from './types';
import FramePicks from './components/FramePicks';
import {SplitIcon, TrashIcon} from './utils/images';
import SegmentTimeline from './components/SegmentTimeline';
import Toast from './utils/Toast';

// Constants
const {width: SCREEN_WIDTH} = Dimensions.get('window');
const FRAME_BAR_HEIGHT = 50;
const TIMELINE_CENTER = SCREEN_WIDTH / 2;
const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
const TIME_INDICATOR_HEIGHT = 25;
const BREAKPOINT_SIZE = 50;

interface SplitPoint {
  id: string;
  time: number;
  frameIndex: number;
}

interface ProcessingProgress {
  segment: number;
  total: number;
  progress: number;
}

interface VideoSegment {
  startTime: number;
  endTime: number;
  duration: number;
}

const VideoClip = () => {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<any>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);
  const [frameGenerationProgress, setFrameGenerationProgress] =
    useState<number>(0);
  const [value, setValue] = useState({min: 0, max: frames.length});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSplitSelecting, setIsSplitSelecting] = useState<boolean>(false);
  const [splitPoints, setSplitPoints] = useState<SplitPoint[]>([]);
  const [processingProgress, setProcessingProgress] =
    useState<ProcessingProgress | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState({
    start: 0,
    end: 0,
  });
  const [isCropping, setIsCropping] = useState(false);
  const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
  const [trimStartTime, setTrimStartTime] = useState<number>(0);
  const [trimEndTime, setTrimEndTime] = useState<number>(0);

  const [segments, setSegments] = useState<
    Array<{startIndex: number; endIndex: number}>
  >([]);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<
    number | null
  >(null);
  const [mainHandlesVisible, setMainHandlesVisible] = useState(true);
  const [toastConfig, setToastConfig] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });
  const [isFrameBarCompressed, setIsFrameBarCompressed] = useState(false);
  const frameBarAnimation = useSharedValue(1);
  const scrollOffset = useSharedValue(0);

  const startSplitPosition = useSharedValue<number>(0);
  const endSplitPosition = useSharedValue<number>(0);

  const videoRef = useRef<Video>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef<boolean>(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const splitPointPositions = useSharedValue<any>({});

  useEffect(() => {
    return () => handleCleanup();
  }, []);

  const handleCleanup = async () => {
    try {
      await VideoUtils.cleanFrames();
      setFrames([]);
      setIsGeneratingFrames(false);
      setVideoUri(null);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  useEffect(() => {
    if (duration > 0 && frames.length > 0) {
      setValue({min: 0, max: frames.length});
      setSelectedTimeRange({start: 0, end: duration});
    }
  }, [duration, frames.length]);

  const resetVideoState = useCallback(async () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsVideoReady(false);
    setIsSplitSelecting(false);
    setSplitPoints([]);
    setSelectedTimeRange({start: 0, end: 0});
    setValue({min: 0, max: 0});
    startSplitPosition.value = 0;
    endSplitPosition.value = 0;
    setFrames([]);
    setIsCropping(false);
    setSaveButtonDisabled(true);
    setIsSplitMode(false);
    setSelectedSegmentIndex(null);
    setMainHandlesVisible(true);
    await handleCleanup();
  }, []);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
  ) => {
    setToastConfig({
      visible: true,
      message,
      type,
    });
  };

  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(2, '0')}`;
  }, []);

  const generateFrames = async (uri: string, videoDuration: number) => {
    const numberOfFrames = Math.ceil(videoDuration * VideoUtils.FRAME_PER_SEC);
    const timestamp = Date.now();
    setIsGeneratingFrames(true);
    setFrameGenerationProgress(0);
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
            status: 'ready',
            timestamp: timestamp,
          }));

          setFrames(_frames);
          setIsGeneratingFrames(false);
        },
        () => {
          Alert.alert('Error', 'Failed to generate frames. Please try again.');
          setIsGeneratingFrames(false);
        },
        (_, processedFrames, totalFrames) => {
          setFrameGenerationProgress(processedFrames / totalFrames);
        },
      );
    } catch (error) {
      console.error('Frame generation error:', error);
      Alert.alert('Error', 'An error occurred while generating frames.');
      setIsGeneratingFrames(false);
    }
  };

  const handleScroll = useCallback(
    (event: any) => {
      if (isUserScrolling.current) {
        const offsetX = event.nativeEvent.contentOffset.x;
        const adjustedOffset = Math.max(0, offsetX);
        const frameIndex = Math.max(
          0,
          Math.min(frames.length - 1, Math.floor(adjustedOffset / FRAME_WIDTH)),
        );
        const newTime = Math.max(
          0,
          Math.min(
            duration,
            (frameIndex / Math.max(1, frames.length - 1)) * duration,
          ),
        );
        const formattedTime = formatTime(newTime);
        if (isCropping) {
          const boundedTime = Math.max(
            trimStartTime,
            Math.min(trimEndTime, newTime),
          );
          setCurrentTime(boundedTime);
          videoRef.current?.seek(boundedTime);
        } else {
          setCurrentTime(newTime);
          videoRef.current?.seek(newTime);
        }

        if (isCropping && isPlaying) {
          setIsPlaying(false);
        }
      }
    },
    [
      duration,
      frames.length,
      isCropping,
      trimStartTime,
      trimEndTime,
      isPlaying,
    ],
  );

  const onProgress = useCallback(
    (data: any) => {
      if (!isUserScrolling.current) {
        const newTime = data.currentTime;
        if (isCropping) {
          if (newTime >= trimEndTime - 0.1) {
            setCurrentTime(trimStartTime);
            videoRef.current?.seek(trimStartTime);
            setIsPlaying(false);
          } else if (newTime < trimStartTime) {
            setCurrentTime(trimStartTime);
            videoRef.current?.seek(trimStartTime);
          } else {
            setCurrentTime(newTime);
          }
        } else {
          setCurrentTime(newTime);
        }
        if (isPlaying && scrollViewRef.current && frames.length > 0) {
          let scrollTime = newTime;
          if (isCropping) {
            scrollTime = Math.max(
              trimStartTime,
              Math.min(trimEndTime, newTime),
            );
          }
          const scrollX = Math.floor(
            (scrollTime / duration) * (frames.length * FRAME_WIDTH),
          );
          scrollViewRef.current.scrollTo({x: scrollX, animated: false});
        }
      }
    },
    [
      duration,
      frames.length,
      isPlaying,
      isCropping,
      trimStartTime,
      trimEndTime,
    ],
  );

  const onVideoLoad = useCallback(
    (data: any) => {
      setDuration(data.duration);
      setIsVideoReady(true);
      if (videoUri) {
        generateFrames(videoUri, data.duration);
        scrollViewRef.current?.scrollTo({x: 0, animated: false});
      }
    },
    [videoUri],
  );

  const onMediaLoaded = useCallback(async (response: any) => {
    if (response.assets?.[0]?.uri) {
      await handleCleanup();
      setSplitPoints([]);
      setVideoUri(response.assets[0].uri);
      setMainHandlesVisible(true);
    }
  }, []);

  const handleUpdateSegment = useCallback(
    (segmentIndex: number, startFrame: number, endFrame: number) => {
      const segment = segments[segmentIndex];
      if (!segment) return;
      const segmentEndTime = splitPoints[segmentIndex]
        ? splitPoints[segmentIndex].time
        : duration;
      const maxEndFrame = Math.ceil(
        (segmentEndTime / duration) * frames.length,
      );

      setSegments(prevSegments => {
        const newSegments = [...prevSegments];
        newSegments[segmentIndex] = {
          startIndex: startFrame,
          endIndex: Math.min(endFrame, maxEndFrame),
        };
        return newSegments;
      });
      const startTime = frameToTimestamp(startFrame, frames.length, duration);
      const endTime = frameToTimestamp(
        Math.min(endFrame, maxEndFrame),
        frames.length,
        duration,
      );

      console.log(`
      Updated Segment ${segmentIndex + 1} Boundaries:
      Start Frame: ${startFrame} (${formatTime(startTime)})
      End Frame: ${endFrame} (${formatTime(endTime)})
      Max End Frame: ${maxEndFrame}
    `);
    },
    [segments, splitPoints, duration, frames.length],
  );

  const renderSplitMarkers = useCallback(() => {
    return (
      <View style={StyleSheet.absoluteFill}>
        {splitPoints.map(point => {
          const gapsBeforePoint =
            splitPoints.filter(p => p.frameIndex < point.frameIndex).length * 4;
          const absolutePosition =
            point.frameIndex * FRAME_WIDTH + gapsBeforePoint;
          return (
            <View
              key={point.id}
              style={[
                styles.splitPoint,
                {
                  transform: [{translateX: absolutePosition}],
                  height: FRAME_BAR_HEIGHT + 8,
                },
              ]}></View>
          );
        })}
      </View>
    );
  }, [splitPoints, frames.length]);

  const checkFrameIntersection = useCallback(
    (currentTime: number) => {
      const exactFramePosition = (currentTime / duration) * frames.length;
      const currentFrameIndex = Math.floor(exactFramePosition);
      const nextFrameIndex = Math.ceil(exactFramePosition);
      const distanceToNextFrame = Math.abs(exactFramePosition - nextFrameIndex);
      const distanceToPrevFrame = Math.abs(
        exactFramePosition - currentFrameIndex,
      );
      const allowance = 0; // 35% allowance
      const isNearBoundary =
        distanceToNextFrame <= allowance || distanceToPrevFrame <= allowance;
      console.log('isNearBoundary', isNearBoundary);
      const distanceFromCenter = Math.min(
        distanceToNextFrame,
        distanceToPrevFrame,
      );

      console.log(`
  === Intersection Check at ${formatTime(currentTime)} ===
  Frame Position: ${exactFramePosition.toFixed(3)}
  Current Frame: ${currentFrameIndex}
  Next Frame: ${nextFrameIndex}
  Distance to Previous Frame: ${distanceToPrevFrame.toFixed(3)}
  Distance to Next Frame: ${distanceToNextFrame.toFixed(3)}
  Allowance: ${allowance}
  Is Near Boundary: ${isNearBoundary ? 'YES' : 'NO'}
  ${isNearBoundary ? '✅ VALID SPLIT POSITION' : '❌ NOT AT INTERSECTION'}
  Closest Distance: ${distanceFromCenter.toFixed(3)}
  ${distanceToPrevFrame <= allowance ? '-> Near Previous Frame' : ''}
  ${distanceToNextFrame <= allowance ? '-> Near Next Frame' : ''}
  ==================================
      `);
      return {
        isNear: isNearBoundary,
        distanceFromCenter,
        debug: {
          exactPosition: exactFramePosition,
          currentFrame: currentFrameIndex,
          nextFrame: nextFrameIndex,
          distanceToNext: distanceToNextFrame,
          distanceToPrev: distanceToPrevFrame,
        },
      };
    },
    [duration, frames.length],
  );

  const handleAddSplit = useCallback(() => {
    if (!isVideoReady || !videoRef.current) return;
    const intersectionCheck = checkFrameIntersection(currentTime);
    const {isNear, distanceFromCenter, debug} = intersectionCheck;
    console.log(`
  === Split Attempt ===
  Time: ${formatTime(currentTime)}
  ${isNear ? '✅ Valid Position' : '❌ Invalid Position'}
  Frame Details:
  - Exact Position: ${debug.exactPosition.toFixed(3)}
  - Current Frame: ${debug.currentFrame}
  - Next Frame: ${debug.nextFrame}
  - Distance to Previous: ${debug.distanceToPrev.toFixed(3)}
  - Distance to Next: ${debug.distanceToNext.toFixed(3)}
  ==================
    `);
    if (!isNear) {
      showToast(
        'Please align with frame boundaries to add split point',
        'error',
      );
      return;
    }
    console.log(`
  === Adding Split Point ===
  ✅ Valid split position detected:
  Time: ${formatTime(currentTime)}
  Frame Index: ${debug.currentFrame}
  Closest Boundary Distance: ${Math.min(
    debug.distanceToNext,
    debug.distanceToPrev,
  ).toFixed(3)}
  =====================
    `);
    const currentFrameIndex = Math.floor(
      (currentTime / duration) * frames.length,
    );
    const newSplitPoint = {
      id: Date.now().toString(),
      time: frameToTimestamp(currentFrameIndex, frames.length, duration),
      frameIndex: currentFrameIndex,
    };
    const nearbyPoint = splitPoints.find(
      point => Math.abs(point.time - currentTime) < 0.5,
    );
    if (nearbyPoint) {
      showToast('A split point already exists near this position', 'error');
      return;
    }
    if (currentTime < 1 || currentTime > duration - 1) {
      showToast(
        'Please add split points at least 1 second from start/end',
        'error',
      );
      return;
    }
    setSplitPoints(prev => {
      const newPoints = [...prev, newSplitPoint].sort(
        (a, b) => a.time - b.time,
      );
      if (newPoints.length > 10) {
        showToast('Maximum of 10 split points allowed', 'error');
        return prev;
      }
      showToast('Split point added successfully', 'success');
      console.log(`
  === Split Point Added ===
  Position: ${formatTime(newSplitPoint.time)}
  Frame Index: ${newSplitPoint.frameIndex}
  Total Split Points: ${newPoints.length}
  ====================
      `);
      return newPoints;
    });
    splitPointPositions.value = {
      ...splitPointPositions.value,
      [newSplitPoint.id]: newSplitPoint.frameIndex * FRAME_WIDTH,
    };
  }, [currentTime, duration, frames.length, isVideoReady, splitPoints]);

  const handleSaveVideoSections = async () => {
    if (!videoUri || splitPoints.length === 0) {
      Alert.alert('Error', 'Please add split points first');
      return;
    }
    setIsProcessing(true);
    setProcessingProgress({
      segment: 0,
      total: splitPoints.length + 1,
      progress: 0,
    });
    try {
      const segments: VideoSegment[] = [];
      let startTime = 0;
      [...splitPoints, {time: duration}].forEach(point => {
        segments.push({
          startTime,
          endTime: point.time,
          duration: point.time - startTime,
        });
        startTime = point.time;
      });
      const downloadDir = rnfs.DownloadDirectoryPath;
      const appName = 'VideoSplitter';
      const appDir = `${downloadDir}/${appName}`;
      await rnfs.mkdir(appDir).catch(() => null);
      const outputPaths = await Promise.all(
        segments.map(async (segment, index) => {
          const outputPath = `${appDir}/segment_${index}_${Date.now()}.mp4`;
          const command = `-i "${videoUri}" -ss ${segment.startTime} -t ${segment.duration} -c copy "${outputPath}"`;
          await FFmpegKit.execute(command);
          setProcessingProgress(prev => ({
            ...prev!,
            segment: index + 1,
            progress: (index + 1) / segments.length,
          }));
          return outputPath;
        }),
      );
      Alert.alert('Success', `Saved ${segments.length} video segments`, [
        {text: 'OK', onPress: resetVideoState},
      ]);
      return outputPaths;
    } catch (error) {
      console.error('Video processing error:', error);
      Alert.alert('Error', 'Failed to process video segments');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(null);
    }
  };

  const togglePlayPause = useCallback(() => {
    if (isCropping && !isPlaying) {
      videoRef.current?.seek(trimStartTime);
      setCurrentTime(trimStartTime);
    }
    setIsPlaying(prev => !prev);
  }, [isCropping, trimStartTime]);

  const frameToTimestamp = (
    frameIndex: number,
    totalFrames: number,
    duration: number,
  ): number => {
    return Number(((frameIndex / (totalFrames - 1)) * duration).toFixed(3));
  };

  const handleSegmentSelect = useCallback(
    (index: number) => {
      setSelectedSegmentIndex(prevIndex => {
        const newIndex = prevIndex === index ? null : index;
        setMainHandlesVisible(newIndex === null);

        setIsFrameBarCompressed(newIndex !== null);
        // if (newIndex !== null && newIndex !== prevIndex) {
        //   const segmentStartTime =
        //     index === 0 ? 0 : splitPoints[index - 1].time;
        //   const segmentEndTime = splitPoints[index]
        //     ? splitPoints[index].time
        //     : duration;
        //   const startFrameIndex = Math.round(
        //     (segmentStartTime / duration) * (frames.length - 1),
        //   );
        //   const endFrameIndex = Math.round(
        //     (segmentEndTime / duration) * (frames.length - 1),
        //   );
        //   const currentSegment = segments[index] || {
        //     startIndex: startFrameIndex,
        //     endIndex: endFrameIndex,
        //   };
        //   const activeStartTime =
        //     (currentSegment.startIndex / (frames.length - 1)) * duration;
        //   const activeEndTime =
        //     (currentSegment.endIndex / (frames.length - 1)) * duration;
        //   const trimmedStart = Number(
        //     (activeStartTime - segmentStartTime).toFixed(3),
        //   );
        //   const trimmedEnd = Number(
        //     (segmentEndTime - activeEndTime).toFixed(3),
        //   );
        //   console.log(
        //     `
        //   Segment ${index + 1} Information:
        //   =============================
        //   Frame Indices:
        //   - Start Frame: ${currentSegment.startIndex}
        //   - End Frame: ${currentSegment.endIndex}
        //   - Total Frames: ${frames.length}

        //   Full Segment Boundaries:
        //   - Start: ${formatTime(segmentStartTime)}
        //   - End: ${formatTime(segmentEndTime)}
        //   - Total Duration: ${formatTime(segmentEndTime - segmentStartTime)}

        //   Active Region (Between Handles):
        //   - Start: ${formatTime(activeStartTime)}
        //   - End: ${formatTime(activeEndTime)}
        //   - Active Duration: ${formatTime(activeEndTime - activeStartTime)}

        //   Trimmed Portions:
        //   - Start Trim: ${formatTime(trimmedStart)}
        //   - End Trim: ${formatTime(trimmedEnd)}

        //   Raw Values:
        //   - Active End Time: ${activeEndTime}
        //   - Segment End Time: ${segmentEndTime}
        // `.replace(/^\s+/gm, ''),
        //   );
        // }
        if (newIndex !== null) {
          // Calculate segment position
          const segmentStartTime =
            index === 0 ? 0 : splitPoints[index - 1].time;
          const segmentEndTime = splitPoints[index]
            ? splitPoints[index].time
            : duration;
          scrollOffset.value = scrollViewRef.current?.contentOffset?.x || 0;
          const scrollPosition =
            (segmentStartTime / duration) * (frames.length * FRAME_WIDTH);
          scrollViewRef.current?.scrollTo({x: scrollPosition, animated: true});
        } else {
          scrollViewRef.current?.scrollTo({
            x: scrollOffset.value,
            animated: true,
          });
        }
        return newIndex;
      });
      if (videoRef.current) {
        const segmentStartTime = index === 0 ? 0 : splitPoints[index - 1].time;
        const segmentEndTime = splitPoints[index]
          ? splitPoints[index].time
          : duration;

        setCurrentTime(segmentStartTime);
        videoRef.current.seek(segmentStartTime);
        setSelectedTimeRange({
          start: segmentStartTime,
          end: segmentEndTime,
        });
      }
    },
    [splitPoints, duration, frames.length, segments],
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={() => setToastConfig(prev => ({...prev, visible: false}))}
      />
      <View>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => resetVideoState()}>
          <AntIcon name={'close'} size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!isCropping || isProcessing) && styles.toolDisabled,
          ]}
          onPress={() => handleSaveVideoSections()}
          disabled={!isCropping || isProcessing}>
          <AntIcon name={'check'} size={24} color="white" />
        </TouchableOpacity>
      </View>
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
          <View style={{height: 45, justifyContent: 'space-between'}}>
            <View style={styles.videoTimeContainer}>
              <Text style={styles.videoTimeText}>
                {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {width: `${(currentTime / duration) * 100}%`},
                ]}
              />
            </View>
          </View>
          <View style={styles.timelineContainer}>
            <View style={styles.playButtonContainer}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}>
                {isPlaying ? (
                  <Icon name={'controller-paus'} size={24} color="white" />
                ) : (
                  <Icon name={'controller-play'} size={24} color="white" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.contentContainer}>
              <View style={styles.centerLine} />
              <View style={styles.frameBarContainer}>
                <ScrollView
                  ref={scrollViewRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.framesContainer,
                    {
                      width:
                        frames.length * FRAME_WIDTH + TIMELINE_CENTER * 2 + 10,
                      paddingHorizontal: TIMELINE_CENTER,
                    },
                  ]}
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
                  bounces={false}
                  scrollEventThrottle={16}
                  removeClippedSubviews={true}
                  decelerationRate="fast">
                  {isGeneratingFrames ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.loadingText}>
                        {Math.round(frameGenerationProgress * 100)}%
                      </Text>
                    </View>
                  ) : isSplitMode ? (
                    <SegmentTimeline
                      frames={frames}
                      splitPoints={splitPoints}
                      onUpdateSegment={handleUpdateSegment}
                      duration={duration}
                    />
                  ) : (
                    <TouchableOpacity
                      style={[styles.framesWrapper, {position: 'relative'}]}>
                      {renderSplitMarkers()}
                      <FramePicks
                        data={frames}
                        splitPoints={splitPoints}
                        onRemoveSplit={id =>
                          setSplitPoints(prev => prev.filter(p => p.id !== id))
                        }
                        formatTime={formatTime}
                        isCropping={isCropping}
                        value={value}
                        duration={duration}
                        selectedSegmentIndex={selectedSegmentIndex}
                        onSegmentSelect={handleSegmentSelect}
                        isMainHandleVisible={true}
                      />
                    </TouchableOpacity>
                  )}
                  <View style={{width: TIMELINE_CENTER}} />
                </ScrollView>
              </View>
            </View>
          </View>
          <View style={styles.toolsContainer}>
            <TouchableOpacity
              style={[
                styles.tool,
                (isProcessing || isGeneratingFrames || isCropping) &&
                  styles.toolDisabled,
              ]}
              onPress={() => {
                if (isSplitSelecting) {
                  handleAddSplit();
                } else {
                  setIsSplitSelecting(true);
                }
              }}
              disabled={isProcessing || isGeneratingFrames || isCropping}>
              <SplitIcon height={27} width={27} />
              <Text style={styles.toolText}>
                {isSplitMode ? 'Add Split' : 'Split'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tool, isProcessing && styles.toolDisabled]}
              disabled={isProcessing}
              onPress={() => {
                setIsSplitSelecting(false);
                setIsCropping(false);
                setSplitPoints([]);
                setIsSplitMode(false);
                setMainHandlesVisible(true);
                setSelectedSegmentIndex(null);
              }}>
              <TrashIcon height={25} width={25} />
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
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  splitPoint: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
    width: 2,
    overflow: 'visible',
  },
  splitLine: {
    width: 3,
    height: '100%',
    backgroundColor: '#ff4444',
    position: 'relative',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  splitLineHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  removeSplitButton: {
    position: 'absolute',
    top: -25,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
    transform: [{translateX: -10.5}],
  },
  removeSplitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  splitTimeText: {
    position: 'absolute',
    bottom: -20,
    color: '#fff',
    fontSize: 12,
    width: 60,
    textAlign: 'center',
    left: -28.5,
    fontWeight: '500',
  },
  segmentContainer: {
    flex: 1,
    height: FRAME_BAR_HEIGHT,
  },
  timeRulerContainer: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    height: 20,
    overflow: 'hidden',
  },
  timelineContainer: {
    flex: 1,
  },
  playButtonContainer: {
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    height: 215,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  frameBarContainer: {
    position: 'relative',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  framesContainer: {
    backgroundColor: 'black',
    height: FRAME_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    flex: 1,
    marginTop: 30,
  },
  video: {
    width: '100%',
    height: '55%', // Reduced from 60%
  },
  videoTimeContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgb(0, 0, 0)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoTimeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  framesSection: {
    height: 120,
  },
  additionalBarsContainer: {
    marginTop: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
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
    right: 20,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 28,
    opacity: 0.9,
  },
  timeIndicator: {
    position: 'absolute',
    top: 50,
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
    marginLeft: 5,
  },
  toolsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 100,
    height: 60,
    backgroundColor: '#222',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tool: {
    padding: 20,
    alignItems: 'center',
  },
  toolDisabled: {
    opacity: 0.5,
  },
  toolText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'bold',
  },
  toolText2: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
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
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  progressText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 5,
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 5,
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90E2', // Progress bar color
    borderRadius: 5,
  },
  progressPercentage: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
  },
  splitRange: {
    position: 'absolute',
    height: FRAME_BAR_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#fff',
  },
  splitHandle: {
    position: 'absolute',
    width: 20,
    height: FRAME_BAR_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  splitHandleLeft: {
    paddingRight: 10,
  },
  splitHandleRight: {
    paddingLeft: 10,
  },
  handleBar: {
    width: 4,
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  inactiveRailSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: FRAME_BAR_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  trimmedArea: {
    flexDirection: 'row',
    alignItems: 'center',
    height: FRAME_BAR_HEIGHT,
    position: 'absolute',
  },
  // activeRailSlider: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   height: FRAME_BAR_HEIGHT,
  //   position: 'absolute',
  //   width: '50%',
  //   overflow: 'hidden',
  // },
  thumbContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    height: '100%',
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  thumbRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  framesWrapper: {
    flexDirection: 'row',
    height: FRAME_BAR_HEIGHT,
  },
  handleTime: {
    position: 'absolute',
    bottom: -20,
    color: '#fff',
    fontSize: 10,
    width: 60,
    textAlign: 'center',
  },
  trimmerContainer: {
    height: FRAME_BAR_HEIGHT, // Match frame bar height exactly
    alignSelf: 'stretch',
    position: 'relative',
  },
});

export default VideoClip;
