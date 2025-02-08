import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  Dimensions,
  ScrollView,
  Text,
  Animated,
} from 'react-native';

interface RangeSliderProps {
  totalDuration: number;
  minimumSegmentDuration?: number;
  onRangeChange?: (start: number, end: number) => void;
  onPreview?: (time: number) => void;
  width?: number;
}

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const HANDLE_WIDTH = 20;
const TIMELINE_CENTER = SCREEN_WIDTH / 2;
const MIN_SEGMENT_DURATION = 10;
const AUTOSCROLL_THRESHOLD = 0.2;
const AUTOSCROLL_SPEED = 3;
const SCROLL_UPDATE_INTERVAL = 16;

export const RangeSlider: React.FC<RangeSliderProps> = ({
  totalDuration,
  minimumSegmentDuration = MIN_SEGMENT_DURATION,
  onRangeChange,
  onPreview,
  width = SCREEN_WIDTH * 2,
}) => {
  const [range, setRange] = useState({start: 0, end: totalDuration});
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(
    null,
  );
  const [autoScrollDirection, setAutoScrollDirection] = useState<
    'left' | 'right' | null
  >(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isInScrollZone, setIsInScrollZone] = useState(false);
  const scrollZoneOpacity = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);
  const currentScrollPosition = useRef(0);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timer | null>(null);
  const scrollViewWidth = useRef(SCREEN_WIDTH);
  const initialHandlePosition = useRef(0);
  const lastScrollUpdate = useRef(Date.now());
  const [lastValidPositions, setLastValidPositions] = useState({
    start: 0,
    end: totalDuration,
  });
  const initialTouch = useRef({x: 0, time: 0});

  useEffect(() => {
    Animated.timing(scrollZoneOpacity, {
      toValue: isInScrollZone ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isInScrollZone]);

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
      setIsDragging(false);
      setActiveHandle(null);
      setAutoScrollDirection(null);
      setIsInScrollZone(false);
      setLastValidPositions({
        start: range.start,
        end: range.end,
      });
    };
  }, []);

  const timeToPosition = useCallback(
    (time: number) => {
      return (time / totalDuration) * width;
    },
    [width, totalDuration],
  );

  const positionToTime = useCallback(
    (position: number) => {
      return (position / width) * totalDuration;
    },
    [width, totalDuration],
  );

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    const milliseconds = Math.floor((duration % 1) * 100);
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(
      milliseconds,
    ).padStart(2, '0')}`;
  };

  const getSegmentDuration = () => {
    return range.end - range.start;
  };

  const handlePreview = useCallback(
    (time: number) => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      previewTimeoutRef.current = setTimeout(() => {
        onPreview?.(time);
        setCurrentTime(time);
      }, 50);
    },
    [onPreview],
  );

  const handleAutoScroll = useCallback(() => {
    if (!scrollViewRef.current || !autoScrollDirection || !activeHandle) return;
    const now = Date.now();
    if (now - lastScrollUpdate.current < SCROLL_UPDATE_INTERVAL) return;

    const newScrollX =
      currentScrollPosition.current +
      (autoScrollDirection === 'left' ? -AUTOSCROLL_SPEED : AUTOSCROLL_SPEED);
    if (newScrollX >= 0 && newScrollX <= width - scrollViewWidth.current) {
      scrollViewRef.current.scrollTo({x: newScrollX, animated: false});
      currentScrollPosition.current = newScrollX;
      lastScrollUpdate.current = now;
      if (activeHandle) {
        const touchX =
          initialTouch.x +
          (autoScrollDirection === 'left'
            ? -AUTOSCROLL_SPEED
            : AUTOSCROLL_SPEED);
        const scrollOffset = newScrollX;
        const relativePosition = touchX + scrollOffset - TIMELINE_CENTER;
        let newTime = positionToTime(relativePosition);
        if (activeHandle === 'start') {
          newTime = Math.max(
            0,
            Math.min(newTime, range.end - MIN_SEGMENT_DURATION),
          );
        } else {
          newTime = Math.min(
            totalDuration,
            Math.max(newTime, range.start + MIN_SEGMENT_DURATION),
          );
        }
        setRange(prev => ({
          ...prev,
          [activeHandle]: newTime,
        }));
        handlePreview(newTime);
      }
    }
  }, [
    autoScrollDirection,
    width,
    activeHandle,
    positionToTime,
    range,
    totalDuration,
    handlePreview,
  ]);

  const startAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) return;

    lastScrollUpdate.current = Date.now();
    autoScrollIntervalRef.current = setInterval(() => {
      handleAutoScroll();
    }, SCROLL_UPDATE_INTERVAL);
  }, [handleAutoScroll]);

  const getScrollZoneInfo = (touchX: number) => {
    const scrollPosition = currentScrollPosition.current;
    const viewportStart = scrollPosition;
    const viewportEnd = scrollPosition + scrollViewWidth.current;

    const leftZoneEnd =
      viewportStart + scrollViewWidth.current * (1 - AUTOSCROLL_THRESHOLD);
    const rightZoneStart =
      viewportEnd - scrollViewWidth.current * (1 - AUTOSCROLL_THRESHOLD);

    return {
      isInLeftZone: touchX <= leftZoneEnd,
      isInRightZone: touchX >= rightZoneStart,
      viewportStart,
      viewportEnd,
      leftZoneEnd,
      rightZoneStart,
    };
  };

  const checkAutoScroll = useCallback(
    (gestureX: number) => {
      if (!gestureX || !scrollViewWidth.current) return null;
      const scrollPosition = currentScrollPosition.current;
      const viewportStart = scrollPosition;
      const viewportEnd = scrollPosition + scrollViewWidth.current;
      const leftZoneEnd =
        viewportStart + scrollViewWidth.current * (1 - AUTOSCROLL_THRESHOLD);
      const rightZoneStart =
        viewportEnd - scrollViewWidth.current * (1 - AUTOSCROLL_THRESHOLD);
      const MINIMUM_THRESHOLD = 5;
      if (
        gestureX < leftZoneEnd &&
        Math.abs(gestureX - leftZoneEnd) > MINIMUM_THRESHOLD
      ) {
        setIsInScrollZone(true);
        return 'left';
      } else if (
        gestureX > rightZoneStart &&
        Math.abs(gestureX - rightZoneStart) > MINIMUM_THRESHOLD
      ) {
        setIsInScrollZone(true);
        return 'right';
      }

      setIsInScrollZone(false);
      return null;
    },
    [activeHandle],
  );

  //   const startAutoScroll = useCallback(() => {
  //     if (autoScrollIntervalRef.current) return;

  //     autoScrollIntervalRef.current = setInterval(() => {
  //       handleAutoScroll();
  //     }, SCROLL_UPDATE_INTERVAL / 2);
  //   }, [handleAutoScroll]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    setAutoScrollDirection(null);
  }, []);

  // Separated handler logic for left and right edges
  const createPanHandler = (edge: 'start' | 'end') => {
    let initialTouch = {x: 0, time: 0};
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: evt => {
        const touchX = evt.nativeEvent.pageX;
        initialTouch = {
          x: touchX,
          time: edge === 'start' ? range.start : range.end,
        };
        setIsDragging(true);
        setActiveHandle(edge);
      },

      onPanResponderMove: evt => {
        const touchX = evt.nativeEvent.pageX;
        const scrollOffset = currentScrollPosition.current;
        const relativePosition = touchX + scrollOffset - TIMELINE_CENTER;
        let newTime = positionToTime(relativePosition);
        if (edge === 'start') {
          handleLeftEdgeMovement(newTime, touchX);
        } else {
          handleRightEdgeMovement(newTime, touchX);
        }
        handlePreview(newTime);
        onRangeChange?.(range.start, range.end);
      },
      onPanResponderRelease: () => {
        cleanupDragStates();
      },
    });
  };

  const cleanupDragStates = () => {
    setIsDragging(false);
    setActiveHandle(null);
    stopAutoScroll();
    setAutoScrollDirection(null);
    setIsInScrollZone(false);
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
    }
  };

  const handleLeftEdgeMovement = (newTime: number, touchX: number) => {
    newTime = Math.max(0, Math.min(newTime, totalDuration));
    newTime = Math.min(newTime, range.end - MIN_SEGMENT_DURATION);

    const scrollDirection = checkAutoScroll(touchX);
    const {isInRightZone} = getScrollZoneInfo(touchX);

    if (scrollDirection !== autoScrollDirection) {
      setAutoScrollDirection(scrollDirection);
      if (scrollDirection) {
        startAutoScroll();
      } else {
        stopAutoScroll();
      }
    }
    if (isInRightZone && scrollDirection === 'right') {
      const rightHandleNewTime = Math.max(
        newTime + MIN_SEGMENT_DURATION,
        Math.min(
          range.end - AUTOSCROLL_SPEED * (totalDuration / width),
          totalDuration,
        ),
      );
      setRange({start: newTime, end: rightHandleNewTime});
    } else {
      setRange(prev => ({...prev, start: newTime}));
    }
  };

  const handleRightEdgeMovement = (newTime: number, touchX: number) => {
    newTime = Math.max(
      range.start + MIN_SEGMENT_DURATION,
      Math.min(newTime, totalDuration),
    );
    const scrollDirection = checkAutoScroll(touchX);
    const {isInLeftZone} = getScrollZoneInfo(touchX);
    if (scrollDirection !== autoScrollDirection) {
      setAutoScrollDirection(scrollDirection);
      if (scrollDirection) {
        startAutoScroll();
      } else {
        stopAutoScroll();
      }
    }
    if (scrollDirection === 'right') {
      const maxScrollPosition = Math.min(
        totalDuration,
        currentScrollPosition.current + AUTOSCROLL_SPEED,
      );
      const scrollAdjustedTime = Math.min(newTime, maxScrollPosition);
      setRange(prev => ({...prev, end: scrollAdjustedTime}));
      if (scrollViewRef.current) {
        const newScrollX = currentScrollPosition.current + AUTOSCROLL_SPEED;
        if (newScrollX <= width - scrollViewWidth.current) {
          scrollViewRef.current.scrollTo({x: newScrollX, animated: false});
          currentScrollPosition.current = newScrollX;
        }
      }
    } else {
      setRange(prev => ({...prev, end: newTime}));
    }
  };

  const handleRightEdgeAutoScroll = useCallback(() => {
    if (
      !scrollViewRef.current ||
      !autoScrollDirection ||
      activeHandle !== 'end'
    ) {
      return;
    }
    const now = Date.now();
    if (now - lastScrollUpdate.current < SCROLL_UPDATE_INTERVAL) return;
    const newScrollX = currentScrollPosition.current + AUTOSCROLL_SPEED;
    if (newScrollX <= width - scrollViewWidth.current) {
      scrollViewRef.current.scrollTo({x: newScrollX, animated: false});
      currentScrollPosition.current = newScrollX;
      lastScrollUpdate.current = now;
      const scrollAdjustedPosition = newScrollX + scrollViewWidth.current;
      const newTime = positionToTime(scrollAdjustedPosition - TIMELINE_CENTER);
      setRange(prev => ({
        ...prev,
        end: Math.min(
          totalDuration,
          Math.max(newTime, range.start + MIN_SEGMENT_DURATION),
        ),
      }));
    }
  }, [autoScrollDirection, width, activeHandle, positionToTime, range.start]);

  const startHandlePanResponder = createPanHandler('start');
  const endHandlePanResponder = createPanHandler('end');

  const handleScroll = useCallback(
    (event: any) => {
      currentScrollPosition.current = event.nativeEvent.contentOffset.x;

      if (!isDragging && !isScrolling.current) {
        const centerTime = positionToTime(
          currentScrollPosition.current + TIMELINE_CENTER,
        );
        handlePreview(centerTime);
      }
    },
    [isDragging, positionToTime, handlePreview],
  );

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(
      milliseconds,
    ).padStart(2, '0')}`;
  };

  const renderScrollZoneIndicators = () => {
    return (
      <>
        <Animated.View
          style={[
            styles.scrollZoneIndicator,
            styles.leftScrollZone,
            {opacity: scrollZoneOpacity},
          ]}
        />
        <Animated.View
          style={[
            styles.scrollZoneIndicator,
            styles.rightScrollZone,
            {opacity: scrollZoneOpacity},
          ]}
        />
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.timeDisplayContainer}>
        <Text style={styles.timeText}>{formatTime(range.start)}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(range.end)}</Text>
      </View>
      {renderScrollZoneIndicators()}
      <View style={styles.sliderContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onScrollBeginDrag={() => {
            isScrolling.current = true;
          }}
          onScrollEndDrag={() => {
            isScrolling.current = false;
          }}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            {width: width + TIMELINE_CENTER * 2},
          ]}>
          <View style={[styles.timeline, {width}]}>
            <View
              style={[
                styles.selectedRange,
                {
                  left: timeToPosition(range.start),
                  width: timeToPosition(range.end - range.start),
                },
              ]}
            />
            <View
              {...startHandlePanResponder.panHandlers}
              style={[
                styles.handle,
                styles.startHandle,
                {left: timeToPosition(range.start) - HANDLE_WIDTH / 2},
                activeHandle === 'start' && styles.activeHandle,
              ]}>
              <View style={styles.handleBar} />
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>
                  {formatDuration(getSegmentDuration())}
                </Text>
              </View>
            </View>
            <View
              {...endHandlePanResponder.panHandlers}
              style={[
                styles.handle,
                styles.endHandle,
                {left: timeToPosition(range.end) - HANDLE_WIDTH / 2},
                activeHandle === 'end' && styles.activeHandle,
              ]}>
              <View style={styles.handleBar} />
            </View>
          </View>
        </ScrollView>
        <View style={styles.centerIndicator} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  durationContainer: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 80,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  sliderContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollZoneIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  leftScrollZone: {
    left: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.3)',
  },
  rightScrollZone: {
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
  },
  container: {
    height: 120,
    backgroundColor: '#000',
  },
  timeDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 30,
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'orange',
  },
  contentContainer: {
    paddingHorizontal: TIMELINE_CENTER,
    alignItems: 'center',
  },
  timeline: {
    height: 40,
    backgroundColor: '#333',
    position: 'relative',
  },
  selectedRange: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#fff',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 100,
  },
  startHandle: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  endHandle: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  activeHandle: {
    backgroundColor: '#E1E1E1',
    transform: [{scale: 1.1}],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  handleBar: {
    width: 2,
    height: '60%',
    backgroundColor: '#000',
    borderRadius: 1,
  },
  centerIndicator: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 50,
  },
});

