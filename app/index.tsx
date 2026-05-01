import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('zizo_user');
        if (savedUser) {
          router.replace('/(tabs)' as any);
          return;
        }
      } catch (e) {}

      const unsub = onAuthStateChanged(auth, async (user) => {
        unsub();
        if (user) {
          await AsyncStorage.setItem('zizo_user', user.uid);
          router.replace('/(tabs)' as any);
        } else {
          router.replace('/splash' as any);
        }
      });
    };
    check();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0914', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator color="#7B5CF6" size="large" />
      <Text style={{ color: '#7A7595', fontSize: 12 }}>Loading...</Text>
    </View>
  );
}