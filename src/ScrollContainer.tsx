import React, { useRef } from 'react';
import { View, Dimensions } from 'react-native';
import RangeSlider from './CustomSlider';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ScrollContainer = () => {
  const videoRef = useRef(null);

  const handleRangeChange = (start: number, end: number) => {
    // console.log(`New range: ${start} - ${end}`);
  };

  const handlePreview = (time: number) => {
    videoRef.current?.seek(time);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <RangeSlider
        totalDuration={120}
        minimumSegmentDuration={0.5}
        onRangeChange={handleRangeChange}
        onPreview={handlePreview}
        width={SCREEN_WIDTH * 2}
      />
    </View>
  );
};

export default ScrollContainer;