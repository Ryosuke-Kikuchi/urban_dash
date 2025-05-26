import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
// import MapboxGL from '@rnmapbox/maps';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  return (
    <View style={styles.container}>
      {/* <MapboxGL.MapView style={styles.map} styleURL={MapboxGL.StyleURL.Dark} /> */}
      <View style={styles.map}>
        <Text style={{textAlign: 'center', marginTop: 40, color: '#888'}}>
          地図機能は現在利用できません
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapScreen; 