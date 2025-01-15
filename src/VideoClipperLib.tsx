import * as React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  NativeEventEmitter,
  NativeModules,
  Modal,
  BackHandler,
  Alert,
  Platform,
} from 'react-native';
import {
  cleanFiles,
  deleteFile,
  listFiles,
  showEditor,
  isValidFile,
} from 'react-native-video-trim';
import {
  launchImageLibrary,
  type ImagePickerResponse,
  type Asset,
} from 'react-native-image-picker';

interface VideoTrimEvent {
  name: string;
  data?: any;
}

export default function VideoClipperLib() {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.VideoTrim);
    const subscription = eventEmitter.addListener('VideoTrim', handleTrimEvent);

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => {
      subscription.remove();
      backHandler.remove();
    };
  }, []);

  const handleTrimEvent = (event: VideoTrimEvent) => {
    console.log(`Event: ${event.name}`, event.data);
    switch (event.name) {
      case 'onFinishTrimming':
        setIsProcessing(false);
        Alert.alert('Success', 'Video trimming completed!');
        break;
      case 'onError':
        setIsProcessing(false);
        Alert.alert('Error', 'Failed to trim video');
        break;
    }
  };

  const handleBackPress = () => {
    if (isProcessing) {
      Alert.alert(
        'Warning',
        'Video processing in progress. Are you sure you want to exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: BackHandler.exitApp },
        ]
      );
      return true;
    }
    return false;
  };

  const handleMediaPicker = async () => {
    try {
      setIsProcessing(true);
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        includeExtra: true,
        assetRepresentationMode: 'current',
      });
      if (result.errorCode) {
        throw new Error(result.errorMessage);
      }
      const videoUri = result.assets?.[0]?.uri;
      if (!videoUri) {
        throw new Error('No video selected');
      }
      const isValid = await isValidFile(videoUri);
      if (!isValid) {
        throw new Error('Invalid video file');
      }
      await showEditor(videoUri, {
        minDuration: 5,
        maxDuration: 15,
        fullScreenModalIOS: true,
        saveToPhoto: true,
        removeAfterSavedToPhoto: true,
        enableHapticFeedback: Platform.OS === 'ios',
        autoplay: true,
        headerTextSize: 20,
        headerTextColor: '#FF0000',
        trimmingText: 'Trimming Video...',
      });
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanFiles = async () => {
    try {
      const result = await cleanFiles();
      Alert.alert('Success', 'Files cleaned successfully');
      console.log('Clean files result:', result);
    } catch (error) {
      Alert.alert('Error', 'Failed to clean files');
    }
  };

  const handleDeleteFile = async () => {
    try {
      const files = await listFiles();
      if (files.length > 0) {
        const result = await deleteFile(files[0]);
        Alert.alert('Success', 'File deleted successfully');
        console.log('Delete file result:', result);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete file');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleMediaPicker}
        disabled={isProcessing}
        style={[styles.button, isProcessing && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {isProcessing ? 'Processing...' : 'Launch Library'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleCleanFiles}
        style={[styles.button, styles.buttonBlue]}
      >
        <Text style={styles.buttonText}>Clean Files</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDeleteFile}
        style={[styles.button, styles.buttonPurple]}
      >
        <Text style={styles.buttonText}>Delete File</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[styles.button, styles.buttonGreen]}
      >
        <Text style={styles.buttonText}>Open Modal</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.container, styles.modalContainer]}>
          <TouchableOpacity
            onPress={handleMediaPicker}
            style={styles.button}
            disabled={isProcessing}
          >
            <Text style={styles.buttonText}>Launch Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={[styles.button, styles.buttonBlue]}
          >
            <Text style={styles.buttonText}>Close Modal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  button: {
    padding: 15,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonBlue: {
    backgroundColor: '#4444ff',
  },
  buttonGreen: {
    backgroundColor: '#44aa44',
  },
  buttonPurple: {
    backgroundColor: '#884488',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
