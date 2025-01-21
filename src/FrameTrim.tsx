import React, { FC, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Image, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { FFmpegKit } from 'ffmpeg-kit-react-native';
import rnfs from 'react-native-fs';
import VideoTrimTimelineFun from './components/VideoTrimTimelineFun';


const FRAME_WIDTH = 50; // Adjust as needed

type Props = NativeStackScreenProps<RootStackParamList, 'FrameTrim'>;

interface Frame {
  uri: string;
  status: string;
  timestamp: number;
}

const FramePicks: FC<{ data: Frame[] }> = ({ data }) => {
  return (
    <>
      {data.map((frame, index) => (
        <View
          key={index}
          style={{
            width: FRAME_WIDTH,
            height: 50,
            marginRight: index === data.length - 1 ? 0 : 3,
          }}>
          <Image
            source={{ uri: `file://${frame.uri}` }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 3,
            }}
            resizeMode="cover"
          />
        </View>
      ))}
    </>
  );
};

const frameToTimestamp = (frameIndex: number, totalFrames: number, duration: number): string => {
  const totalSeconds = (frameIndex / totalFrames) * duration;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 100);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};

export const trimVideo = async (path: string, start: string, end: string) => {
  try {
    const downloadDir = rnfs.DownloadDirectoryPath;
    const appName = 'FrameTrimmer';
    const appDir = `${downloadDir}/${appName}`;
    
    const exists = await rnfs.exists(appDir);
    if (!exists) {
      await rnfs.mkdir(appDir);
    }

    const outputPath = `${downloadDir}/${appName}/trimmed_${Date.now()}.mp4`;
    const command = `-i "${path}" -ss ${start} -to ${end} -c copy "${outputPath}"`;
    
    await FFmpegKit.execute(command);
    Alert.alert('Success', `Video saved to: ${outputPath}`);
  } catch (error) {
    console.error('Trim error:', error);
    Alert.alert('Error', 'Failed to trim video');
  }
};

const FrameTrim: FC<Props> = ({ route, navigation }) => {
  const { frames, path, duration } = route.params;
  const [value, setValue] = useState({ min: 0, max: frames.length });

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="black" />
        </Pressable>
        <Text style={styles.title}>Frame Trim</Text>
      </View>

      <View style={styles.trimmerContainer}>
        <VideoTrimTimelineFun
          min={0}
          max={frames.length}
          step={1}
          timestampStart={frameToTimestamp(value.min, frames.length, duration)}
          timestampEnd={frameToTimestamp(value.max, frames.length, duration)}
          sliderWidth={frames.length * (FRAME_WIDTH + 3)} // Adding gap
          onChangeHandler={values => setValue(values)}
          renderRails={() => (
            <View style={{ flexDirection: 'row' }}>
              <FramePicks data={frames} />
            </View>
          )}
        />
      </View>

      <Pressable
        onPress={() =>
          trimVideo(
            path,
            frameToTimestamp(value.min, frames.length, duration),
            frameToTimestamp(value.max, frames.length, duration)
          )
        }
        style={styles.trimButton}>
        <Icon name="content-cut" size={24} color="black" />
        <Text style={styles.trimButtonText}>Trim Video</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
    color: 'black',
  },
  trimmerContainer: {
    height: 120,
    marginTop: 20,
  },
  trimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trimButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
  },
});

export default FrameTrim;