export default RangeSlider;

// import React, {useCallback, useEffect, useRef, useState} from 'react';
// import {
//   View,
//   PanResponder,
//   StyleSheet,
//   Dimensions,
//   ScrollView,
//   Text,
//   Animated,
// } from 'react-native';
// import {formatTime} from './utils/segmentManager';

// // Define component props interface
// interface RangeSliderProps {
//   totalDuration: number;
//   minimumSegmentDuration?: number;
//   onRangeChange?: (start: number, end: number) => void;
//   onPreview?: (time: number) => void;
//   width?: number;
// }

// // Constants for configuration
// const {width: SCREEN_WIDTH} = Dimensions.get('window');
// const HANDLE_WIDTH = 20;
// const TIMELINE_CENTER = SCREEN_WIDTH / 2;
// const MIN_SEGMENT_DURATION = 10;
// const AUTOSCROLL_THRESHOLD = 0.2;
// const AUTOSCROLL_SPEED = 3;
// const SCROLL_UPDATE_INTERVAL = 16;
// const MAGNET_THRESHOLD = 50;

// export const RangeSlider: React.FC<RangeSliderProps> = ({
//   totalDuration,
//   minimumSegmentDuration = MIN_SEGMENT_DURATION,
//   onRangeChange,
//   onPreview,
//   width = SCREEN_WIDTH * 2,
// }) => {
//   // State management
//   const [range, setRange] = useState({start: 0, end: totalDuration});
//   const [isDragging, setIsDragging] = useState(false);
//   const [activeHandle, setActiveHandle] = useState<'start' | 'end' | null>(
//     null,
//   );
//   const [autoScrollDirection, setAutoScrollDirection] = useState<
//     'left' | 'right' | null
//   >(null);
//   const [currentTime, setCurrentTime] = useState(0);
//   const [isInScrollZone, setIsInScrollZone] = useState(false);

