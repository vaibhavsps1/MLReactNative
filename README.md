Video Trimming Feature Implementation Guide

Required Dependencies
```json
{
  "dependencies": {
    "react-native-video": "^5.2.1",
    "react-native-image-picker": "^5.0.0",
    "react-native-gesture-handler": "^2.9.0",
    "react-native-reanimated": "^2.14.4",
    "ffmpeg-kit-react-native": "^5.1.0",
    "react-native-fs": "^2.20.0"
  }
}
```
check package.json and following files
> VideoClip (main component)
> VideoUtils (Utility function for extracting frames)
> AudioTrimTimelineFun (trim slider component)
> FramePicks (frame display component)
> TimeRuler (to display time)
> Additional bar (will be used)

Please import assets also