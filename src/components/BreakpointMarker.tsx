import React from 'react';
import { View, StyleSheet } from 'react-native';

interface BreakpointProps {
  position: number;
  barHeight: number;
  isActive?: boolean;
  onRemove?: () => void;
}

export const BreakpointMarker: React.FC<BreakpointProps> = ({
  position,
  barHeight,
  isActive,
  onRemove,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          height: barHeight + 20,
          transform: [{ translateX: position - 1 }],
        },
        isActive && styles.active,
      ]}>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 2,
    top: -10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150,
  },
  line: {
    width: '100%',
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 1,
  },
  active: {
    transform: [{ scaleX: 1.5 }],
  },
  removeButton: {
    position: 'absolute',
    top: -20,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});