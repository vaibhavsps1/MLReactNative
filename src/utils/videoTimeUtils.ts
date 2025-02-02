interface TimeComponents {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export const formatVideoTime = (
  timeInSeconds: number,
  options: {
    showHours?: boolean;
    showMilliseconds?: boolean;
    millisecondPrecision?: 1 | 2 | 3;
  } = {},
): string => {
  const {
    showHours = false,
    showMilliseconds = true,
    millisecondPrecision = 3,
  } = options;

  if (timeInSeconds < 0) return '00:00.000';

  const components = getTimeComponents(timeInSeconds);

  const hoursStr =
    showHours || components.hours > 0
      ? `${components.hours.toString().padStart(2, '0')}:`
      : '';

  const minutesStr = components.minutes.toString().padStart(2, '0');
  const secondsStr = components.seconds.toString().padStart(2, '0');
  const msStr = showMilliseconds
    ? '.' +
      components.milliseconds
        .toString()
        .padStart(3, '0')
        .slice(0, millisecondPrecision)
    : '';

  return `${hoursStr}${minutesStr}:${secondsStr}${msStr}`;
};

const getTimeComponents = (timeInSeconds: number): TimeComponents => {
  const totalMilliseconds = Math.floor(timeInSeconds * 1000);

  const hours = Math.floor(totalMilliseconds / (1000 * 60 * 60));
  const minutes = Math.floor(
    (totalMilliseconds % (1000 * 60 * 60)) / (1000 * 60),
  );
  const seconds = Math.floor((totalMilliseconds % (1000 * 60)) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return {hours, minutes, seconds, milliseconds};
};

// Precise frame-time conversions
// Update your existing frameToTimestamp function
export const frameToTimestamp = (
  frameIndex: number,
  totalFrames: number,
  duration: number,
): number => {
  // Calculate time with increased precision
  const time = (frameIndex / totalFrames) * duration;
  // Return with 3 decimal places precision
  return Number(time.toFixed(3));
};

// Alternative version if you want to use FPS directly
export const frameToTimestampWithFPS = (
  frameIndex: number,
  fps: number,
): number => {
  // Calculate time based on FPS
  const time = frameIndex * (1 / fps);
  // Return with 3 decimal places precision
  return Number(time.toFixed(3));
};

export const timeToFrame = (timeInSeconds: number, fps: number): number => {
  return Math.round(timeInSeconds * fps);
};

// Segment boundary utilities
export const calculateSegmentBoundaries = (
  segmentIndex: number,
  splitPoints: Array<{time: number}>,
  duration: number,
): {startTime: number; endTime: number} => {
  const startTime = segmentIndex === 0 ? 0 : splitPoints[segmentIndex - 1].time;
  const endTime = splitPoints[segmentIndex]
    ? splitPoints[segmentIndex].time
    : duration;

  return {
    startTime: Number(startTime.toFixed(3)),
    endTime: Number(endTime.toFixed(3)),
  };
};

// Precise segment duration calculation
export const calculateSegmentDuration = (
  startTime: number,
  endTime: number,
): number => {
  return Number((endTime - startTime).toFixed(3));
};
