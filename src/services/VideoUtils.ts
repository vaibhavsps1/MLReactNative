// VideoUtils.ts
import { FFmpegKit, FFmpegKitConfig, ReturnCode } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';

export class VideoUtils {
  static FRAME_PER_SEC = 1;
  static FRAME_WIDTH = 50;

  static async cleanFrames() {
    try {
      const framesDir = `${RNFS.CachesDirectoryPath}/frames/`;
      console.log('Cleaning frames directory:', framesDir);
      
      if (await RNFS.exists(framesDir)) {
        const files = await RNFS.readDir(framesDir);
        await Promise.all(
          files.map(file => RNFS.unlink(file.path))
        );
        await RNFS.unlink(framesDir);
        console.log('Frames cleanup completed');
      }
    } catch (error) {
      console.error('Error cleaning frames:', error);
    }
  }

  static async getFrames(
    fileName: string,
    videoURI: string,
    frameNumber: number,
    successCallback: (outputPath: string) => void,
    errorCallback: () => void,
    onFrameGenerated: (frameUri: string, processedFrames: number, totalFrames: number) => void,
  ) {
    try {
      const outputDirectory = `${RNFS.CachesDirectoryPath}/frames/`;
      const outputImagePath = `${outputDirectory}${fileName}_%4d.png`;

      // Clean existing frames before generating new ones
      await this.cleanFrames();

      // Create fresh directory
      await RNFS.mkdir(outputDirectory);

      // Handle file:// prefix for iOS
      let processedVideoUri = videoURI;
      if (processedVideoUri.startsWith('file://')) {
        processedVideoUri = processedVideoUri.replace('file://', '');
      }

      const ffmpegCommand = `-ss 0 -i "${processedVideoUri}" -vf "fps=${this.FRAME_PER_SEC}/1:round=up,scale=${this.FRAME_WIDTH}:-2" -vframes ${frameNumber} "${outputImagePath}"`;

      FFmpegKit.executeAsync(
        ffmpegCommand,
        async (session) => {
          const returnCode = await session.getReturnCode();
          const duration = await session.getDuration();

          if (ReturnCode.isSuccess(returnCode)) {
            console.log(`Encode completed successfully in ${duration} milliseconds`);
            successCallback(outputImagePath);
          } else {
            const state = FFmpegKitConfig.sessionStateToString(await session.getState());
            const failStackTrace = await session.getFailStackTrace();
            console.error('FFmpeg execution failed:', {
              state,
              failStackTrace,
              command: ffmpegCommand
            });
            // Clean up failed frames
            await this.cleanFrames();
            errorCallback();
          }
        },
        (log) => {
          // console.log('FFmpeg log:', log.getMessage());
        },
        (statistics) => {
          const processedFrames = statistics.getVideoFrameNumber();
          const frameUri = `${outputImagePath.replace(
            '%4d',
            String(processedFrames).padStart(4, '0')
          )}`;
          onFrameGenerated(frameUri, processedFrames, frameNumber);
        }
      );
    } catch (error) {
      console.error('Error in frame extraction:', error);
      // Clean up on error
      await this.cleanFrames();
      errorCallback();
    }
  }

  static async verifyFramesCleanup() {
    try {
      const framesDir = `${RNFS.CachesDirectoryPath}/frames/`;
      const exists = await RNFS.exists(framesDir);
      if (exists) {
        const files = await RNFS.readDir(framesDir);
        console.log('Remaining files in frames directory:', files.length);
        return files.length === 0;
      }
      return true;
    } catch (error) {
      console.error('Error verifying frames cleanup:', error);
      return false;
    }
  }
}

export const formatVideoTime = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};