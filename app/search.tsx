import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../firebaseConfig';

const VENUES = [
  { id: '1', name: 'Smash Padel Club', emoji: '🎾', category: 'Sports', dist: '0.5 km', loc: 'Lusail Marina', cb: 20, tags: ['Padel', 'Fitness'] },
  { id: '2', name: 'Sip & Soul Café',  emoji: '☕',  category: 'Coffee',  dist: '0.9 km', loc: 'Fox Hills',     cb: 15, tags: ['Coffee', 'Reading'] },
  { id: '3', name: 'The Bookroom',     emoji: '📚',  category: 'Culture',  dist: '1.4 km', loc: 'The Pearl',     cb: 10, tags: ['Reading', 'Coffee'] },
  { id: '4', name: 'Lusail Yoga Studio', emoji: '🧘', category: 'Wellness', dist: '1.1 km', loc: 'Lusail City', cb: 25, tags: ['Yoga', 'Wellness'] },
  { id: '5', name: 'Chess & Co',       emoji: '♟️', category: 'Games',    dist: '1.8 km', loc: 'Katara',        cb: 12, tags: ['Chess', 'Board Games'] },
  { id: '6', name: 'Shisha Lounge QD', emoji: '💨', category: 'Lounge',   dist: '2.2 km', loc: 'Corniche',      cb: 18, tags: ['Shisha', 'Coffee'] },
  { id: '7', name: 'Fox Hills Padel',  emoji: '🏓',  category: 'Sports',   dist: '2.5 km', loc: 'Fox Hills',     cb: 22, tags: ['Padel', 'Sports'] },
  { id: '8', name: 'Grind Coffee Bar', emoji: '☕',  category: 'Coffee',   dist: '0.7 km', loc: 'Lusail Marina', cb: 17, tags: ['Coffee', 'Work'] },
];

const VENUE_COLORS: Record<string, string> = {
  Sports: '#C8F53B', Coffee: '#F5A53B', Wellness: '#3BF5C8',
  Games: '#A78BFA', Lounge: '#F53B8F', Culture: '#7B5CF6',
};

const AVATAR_COLORS = ['#7B5CF6', '#3BF5C8', '#F53B8F', '#F5A53B', '#A78BFA', '#C8F53B'];

type Tab = 'people' | 'venues';

