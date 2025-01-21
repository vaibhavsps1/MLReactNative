// constants/video.ts
import { Dimensions } from 'react-native';

export const VIDEO_CONSTANTS = {
  SCREEN_WIDTH: Dimensions.get('window').width,
  FRAME_WIDTH: 60,
  FRAME_HEIGHT: 60,
  FRAME_PER_SEC: 1,
  MIN_TRIM_DURATION: 0.5,
  TIMELINE_CENTER: Dimensions.get('window').width / 2,
};