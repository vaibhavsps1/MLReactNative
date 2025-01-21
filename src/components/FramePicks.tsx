import React, {useState} from 'react';
import {StyleSheet, View, Image, TouchableOpacity, Text} from 'react-native';
import {VideoUtils} from '../services/VideoUtils';

interface Frame {
  uri: string;
}

interface SplitPoint {
  id: string;
  time: number;
  frameIndex: number;
}


interface FramePicksProps {
  data: Frame[];
  splitPoints?: SplitPoint[];
  onAddSplit?: (frameIndex: number) => void;
  onRemoveSplit?: (id: string) => void;
  formatTime?: (time: number) => string;
  canSplit?: boolean;
  isCropping?: boolean; // Add this
  value?: {min: number; max: number}; // Add this
}

const FRAME_BAR_HEIGHT = 50;
const FRAME_WIDTH = VideoUtils.FRAME_WIDTH;

const FramePicks: React.FC<FramePicksProps> = React.memo(
  ({
    data,
    splitPoints = [],
    onAddSplit,
    onRemoveSplit,
    formatTime,
    canSplit = true,
    isCropping = false,
    value,
  }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handleFramePress = (index: number) => {
      if (canSplit) {
        setSelectedIndex(index === selectedIndex ? null : index);
      } else {
        const existingSplitPoint = splitPoints.find(
          point => point.frameIndex === index,
        );
        if (existingSplitPoint) {
          onRemoveSplit?.(existingSplitPoint.id);
        } else {
          onAddSplit?.(index);
        }
      }
    };

    const handleRemoveSplit = (id: string) => {
      onRemoveSplit?.(id);
    };

    return (
      <View style={styles.framePicksContainer}>
        {data.map((frame, index) => (
          <View key={index} style={styles.frameWrapper}>
            <Image
              source={{uri: `file://${frame.uri}`}}
              style={[
                styles.frameImage,
                index === selectedIndex && canSplit && styles.selectedFrame,
                splitPoints.some(point => point.frameIndex === index) &&
                  !canSplit &&
                  styles.disabledFrame,
              ]}
              resizeMode="cover"
              onPress={() => handleFramePress(index)}
            />
            {/* Add overlay for inactive frames */}
            {isCropping && value && (index < value.min || index > value.max) && (
              <View style={styles.inactiveOverlay} />
            )}
            {splitPoints.some(point => point.frameIndex === index) && (
              <View style={[styles.splitMarker, {left: point.frameIndex * 80}]}>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() =>
                    handleRemoveSplit(
                      splitPoints.find(point => point.frameIndex === index)!.id,
                    )
                  }>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
                {formatTime && (
                  <Text style={styles.markerTime}>
                    {formatTime(
                      splitPoints.find(point => point.frameIndex === index)!
                        .time,
                    )}
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  framePicksContainer: {
    flexDirection: 'row',
  },
  frameWrapper: {
    height: 50,
    position: 'relative',
    marginRight: 1, // Add small gap between frames
  },
  frameImage: {
    width: FRAME_WIDTH,
    height: FRAME_BAR_HEIGHT,
    backgroundColor: '#333',
  },
  selectedFrame: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  disabledFrame: {
    opacity: 0.5,
  },
  inactiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#151414',
    opacity: 0.85,
  },
  splitMarker: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    zIndex: 100,
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
});

export default FramePicks;
