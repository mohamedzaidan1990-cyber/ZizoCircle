import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const MATCHES = [
  { id: '1', name: 'Layla M.', alias: '@LaylaPadel', init: 'L', pct: 94, dist: '0.8 km', loc: 'Lusail Marina', tags: ['Padel', 'Coffee', 'Yoga'], color: '#7B5CF6', online: true },
  { id: '2', name: 'Omar K.', alias: '@OmarChess', init: 'O', pct: 87, dist: '1.2 km', loc: 'Fox Hills', tags: ['Chess', 'Reading', 'Coffee'], color: '#3BF5C8', online: true },
  { id: '3', name: 'Sara H.', alias: '@SaraFit', init: 'S', pct: 82, dist: '2.1 km', loc: 'The Pearl', tags: ['Yoga', 'Padel', 'Fitness'], color: '#F53B8F', online: false },
  { id: '4', name: 'Khalid R.', alias: '@KhalidGoal', init: 'K', pct: 76, dist: '3.0 km', loc: 'Katara', tags: ['Football', 'Gaming', 'Padel'], color: '#F5A53B', online: false },
  { id: '5', name: 'Nour A.', alias: '@NourReads', init: 'N', pct: 74, dist: '3.5 km', loc: 'Msheireb', tags: ['Reading', 'Coffee', 'Art'], color: '#C8F53B', online: true },
  { id: '6', name: 'Tariq M.', alias: '@TariqPadel', init: 'T', pct: 71, dist: '4.1 km', loc: 'West Bay', tags: ['Padel', 'Football', 'Gym'], color: '#A78BFA', online: false },
];

const FILTERS = ['All', 'Padel', 'Coffee', 'Chess', 'Yoga', 'Reading', 'Football'];

export default function MatchesScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [connected, setConnected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = MATCHES.filter(m => {
    const matchesFilter = activeFilter === 'All' || m.tags.includes(activeFilter);
    const matchesSearch = search === '' ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.alias.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      m.loc.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const connect = (id: string) => {
    setConnected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Your Matches</Text>
          <Text style={styles.headerSub}>{MATCHES.length} people nearby share your interests</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>✨ AI Matched</Text>
        </View>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, alias, interest..."
          placeholderTextColor="#4A4560"
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipOn]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextOn]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.resultCount}>
        {filtered.length} match{filtered.length !== 1 ? 'es' : ''} found
        {search.length > 0 && <Text style={{ color: '#A78BFA' }}> for "{search}"</Text>}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptyText}>Try a different name, alias, or interest</Text>
            <TouchableOpacity onPress={() => { setSearch(''); setActiveFilter('All'); }}>
              <Text style={styles.emptyClear}>Clear search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(m => (
            <TouchableOpacity
              key={m.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/match-detail', params: { id: m.id } } as any)}
            >
              <View style={[styles.avWrap, { backgroundColor: m.color + '20' }]}>
                <View style={[styles.av, { backgroundColor: m.color }]}>
                  <Text style={styles.avText}>{m.init}</Text>
                </View>
                {m.online && <View style={styles.onlineDot} />}
              </View>

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{m.name}</Text>
                  <View style={[styles.pctBadge, { backgroundColor: m.pct >= 90 ? 'rgba(200,245,59,0.15)' : 'rgba(123,92,246,0.15)' }]}>
                    <Text style={[styles.pctText, { color: m.pct >= 90 ? '#C8F53B' : '#A78BFA' }]}>
                      {m.pct}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.alias}>{m.alias}</Text>
                <Text style={styles.loc}>📍 {m.dist} · {m.loc}</Text>
                <View style={styles.tags}>
                  {m.tags.map(t => (
                    <View key={t} style={[styles.tag, search && t.toLowerCase().includes(search.toLowerCase()) && styles.tagHighlight]}>
                      <Text style={[styles.tagText, search && t.toLowerCase().includes(search.toLowerCase()) && styles.tagTextHighlight]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.connectBtn, connected.includes(m.id) && styles.connectBtnOn]}
                onPress={(e) => { e.stopPropagation(); connect(m.id); }}
              >
                <Text style={[styles.connectText, connected.includes(m.id) && styles.connectTextOn]}>
                  {connected.includes(m.id) ? '✓' : '+'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#F0EEF8' },
  headerSub: { fontSize: 12, color: '#7A7595', marginTop: 2 },
  headerBadge: {
    backgroundColor: 'rgba(123,92,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.3)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#A78BFA' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchWrapFocused: { borderColor: '#7B5CF6' },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: '#F0EEF8' },
  searchClear: { fontSize: 14, color: '#7A7595', padding: 4 },
  filterScroll: { marginBottom: 8, maxHeight: 40 },
  filterChip: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 100,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  filterChipOn: { backgroundColor: 'rgba(123,92,246,0.2)', borderColor: '#7B5CF6' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#7A7595' },
  filterTextOn: { color: '#F0EEF8' },
  resultCount: { fontSize: 12, color: '#7A7595', paddingHorizontal: 20, marginBottom: 12 },
  list: { flex: 1, paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#F0EEF8' },
  emptyText: { fontSize: 13, color: '#7A7595' },
  emptyClear: { fontSize: 13, color: '#A78BFA', fontWeight: '700', marginTop: 8 },
  card: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 20,
    padding: 14, marginBottom: 10,
  },
  avWrap: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', flexShrink: 0,
  },
  av: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  avText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 10, height: 10, backgroundColor: '#3BF5C8',
    borderRadius: 5, borderWidth: 2, borderColor: '#181428',
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: '#F0EEF8' },
  pctBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  pctText: { fontSize: 11, fontWeight: '800' },
  alias: { fontSize: 12, color: '#7A7595', marginBottom: 3 },
  loc: { fontSize: 11, color: '#7A7595', marginBottom: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    backgroundColor: 'rgba(123,92,246,0.1)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
  },
  tagHighlight: { backgroundColor: 'rgba(200,245,59,0.15)' },
  tagText: { fontSize: 10, fontWeight: '600', color: '#A78BFA' },
  tagTextHighlight: { color: '#C8F53B' },
  connectBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#181428', borderWidth: 2,
    borderColor: '#7B5CF6', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  connectBtnOn: { backgroundColor: '#7B5CF6' },
  connectText: { fontSize: 18, fontWeight: '800', color: '#7B5CF6' },
  connectTextOn: { color: '#fff' },
});