//   // Refs for managing component state
//   const initialTouch = useRef({x: 0, time: 0}); // Added for touch tracking
//   const scrollZoneOpacity = useRef(new Animated.Value(0)).current;
//   const scrollViewRef = useRef<ScrollView>(null);
//   const isScrolling = useRef(false);
//   const currentScrollPosition = useRef(0);
//   const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const autoScrollIntervalRef = useRef<NodeJS.Timer | null>(null);
//   const scrollViewWidth = useRef(SCREEN_WIDTH);
//   const lastScrollUpdate = useRef(Date.now());
//   const [lastValidPositions, setLastValidPositions] = useState({
//     start: 0,
//     end: totalDuration,
//   });

//   useEffect(() => {
//     Animated.timing(scrollZoneOpacity, {
//       toValue: isInScrollZone ? 1 : 0,
//       duration: 200,
//       useNativeDriver: true,
//     }).start();
//   }, [isInScrollZone]);

//   useEffect(() => {
//     return () => {
//       if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
//       if (autoScrollIntervalRef.current)
//         clearInterval(autoScrollIntervalRef.current);
//       setIsDragging(false);
//       setActiveHandle(null);
//       setAutoScrollDirection(null);
//       setIsInScrollZone(false);
//       setLastValidPositions({start: range.start, end: range.end});
//     };
//   }, []);

