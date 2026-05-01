import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !pw) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pw);
      await AsyncStorage.setItem('zizo_user', cred.user.uid);
      
      // Cache profile data for instant loading
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists()) {
        await AsyncStorage.setItem('zizo_profile', JSON.stringify(snap.data()));
      }
      
      router.replace('/(tabs)' as any);
    } catch (error: any) {
      let msg = 'Something went wrong';
      if (error.code === 'auth/user-not-found') msg = 'No account found with this email';
      if (error.code === 'auth/wrong-password') msg = 'Incorrect password';
      if (error.code === 'auth/invalid-email') msg = 'Invalid email address';
      if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later';
      if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoZ}>Z</Text>
          </View>
          <Text style={styles.logoName}>Welcome back</Text>
          <Text style={styles.logoSub}>Sign in to your Zizo Circle account</Text>
        </View>

        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor="#7A7595"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
        <View>
          <TextInput
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor="#7A7595"
            secureTextEntry={!showPw}
            value={pw}
            onChangeText={setPw}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
            <Text>{showPw ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnMain, loading && { opacity: 0.7 }]}
          onPress={login}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnMainText}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/phone' as any)}>
            <Text style={styles.signupLink}>Sign Up Free</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  header: { padding: 24, paddingTop: 52 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: '#7A7595' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#7B5CF6',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logoZ: { fontSize: 34, fontWeight: '900', color: '#fff' },
  logoName: { fontSize: 24, fontWeight: '800', color: '#F0EEF8', marginBottom: 6 },
  logoSub: { fontSize: 14, color: '#7A7595' },
  label: {
    fontSize: 11, fontWeight: '700',
    color: '#7A7595', letterSpacing: 1, marginBottom: 8,
  },
  input: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#F0EEF8',
  },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 8, marginBottom: 24 },
  forgotText: { fontSize: 13, color: '#A78BFA', fontWeight: '600' },
  btnMain: {
    backgroundColor: '#7B5CF6',
    borderRadius: 16, padding: 17, alignItems: 'center',
  },
  btnMainText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#231E3A' },
  dividerText: { fontSize: 13, color: '#7A7595' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupText: { fontSize: 14, color: '#7A7595' },
  signupLink: { fontSize: 14, fontWeight: '700', color: '#A78BFA' },
});