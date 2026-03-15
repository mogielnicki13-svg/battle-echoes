// ============================================================
// BATTLE ECHOES — WebContainer.tsx
// Wrapper komponent — centruje zawartość na web (max 600px)
// ============================================================
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: any;
}

export default function WebContainer({ children, style }: Props) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.outer}>
      <View style={[styles.inner, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    backgroundColor: Colors.background,
  },
});