//   // Utility functions for time-position conversion
//   const timeToPosition = useCallback(
//     (time: number) => (time / totalDuration) * width,
//     [width, totalDuration],
//   );

//   const positionToTime = useCallback(
//     (position: number) => (position / width) * totalDuration,
//     [width, totalDuration],
//   );

//   // Time formatting helpers
//   const formatDuration = (duration: number) => {
//     const minutes = Math.floor(duration / 60);
//     const seconds = Math.floor(duration % 60);
//     const milliseconds = Math.floor((duration % 1) * 100);
//     return `${minutes}:${String(seconds).padStart(2, '0')}.${String(
//       milliseconds,
//     ).padStart(2, '0')}`;
//   };

//   const getSegmentDuration = () => range.end - range.start;

//   // Preview handling
//   const handlePreview = useCallback(
//     (time: number) => {
//       if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
//       previewTimeoutRef.current = setTimeout(() => {
//         onPreview?.(time);
//         setCurrentTime(time);
//       }, 50);
//     },
//     [onPreview],
//   );

//   const handleRightEdgeAutoScroll = useCallback(() => {
//     if (
//       !scrollViewRef.current ||
//       autoScrollDirection !== 'right' ||
//       activeHandle !== 'end'
//     ) {
//       return;
//     }

//     const now = Date.now();
//     if (now - lastScrollUpdate.current < SCROLL_UPDATE_INTERVAL) return;

