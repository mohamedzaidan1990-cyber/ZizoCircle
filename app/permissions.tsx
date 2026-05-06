import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PermissionsScreen() {
  const router = useRouter();
  const [geoOn, setGeoOn] = useState(true);
  const [notifOn, setNotifOn] = useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <Text style={styles.stepText}>5 of 5</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Last couple{'\n'}of things 🙏</Text>
        <Text style={styles.subtitle}>
          These make Zizo Circle work. Change anytime in settings.
        </Text>

        {/* Location */}
        <View style={styles.permCard}>
          <View style={[styles.permIco, { backgroundColor: 'rgba(59,245,200,0.1)' }]}>
            <Text style={styles.permIcoText}>📍</Text>
          </View>
          <View style={styles.permInfo}>
            <Text style={styles.permTitle}>Location Access</Text>
            <Text style={styles.permDesc}>
              Finds people and venues near you. We never share your exact location.
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggle, geoOn && styles.toggleOn]}
                onPress={() => setGeoOn(!geoOn)}
              >
                <View style={[styles.toggleKnob, geoOn && styles.toggleKnobOn]} />
              </TouchableOpacity>
              <Text style={[styles.toggleLabel, geoOn && styles.toggleLabelOn]}>
                {geoOn ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.permCard}>
          <View style={[styles.permIco, { backgroundColor: 'rgba(123,92,246,0.1)' }]}>
            <Text style={styles.permIcoText}>🔔</Text>
          </View>
          <View style={styles.permInfo}>
            <Text style={styles.permTitle}>Push Notifications</Text>
            <Text style={styles.permDesc}>
              Get notified when Zizo finds a match, cashback lands, or someone messages you.
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggle, notifOn && styles.toggleOn]}
                onPress={() => setNotifOn(!notifOn)}
              >
                <View style={[styles.toggleKnob, notifOn && styles.toggleKnobOn]} />
              </TouchableOpacity>
              <Text style={[styles.toggleLabel, notifOn && styles.toggleLabelOn]}>
                {notifOn ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.privacyBox}>
          <Text style={styles.privacyText}>
            🔒 <Text style={{ color: '#F0EEF8', fontWeight: '700' }}>Your data is yours.</Text> We never sell personal data. Location is approximate and never stored precisely.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.btnMain}
          onPress={() => router.replace('/(tabs)' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnMainText}>Continue</Text>
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
  subtitle: { fontSize: 14, color: '#7A7595', lineHeight: 22, marginBottom: 24 },
  permCard: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 20,
    padding: 18, marginBottom: 14, flexDirection: 'row', gap: 14,
  },
  permIco: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  permIcoText: { fontSize: 22 },
  permInfo: { flex: 1 },
  permTitle: {
    fontSize: 15, fontWeight: '700',
    color: '#F0EEF8', marginBottom: 6,
  },
  permDesc: { fontSize: 13, color: '#7A7595', lineHeight: 19, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: '#231E3A', justifyContent: 'center', padding: 3,
  },
  toggleOn: { backgroundColor: '#7B5CF6' },
  toggleKnob: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, elevation: 2,
  },
  toggleKnobOn: { transform: [{ translateX: 20 }] },
  toggleLabel: { fontSize: 12, fontWeight: '600', color: '#7A7595' },
  toggleLabelOn: { color: '#A78BFA' },
  privacyBox: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 14,
    padding: 14, marginBottom: 24,
  },
  privacyText: { fontSize: 13, color: '#7A7595', lineHeight: 20 },
  btnMain: {
    backgroundColor: '#7B5CF6',
    borderRadius: 16, padding: 17, alignItems: 'center',
  },
  btnMainText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});