// app/index.tsx
// This screen is a pure splash/loading screen.
// All auth-based routing happens in _layout.tsx via onAuthStateChanged.
// This screen only shows while _layout.tsx completes its auth check (ready = false).
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}