//     const maxScrollX = width - scrollViewWidth.current;
//     const newScrollX = Math.min(
//       currentScrollPosition.current + AUTOSCROLL_SPEED,
//       maxScrollX,
//     );

//     scrollViewRef.current.scrollTo({x: newScrollX, animated: false});
//     currentScrollPosition.current = newScrollX;
//     lastScrollUpdate.current = now;

//     const touchX =
//       initialTouch.current.x + (newScrollX - initialTouch.current.scrollX);
//     const relativePosition = touchX - TIMELINE_CENTER;
//     const newTime = positionToTime(relativePosition + newScrollX);
//     const boundedTime = Math.min(
//       totalDuration,
//       Math.max(newTime, range.start + MIN_SEGMENT_DURATION),
//     );

//     setRange(prev => ({
//       ...prev,
//       end: boundedTime,
//     }));

//     handlePreview(boundedTime);
//   }, [
//     autoScrollDirection,
//     activeHandle,
//     width,
//     positionToTime,
//     totalDuration,
//     range.start,
//     handlePreview,
//   ]);

//   const handleAutoScroll = useCallback(() => {
//     if (!scrollViewRef.current || !autoScrollDirection || !activeHandle) return;
//     if (activeHandle === 'end') {
//       handleRightEdgeAutoScroll();
//       return;
//     }

//     const now = Date.now();
//     if (now - lastScrollUpdate.current < SCROLL_UPDATE_INTERVAL) return;

//     const newScrollX =
//       currentScrollPosition.current +
//       (autoScrollDirection === 'left' ? -AUTOSCROLL_SPEED : AUTOSCROLL_SPEED);

//     if (newScrollX >= 0 && newScrollX <= width - scrollViewWidth.current) {
//       scrollViewRef.current.scrollTo({x: newScrollX, animated: false});
//       currentScrollPosition.current = newScrollX;
//       lastScrollUpdate.current = now;

//       if (activeHandle === 'start') {
//         const touchX =
//           initialTouch.current.x +
//           (autoScrollDirection === 'left'
//             ? -AUTOSCROLL_SPEED
//             : AUTOSCROLL_SPEED);
//         const scrollOffset = newScrollX;
//         const relativePosition = touchX + scrollOffset - TIMELINE_CENTER;
//         let newTime = positionToTime(relativePosition);
//         newTime = Math.max(
//           0,
//           Math.min(newTime, range.end - MIN_SEGMENT_DURATION),
//         );

//         setRange(prev => ({
//           ...prev,
//           start: newTime,
//         }));
//         handlePreview(newTime);
//       }
//     }
//   }, [
//     autoScrollDirection,
//     width,
//     activeHandle,
//     positionToTime,
//     range,
//     handlePreview,
//     handleRightEdgeAutoScroll,
//   ]);

