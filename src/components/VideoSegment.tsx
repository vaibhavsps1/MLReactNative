import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, PanResponder } from 'react-native';
import { CONSTRAINTS } from '../utils/segmentManager';
import { Frame, SegmentBounds, PreviewState } from '../types';

interface VideoSegmentProps {
  segment: {
    start: number;
    end: number;
    isFullTimeline?: boolean;
  };
  frames: Frame[];
  isSelected: boolean;
  frameWidth: number;
  barHeight: number;
  segmentIndex: number;
  activeHandle: 'left' | 'right' | null;
  dynamicWidth?: number;
  onSelect: (index: number) => void;
  onPreview: (time: number) => void;
  onSegmentChange: (segmentIndex: number, newBounds: SegmentBounds) => void;
}

const VideoSegment: React.FC<VideoSegmentProps> = React.memo(({
  segment,
  frames,
  isSelected,
  frameWidth,
  barHeight,
  segmentIndex,
  activeHandle,
  dynamicWidth,
  onSelect,
  onPreview,
  onSegmentChange,
}) => {
  const [previewState, setPreviewState] = useState<PreviewState>({
    isActive: false,
    time: 0,
    loading: false
  });
  
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPreviewTime = useRef<number>(0);

  const handlePreview = useCallback((time: number) => {
    const currentTime = Date.now();
    
    if (currentTime - lastPreviewTime.current >= CONSTRAINTS.PREVIEW_THROTTLE) {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      
      setPreviewState(prev => ({ ...prev, loading: true }));
      
      previewTimeoutRef.current = setTimeout(() => {
        onPreview(time);
        setPreviewState({
          isActive: true,
          time,
          loading: false
        });
      }, CONSTRAINTS.SEEK_DELAY);
      
      lastPreviewTime.current = currentTime;
    }
  }, [onPreview]);

  const createPanHandler = useCallback((edge: 'left' | 'right') => {
    let lastDx = 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        setPreviewState(prev => ({ ...prev, isActive: true }));
        lastDx = 0;
      },
      
      onPanResponderMove: (_, gestureState) => {
        const dx = gestureState.dx - lastDx;
        const frameShift = Math.floor(dx / frameWidth);
        
        if (frameShift !== 0) {
          const newBounds = calculateNewBounds(edge, frameShift);
          if (validateBounds(newBounds)) {
            onSegmentChange(segmentIndex, newBounds);
            handlePreview(edge === 'left' ? newBounds.startTime : newBounds.endTime);
          }
          lastDx = gestureState.dx;
        }
      },
      
      onPanResponderRelease: () => {
        if (previewTimeoutRef.current) {
          clearTimeout(previewTimeoutRef.current);
        }
        setPreviewState({ isActive: false, time: 0, loading: false });
      },
    });
  }, [frameWidth, segmentIndex, onSegmentChange, handlePreview]);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  const calculateNewBounds = (edge: 'left' | 'right', frameShift: number): SegmentBounds => {
    const currentStart = segment.start;
    const currentEnd = segment.end;
    
    return edge === 'left' 
      ? { startFrame: currentStart + frameShift, endFrame: currentEnd }
      : { startFrame: currentStart, endFrame: currentEnd + frameShift };
  };

  const validateBounds = (bounds: SegmentBounds): boolean => {
    const duration = bounds.endFrame - bounds.startFrame;
    return duration >= CONSTRAINTS.MIN_FRAMES;
  };

  const segmentWidth = dynamicWidth ?? (segment.end - segment.start + 1) * frameWidth;

  return (
    <TouchableOpacity
      onPress={() => onSelect(segmentIndex)}
      style={[
        styles.container,
        { width: segmentWidth },
        isSelected && styles.selectedContainer,
      ]}>
      {frames
        .slice(segment.start, segment.end + 1)
        .map((frame, index) => (
          <View key={index} style={[styles.frameWrapper, { width: frameWidth }]}>
            <Image
              source={{ uri: `file://${frame.uri}` }}
              style={[styles.frameImage, { width: frameWidth }]}
              resizeMode="cover"
            />
          </View>
        ))}

      {isSelected && (
        <>
          <Handle
            position="left"
            isActive={activeHandle === 'left'}
            panHandler={createPanHandler('left')}
          />
          <Handle
            position="right"
            isActive={activeHandle === 'right'}
            panHandler={createPanHandler('right')}
          />
        </>
      )}

      <View style={[styles.border, isSelected && styles.selectedBorder]} />
    </TouchableOpacity>
  );
});

interface HandleProps {
  position: 'left' | 'right';
  isActive: boolean;
  panHandler: ReturnType<typeof PanResponder.create>;
}

const Handle: React.FC<HandleProps> = React.memo(({ position, isActive, panHandler }) => (
  <View
    {...panHandler.panHandlers}
    style={[
      styles.handle,
      position === 'left' ? styles.leftHandle : styles.rightHandle,
      isActive && styles.activeHandle,
    ]}>
    <View style={styles.gripLine} />
  </View>
));

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'visible',
    backgroundColor: 'black',
    position: 'relative',
  },
  selectedContainer: {
    backgroundColor: '#3A3A3A',
    zIndex: 1,
  },
  frameWrapper: {
    position: 'relative',
    height: '100%',
  },
  frameImage: {
    height: '100%',
    backgroundColor: '#333',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#a6a6a6',
    backgroundColor: 'transparent',
  },
  selectedBorder: {
    borderColor: 'white',
    borderWidth: 2.5,
  },
  handle: {
    position: 'absolute',
    width: 20,
    height: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  leftHandle: {
    left: -10,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  rightHandle: {
    right: -10,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  gripLine: {
    width: 2,
    height: '60%',
    backgroundColor: 'black',
    borderRadius: 1,
  },
  activeHandle: {
    backgroundColor: '#E1E1E1',
    transform: [{ scale: 1.1 }],
  },
});

export default VideoSegment;