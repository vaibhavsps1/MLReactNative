// VideoEditorScreen.tsx
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import Video from 'react-native-video';
import RNFS from 'react-native-fs';
import {FFmpegKit, FFmpegKitConfig, ReturnCode} from 'ffmpeg-kit-react-native';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const FRAME_BAR_HEIGHT = 80;
const FRAME_WIDTH = 40;
const FRAME_PER_SEC = 1;

const FRAME_STATUS = {
  READY: {
    name: {
      description: 'ready',
    },
  },
};

interface Frame {
  uri: string;
  status: string;
}

interface VideoEditorScreenProps {
  route: {params: {videoUri: string}};
  navigation: any;
}

const VideoEditorScreen = ({route, navigation}: VideoEditorScreenProps) => {
  const {videoUri} = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isLoadingFrames, setIsLoadingFrames] = useState(true);

  const videoRef = useRef(null);
  const scrollViewRef = useRef(null);
  const frameBarPosition = useRef(new Animated.Value(0)).current;

  const getFrames = (
    fileName: string,
    videoURI: string,
    frameNumber: number,
    successCallback: (filePath: string) => void,
    errorCallback: () => void,
    onFrameGenerated: (
      frameUri: string,
      processedFrames: number,
      totalFrames: number,
    ) => void,
  ) => {
    let outputImagePath = `${RNFS.CachesDirectoryPath}/${fileName}_%4d.png`;
    const ffmpegCommand = `-ss 0 -i ${videoURI} -vf "fps=${FRAME_PER_SEC}/1:round=up,scale=${FRAME_WIDTH}:-2" -vframes ${frameNumber} ${outputImagePath}`;

    FFmpegKit.executeAsync(
      ffmpegCommand,
      async session => {
        const state = FFmpegKitConfig.sessionStateToString(
          await session.getState(),
        );
        const returnCode = await session.getReturnCode();
        const failStackTrace = await session.getFailStackTrace();
        const duration = await session.getDuration();

        if (ReturnCode.isSuccess(returnCode)) {
          console.log(
            `Encode completed successfully in ${duration} milliseconds;.`,
          );
          successCallback(outputImagePath);
        } else {
          console.log('Encode failed. Please check log for the details.');
          console.log(
            `Encode failed with state ${state} and rc ${returnCode}.${failStackTrace}\\n`,
          );
          errorCallback();
        }
      },
      log => {},
      statistics => {
        const processedFrames = statistics.getVideoFrameNumber();
        const frameUri = `${outputImagePath.replace(
          '%4d',
          String(processedFrames).padStart(4, '0'),
        )}`;
        onFrameGenerated(frameUri, processedFrames, frameNumber);
      },
    ).then(session =>
      console.log(
        `Async FFmpeg process started with sessionId ${session.getSessionId()}.`,
      ),
    );
  };

  const generateFrames = () => {
    const fileName = 'frame';
    const numberOfFrames = Math.ceil(duration * FRAME_PER_SEC);

    getFrames(
      fileName,
      videoUri,
      numberOfFrames,
      (filePath: string) => {
        const _framesURI = [];
        for (let i = 0; i < numberOfFrames; i++) {
          _framesURI.push(
            `${filePath.replace('%4d', String(i + 1).padStart(4, '0'))}`,
          );
        }
        const _frames = _framesURI.map(_frameURI => ({
          uri: _frameURI,
          status: FRAME_STATUS.READY.name.description,
        }));
        setFrames(_frames);
        setIsLoadingFrames(false);
      },
      () => {
        setIsLoadingFrames(false);
      },
      () => {},
    );
  };

  const onLoad = data => {
    setDuration(data.duration);
    generateFrames();
  };

  const onProgress = data => {
    setCurrentTime(data.currentTime);
    // Update frame bar position while keeping current frame centered
    const position = (data.currentTime / duration) * (SCREEN_WIDTH * 2);
    frameBarPosition.setValue(position);
  };

  const onSeek = time => {
    if (videoRef.current) {
      videoRef.current.seek(time);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{uri: videoUri}}
          style={styles.video}
          resizeMode="contain"
          onLoad={onLoad}
          onProgress={onProgress}
          paused={!isPlaying}
          repeat={true}
        />

        {/* Play/Pause Button */}
        <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
          <Text style={styles.playButtonText}>{isPlaying ? '⏸️' : '▶️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Frame Bar */}
      <View style={styles.frameBarContainer}>
        <View style={styles.currentFrameIndicator} />
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.frameBarContent}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {x: frameBarPosition}}}],
            {useNativeDriver: true},
          )}>
          {isLoadingFrames ? (
            <Text style={styles.loadingText}>Generating frames...</Text>
          ) : (
            frames.map((frame, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => onSeek(index / FRAME_PER_SEC)}
                style={styles.frame}>
                <Image
                  source={{uri: `file://${frame.uri}`}}
                  style={styles.frameImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Bottom Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton}>
          <Text style={styles.toolbarButtonText}>Split</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton}>
          <Text style={styles.toolbarButtonText}>Trim</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton}>
          <Text style={styles.toolbarButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 24,
  },
  frameBarContainer: {
    height: FRAME_BAR_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    marginBottom: 80,
  },
  currentFrameIndicator: {
    position: 'absolute',
    width: 2,
    height: FRAME_BAR_HEIGHT,
    backgroundColor: '#007AFF',
    left: '50%',
    zIndex: 1,
  },
  frameBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH / 2, // Center the frames
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_BAR_HEIGHT - 20,
    marginHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    overflow: 'hidden',
  },
  frameImage: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  toolbar: {
    height: 80,
    backgroundColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  toolbarButton: {
    padding: 10,
  },
  toolbarButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default VideoEditorScreen;
