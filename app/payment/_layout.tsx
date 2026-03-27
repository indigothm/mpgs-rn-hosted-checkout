// app/payment/_layout.tsx — Payment sub-stack with modal presentation

import { Stack } from 'expo-router';

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#020617' },
        headerTintColor: '#e5e7eb',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#020617' },
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="checkout"
        options={{ title: 'Card Payment', headerBackTitle: 'Cancel' }}
      />
      <Stack.Screen
        name="confirmation"
        options={{ title: 'Payment Successful', headerShown: false }}
      />
      <Stack.Screen
        name="error"
        options={{ title: 'Payment Failed', headerShown: false }}
      />
    </Stack>
  );
}
