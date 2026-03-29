// src/components/PaymentMethodSelector.tsx — Payment method buttons

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { FEATURES } from '../constants/config';

interface PaymentMethodSelectorProps {
  onCardPress: () => void;
  onGooglePayPress: () => void;
  onApplePayPress?: () => void;
  onPayPalPress?: () => void;
  disabled?: boolean;
}

interface MethodConfig {
  id: string;
  icon: string;
  iconBg: string;
  label: string;
  enabled: boolean;
  badge?: string;
  onPress?: () => void;
}

export function PaymentMethodSelector({
  onCardPress,
  onGooglePayPress,
  onApplePayPress,
  onPayPalPress,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const methods: MethodConfig[] = [
    {
      id: 'card',
      icon: '💳',
      iconBg: 'rgba(99, 102, 241, 0.15)',
      label: 'Pay with Card',
      enabled: true,
      onPress: onCardPress,
    },
    {
      id: 'google',
      icon: 'G',
      iconBg: 'rgba(66, 133, 244, 0.15)',
      label: 'Google Pay',
      enabled: FEATURES.GOOGLE_PAY_ENABLED,
      badge: FEATURES.GOOGLE_PAY_ENABLED ? undefined : 'Requires dev build · Android',
      onPress: onGooglePayPress,
    },
    {
      id: 'apple',
      icon: '',
      iconBg: 'rgba(255, 255, 255, 0.08)',
      label: 'Apple Pay',
      enabled: FEATURES.APPLE_PAY_ENABLED,
      badge: 'Requires dev build · iOS device',
      onPress: onApplePayPress,
    },
    {
      id: 'paypal',
      icon: 'P',
      iconBg: 'rgba(0, 112, 186, 0.15)',
      label: 'PayPal',
      enabled: FEATURES.PAYPAL_ENABLED,
      badge: FEATURES.PAYPAL_ENABLED ? undefined : 'Requires backend endpoint',
      onPress: onPayPalPress,
    },
  ];

  return (
    <View style={styles.container}>
      {methods.map((method, index) => {
        const isActive = method.id === 'card';
        const isDisabled = disabled || !method.enabled;

        return (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.button,
              isActive && styles.activeButton,
              isDisabled && !isActive && styles.buttonDisabled,
            ]}
            onPress={method.onPress}
            disabled={isDisabled}
            activeOpacity={0.6}
          >
            <View style={[styles.iconContainer, { backgroundColor: method.iconBg }]}>
              <Text style={[
                styles.buttonIcon,
                method.id === 'google' && styles.googleIcon,
                method.id === 'paypal' && styles.paypalIcon,
              ]}>
                {method.icon}
              </Text>
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={[
                styles.buttonText,
                isDisabled && !isActive && styles.textDisabled,
              ]}>
                {method.label}
              </Text>
              {method.badge && (
                <Text style={styles.badge}>{method.badge}</Text>
              )}
            </View>
            {isActive && (
              <View style={styles.selectedDot} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  activeButton: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 18,
  },
  googleIcon: {
    fontWeight: '700',
    color: '#4285F4',
    fontSize: 16,
  },
  paypalIcon: {
    fontWeight: '700',
    color: '#0070BA',
    fontSize: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  textDisabled: {
    color: '#475569',
  },
  badge: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginRight: 4,
  },
});
