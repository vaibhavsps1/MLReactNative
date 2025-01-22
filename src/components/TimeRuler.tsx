// TimeRuler.tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface TimeRulerProps {
  duration: number;
  width: number;
}

const TimeRuler: React.FC<TimeRulerProps> = ({duration, width}) => {
  const secondMarkers = [];
  const secondsCount = Math.ceil(duration);
  const markerWidth = width / secondsCount;

  for (let i = 0; i < secondsCount; i++) {
    secondMarkers.push(
      <View key={i} style={[styles.markerContainer, {width: markerWidth}]}>
        <View style={styles.marker} />
        <Text style={styles.markerText}>{`${i}.00`}</Text>
      </View>
    );
  }

  return <View style={styles.container}>{secondMarkers}</View>;
};

const styles = StyleSheet.create({
  container: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#000',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 1,
    height: 10,
    backgroundColor: '#666',
  },
  markerText: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
});

export default TimeRuler;