import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        if (user) {
          router.replace('/(tabs)' as any);
        } else {
          router.replace('/welcome' as any);
        }
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoZ}>Z</Text>
      </View>
      <Text style={styles.appName}>Zizo Circle</Text>
      <Text style={styles.tagline}>CONNECT · DISCOVER · EARN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#7B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoZ: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F0EEF8',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    color: '#7A7595',
    letterSpacing: 2,
  },
});