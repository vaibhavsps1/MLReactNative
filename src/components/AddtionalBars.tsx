import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StickerAdd, TextAdd, ToneAdd} from '../utils/images';

const AdditionalBars = () => {
  const bars = [
    {icon: <TextAdd height={20} width={20} />, text: 'TAP TO ADD TEXT'},
    {icon: <ToneAdd height={20} width={20} />, text: 'TAP TO ADD SOUND'},
    {icon: <StickerAdd height={20} width={20} />, text: 'TAP TO ADD STICKER'},
  ];

  return (
    <View style={styles.container}>
      {bars.map((bar, index) => (
        <View key={index} style={styles.barRow}>
          <View style={styles.leftSection}>
            {bar.icon}
          </View>
          <View style={styles.rightSection}>
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
    marginBottom: 50,
  },
  barRow: {
    flexDirection: 'row',
    height: 35,
    alignItems: 'center',
    marginBottom: 1,
  },
  leftSection: {
    width: '50%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 15,
    backgroundColor: '#1a1a1a',
  },
  rightSection: {
    width: '50%',
    height: '100%',
    backgroundColor: '#262626',
    justifyContent: 'center',
    paddingLeft: 15,
  },
  text: {
    color: '#fff',
    fontSize: 14,
  },
});

export default AdditionalBars;
