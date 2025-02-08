import React from 'react';
import { View, StyleSheet } from 'react-native';

interface HandleProps {
  position: 'left' | 'right';
  isActive: boolean;
  panHandlers: any;
  handleWidth?: number;
  barHeight?: number;
}

export const SegmentHandle: React.FC<HandleProps> = ({
  position,
  isActive,
  panHandlers,
  handleWidth = 16,
  barHeight = 40,
}) => {
  return (
    <View
      {...panHandlers}
      style={[
        styles.handle,
        position === 'left' ? styles.leftHandle : styles.rightHandle,
        isActive && styles.activeHandle,
        { 
          width: handleWidth,
          height: barHeight,
          zIndex: isActive ? 200 : 100 
        },
      ]}>
      <View style={styles.gripContainer}>
        <View style={styles.gripLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    left: -8,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  rightHandle: {
    right: -8,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  activeHandle: {
    backgroundColor: '#E1E1E1',
    transform: [{ scale: 1.1 }],
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  gripContainer: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gripLine: {
    width: 2,
    height: 14,
    backgroundColor: 'black',
    borderRadius: 1,
    marginVertical: 2,
  },
});