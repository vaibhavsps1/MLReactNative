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
import { SplitIcon, TrashIcon} from './utils/images';
import VideoSegment from './components/VideoSegment';
import SegmentTimeline from './components/SegmentTimeline';

// Constants
const {width: SCREEN_WIDTH} = Dimensions.get('window');
const FRAME_BAR_HEIGHT = 50;
const TIMELINE_CENTER = SCREEN_WIDTH / 2;
const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;
const TIME_INDICATOR_HEIGHT = 25;

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

  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(2, '0')}`;
  }, []);

  // const handleSegmentSelect = (index: number) => {
  //   setSelectedSegmentIndex(prevIndex => {
  //     const newIndex = prevIndex === index ? null : index;
  //     // Update main handles visibility based on selection
  //     setMainHandlesVisible(newIndex === null);
  //     return newIndex;
  //   });

  //   if (videoRef.current) {
  //     let segmentStartTime;
  //     let segmentEndTime;

  //     if (splitPoints.length === 0) {
  //       segmentStartTime = 0;
  //       segmentEndTime = duration;
  //     } else {
  //       segmentStartTime = index === 0 ? 0 : splitPoints[index - 1].time;
  //       segmentEndTime = splitPoints[index]
  //         ? splitPoints[index].time
  //         : duration;
  //     }

  //     setCurrentTime(segmentStartTime);
  //     videoRef.current.seek(segmentStartTime);

  //     setSelectedTimeRange({
  //       start: segmentStartTime,
  //       end: segmentEndTime,
  //     });
  //   }
  // };

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

  const getSegmentTimes = (
    splitPoints: SplitPoint[],
    totalDuration: number,
  ) => {
    const sortedPoints = [...splitPoints].sort((a, b) => a.time - b.time);
    const segments = [];
    let startTime = 0;
    sortedPoints.forEach(point => {
      segments.push([startTime, point.time]);
      startTime = point.time;
    });
    segments.push([startTime, totalDuration]);
    return segments;
  };

  const parseTimeToSeconds = (timestamp: string): number => {
    const [minutes, rest] = timestamp.split(':');
    const [seconds, milliseconds] = rest.split('.');
    return (
      parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 100
    );
  };

  // const handleFrameTrim = async () => {
  //   setIsCropping(true);
  //   trimVideo(
  //     videoUri,
  //     frameToTimestamp(value.min, frames.length, duration),
  //     frameToTimestamp(value.max, frames.length, duration),
  //   );
  //   try {
  //     const downloadDir = rnfs.DownloadDirectoryPath;
  //     const appName = 'FrameTrimmer';
  //     const appDir = `${downloadDir}/${appName}`;

  //     const exists = await rnfs.exists(appDir);
  //     if (!exists) {
  //       await rnfs.mkdir(appDir);
  //     }

  //     const outputPath = `${downloadDir}/${appName}/trimmed_${Date.now()}.mp4`;
  //     const command = `-i "${videoUri}" -ss ${frameToTimestamp(
  //       value.min,
  //       frames.length,
  //       duration,
  //     )} -to ${frameToTimestamp(
  //       value.max,
  //       frames.length,
  //       duration,
  //     )} -c copy "${outputPath}"`;

  //     await FFmpegKit.execute(command);
  //     Alert.alert('Success', `Video saved to: ${outputPath}`, [
  //       {
  //         text: 'OK',
  //         onPress: async () => {
  //           setIsPlaying(false);
  //           setCurrentTime(0);
  //           setDuration(0);
  //           setIsVideoReady(false);
  //           setFrames([]);
  //           setIsGeneratingFrames(false);
  //           setFrameGenerationProgress(0);
  //           setValue({min: 0, max: 0});
  //           setIsProcessing(false);
  //           setIsSplitSelecting(false);
  //           setSplitPoints([]);
  //           setProcessingProgress(null);
  //           setSelectedTimeRange({start: 0, end: 0});
  //           setIsCropping(false);
  //           setSaveButtonDisabled(true);
  //           setTrimStartTime(0);
  //           setTrimEndTime(0);
  //           setVideoUri(null);
  //           setIsSplitMode(false);
  //           await handleCleanup();
  //         },
  //       },
  //     ]);
  //   } catch (error) {
  //     console.error('Trim error:', error);
  //     Alert.alert('Error', 'Failed to trim video');
  //   }
  // };

  const handleScroll = useCallback(
    (event: any) => {
      if (isUserScrolling.current) {
        const offsetX = event.nativeEvent.contentOffset.x;
        const frameIndex = Math.floor(offsetX / FRAME_WIDTH);
        let newTime = Math.max(
          0,
          Math.min(duration, (frameIndex / frames.length) * duration),
        );
        if (isCropping) {
          newTime = Math.max(trimStartTime, Math.min(trimEndTime, newTime));
        }
        setCurrentTime(newTime);
        videoRef.current?.seek(newTime);
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
      setSegments(prevSegments => {
        const newSegments = [...prevSegments];
        newSegments[segmentIndex] = {
          startIndex: startFrame,
          endIndex: endFrame,
        };
        return newSegments;
      });
    },
    [],
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
              ]}>
              <View style={styles.splitLine} />
            </View>
          );
        })}
      </View>
    );
  }, [splitPoints, frames.length]);

  const handleAddSplit = useCallback(() => {
    if (!isVideoReady || !videoRef.current) return;
    const newSplitPoint = {
      id: Date.now().toString(),
      time: currentTime,
      frameIndex: Math.floor((currentTime / duration) * frames.length),
    };
    console.log('this newSplit', newSplitPoint);
    const nearbyPoint = splitPoints.find(
      point => Math.abs(point.time - currentTime) < 0.5,
    );
    if (nearbyPoint) {
      Alert.alert(
        'Split Point Exists',
        'A split point already exists near this position',
      );
      return;
    }
    if (currentTime < 1 || currentTime > duration - 1) {
      Alert.alert(
        'Invalid Position',
        'Please add split points at least 1 second from the start/end',
      );
      return;
    }
    setSplitPoints(prev => {
      const newPoints = [...prev, newSplitPoint].sort(
        (a, b) => a.time - b.time,
      );
      if (newPoints.length > 10) {
        Alert.alert(
          'Maximum Splits Reached',
          'You can have up to 10 split points',
        );
        return prev;
      }
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

  const frameToTimestamp = (frameIndex, totalFrames, duration) => {
    return (frameIndex / totalFrames) * duration;
  };

  // Enhanced handleSegmentSelect with detailed logging
  const handleSegmentSelect = index => {
    setSelectedSegmentIndex(prevIndex => {
      const newIndex = prevIndex === index ? null : index;
      setMainHandlesVisible(newIndex === null);
      if (newIndex !== null && newIndex !== prevIndex) {
        let segmentStartTime, segmentEndTime;
        if (splitPoints.length === 0) {
          segmentStartTime = 0;
          segmentEndTime = duration;
        } else {
          segmentStartTime = index === 0 ? 0 : splitPoints[index - 1].time;
          segmentEndTime = splitPoints[index]
            ? splitPoints[index].time
            : duration;
        }

        // Get current trim handles position
        const currentSegment = segments[index] || {
          startIndex: 0,
          endIndex: frames.length - 1,
        };

        // Calculate active region (between trim handles)
        const activeStartTime = frameToTimestamp(
          currentSegment.startIndex,
          frames.length,
          duration,
        );
        const activeEndTime = frameToTimestamp(
          currentSegment.endIndex,
          frames.length,
          duration,
        );

        // Calculate trimmed portions
        const trimmedStart = activeStartTime - segmentStartTime;
        const trimmedEnd = segmentEndTime - activeEndTime;

        console.log(
          `
        Segment ${index + 1} Information:
        =============================
        Full Segment Boundaries:
        - Start: ${formatTime(segmentStartTime)}
        - End: ${formatTime(segmentEndTime)}
        - Total Duration: ${formatTime(segmentEndTime - segmentStartTime)}
        
        Active Region (Between Handles):
        - Start: ${formatTime(activeStartTime)}
        - End: ${formatTime(activeEndTime)}
        - Active Duration: ${formatTime(activeEndTime - activeStartTime)}
        
        Trimmed Portions:
        - Start Trim: ${formatTime(trimmedStart)}
        - End Trim: ${formatTime(trimmedEnd)}
      `.replace(/^\s+/gm, ''),
        );
      }

      return newIndex;
    });

    if (videoRef.current) {
      let segmentStartTime;
      const segmentEndTime = splitPoints[index]
        ? splitPoints[index].time
        : duration;

      if (index === 0) {
        segmentStartTime = 0;
      } else {
        segmentStartTime = splitPoints[index - 1].time;
      }

      setCurrentTime(segmentStartTime);
      videoRef.current.seek(segmentStartTime);
      setSelectedTimeRange({
        start: segmentStartTime,
        end: segmentEndTime,
      });
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
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
                  scrollEventThrottle={16}
                  removeClippedSubviews={true}
                  decelerationRate="fast">
                  <View style={{width: TIMELINE_CENTER}} />
                  {isGeneratingFrames ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.loadingText}>
                        Generating frames...{' '}
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
    width: 3,
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
    marginLeft: 10,
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
    width: '110%',
    paddingRight: 120,
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
