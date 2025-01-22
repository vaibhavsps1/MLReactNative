// TimeRuler.tsx
import React from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TIMELINE_CENTER = SCREEN_WIDTH / 2;

interface TimeRulerProps {
  duration: number;
  width: number;
  frameWidth: number;
}

const TimeRuler: React.FC<TimeRulerProps> = ({duration, width, frameWidth}) => {
  const secondMarkers = [];
  const framesPerSecond = 30; // Should match your VideoUtils.FRAME_PER_SEC
  const totalFrames = Math.ceil(duration * framesPerSecond);
  const markerInterval = framesPerSecond * frameWidth; // Pixels per second

  // Start from center (white line)
  for (let i = 0; i <= totalFrames; i += framesPerSecond) {
    const position = (i * frameWidth) - TIMELINE_CENTER;
    const timeValue = (i / framesPerSecond).toFixed(1);
    
    secondMarkers.push(
      <View 
        key={i} 
        style={[
          styles.markerContainer, 
          {
            left: position,
            width: markerInterval,
          }
        ]}>
        <View style={styles.marker} />
        <Text style={styles.markerText}>{timeValue}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.rulerContainer, {width}]}>
      {secondMarkers}
    </View>
  );
};

const styles = StyleSheet.create({
  rulerContainer: {
    height: 20,
    position: 'relative',
  },
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  marker: {
    width: 1,
    height: 5,
    backgroundColor: '#666',
  },
  markerText: {
    color: '#666',
    fontSize: 10,
  },
});

export default TimeRuler;