//   // Auto-scroll management
//   const startAutoScroll = useCallback(() => {
//     if (autoScrollIntervalRef.current) return;
//     lastScrollUpdate.current = Date.now();
//     autoScrollIntervalRef.current = setInterval(() => {
//       handleAutoScroll();
//     }, SCROLL_UPDATE_INTERVAL);
//   }, [handleAutoScroll]);

//   const stopAutoScroll = useCallback(() => {
//     if (autoScrollIntervalRef.current) {
//       clearInterval(autoScrollIntervalRef.current);
//       autoScrollIntervalRef.current = null;
//     }
//     setAutoScrollDirection(null);
//   }, []);

//   // Scroll zone detection
//   const getScrollZoneInfo = useCallback((touchX: number) => {
//     const scrollPosition = currentScrollPosition.current;
//     const viewportStart = scrollPosition;
//     const viewportEnd = scrollPosition + scrollViewWidth.current;

//     const leftZoneEnd =
//       viewportStart + scrollViewWidth.current * (1 - AUTOSCROLL_THRESHOLD);
//     const rightZoneStart =
//       viewportEnd - scrollViewWidth.current * (1 - AUTOSCROLL_THRESHOLD);
//     console.log('this is left and right end zone', leftZoneEnd, rightZoneStart);
//     return {
//       isInLeftZone: touchX <= leftZoneEnd,
//       isInRightZone: touchX >= rightZoneStart,
//       viewportStart,
//       viewportEnd,
//       leftZoneEnd,
//       rightZoneStart,
//     };
//   }, []);

//   const checkAutoScroll = useCallback(
//     (gestureX: number) => {
//       if (!gestureX || !scrollViewWidth.current) return null;

//       const {leftZoneEnd, rightZoneStart} = getScrollZoneInfo(gestureX);
//       const MINIMUM_THRESHOLD = 5;

//       if (
//         gestureX < leftZoneEnd &&
//         Math.abs(gestureX - leftZoneEnd) > MINIMUM_THRESHOLD
//       ) {
//         setIsInScrollZone(true);
//         return 'left';
//       } else if (
//         gestureX > rightZoneStart &&
//         Math.abs(gestureX - rightZoneStart) > MINIMUM_THRESHOLD
//       ) {
//         setIsInScrollZone(true);
//         return 'right';
//       }

//       setIsInScrollZone(false);
//       return null;
//     },
//     [getScrollZoneInfo],
//   );

//   // Edge movement handlers
//   const handleLeftEdgeMovement = useCallback(
//     (newTime: number, touchX: number) => {
//       newTime = Math.max(0, Math.min(newTime, totalDuration));
//       newTime = Math.min(newTime, range.end - MIN_SEGMENT_DURATION);

//       const scrollDirection = checkAutoScroll(touchX);
//       const {isInRightZone} = getScrollZoneInfo(touchX);

//       if (scrollDirection !== autoScrollDirection) {
//         setAutoScrollDirection(scrollDirection);
//         if (scrollDirection) {
//           startAutoScroll();
//         } else {
//           stopAutoScroll();
//         }
//       }

//       if (isInRightZone && scrollDirection === 'right') {
//         const rightHandleNewTime = Math.max(
//           newTime + MIN_SEGMENT_DURATION,
//           Math.min(
//             range.end - AUTOSCROLL_SPEED * (totalDuration / width),
//             totalDuration,
//           ),
//         );
//         setRange({start: newTime, end: rightHandleNewTime});
//       } else {
//         setRange(prev => ({...prev, start: newTime}));
//       }
//     },
//     [
//       totalDuration,
//       range.end,
//       checkAutoScroll,
//       getScrollZoneInfo,
//       autoScrollDirection,
//       startAutoScroll,
//       stopAutoScroll,
//       width,
//     ],
//   );

//   const handleRightEdgeMovement = useCallback(
//     (newTime: number, touchX: number) => {
//       newTime = Math.max(
//         range.start + MIN_SEGMENT_DURATION,
//         Math.min(newTime, totalDuration),
//       );

//       const scrollDirection = checkAutoScroll(touchX);
//       const {isInLeftZone} = getScrollZoneInfo(touchX);

//       if (scrollDirection !== autoScrollDirection) {
//         setAutoScrollDirection(scrollDirection);
//         if (scrollDirection) {
//           startAutoScroll();
//         } else {
//           stopAutoScroll();
//         }
//       }

//       if (scrollDirection === 'right') {
//         const scrollAdjustedTime = Math.min(newTime, totalDuration);
//         setRange(prev => ({...prev, end: scrollAdjustedTime}));

