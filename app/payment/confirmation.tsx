// app/payment/confirmation.tsx — Payment success screen

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId: string;
    amount: string;
    currency: string;
    gatewayCode: string;
    resultJson: string;
  }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✓</Text>
        </View>

        <Text style={styles.title}>Payment Successful</Text>
        <Text style={styles.subtitle}>Your payment has been processed</Text>

        {/* Details card */}
        <View style={styles.detailsCard}>
          {params.orderId ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order ID</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {params.orderId}
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValueHighlight}>
              {params.currency ?? 'AUD'} ${params.amount ?? '—'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {params.gatewayCode ?? 'APPROVED'}
              </Text>
            </View>
          </View>
        </View>

        {/* Done button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.dismissAll()}
          activeOpacity={0.7}
        >
          <Text style={styles.doneButtonText}>Done</Text>
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
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  icon: {
    fontSize: 32,
    color: '#10b981',
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
    color: '#64748b',
    marginBottom: 32,
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
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#94a3b8',
    maxWidth: '60%',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  detailValueHighlight: {
    fontSize: 17,
    color: '#f1f5f9',
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#34d399',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  doneButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
