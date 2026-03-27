// app/payment/error.tsx — Payment error screen

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ErrorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    message: string;
    gatewayCode: string;
  }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Error icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✕</Text>
        </View>

        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>
          {params.message || 'Something went wrong with your payment.'}
        </Text>

        {/* Error details */}
        {params.gatewayCode ? (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gateway Code</Text>
              <View style={styles.errorBadge}>
                <Text style={styles.errorBadgeText}>{params.gatewayCode}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Try Again button */}
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.dismissAll()}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e0d1c', /* Opaque alternative to fix Android shadow inset */
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  icon: {
    fontSize: 32,
    color: '#ef4444',
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 18,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  errorBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  errorBadgeText: {
    fontSize: 12,
    color: '#f87171',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  retryButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
