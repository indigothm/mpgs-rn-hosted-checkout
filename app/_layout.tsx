// app/_layout.tsx — Root Stack Navigator

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#020617' },
          headerTintColor: '#e5e7eb',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'MPGS Checkout' }}
        />
        <Stack.Screen
          name="payment"
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}
