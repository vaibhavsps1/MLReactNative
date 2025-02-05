import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import VideoClip from './src/VideoClip';
import FrameTrim from './src/FrameTrim';

export type RootStackParamList = {
  VideoClip: undefined;
  VideoTrim: {
    path: string;
    samples: number[];
  };
  FrameTrim: {
    frames: Array<{
      uri: string;
      status: string;
      timestamp: number;
    }>;
    path: string;
    duration: number;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="FrameTrim"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="VideoClip" component={VideoClip} />
          <Stack.Screen
            name="FrameTrim"
            component={FrameTrim}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default App;
