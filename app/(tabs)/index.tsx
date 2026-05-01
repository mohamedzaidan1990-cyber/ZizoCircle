import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useLocation from '../../hooks/useLocation';

const MATCHES = [
  { id: '1', name: 'Layla M.', init: 'L', pct: 94, dist: '0.8 km', loc: 'Lusail', tags: ['Padel', 'Coffee'], color: '#7B5CF6' },
  { id: '2', name: 'Omar K.', init: 'O', pct: 87, dist: '1.2 km', loc: 'Fox Hills', tags: ['Reading', 'Chess'], color: '#3BF5C8' },
  { id: '3', name: 'Sara H.', init: 'S', pct: 82, dist: '2.1 km', loc: 'Pearl', tags: ['Yoga', 'Padel'], color: '#F53B8F' },
  { id: '4', name: 'Khalid R.', init: 'K', pct: 76, dist: '3.0 km', loc: 'Katara', tags: ['Football', 'Gaming'], color: '#F5A53B' },
];

const VENUES = [
  { id: '1', name: 'Smash Padel', emoji: '🎾', dist: '0.5 km', cb: '20%', color: '#C8F53B' },
  { id: '2', name: 'Sip & Soul', emoji: '☕', dist: '0.9 km', cb: '15%', color: '#F5A53B' },
  { id: '3', name: 'The Bookroom', emoji: '📚', dist: '1.4 km', cb: '10%', color: '#A78BFA' },
  { id: '4', name: 'Lusail Yoga', emoji: '🧘', dist: '1.1 km', cb: '25%', color: '#F53B8F' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [alias, setAlias] = useState('');
  const [greeting, setGreeting] = useState('');
  const [wallet, setWallet] = useState(0);
  const { location } = useLocation();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning,');
    else if (hour < 18) setGreeting('Good afternoon,');
    else setGreeting('Good evening,');

    const loadProfile = async () => {
      try {
        const cached = await AsyncStorage.getItem('zizo_profile');
        if (cached) {
          const data = JSON.parse(cached);
          setAlias(data.alias || '');
          setWallet(data.wallet || 0);
        }
      } catch (e) {
        console.log('Error loading profile:', e);
      }
    };
    loadProfile();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoZ}>Z</Text>
          </View>
          <Text style={styles.logoName}>Zizo Circle</Text>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.locationPill}>
            <Text style={styles.locationText} numberOfLines={1}>📍 {location}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.walletPill}
            onPress={() => router.push('/(tabs)/wallet' as any)}
          >
            <Text style={styles.walletText}>💰 QR {wallet.toFixed(2)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/search' as any)}
          >
            <Text style={{ fontSize: 16 }}>🔍</Text>
          </TouchableOpacity>
          <View style={styles.iconBtn}>
            <Text style={{ fontSize: 16 }}>🔔</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.greeting}>
          <Text style={styles.greetLine}>{greeting}</Text>
          <Text style={styles.greetName}>
            Hey <Text style={{ color: '#A78BFA' }}>{alias || '...'}</Text> 👋
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.zizoCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/zizo' as any)}
          >
            <View style={styles.zizoAv}>
              <View style={styles.zaHair} />
              <View style={styles.zaSkin} />
              <View style={styles.zaEyes}>
                <View style={styles.zaEye} />
                <View style={styles.zaEye} />
              </View>
              <View style={styles.zaMouth} />
              <View style={styles.zaOnline} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.zizoLabel}>● ZIZO · ONLINE NOW</Text>
              <Text style={styles.zizoMsg}>
                I found 4 people near you who love padel & coffee! ☕🎾
              </Text>
              <View style={styles.zizoCta}>
                <Text style={styles.zizoCtaText}>Chat with Zizo →</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.cbBanner}>
          <Text style={styles.cbTitle}>💰 How Cashback Works</Text>
          <Text style={styles.cbText}>
            Visit any partner venue and earn cashback straight to your Zizo Wallet. No codes needed.
          </Text>
          <View style={styles.cbStats}>
            <View style={styles.cbStat}>
              <Text style={styles.cbVal}>10–25%</Text>
              <Text style={styles.cbLbl}>Cashback</Text>
            </View>
            <View style={styles.cbStat}>
              <Text style={styles.cbVal}>2×</Text>
              <Text style={styles.cbLbl}>With match</Text>
            </View>
            <View style={styles.cbStat}>
              <Text style={styles.cbVal}>120+</Text>
              <Text style={styles.cbLbl}>Venues</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.secHdr}>
            <Text style={styles.secLbl}>✨ TOP MATCHES TODAY</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/matches' as any)}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {MATCHES.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.matchCard}
                  onPress={() => router.push({ pathname: '/match-detail', params: { id: m.id } } as any)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.matchTop, { backgroundColor: m.color + '15' }]}>
                    <View style={[styles.matchAv, { backgroundColor: m.color }]}>
                      <Text style={styles.matchAvText}>{m.init}</Text>
                    </View>
                    <View style={styles.matchPct}>
                      <Text style={[styles.matchPctText, { color: m.pct >= 90 ? '#C8F53B' : '#A78BFA' }]}>
                        {m.pct}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.matchBody}>
                    <Text style={styles.matchName}>{m.name}</Text>
                    <Text style={styles.matchLoc}>📍 {m.dist} · {m.loc}</Text>
                    <View style={styles.matchTags}>
                      {m.tags.map(t => (
                        <View key={t} style={styles.tag}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.secHdr}>
            <Text style={styles.secLbl}>🏪 VENUES NEAR YOU</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/venues' as any)}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {VENUES.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.venueCard}
                  onPress={() => router.push({ pathname: '/venue-detail', params: { id: v.id } } as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.venueTop}>
                    <Text style={{ fontSize: 34 }}>{v.emoji}</Text>
                  </View>
                  <View style={styles.venueBody}>
                    <Text style={styles.venueName}>{v.name}</Text>
                    <Text style={styles.venueMeta}>{v.dist}</Text>
                    <View style={[styles.venueCb, { backgroundColor: v.color + '20' }]}>
                      <Text style={[styles.venueCbText, { color: v.color }]}>
                        {v.cb} cashback
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  topbar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 10,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#7B5CF6',
    alignItems: 'center', justifyContent: 'center',
  },
  logoZ: { fontSize: 16, fontWeight: '900', color: '#fff' },
  logoName: { fontSize: 18, fontWeight: '800', color: '#F0EEF8' },
  topRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  locationPill: {
    backgroundColor: 'rgba(59,245,200,0.08)',
    borderWidth: 1, borderColor: 'rgba(59,245,200,0.2)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    maxWidth: 110,
  },
  locationText: { fontSize: 10, fontWeight: '600', color: '#3BF5C8' },
  walletPill: {
    backgroundColor: 'rgba(123,92,246,0.12)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.25)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  walletText: { fontSize: 12, fontWeight: '700', color: '#A78BFA' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', alignItems: 'center', justifyContent: 'center',
  },
  greeting: { paddingHorizontal: 20, paddingBottom: 14 },
  greetLine: { fontSize: 13, color: '#7A7595' },
  greetName: { fontSize: 22, fontWeight: '800', color: '#F0EEF8' },
  section: { paddingHorizontal: 20, marginBottom: 22 },
  secHdr: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  secLbl: { fontSize: 11, fontWeight: '700', color: '#7A7595', letterSpacing: 1.5 },
  seeAll: { fontSize: 12, color: '#A78BFA', fontWeight: '700' },
  zizoCard: {
    backgroundColor: 'rgba(91,60,214,0.2)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.35)',
    borderRadius: 20, padding: 16,
    flexDirection: 'row', gap: 13, alignItems: 'center',
  },
  zizoAv: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#3D2478', position: 'relative', overflow: 'hidden',
  },
  zaHair: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: '46%', backgroundColor: '#1A0A3C',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  zaSkin: {
    position: 'absolute', top: '30%',
    left: '18%', right: '18%', bottom: '8%',
    backgroundColor: '#C4A882', borderRadius: 20,
  },
  zaEyes: {
    position: 'absolute', top: '38%', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 10,
  },
  zaEye: { width: 6, height: 7, backgroundColor: '#1A0A2E', borderRadius: 3 },
  zaMouth: {
    position: 'absolute', top: '60%', alignSelf: 'center',
    width: 14, height: 7,
    borderBottomWidth: 2, borderColor: '#1A0A2E',
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
  },
  zaOnline: {
    position: 'absolute', bottom: 2, right: 2,
    width: 11, height: 11, backgroundColor: '#3BF5C8',
    borderRadius: 6, borderWidth: 2, borderColor: '#0B0914',
  },
  zizoLabel: { fontSize: 11, fontWeight: '700', color: '#3BF5C8', marginBottom: 3 },
  zizoMsg: { fontSize: 13, color: '#F0EEF8', lineHeight: 19, marginBottom: 8 },
  zizoCta: {
    backgroundColor: '#7B5CF6', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start',
  },
  zizoCtaText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cbBanner: {
    marginHorizontal: 20, marginBottom: 22,
    backgroundColor: 'rgba(200,245,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(200,245,59,0.2)',
    borderRadius: 18, padding: 16,
  },
  cbTitle: { fontSize: 15, fontWeight: '800', color: '#C8F53B', marginBottom: 6 },
  cbText: { fontSize: 13, color: '#7A7595', lineHeight: 19, marginBottom: 12 },
  cbStats: { flexDirection: 'row', gap: 10 },
  cbStat: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12, padding: 10, alignItems: 'center',
  },
  cbVal: { fontSize: 18, fontWeight: '800', color: '#C8F53B' },
  cbLbl: { fontSize: 10, color: '#7A7595', marginTop: 2 },
  matchCard: {
    width: 152, backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 20, overflow: 'hidden',
  },
  matchTop: { height: 78, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  matchAv: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#0B0914',
  },
  matchAvText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  matchPct: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  matchPctText: { fontSize: 10, fontWeight: '800' },
  matchBody: { padding: 12 },
  matchName: { fontSize: 14, fontWeight: '700', color: '#F0EEF8', marginBottom: 2 },
  matchLoc: { fontSize: 11, color: '#7A7595', marginBottom: 8 },
  matchTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    backgroundColor: 'rgba(123,92,246,0.12)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  tagText: { fontSize: 10, fontWeight: '600', color: '#A78BFA' },
  venueCard: {
    width: 155, backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 20, overflow: 'hidden',
  },
  venueTop: {
    height: 72, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(123,92,246,0.06)',
  },
  venueBody: { padding: 12 },
  venueName: { fontSize: 13, fontWeight: '700', color: '#F0EEF8', marginBottom: 2 },
  venueMeta: { fontSize: 11, color: '#7A7595', marginBottom: 8 },
  venueCb: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  venueCbText: { fontSize: 11, fontWeight: '800' },
});