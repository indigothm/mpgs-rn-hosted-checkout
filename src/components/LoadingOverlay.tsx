// src/components/LoadingOverlay.tsx — Full-screen spinner overlay

import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Modal } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message = 'Loading…' }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.text}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#0b1120',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  text: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