//         if (scrollViewRef.current) {
//           const newScrollX = currentScrollPosition.current + AUTOSCROLL_SPEED;
//           if (newScrollX <= width - scrollViewWidth.current) {
//             scrollViewRef.current.scrollTo({x: newScrollX, animated: false});
//             currentScrollPosition.current = newScrollX;
//           }
//         }
//       } else {
//         setRange(prev => ({...prev, end: newTime}));
//       }
//     },
//     [
//       totalDuration,
//       range.start,
//       checkAutoScroll,
//       getScrollZoneInfo,
//       autoScrollDirection,
//       startAutoScroll,
//       stopAutoScroll,
//       width,
//     ],
//   );

//   const cleanupDragStates = () => {
//     setIsDragging(false);
//     setActiveHandle(null);
//     stopAutoScroll();
//     setAutoScrollDirection(null);
//     setIsInScrollZone(false);
//     if (previewTimeoutRef.current) {
//       clearTimeout(previewTimeoutRef.current);
//     }
//     if (autoScrollIntervalRef.current) {
//       clearInterval(autoScrollIntervalRef.current);
//     }
//   };

//   const createPanHandler = useCallback(
//     (edge: 'start' | 'end') => {
//       return PanResponder.create({
//         onStartShouldSetPanResponder: () => true,
//         onMoveShouldSetPanResponder: () => true,

//         onPanResponderGrant: evt => {
//           const touchX = evt.nativeEvent.pageX;
//           initialTouch.current = {
//             x: touchX,
//             time: edge === 'start' ? range.start : range.end,
//             scrollX: currentScrollPosition.current,
//           };
//           setIsDragging(true);
//           setActiveHandle(edge);
//         },

//         onPanResponderMove: evt => {
//           const touchX = evt.nativeEvent.pageX;
//           const scrollOffset = currentScrollPosition.current;

//           // Check for auto-scroll
//           const scrollDirection = checkAutoScroll(touchX);

//           if (scrollDirection !== autoScrollDirection) {
//             setAutoScrollDirection(scrollDirection);
//             if (scrollDirection) {
//               startAutoScroll();
//             } else {
//               stopAutoScroll();
//             }
//           }

//           // Calculate position and update
//           const relativePosition = touchX + scrollOffset - TIMELINE_CENTER;
//           let newTime = positionToTime(relativePosition);

//           if (edge === 'start') {
//             handleLeftEdgeMovement(newTime, touchX);
//           } else {
//             handleRightEdgeMovement(newTime, touchX);
//           }

//           handlePreview(newTime);
//           onRangeChange?.(range.start, range.end);
//         },

//         onPanResponderRelease: () => {
//           cleanupDragStates();
//           initialTouch.current = {x: 0, time: 0, scrollX: 0};
//         },
//       });
//     },
//     [
//       range,
//       positionToTime,
//       handleLeftEdgeMovement,
//       handleRightEdgeMovement,
//       handlePreview,
//       onRangeChange,
//       stopAutoScroll,
//     ],
//   );
//   // Create pan responders for both edges
//   const startHandlePanResponder = createPanHandler('start');
//   const endHandlePanResponder = createPanHandler('end');

//   // Handle scroll events
//   const handleScroll = useCallback(
//     (event: any) => {
//       currentScrollPosition.current = event.nativeEvent.contentOffset.x;

//       if (!isDragging && !isScrolling.current) {
//         const centerTime = positionToTime(
//           currentScrollPosition.current + TIMELINE_CENTER,
//         );
//         handlePreview(centerTime);
//       }
//     },
//     [isDragging, positionToTime, handlePreview],
//   );

//   // Render scroll zone indicators
//   const renderScrollZoneIndicators = () => (
//     <>
//       <Animated.View
//         style={[
//           styles.scrollZoneIndicator,
//           styles.leftScrollZone,
//           {opacity: scrollZoneOpacity},
//         ]}
//       />
//       <Animated.View
//         style={[
//           styles.scrollZoneIndicator,
//           styles.rightScrollZone,
//           {opacity: scrollZoneOpacity},
//         ]}
//       />
//     </>
//   );

