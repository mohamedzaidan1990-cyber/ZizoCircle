import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const AGE_GROUPS = ['18–24', '25–32', '33–40', '41–50', '50+'];
const GENDERS = ['Male', 'Female', 'Prefer not to say'];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ageGroup, setAgeGroup] = useState('');
  const [gender, setGender] = useState('');

  const pwStrength = () => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const handleAlias = (text: string) => {
    let v = text.replace(/\s/g, '');
    if (v && !v.startsWith('@')) v = '@' + v;
    setAlias(v);
  };

  const save = async () => {
    if (!name) { Alert.alert('Error', 'Enter your name'); return; }
    if (!alias || alias === '@') { Alert.alert('Error', 'Choose an alias'); return; }
    if (!email || !email.includes('@')) { Alert.alert('Error', 'Enter a valid email'); return; }
    if (!ageGroup) { Alert.alert('Error', 'Select your age group'); return; }
    if (!gender) { Alert.alert('Error', 'Select your gender'); return; }
    if (pw.length < 8) { Alert.alert('Error', 'Password too short (min 8 chars)'); return; }
    if (pw !== pw2) { Alert.alert('Error', "Passwords don't match"); return; }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, pw);
      const user = userCred.user;
      await updateProfile(user, { displayName: name });

      const userData = {
        uid: user.uid,
        name,
        alias,
        email,
        ageGroup,
        gender,
        location: 'Qatar',
        interests: [],
        wallet: 0,
        visits: 0,
        matches: 0,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      await AsyncStorage.setItem('zizo_user', user.uid);
      await AsyncStorage.setItem('zizo_profile', JSON.stringify({ ...userData, createdAt: new Date().toISOString() }));

      router.push('/interests' as any);
    } catch (error: any) {
      let msg = 'Something went wrong';
      if (error.code === 'auth/email-already-in-use') msg = 'Email already registered';
      if (error.code === 'auth/invalid-email') msg = 'Invalid email address';
      if (error.code === 'auth/weak-password') msg = 'Password too weak';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const strength = pwStrength();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '42%' }]} />
        </View>
        <Text style={styles.stepText}>3 of 7</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create your{'\n'}profile</Text>
        <Text style={styles.subtitle}>Choose your alias wisely — it's permanent! 🎭</Text>

        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarEmoji}>😊</Text>
            </View>
          </View>
          <Text style={styles.avatarHint}>You can change your avatar later</Text>
        </View>

        <Text style={styles.label}>YOUR FULL NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mohamed Al-Rashidi"
          placeholderTextColor="#7A7595"
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.hint}>Only shown to matches you approve</Text>

        <Text style={[styles.label, { marginTop: 16 }]}>ALIAS ⚠️ PERMANENT</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. @PadelKing94"
          placeholderTextColor="#7A7595"
          value={alias}
          onChangeText={handleAlias}
          autoCapitalize="none"
        />
        <Text style={styles.hint}>Cannot be changed later</Text>

        <Text style={[styles.label, { marginTop: 16 }]}>EMAIL ADDRESS</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor="#7A7595"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, { marginTop: 16 }]}>AGE GROUP</Text>
        <View style={styles.chipRow}>
          {AGE_GROUPS.map(a => (
            <TouchableOpacity
              key={a}
              style={[styles.chip, ageGroup === a && styles.chipOn]}
              onPress={() => setAgeGroup(a)}
            >
              <Text style={[styles.chipText, ageGroup === a && styles.chipTextOn]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>GENDER</Text>
        <View style={styles.chipRow}>
          {GENDERS.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, gender === g && styles.chipOn]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.chipText, gender === g && styles.chipTextOn]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
        <View>
          <TextInput
            style={styles.input}
            placeholder="Min. 8 characters"
            placeholderTextColor="#7A7595"
            secureTextEntry={!showPw}
            value={pw}
            onChangeText={setPw}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
            <Text>{showPw ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.strengthRow}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                styles.strengthBar,
                i < strength
                  ? strength <= 1 ? styles.weak
                  : strength <= 2 ? styles.medium
                  : styles.strong
                  : null
              ]}
            />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>CONFIRM PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Re-enter password"
          placeholderTextColor="#7A7595"
          secureTextEntry
          value={pw2}
          onChangeText={setPw2}
        />

        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Your alias is permanent</Text>
            <Text style={styles.warningText}>
              Once set, your alias can never be changed. This helps the community recognise you over time.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnMain, loading && { opacity: 0.7 }]}
          onPress={save}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.btnMainText}>
            {loading ? 'Creating account...' : 'Continue'}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 24, paddingTop: 52,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: '#7A7595' },
  progressBar: {
    flex: 1, height: 3, backgroundColor: '#231E3A',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#7B5CF6' },
  stepText: { fontSize: 11, color: '#7A7595', fontWeight: '600' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  title: {
    fontSize: 26, fontWeight: '800',
    color: '#F0EEF8', lineHeight: 32, marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: '#7A7595', lineHeight: 22, marginBottom: 20 },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#7B5CF6', padding: 3,
  },
  avatarInner: {
    flex: 1, borderRadius: 46,
    backgroundColor: '#1E1935',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 38 },
  avatarHint: { fontSize: 13, color: '#7A7595', marginTop: 8 },
  label: {
    fontSize: 11, fontWeight: '700',
    color: '#7A7595', letterSpacing: 1, marginBottom: 8,
  },
  input: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#F0EEF8',
  },
  hint: { fontSize: 12, color: '#7A7595', marginTop: 5 },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 100,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  chipOn: {
    backgroundColor: 'rgba(123,92,246,0.18)',
    borderColor: '#7B5CF6',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#7A7595' },
  chipTextOn: { color: '#F0EEF8' },
  strengthRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  strengthBar: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: '#231E3A',
  },
  weak: { backgroundColor: '#F53B8F' },
  medium: { backgroundColor: '#F5A53B' },
  strong: { backgroundColor: '#C8F53B' },
  warningBox: {
    flexDirection: 'row', gap: 10,
    backgroundColor: 'rgba(245,59,143,0.08)',
    borderWidth: 1, borderColor: 'rgba(245,59,143,0.2)',
    borderRadius: 14, padding: 14, marginVertical: 20,
  },
  warningIcon: { fontSize: 18 },
  warningTitle: {
    fontSize: 13, fontWeight: '700',
    color: '#F53B8F', marginBottom: 3,
  },
  warningText: { fontSize: 12, color: '#7A7595', lineHeight: 18 },
  btnMain: {
    backgroundColor: '#7B5CF6',
    borderRadius: 16, padding: 17, alignItems: 'center',
  },
  btnMainText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});