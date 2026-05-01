import { useRouter } from 'expo-router';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <View style={styles.topVisual}>
        <View style={styles.circleOuter}>
          <View style={styles.circleInner}>
            <View style={styles.circleCenter}>
              <Text style={styles.circleZ}>Z</Text>
            </View>
          </View>
        </View>
        <View style={[styles.avatar, styles.av1]}><Text style={styles.avText}>L</Text></View>
        <View style={[styles.avatar, styles.av2]}><Text style={styles.avText}>O</Text></View>
        <View style={[styles.avatar, styles.av3]}><Text style={styles.avText}>S</Text></View>
        <View style={[styles.avatar, styles.av4]}><Text style={styles.avText}>K</Text></View>
        <View style={[styles.matchBadge, styles.mb1]}>
          <Text style={styles.matchText}>94% match ✨</Text>
        </View>
        <View style={[styles.matchBadge, styles.mb2]}>
          <Text style={styles.matchText}>87% match ✨</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✦ QATAR'S SOCIAL CIRCLE APP</Text>
        </View>

        <Text style={styles.title}>
          Meet people who{'\n'}
          <Text style={styles.titlePurple}>love what you love</Text>
        </Text>

        <Text style={styles.subtitle}>
          AI matches you with people nearby based on your real interests — and rewards you with cashback every time you go out.
        </Text>

        <TouchableOpacity
          style={styles.btnMain}
          onPress={() => router.push('/phone' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnMainText}>Get Started — It's Free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => router.push('/login' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnOutlineText}>I already have an account</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/tos' as any)}>
          <Text style={styles.terms}>
            By continuing you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: {
    width: 340, height: 340,
    backgroundColor: 'rgba(123,92,246,0.12)',
    top: -100, right: -80,
  },
  orb2: {
    width: 280, height: 280,
    backgroundColor: 'rgba(245,59,143,0.08)',
    bottom: 200, left: -80,
  },
  topVisual: {
    height: height * 0.52,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  circleOuter: {
    width: 260, height: 260, borderRadius: 130,
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  circleInner: {
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 1, borderColor: 'rgba(245,59,143,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  circleCenter: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#7B5CF6',
    alignItems: 'center', justifyContent: 'center',
    elevation: 15,
  },
  circleZ: { fontSize: 44, fontWeight: '900', color: '#fff' },
  avatar: {
    position: 'absolute', width: 50, height: 50,
    borderRadius: 25, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#0B0914',
  },
  av1: { backgroundColor: '#7B5CF6', top: 30, left: width * 0.1 },
  av2: { backgroundColor: '#3BF5C8', top: 20, right: width * 0.1 },
  av3: { backgroundColor: '#F53B8F', bottom: 50, left: width * 0.08 },
  av4: { backgroundColor: '#F5A53B', bottom: 40, right: width * 0.08 },
  avText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  matchBadge: {
    position: 'absolute', backgroundColor: '#1A1530',
    borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  mb1: { top: 15, left: width * 0.28 },
  mb2: { top: 5, right: width * 0.05 },
  matchText: { fontSize: 11, fontWeight: '700', color: '#C8F53B' },
  content: {
    flex: 1, paddingHorizontal: 28,
    paddingBottom: 44, justifyContent: 'flex-end',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(123,92,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.3)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#A78BFA', letterSpacing: 1 },
  title: {
    fontSize: 32, fontWeight: '800',
    color: '#F0EEF8', lineHeight: 38, marginBottom: 12,
  },
  titlePurple: { color: '#A78BFA' },
  subtitle: { fontSize: 15, color: '#7A7595', lineHeight: 24, marginBottom: 28 },
  btnMain: {
    backgroundColor: '#7B5CF6', borderRadius: 16,
    padding: 17, alignItems: 'center', marginBottom: 12,
  },
  btnMainText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnOutline: {
    borderRadius: 16, padding: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#231E3A', marginBottom: 16,
  },
  btnOutlineText: { fontSize: 15, fontWeight: '600', color: '#F0EEF8' },
  terms: { fontSize: 11, color: '#7A7595', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#A78BFA', fontWeight: '700', textDecorationLine: 'underline' },
});