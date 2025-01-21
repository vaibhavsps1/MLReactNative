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
import {VideoUtils} from './services/VideoUtils';
import {Frame} from './types';
import AudioTrimTimelineFun from './components/AudioTrimTimelineFun';
import FramePicks from './components/FramePicks';
import {trimVideo} from './FrameTrim';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<any>(0);
  const [duration, setDuration] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);
  const [frameGenerationProgress, setFrameGenerationProgress] = useState(0);
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
  const [isFrameBarTouched, setIsFrameBarTouched] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [saveButtonDisabled, setSaveButtonDisabled] = useState(true);
  const [trimStartTime, setTrimStartTime] = useState(0);
  const [trimEndTime, setTrimEndTime] = useState(0);

  const startSplitPosition = useSharedValue(0);
  const endSplitPosition = useSharedValue(0);

  const videoRef = useRef<Video>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);

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

  const handleValueChange = (newValue: {min: number; max: number}) => {
    setValue(newValue);
    const newStartTime = frameToTimestamp(
      newValue.min,
      frames.length,
      duration,
    );
    const newEndTime = frameToTimestamp(newValue.max, frames.length, duration);
    const newTrimStartTime = parseTimeToSeconds(newStartTime);
    const newTrimEndTime = parseTimeToSeconds(newEndTime);

    setTrimStartTime(newTrimStartTime);
    setTrimEndTime(newTrimEndTime);

    if (currentTime < newTrimStartTime || currentTime > newTrimEndTime) {
      setCurrentTime(newTrimStartTime);
      videoRef.current?.seek(newTrimStartTime);
      if (isPlaying) {
        setIsPlaying(false);
      }
    }
  };

  const parseTimeToSeconds = (timestamp: string): number => {
    const [minutes, rest] = timestamp.split(':');
    const [seconds, milliseconds] = rest.split('.');
    return (
      parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 100
    );
  };

  const handleFrameTrim = async () => {
    setIsCropping(true);
    trimVideo(
      videoUri,
      frameToTimestamp(value.min, frames.length, duration),
      frameToTimestamp(value.max, frames.length, duration),
    );
    try {
      const downloadDir = rnfs.DownloadDirectoryPath;
      const appName = 'FrameTrimmer';
      const appDir = `${downloadDir}/${appName}`;

      const exists = await rnfs.exists(appDir);
      if (!exists) {
        await rnfs.mkdir(appDir);
      }

      const outputPath = `${downloadDir}/${appName}/trimmed_${Date.now()}.mp4`;
      const command = `-i "${videoUri}" -ss ${frameToTimestamp(
        value.min,
        frames.length,
        duration,
      )} -to ${frameToTimestamp(
        value.max,
        frames.length,
        duration,
      )} -c copy "${outputPath}"`;

      await FFmpegKit.execute(command);
      Alert.alert('Success', `Video saved to: ${outputPath}`, [
        {
          text: 'OK',
          onPress: async () => {
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            setIsVideoReady(false);
            setFrames([]);
            setIsGeneratingFrames(false);
            setFrameGenerationProgress(0);
            setValue({min: 0, max: 0});
            setIsProcessing(false);
            setIsSplitSelecting(false);
            setSplitPoints([]);
            setProcessingProgress(null);
            setSelectedTimeRange({start: 0, end: 0});
            setIsFrameBarTouched(false);
            setIsCropping(false);
            setSaveButtonDisabled(true);
            setTrimStartTime(0);
            setTrimEndTime(0);
            setVideoUri(null);
            await handleCleanup();
          },
        },
      ]);
    } catch (error) {
      console.error('Trim error:', error);
      Alert.alert('Error', 'Failed to trim video');
    }
  };

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
            setIsPlaying(false); // Stop at the end of trim
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
    }
  }, []);

  const frameToTimestamp = useCallback(
    (frameIndex: number, totalFrames: number, duration: number): string => {
      const totalSeconds = (frameIndex / totalFrames) * duration;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      const milliseconds = Math.floor((totalSeconds % 1) * 100);
      return `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    },
    [],
  );

  const handleSaveVideoSections = async () => {
    if (isCropping) {
      handleFrameTrim();
      return;
    }
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
      const outputPaths = await Promise.all(
        segments.map((segment, index) =>
          processingProgress(segment, index, segments.length),
        ),
      );
      Alert.alert(
        'Success',
        `Successfully saved ${segments.length} video segments`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetVideoState();
            },
          },
        ],
      );
      return outputPaths;
    } catch (error) {
      console.error('Video processing error:', error);
      Alert.alert(
        'Error',
        'Failed to process video segments. Please try again.',
      );
    } finally {
      setIsProcessing(false);
      setProcessingProgress(null);
    }
  };

  const renderSplitMarkers = useCallback(
    () => (
      <View style={StyleSheet.absoluteFill}>
        {splitPoints.map(point => (
          <View
            key={point.id}
            style={[
              styles.splitPoint,
              {
                transform: [{translateX: point.frameIndex * FRAME_WIDTH}],
                height: FRAME_BAR_HEIGHT + 20,
              },
            ]}>
            <TouchableOpacity
              style={styles.removeSplitButton}
              onPress={() =>
                setSplitPoints(prev => prev.filter(p => p.id !== point.id))
              }>
              <Text style={styles.removeSplitText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.splitLine} />
            <Text style={styles.splitTimeText}>{formatTime(point.time)}</Text>
          </View>
        ))}
      </View>
    ),
    [splitPoints, formatTime],
  );

  const handleAddSplitPoint = useCallback(() => {
    if (!isVideoReady) return;
    setIsPlaying(false);
    const newSplitPoint = {
      id: Date.now().toString(),
      time: currentTime,
      frameIndex: value.max,
    };

    setSplitPoints(prev => {
      const newSplits = [...prev, newSplitPoint].sort(
        (a, b) => a.time - b.time,
      );
      startSplitPosition.value = value.max * FRAME_WIDTH;
      endSplitPosition.value = frames.length * FRAME_WIDTH;
      setSelectedTimeRange({
        start: currentTime,
        end: duration,
      });
      setValue({
        min: value.max,
        max: frames.length,
      });

      return newSplits;
    });
  }, [duration, frames.length, isVideoReady, isSplitSelecting, value]);

  const togglePlayPause = useCallback(() => {
    if (isCropping && !isPlaying) {
      videoRef.current?.seek(trimStartTime);
      setCurrentTime(trimStartTime);
    }
    setIsPlaying(prev => !prev);
  }, [isCropping, trimStartTime]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => resetVideoState()}>
        <Icon name={'cross'} size={24} color="white" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.nextButton,
          (!isCropping || isProcessing) && styles.toolDisabled,
        ]}
        onPress={() => handleSaveVideoSections()}
        disabled={!isCropping || isProcessing}>
        <Text style={styles.toolText2}>Save</Text>
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
          <View style={styles.timelineContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayPause}>
              {isPlaying ? (
                <Icon name={'controller-paus'} size={24} color="white" />
              ) : (
                <Icon name={'controller-play'} size={24} color="white" />
              )}
            </TouchableOpacity>
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
                // PerformanceEntry;
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
              ) : (
                <TouchableOpacity
                  style={[styles.framesWrapper, {position: 'relative'}]}>
                  {renderSplitMarkers()}
                  {!isSplitSelecting ? (
                    <FramePicks
                      data={frames}
                      splitPoints={splitPoints}
                      onRemoveSplit={id =>
                        setSplitPoints(prev => prev.filter(p => p.id !== id))
                      }
                      formatTime={formatTime}
                      isCropping={isCropping}
                      value={value}
                    />
                  ) : (
                    <View style={styles.trimmerContainer}>
                      <AudioTrimTimelineFun
                        min={0}
                        max={frames.length - 1}
                        step={1}
                        timestampStart={frameToTimestamp(
                          value.min,
                          frames.length,
                          duration,
                        )}
                        timestampEnd={frameToTimestamp(
                          value.max,
                          frames.length,
                          duration,
                        )}
                        sliderWidth={frames.length * FRAME_WIDTH - 20}
                        onChangeHandler={handleValueChange}
                        handleStyle={{
                          width: 4,
                          height: FRAME_BAR_HEIGHT,
                          backgroundColor: '#fff',
                          borderRadius: 0,
                        }}
                        railStyle={{
                          borderColor: '#fff',
                          borderWidth: 2,
                          backgroundColor: 'transparent',
                        }}
                        renderRails={() => (
                          <FramePicks
                            data={frames}
                            splitPoints={splitPoints}
                            onRemoveSplit={id =>
                              setSplitPoints(prev =>
                                prev.filter(p => p.id !== id),
                              )
                            }
                            formatTime={formatTime}
                            isCropping={isCropping}
                            value={value}
                          />
                        )}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              <View style={{width: TIMELINE_CENTER}} />
            </ScrollView>
          </View>
          <View style={styles.toolsContainer}>
            <TouchableOpacity
              style={[styles.tool, isProcessing && styles.toolDisabled]}
              onPress={() => {
                setIsCropping(true);
                setIsSplitSelecting(true);
              }}
              disabled={isProcessing || isGeneratingFrames}>
              <Text style={styles.toolText}>Trim</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tool,
                (isProcessing || isGeneratingFrames || isCropping) &&
                  styles.toolDisabled,
              ]}
              onPress={() => {
                if (isSplitSelecting) {
                  handleAddSplitPoint();
                } else {
                  setIsSplitSelecting(true);
                }
              }}
              disabled={isProcessing || isGeneratingFrames || isCropping}>
              <Text style={styles.toolText}>Split</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tool,
                (isProcessing || !splitPoints.length) && styles.toolDisabled,
              ]}
              onPress={() => setSplitPoints([])}
              disabled={isProcessing || !splitPoints.length}>
              <Text style={styles.toolText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tool, isProcessing && styles.toolDisabled]}
              disabled={isProcessing}
              onPress={() => {
                setIsSplitSelecting(false);
                setIsCropping(false);
              }}>
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
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '70%',
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
  buttonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playButton: {
    alignSelf: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  centerLine: {
    position: 'absolute',
    left: TIMELINE_CENTER,
    top: 70,
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
  splitPoint: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1,
    width: 3,
    bottom: 10,
  },
  splitLine: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ff4444',
  },
  removeSplitButton: {
    position: 'absolute',
    top: -25,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeSplitText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  splitTimeText: {
    position: 'absolute',
    bottom: -20,
    color: '#fff',
    fontSize: 10,
    width: 60,
    textAlign: 'center',
    left: -28,
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
  toolDisabled: {
    opacity: 0.5,
  },
  toolText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90E2',
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
  activeRailSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: FRAME_BAR_HEIGHT,
    position: 'absolute',
    width: '50%',
    overflow: 'hidden',
  },
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
    height: 120,
    marginTop: 10,
    alignSelf: 'center',
  },
  framePicksContainer: {
    flexDirection: 'row',
  },

  markerWrapper: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    zIndex: 100,
  },
  markerLine: {
    height: '100%',
    width: 3,
    backgroundColor: '#ff4444',
    position: 'relative',
  },
  marker: {
    position: 'absolute',
    top: 0,
    left: -2,
    width: 7,
    height: '100%',
    backgroundColor: '#ff4444',
  },
  removeButton: {
    position: 'absolute',
    top: -25,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
  },
  removeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markerTime: {
    position: 'absolute',
    bottom: -20,
    color: '#fff',
    fontSize: 10,
    width: 60,
    textAlign: 'center',
    marginLeft: -30,
  },
  timelineContainer: {
    width: '100%',
    flex: 1,
    backgroundColor: '#000',
  },
  progressLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 5,
  },
  frameWrapper: {
    height: FRAME_BAR_HEIGHT,
    position: 'relative',
    marginRight: 1,
    overflow: 'hidden', // This will keep frame content within bounds
  },
  trimSelection: {
    borderColor: '#fff',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default VideoClip;
