import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// TODO(auth): Wire to Firebase Phone Auth (signInWithPhoneNumber + confirmationResult.confirm).
// Until then this screen acts as a UX gate only — it does NOT verify the SMS code.
// Do not point external traffic at the app until real Phone Auth is integrated.

export default function OTPScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const verify = () => {
    if (otp.some(v => !v)) {
      Alert.alert('Enter the code', 'Please enter all 6 digits sent to your phone');
      return;
    }
    // TODO(auth): replace with confirmationResult.confirm(otp.join(''))
    router.push('/zizo-intro' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '40%' }]} />
        </View>
        <Text style={styles.stepText}>2 of 5</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Check your{'\n'}messages 📱</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{' '}
          <Text style={styles.phoneText}>+974 {phone}</Text>
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={ref => { inputs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={text => handleChange(text, i)}
              textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : undefined}
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : undefined}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
                  inputs.current[i - 1]?.focus();
                }
              }}
            />
          ))}
        </View>

        <Text style={styles.resend}>
          Didn't get it?{' '}
          <Text
            style={styles.resendLink}
            onPress={() => Alert.alert('Resent!', 'Code resent successfully')}
          >
            Resend in 0:45
          </Text>
        </Text>

        <TouchableOpacity
          style={styles.btnMain}
          onPress={verify}
          activeOpacity={0.85}
        >
          <Text style={styles.btnMainText}>Verify & Continue</Text>
        </TouchableOpacity>
      </View>
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
  content: { flex: 1, paddingHorizontal: 24 },
  title: {
    fontSize: 26, fontWeight: '800',
    color: '#F0EEF8', lineHeight: 32, marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: '#7A7595', lineHeight: 22, marginBottom: 32 },
  phoneText: { color: '#A78BFA', fontWeight: '700' },
  otpRow: {
    flexDirection: 'row', gap: 10,
    justifyContent: 'center', marginBottom: 16,
  },
  otpBox: {
    width: 52, height: 62, borderRadius: 14,
    backgroundColor: '#181428', borderWidth: 2,
    borderColor: '#231E3A', textAlign: 'center',
    fontSize: 26, fontWeight: '800', color: '#F0EEF8',
  },
  otpBoxFilled: { borderColor: '#7B5CF6' },
  resend: { fontSize: 13, color: '#7A7595', textAlign: 'center', marginBottom: 24 },
  resendLink: { color: '#A78BFA', fontWeight: '700' },
  btnMain: {
    backgroundColor: '#7B5CF6',
    borderRadius: 16, padding: 17, alignItems: 'center',
  },
  btnMainText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});