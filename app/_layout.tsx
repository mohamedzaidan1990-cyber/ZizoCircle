import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="phone" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="interests" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="zizo-intro" />
        <Stack.Screen name="login" />
        <Stack.Screen name="match-detail" />
        <Stack.Screen name="venue-detail" />
        <Stack.Screen name="my-qr" />
        <Stack.Screen name="tos" />
        <Stack.Screen name="search" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}