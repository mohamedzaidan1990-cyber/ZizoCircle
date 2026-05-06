import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');

  const sendCode = () => {
    if (phone.length < 7) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }
    router.push({ pathname: '/otp', params: { phone } } as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '20%' }]} />
        </View>
        <Text style={styles.stepText}>1 of 5</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What's your{'\n'}phone number?</Text>
        <Text style={styles.subtitle}>
          We'll send a verification code. Never shown to other users.
        </Text>

        <Text style={styles.label}>MOBILE NUMBER</Text>
        <View style={styles.phoneRow}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>🇶🇦 +974</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="5x xxx xxxx"
            placeholderTextColor="#7A7595"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
        <Text style={styles.hint}>Qatar (+974) selected by default</Text>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign up with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => router.push('/email' as any)}
          >
            <Text style={styles.socialBtnText}>📧 Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => Alert.alert('Coming Soon', 'Google Sign-In coming soon!')}
          >
            <Text style={styles.socialBtnText}>🔵 Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => Alert.alert('Coming Soon', 'Apple Sign-In coming soon!')}
          >
            <Text style={styles.socialBtnText}>🍎 Apple</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.btnMain}
          onPress={sendCode}
          activeOpacity={0.85}
        >
          <Text style={styles.btnMainText}>Send Verification Code</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    paddingTop: 52,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: '#7A7595' },
  progressBar: {
    flex: 1, height: 3,
    backgroundColor: '#231E3A',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#7B5CF6',
  },
  stepText: { fontSize: 11, color: '#7A7595', fontWeight: '600' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  title: {
    fontSize: 26, fontWeight: '800',
    color: '#F0EEF8', lineHeight: 32, marginBottom: 6,
  },
  subtitle: {
    fontSize: 14, color: '#7A7595',
    lineHeight: 22, marginBottom: 28,
  },
  label: {
    fontSize: 11, fontWeight: '700',
    color: '#7A7595', letterSpacing: 1, marginBottom: 8,
  },
  phoneRow: { flexDirection: 'row', gap: 10 },
  codeBox: {
    backgroundColor: '#181428',
    borderWidth: 1.5, borderColor: '#231E3A',
    borderRadius: 12, paddingHorizontal: 12,
    justifyContent: 'center',
  },
  codeText: { fontSize: 14, color: '#F0EEF8', fontWeight: '700' },
  phoneInput: {
    flex: 1, backgroundColor: '#181428',
    borderWidth: 1.5, borderColor: '#231E3A',
    borderRadius: 12, padding: 14,
    fontSize: 15, color: '#F0EEF8',
  },
  hint: { fontSize: 12, color: '#7A7595', marginTop: 6 },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#231E3A' },
  dividerText: { fontSize: 13, color: '#7A7595' },
  socialRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  socialBtn: {
    flex: 1, backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 12, padding: 13, alignItems: 'center',
  },
  socialBtnText: { fontSize: 13, fontWeight: '600', color: '#F0EEF8' },
  btnMain: {
    backgroundColor: '#7B5CF6',
    borderRadius: 16, padding: 17, alignItems: 'center',
  },
  btnMainText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});