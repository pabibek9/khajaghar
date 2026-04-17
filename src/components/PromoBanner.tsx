// src/components/PromoBanner.tsx
//
// Static promotional banner shown on the menu tab.
// Extracted from user.tsx to keep the screen component lean.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PromoBanner = React.memo(function PromoBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Text style={styles.sub}>
          Use code <Text style={styles.code}>FIRST50</Text> at checkout. Offer ends soon!
        </Text>
        <Text style={styles.title}>Get 20% Off Your First Order!</Text>
        <Pressable style={styles.btn}>
          <Text style={styles.btnText}>Order Now</Text>
        </Pressable>
      </View>
      <Ionicons
        name="fast-food"
        size={100}
        color="rgba(255,255,255,0.18)"
        style={styles.bgIcon}
      />
    </View>
  );
});

export default PromoBanner;

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF5C2A',
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: 6,
  },
  content: { flex: 1, zIndex: 2 },
  sub: { color: '#fff', fontSize: 12, marginBottom: 6 },
  code: {
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 5,
    borderRadius: 5,
    color: '#FF5C2A',
    overflow: 'hidden',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', width: '72%', marginBottom: 14 },
  btn: {
    backgroundColor: '#000',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bgIcon: { position: 'absolute', right: -16, bottom: -18, transform: [{ rotate: '-15deg' }] },
});
