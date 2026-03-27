// app/index.tsx — Order Screen

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getConfig, createSession } from '../src/api/mpgs';
import { PaymentMethodSelector } from '../src/components/PaymentMethodSelector';
import { LoadingOverlay } from '../src/components/LoadingOverlay';
import { API_BASE_URL } from '../src/constants/config';

const CURRENCY = 'AUD';

export default function OrderScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('10.00');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleCardPayment = useCallback(async () => {
    const trimmed = amount.trim();
    if (!trimmed || isNaN(parseFloat(trimmed)) || parseFloat(trimmed) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Initialising payment…');

    try {
      const config = await getConfig();
      setLoadingMessage('Creating session…');
      const session = await createSession();

      setLoading(false);

      router.push({
        pathname: '/payment/checkout',
        params: {
          baseUrl: config.baseUrl,
          merchantId: config.merchantId,
          formVersion: config.formVersion,
          sessionId: session.session.id,
          backendUrl: API_BASE_URL,
          amount: trimmed,
          currency: CURRENCY,
          enable3ds: config.enable3ds ? 'true' : 'false',
        },
      });
    } catch (error: any) {
      setLoading(false);
      Alert.alert(
        'Connection Error',
        `Could not connect to the payment server.\n\n${error.message}\n\nMake sure the backend is running on ${API_BASE_URL}`
      );
    }
  }, [amount, router]);

  const handleGooglePay = useCallback(async () => {
    Alert.alert(
      'Google Pay',
      'Google Pay is only available on Android devices with a development build.'
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Payment</Text>
            <Text style={styles.subtitle}>
              MPGS Hosted Session · Sandbox
            </Text>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ORDER</Text>
            <View style={styles.sectionCard}>
              <View style={styles.amountRow}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>{CURRENCY}</Text>
                </View>
              </View>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#374151"
                  selectTextOnFocus
                />
              </View>
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
            <PaymentMethodSelector
              onCardPress={handleCardPayment}
              onGooglePayPress={handleGooglePay}
              disabled={loading}
            />
          </View>

          {/* Backend URL info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Server</Text>
            <Text style={styles.infoText}>
              {API_BASE_URL}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={loading} message={loadingMessage} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#4b5563',
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  currencyBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currencyBadgeText: {
    fontSize: 11,
    color: '#818cf8',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    color: '#475569',
    marginRight: 6,
    fontWeight: '500',
  },
  amountInput: {
    flex: 1,
    height: 48,
    fontSize: 20,
    color: '#f1f5f9',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  infoBox: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  infoLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  infoText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
});
