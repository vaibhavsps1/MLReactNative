// AdditionalBars.tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AdditionalBars = () => {
  const bars = [
    {icon: 'text-fields', text: 'TAP TO ADD TEXT'},
    {icon: 'music-note', text: 'TAP TO ADD SOUND'},
    {icon: 'emoji-emotions', text: 'TAP TO ADD STICKER'},
  ];

  return (
    <View style={styles.container}>
      {bars.map((bar, index) => (
        <View key={index} style={styles.bar}>
          <View style={styles.iconContainer}>
            <Icon name={bar.icon} size={24} color="#666" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.text}>{bar.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  bar: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginBottom: 1,
  },
  iconContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    backgroundColor: '#262626',
    height: '100%',
    justifyContent: 'center',
    paddingLeft: 15,
  },
  text: {
    color: '#fff',
    fontSize: 14,
  },
});

export default AdditionalBars;