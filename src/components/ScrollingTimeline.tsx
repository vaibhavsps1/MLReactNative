import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Frame, SplitPoint } from '../types';

const FRAME_WIDTH = 50;
const FRAME_BAR_HEIGHT = 50;
const SEGMENT_GAP = 8;
const TIMELINE_CENTER = Dimensions.get('window').width / 2;

interface ScrollingTimelineProps {
  frames: Frame[];
  splitPoints: SplitPoint[];
  duration: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onSplitPointsChange: (points: SplitPoint[]) => void;
  onAddSplit?: () => void;
  isPlaying: boolean;
}

export const ScrollingTimeline: React.FC<ScrollingTimelineProps> = ({
  frames,
  splitPoints,
  duration,
  currentTime,
  onTimeChange,
  onSplitPointsChange,
  onAddSplit,
  isPlaying,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  const isUserScrolling = useRef(false);

  const totalWidth = React.useMemo(() => {
    const baseWidth = frames.length * FRAME_WIDTH;
    const gapsWidth = splitPoints.length * SEGMENT_GAP;
    return baseWidth + gapsWidth;
  }, [frames.length, splitPoints.length]);

  useEffect(() => {
    if (!isUserScrolling.current && scrollViewRef.current && isPlaying) {
      const scrollPosition = (currentTime / duration) * totalWidth;
      scrollViewRef.current.scrollTo({ x: scrollPosition, animated: false });
    }
  }, [currentTime, duration, totalWidth, isPlaying]);

  const handleScroll = (event: any) => {
    if (isUserScrolling.current) {
      const offsetX = event.nativeEvent.contentOffset.x;
      setScrollX(offsetX);
      const newTime = (offsetX / totalWidth) * duration;
      onTimeChange(Math.max(0, Math.min(duration, newTime)));
    }
  };

  const renderSplitMarkers = () => (
    <View style={StyleSheet.absoluteFill}>
      {splitPoints.map((point, index) => {
        const absolutePosition = point.frameIndex * FRAME_WIDTH + (index * SEGMENT_GAP);
        return (
          <View key={point.id} style={[styles.splitPoint, { transform: [{ translateX: absolutePosition }] }]}>
            <TouchableOpacity
              style={styles.removeSplitButton}
              onPress={() => onSplitPointsChange(splitPoints.filter(p => p.id !== point.id))}>
              <Text style={styles.removeSplitText}>×</Text>
            </TouchableOpacity>
            <View style={styles.splitLine} />
            <Text style={styles.splitTimeText}>{formatTime(point.time)}</Text>
          </View>
        );
      })}
    </View>
  );

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isUserScrolling.current = true;
        }}
        onScrollEndDrag={() => {
          setTimeout(() => {
            isUserScrolling.current = false;
          }, 50);
        }}>
        <View style={{ width: TIMELINE_CENTER }} />
        <View style={[styles.framesContainer, { width: totalWidth }]}>
          {frames.map((frame, index) => (
            <React.Fragment key={index}>
              <View style={styles.frameWrapper}>
                <Image
                  source={{ uri: `file://${frame.uri}` }}
                  style={styles.frame}
                  resizeMode="cover"
                />
              </View>
              {splitPoints.find(p => p.frameIndex === index) && (
                <View style={styles.gap} />
              )}
            </React.Fragment>
          ))}
          {renderSplitMarkers()}
        </View>
        <View style={{ width: TIMELINE_CENTER }} />
      </ScrollView>
      
      <View style={[styles.currentTimeIndicator, { left: TIMELINE_CENTER - 1 }]} />
      
      {onAddSplit && (
        <TouchableOpacity
          style={[styles.splitButton, { left: TIMELINE_CENTER - 15 }]}
          onPress={onAddSplit}>
          <View style={styles.splitButtonInner} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: FRAME_BAR_HEIGHT + 30,
    position: 'relative',
  },
  framesContainer: {
    flexDirection: 'row',
    height: FRAME_BAR_HEIGHT,
  },
  frameWrapper: {
    width: FRAME_WIDTH,
    height: FRAME_BAR_HEIGHT,
  },
  frame: {
    width: '100%',
    height: '100%',
  },
  gap: {
    width: SEGMENT_GAP,
    height: FRAME_BAR_HEIGHT,
  },
  splitPoint: {
    position: 'absolute',
    height: FRAME_BAR_HEIGHT + 8,
    alignItems: 'center',
    zIndex: 100,
  },
  splitLine: {
    width: 3,
    height: '100%',
    backgroundColor: '#ff4444',
    borderRadius: 1.5,
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
  },
  currentTimeIndicator: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: FRAME_BAR_HEIGHT,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  splitButton: {
    position: 'absolute',
    top: -30,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  splitButtonInner: {
    width: 14,
    height: 2,
    backgroundColor: '#fff',
  },
});

export default ScrollingTimeline;