//   return (
//     <View style={styles.container}>
//       <View style={styles.timeDisplayContainer}>
//         <Text style={styles.timeText}>{formatTime(range.start)}</Text>
//         <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
//         <Text style={styles.timeText}>{formatTime(range.end)}</Text>
//       </View>
//       {renderScrollZoneIndicators()}
//       <View style={styles.sliderContainer}>
//         <ScrollView
//           ref={scrollViewRef}
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           scrollEventThrottle={16}
//           onScroll={handleScroll}
//           onScrollBeginDrag={() => {
//             isScrolling.current = true;
//           }}
//           onScrollEndDrag={() => {
//             isScrolling.current = false;
//           }}
//           style={styles.scrollView}
//           contentContainerStyle={[
//             styles.contentContainer,
//             {width: width + TIMELINE_CENTER * 2},
//           ]}>
//           <View style={[styles.timeline, {width}]}>
//             <View
//               style={[
//                 styles.selectedRange,
//                 {
//                   left: timeToPosition(range.start),
//                   width: timeToPosition(range.end - range.start),
//                 },
//               ]}
//             />
//             <View
//               {...startHandlePanResponder.panHandlers}
//               style={[
//                 styles.handle,
//                 styles.startHandle,
//                 {left: timeToPosition(range.start) - HANDLE_WIDTH / 2},
//                 activeHandle === 'start' && styles.activeHandle,
//               ]}>
//               <View style={styles.handleBar} />
//               <View style={styles.durationContainer}>
//                 <Text style={styles.durationText}>
//                   {formatDuration(getSegmentDuration())}
//                 </Text>
//               </View>
//             </View>
//             <View
//               {...endHandlePanResponder.panHandlers}
//               style={[
//                 styles.handle,
//                 styles.endHandle,
//                 {left: timeToPosition(range.end) - HANDLE_WIDTH / 2},
//                 activeHandle === 'end' && styles.activeHandle,
//               ]}>
//               <View style={styles.handleBar} />
//             </View>
//           </View>
//         </ScrollView>
//         <View style={styles.centerIndicator} />
//       </View>
//     </View>
//   );
// };

// // Styles
// const styles = StyleSheet.create({
//   container: {
//     height: 120,
//     backgroundColor: '#000',
//   },
//   timeDisplayContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     height: 30,
//     alignItems: 'center',
//   },
//   timeText: {
//     color: '#fff',
//     fontSize: 12,
//   },
//   scrollView: {
//     flex: 1,
//     backgroundColor: 'orange',
//   },
//   contentContainer: {
//     paddingHorizontal: TIMELINE_CENTER,
//     alignItems: 'center',
//   },
//   timeline: {
//     height: 40,
//     backgroundColor: '#333',
//     position: 'relative',
//   },
//   selectedRange: {
//     position: 'absolute',
//     height: '100%',
//     backgroundColor: 'rgba(255, 255, 255, 0.3)',
//     borderWidth: 2,
//     borderColor: '#fff',
//   },
//   handle: {
//     position: 'absolute',
//     width: HANDLE_WIDTH,
//     height: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     zIndex: 100,
//   },
//   startHandle: {
//     borderTopLeftRadius: 4,
//     borderBottomLeftRadius: 4,
//   },
//   endHandle: {
//     borderTopRightRadius: 4,
//     borderBottomRightRadius: 4,
//   },
//   activeHandle: {
//     backgroundColor: '#E1E1E1',
//     transform: [{scale: 1.1}],
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   handleBar: {
//     width: 2,
//     height: '60%',
//     backgroundColor: '#000',
//     borderRadius: 1,
//   },
//   centerIndicator: {
//     position: 'absolute',
//     left: '50%',
//     width: 2,
//     height: '100%',
//     backgroundColor: '#fff',
//     zIndex: 50,
//   },
//   scrollZoneIndicator: {
//     position: 'absolute',
//     top: 0,
//     bottom: 0,
//     width: SCREEN_WIDTH * 0.2,
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     zIndex: 10,
//   },
//   leftScrollZone: {
//     left: 0,
//     borderRightWidth: 1,
//     borderRightColor: 'rgba(255, 255, 255, 0.3)',
//   },
//   rightScrollZone: {
//     right: 0,
//     borderLeftWidth: 1,
//     borderLeftColor: 'rgba(255, 255, 255, 0.3)',
//   },
//   durationContainer: {
//     position: 'absolute',
//     bottom: 2,
//     left: 2,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//     minWidth: 80,
//   },
//   durationText: {
//     color: '#fff',
//     fontSize: 12,
//     textAlign: 'center',
//   },
//   sliderContainer: {
//     flex: 1,
//     position: 'relative',
//   },
// });

// export default RangeSlider;
