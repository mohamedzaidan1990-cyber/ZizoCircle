import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ZizoIntroScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.glow} />

      <View style={styles.avatarWrap}>
        <View style={styles.zizoHead}>
          <View style={styles.hair} />
          <View style={[styles.ear, styles.earLeft]} />
          <View style={[styles.ear, styles.earRight]} />
          <View style={styles.skin} />
          <View style={styles.browsRow}>
            <View style={styles.brow} />
            <View style={styles.brow} />
          </View>
          <View style={styles.eyesRow}>
            <View style={styles.eye}>
              <View style={styles.pupil} />
              <View style={styles.eyeShine} />
            </View>
            <View style={styles.eye}>
              <View style={styles.pupil} />
              <View style={styles.eyeShine} />
            </View>
          </View>
          <View style={styles.nose} />
          <View style={styles.smile} />
          <View style={styles.collar} />
        </View>
        <View style={styles.ring1} />
        <View style={styles.ring2} />
        <View style={[styles.particle, { backgroundColor: '#C8F53B', top: 8, right: 16 }]} />
        <View style={[styles.particle, { backgroundColor: '#F53B8F', bottom: 10, left: 12 }]} />
        <View style={[styles.particle, { backgroundColor: '#3BF5C8', top: 20, left: 8 }]} />
        <View style={styles.speechBubble}>
          <Text style={styles.speechText}>👋 Hi! I'm Zizo</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>ZIZO · YOUR AI GUIDE</Text>
        </View>

        <Text style={styles.title}>Nice to meet you!{'\n'}I'm Zizo 🤝</Text>
        <Text style={styles.subtitle}>
          I'm your personal AI companion inside Zizo Circle. I know your interests, I know what's around you, and I'll help you find the best experiences — with the right people.
        </Text>

        <View style={styles.features}>
          {[
            { ico: '🎯', bg: 'rgba(59,245,200,0.1)', title: 'AI Matching', desc: 'People nearby with 70%+ matching interests' },
            { ico: '🏙️', bg: 'rgba(245,165,59,0.1)', title: 'Venue Discovery', desc: 'Best spots filtered by your budget & mood' },
            { ico: '💰', bg: 'rgba(200,245,59,0.1)', title: 'Cashback Rewards', desc: 'Every visit earns QR credit to your wallet' },
          ].map(f => (
            <View key={f.title} style={styles.featRow}>
              <View style={[styles.featIco, { backgroundColor: f.bg }]}>
                <Text style={{ fontSize: 18 }}>{f.ico}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featTitle}>{f.title}</Text>
                <Text style={styles.featDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ToS notice */}
        <View style={styles.tosNotice}>
          <Text style={styles.tosNoticeText}>
            📋 Before you start, please read and accept our Terms of Service. By using Zizo Circle you agree to our community guidelines and privacy policy.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.btnMain}
          onPress={() => router.push({ pathname: '/tos', params: { from: 'onboarding' } } as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnMainText}>Read & Accept Terms →</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  glow: {
    position: 'absolute', top: -60,
    alignSelf: 'center', width: 400, height: 400,
    backgroundColor: 'rgba(123,92,246,0.12)', borderRadius: 200,
  },
  avatarWrap: {
    alignSelf: 'center', marginTop: 60,
    width: 160, height: 160, position: 'relative',
  },
  zizoHead: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#6A4CE4', overflow: 'hidden', position: 'relative',
  },
  hair: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: '50%', backgroundColor: '#1A0A3C',
    borderBottomLeftRadius: 60, borderBottomRightRadius: 60,
  },
  ear: {
    position: 'absolute', top: '42%',
    width: 16, height: 22,
    backgroundColor: '#C4A882', borderRadius: 8,
  },
  earLeft: { left: 6 },
  earRight: { right: 6 },
  skin: {
    position: 'absolute', top: '35%',
    left: '18%', right: '18%', bottom: '10%',
    backgroundColor: '#C4A882',
    borderTopLeftRadius: 40, borderTopRightRadius: 40,
    borderBottomLeftRadius: 45, borderBottomRightRadius: 45,
  },
  browsRow: {
    position: 'absolute', top: '36%', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 24,
  },
  brow: { width: 20, height: 4, backgroundColor: '#1A0A2E', borderRadius: 10 },
  eyesRow: {
    position: 'absolute', top: '44%', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 26,
  },
  eye: {
    width: 18, height: 20, backgroundColor: '#1A0A2E',
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  pupil: { width: 8, height: 8, backgroundColor: '#7B5CF6', borderRadius: 4 },
  eyeShine: {
    position: 'absolute', top: 3, right: 3,
    width: 4, height: 4,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2,
  },
  nose: {
    position: 'absolute', top: '54%', alignSelf: 'center',
    width: 10, height: 12,
    borderLeftWidth: 2, borderBottomWidth: 2,
    borderColor: 'rgba(26,10,46,0.4)',
    borderBottomLeftRadius: 5,
  },
  smile: {
    position: 'absolute', top: '65%', alignSelf: 'center',
    width: 36, height: 18,
    borderBottomWidth: 3, borderLeftWidth: 2, borderRightWidth: 2,
    borderColor: '#1A0A2E',
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  collar: {
    position: 'absolute', bottom: 0,
    left: '20%', right: '20%', height: '22%',
    backgroundColor: '#5B3CD6',
    borderBottomLeftRadius: 50, borderBottomRightRadius: 50,
  },
  ring1: {
    position: 'absolute', top: -18, left: -18, right: -18, bottom: -18,
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.25)', borderRadius: 100,
  },
  ring2: {
    position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
    borderWidth: 1, borderColor: 'rgba(245,59,143,0.15)', borderRadius: 88,
  },
  particle: { position: 'absolute', width: 7, height: 7, borderRadius: 4 },
  speechBubble: {
    position: 'absolute', top: -14, right: -20,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  speechText: { fontSize: 11, fontWeight: '700', color: '#3BF5C8' },
  scroll: { flex: 1, paddingHorizontal: 26 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(123,92,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.3)',
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 18, marginTop: 16,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3BF5C8' },
  liveText: { fontSize: 12, fontWeight: '700', color: '#A78BFA', letterSpacing: 1 },
  title: {
    fontSize: 28, fontWeight: '800',
    color: '#F0EEF8', lineHeight: 34, marginBottom: 10,
  },
  subtitle: { fontSize: 14, color: '#7A7595', lineHeight: 22, marginBottom: 22 },
  features: { gap: 10, marginBottom: 20 },
  featRow: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 14,
    padding: 12, alignItems: 'center',
  },
  featIco: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  featTitle: { fontSize: 13, fontWeight: '700', color: '#F0EEF8', marginBottom: 2 },
  featDesc: { fontSize: 12, color: '#7A7595' },
  tosNotice: {
    backgroundColor: 'rgba(123,92,246,0.08)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.2)',
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  tosNoticeText: { fontSize: 13, color: '#7A7595', lineHeight: 20 },
  btnMain: {
    backgroundColor: '#7B5CF6',
    borderRadius: 16, padding: 17, alignItems: 'center',
  },
  btnMainText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});