interface UserResult {
  uid: string;
  alias: string;
  name: string;
  ageGroup: string;
  interests: string[];
  location: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('people');
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [myUid, setMyUid] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('zizo_user').then(uid => setMyUid(uid));
  }, []);

  const searchUsers = async (term: string) => {
    const t = term.trim();
    if (!t) { setUsers([]); setLoading(false); return; }
    setLoading(true);
    try {
      const ref = collection(db, 'users');
      // Prefix-range queries: one on alias (prepend @ if missing), one on name.
      // Both run in parallel; results are merged and deduplicated by document ID.
      const aliasPrefix = t.startsWith('@') ? t : '@' + t;
      const namePrefix  = t.charAt(0).toUpperCase() + t.slice(1);

      const [aliasSnap, nameSnap] = await Promise.all([
        getDocs(query(ref, where('alias', '>=', aliasPrefix), where('alias', '<=', aliasPrefix + ''), limit(15))),
        getDocs(query(ref, where('name',  '>=', namePrefix),  where('name',  '<=', namePrefix  + ''), limit(15))),
      ]);

      const seen = new Set<string>();
      const results: UserResult[] = [];
      [...aliasSnap.docs, ...nameSnap.docs].forEach(d => {
        if (!seen.has(d.id) && d.id !== myUid) {
          seen.add(d.id);
          results.push({ uid: d.id, ...(d.data() as Omit<UserResult, 'uid'>) });
        }
      });
      setUsers(results);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const onChangeText = (text: string) => {
    setSearchText(text);
    if (tab === 'people') {
      setLoading(text.trim().length > 0);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchUsers(text), 350);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setUsers([]);
    setLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (t === 'people' && searchText.trim()) {
      setLoading(true);
      debounceRef.current = setTimeout(() => searchUsers(searchText), 50);
    }
  };

  const filteredVenues = VENUES.filter(v => {
    const t = searchText.toLowerCase();
    return !t ||
      v.name.toLowerCase().includes(t) ||
      v.category.toLowerCase().includes(t) ||
      v.loc.toLowerCase().includes(t) ||
      v.tags.some(tag => tag.toLowerCase().includes(t));
  });

  const initials = (name: string) =>
    (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const avatarColor = (uid: string) =>
    AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={tab === 'people' ? 'Search by alias or name...' : 'Search venues...'}
          placeholderTextColor="#4A4560"
          value={searchText}
          onChangeText={onChangeText}
          autoFocus
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchText(''); setUsers([]); setLoading(false); }}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'people' && styles.tabOn]}
          onPress={() => switchTab('people')}
        >
          <Text style={[styles.tabText, tab === 'people' && styles.tabTextOn]}>👥 People</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'venues' && styles.tabOn]}
          onPress={() => switchTab('venues')}
        >
          <Text style={[styles.tabText, tab === 'venues' && styles.tabTextOn]}>🏪 Venues</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {tab === 'people' ? (
          loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color="#7B5CF6" size="large" />
              <Text style={styles.stateText}>Searching...</Text>
            </View>
          ) : !searchText.trim() ? (
            <View style={styles.centerState}>
              <Text style={styles.stateIcon}>👥</Text>
              <Text style={styles.stateTitle}>Find people</Text>
              <Text style={styles.stateText}>Search by alias (e.g. @LaylaPadel) or name</Text>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.stateIcon}>🔍</Text>
              <Text style={styles.stateTitle}>No users found</Text>
              <Text style={styles.stateText}>Try a different alias or name</Text>
            </View>
          ) : (
            users.map(u => {
              const color = avatarColor(u.uid);
              return (
                <View key={u.uid} style={styles.userCard}>
                  <View style={[styles.userAvWrap, { backgroundColor: color + '22' }]}>
                    <View style={[styles.userAv, { backgroundColor: color }]}>
                      <Text style={styles.userAvText}>{initials(u.name)}</Text>
                    </View>
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.userTopRow}>
                      <Text style={styles.userAlias}>{u.alias}</Text>
                      {!!u.ageGroup && (
                        <View style={styles.ageBadge}>
                          <Text style={styles.ageBadgeText}>{u.ageGroup}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.userName}>{u.name}</Text>
                    {!!u.location && (
                      <Text style={styles.userLoc}>📍 {u.location}</Text>
                    )}
                    {u.interests?.length > 0 && (
                      <View style={styles.chipRow}>
                        {u.interests.slice(0, 4).map(i => (
                          <View key={i} style={styles.chip}>
                            <Text style={styles.chipText}>{i}</Text>
                          </View>
                        ))}
                        {u.interests.length > 4 && (
                          <View style={styles.chipMore}>
                            <Text style={styles.chipMoreText}>+{u.interests.length - 4}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )
        ) : (
          !searchText.trim() ? (
            <View style={styles.centerState}>
              <Text style={styles.stateIcon}>🏪</Text>
              <Text style={styles.stateTitle}>Find venues</Text>
              <Text style={styles.stateText}>Search by name, category, or location</Text>
            </View>
          ) : filteredVenues.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.stateIcon}>🔍</Text>
              <Text style={styles.stateTitle}>No venues found</Text>
              <Text style={styles.stateText}>Try a different name or category</Text>
            </View>
          ) : (
            filteredVenues.map(v => {
              const color = VENUE_COLORS[v.category] ?? '#A78BFA';
              return (
                <TouchableOpacity
                  key={v.id}
                  style={styles.venueCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/venue-detail', params: { id: v.id } } as any)}
                >
                  <View style={[styles.venueEmoji, { backgroundColor: color + '15' }]}>
                    <Text style={styles.venueEmojiText}>{v.emoji}</Text>
                  </View>
                  <View style={styles.venueInfo}>
                    <View style={styles.venueTopRow}>
                      <Text style={styles.venueName} numberOfLines={1}>{v.name}</Text>
                      <View style={[styles.venueCbBadge, { backgroundColor: color + '18' }]}>
                        <Text style={[styles.venueCbText, { color }]}>{v.cb}%</Text>
                      </View>
                    </View>
                    <Text style={styles.venueMeta}>{v.category} · 📍 {v.dist} · {v.loc}</Text>
                    <View style={styles.chipRow}>
                      {v.tags.map(t => (
                        <View key={t} style={[styles.chip, { backgroundColor: color + '12' }]}>
                          <Text style={[styles.chipText, { color }]}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#181428', borderWidth: 1, borderColor: '#231E3A',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 20, color: '#F0EEF8' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#F0EEF8' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#181428', borderWidth: 1.5, borderColor: '#231E3A',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: '#F0EEF8' },
  searchClear: { fontSize: 14, color: '#7A7595', padding: 4 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#181428', borderWidth: 1.5, borderColor: '#231E3A',
    alignItems: 'center',
  },
  tabOn: { backgroundColor: 'rgba(123,92,246,0.18)', borderColor: '#7B5CF6' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#7A7595' },
  tabTextOn: { color: '#F0EEF8' },
  list: { flex: 1, paddingHorizontal: 16 },
  centerState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  stateIcon: { fontSize: 44, marginBottom: 6 },
  stateTitle: { fontSize: 17, fontWeight: '800', color: '#F0EEF8' },
  stateText: { fontSize: 13, color: '#7A7595', textAlign: 'center' },
  // People cards
  userCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#181428', borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 20, padding: 14, marginBottom: 10,
  },
  userAvWrap: {
    width: 56, height: 56, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userAv: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1 },
  userTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  userAlias: { fontSize: 14, fontWeight: '800', color: '#A78BFA' },
  ageBadge: {
    backgroundColor: 'rgba(123,92,246,0.15)',
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
  },
  ageBadgeText: { fontSize: 10, fontWeight: '700', color: '#7B5CF6' },
  userName: { fontSize: 13, fontWeight: '600', color: '#F0EEF8', marginBottom: 3 },
  userLoc: { fontSize: 11, color: '#7A7595', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    backgroundColor: 'rgba(123,92,246,0.1)',
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: '#A78BFA' },
  chipMore: {
    backgroundColor: '#231E3A',
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3,
  },
  chipMoreText: { fontSize: 11, fontWeight: '600', color: '#7A7595' },
  // Venue cards
  venueCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#181428', borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 20, padding: 14, marginBottom: 10,
  },
  venueEmoji: {
    width: 56, height: 56, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  venueEmojiText: { fontSize: 28 },
  venueInfo: { flex: 1, justifyContent: 'center' },
  venueTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 3,
  },
  venueName: { fontSize: 14, fontWeight: '700', color: '#F0EEF8', flex: 1 },
  venueCbBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  venueCbText: { fontSize: 11, fontWeight: '800' },
  venueMeta: { fontSize: 11, color: '#7A7595', marginBottom: 6 },
});
