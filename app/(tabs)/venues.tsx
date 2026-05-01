import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const VENUES = [
  { id: '1', name: 'Smash Padel Club', emoji: '🎾', category: 'Sports', dist: '0.5 km', loc: 'Lusail Marina', cb: 20, matchCb: 40, rating: 4.8, reviews: 124, tags: ['Padel', 'Fitness'] },
  { id: '2', name: 'Sip & Soul Café', emoji: '☕', category: 'Coffee', dist: '0.9 km', loc: 'Fox Hills', cb: 15, matchCb: 30, rating: 4.7, reviews: 89, tags: ['Coffee', 'Reading'] },
  { id: '3', name: 'The Bookroom', emoji: '📚', category: 'Culture', dist: '1.4 km', loc: 'The Pearl', cb: 10, matchCb: 20, rating: 4.6, reviews: 56, tags: ['Reading', 'Coffee'] },
  { id: '4', name: 'Lusail Yoga Studio', emoji: '🧘', category: 'Wellness', dist: '1.1 km', loc: 'Lusail City', cb: 25, matchCb: 50, rating: 4.9, reviews: 201, tags: ['Yoga', 'Wellness'] },
  { id: '5', name: 'Chess & Co', emoji: '♟️', category: 'Games', dist: '1.8 km', loc: 'Katara', cb: 12, matchCb: 24, rating: 4.5, reviews: 43, tags: ['Chess', 'Board Games'] },
  { id: '6', name: 'Shisha Lounge QD', emoji: '💨', category: 'Lounge', dist: '2.2 km', loc: 'Corniche', cb: 18, matchCb: 36, rating: 4.4, reviews: 178, tags: ['Shisha', 'Coffee'] },
  { id: '7', name: 'Fox Hills Padel', emoji: '🏓', category: 'Sports', dist: '2.5 km', loc: 'Fox Hills', cb: 22, matchCb: 44, rating: 4.7, reviews: 95, tags: ['Padel', 'Sports'] },
  { id: '8', name: 'Grind Coffee Bar', emoji: '☕', category: 'Coffee', dist: '0.7 km', loc: 'Lusail Marina', cb: 17, matchCb: 34, rating: 4.8, reviews: 112, tags: ['Coffee', 'Work'] },
];

const FILTERS = ['All', 'Sports', 'Coffee', 'Wellness', 'Games', 'Lounge', 'Culture'];

const CB_COLORS: { [key: string]: string } = {
  Sports: '#C8F53B',
  Coffee: '#F5A53B',
  Wellness: '#3BF5C8',
  Games: '#A78BFA',
  Lounge: '#F53B8F',
  Culture: '#7B5CF6',
};

export default function VenuesScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = VENUES.filter(v => {
    const matchesFilter = activeFilter === 'All' || v.category === activeFilter;
    const matchesSearch = search === '' ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase()) ||
      v.loc.toLowerCase().includes(search.toLowerCase()) ||
      v.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Venues Near You</Text>
          <Text style={styles.subtitle}>Earn cashback on every visit</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>📍 Lusail</Text>
        </View>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          💡 Visit alone = regular cashback · Visit with a match = <Text style={{ color: '#C8F53B', fontWeight: '800' }}>2× cashback!</Text>
        </Text>
      </View>

      <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, category, tag, location..."
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
        {filtered.length} venue{filtered.length !== 1 ? 's' : ''} found
        {search.length > 0 && <Text style={{ color: '#A78BFA' }}> for "{search}"</Text>}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>No venues found</Text>
            <Text style={styles.emptyText}>Try a different name, category, tag, or location</Text>
            <TouchableOpacity onPress={() => { setSearch(''); setActiveFilter('All'); }}>
              <Text style={styles.emptyClear}>Clear search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(v => {
            const color = CB_COLORS[v.category] || '#A78BFA';
            return (
              <TouchableOpacity
                key={v.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/venue-detail', params: { id: v.id } } as any)}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.emojiWrap, { backgroundColor: color + '15' }]}>
                    <Text style={styles.emoji}>{v.emoji}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.venueName}>{v.name}</Text>
                    <Text style={styles.venueMeta}>📍 {v.dist} · {v.loc}</Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.rating}>⭐ {v.rating}</Text>
                      <Text style={styles.reviews}>({v.reviews} reviews)</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cbRow}>
                  <View style={[styles.cbCard, { backgroundColor: color + '10', borderColor: color + '30' }]}>
                    <Text style={styles.cbLabel}>SOLO VISIT</Text>
                    <Text style={[styles.cbVal, { color }]}>{v.cb}%</Text>
                    <Text style={styles.cbSub}>cashback</Text>
                  </View>
                  <View style={styles.cbArrow}>
                    <Text style={styles.cbArrowText}>+</Text>
                  </View>
                  <View style={[styles.cbCard, { backgroundColor: 'rgba(200,245,59,0.1)', borderColor: 'rgba(200,245,59,0.3)' }]}>
                    <Text style={styles.cbLabel}>WITH MATCH</Text>
                    <Text style={[styles.cbVal, { color: '#C8F53B' }]}>{v.matchCb}%</Text>
                    <Text style={styles.cbSub}>2× cashback</Text>
                  </View>
                </View>

                <View style={styles.tagRow}>
                  {v.tags.map(t => {
                    const isMatch = search.length > 0 && t.toLowerCase().includes(search.toLowerCase());
                    return (
                      <View key={t} style={[styles.tag, isMatch ? styles.tagHighlight : { backgroundColor: color + '12' }]}>
                        <Text style={[styles.tagText, isMatch ? styles.tagTextHighlight : { color }]}>{t}</Text>
                      </View>
                    );
                  })}
                  <View style={styles.visitBtn}>
                    <Text style={styles.visitText}>Visit & Earn →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
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
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 10,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#F0EEF8' },
  subtitle: { fontSize: 12, color: '#7A7595', marginTop: 2 },
  headerBadge: {
    backgroundColor: 'rgba(123,92,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.3)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#A78BFA' },
  banner: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: 'rgba(200,245,59,0.06)',
    borderWidth: 1, borderColor: 'rgba(200,245,59,0.2)',
    borderRadius: 12, padding: 10,
  },
  bannerText: { fontSize: 12, color: '#7A7595', lineHeight: 18 },
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
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#F0EEF8' },
  emptyText: { fontSize: 13, color: '#7A7595' },
  emptyClear: { fontSize: 13, color: '#A78BFA', fontWeight: '700', marginTop: 8 },
  tagHighlight: { backgroundColor: 'rgba(200,245,59,0.15)' },
  tagTextHighlight: { color: '#C8F53B' },
  filterScroll: { marginBottom: 8, maxHeight: 40 },
  filterChip: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 100,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  filterChipOn: { backgroundColor: 'rgba(123,92,246,0.2)', borderColor: '#7B5CF6' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#7A7595' },
  filterTextOn: { color: '#F0EEF8' },
  resultCount: { fontSize: 12, color: '#7A7595', paddingHorizontal: 20, marginBottom: 10 },
  list: { flex: 1, paddingHorizontal: 20 },
  card: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 20,
    padding: 14, marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  emojiWrap: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  venueName: { fontSize: 15, fontWeight: '700', color: '#F0EEF8', marginBottom: 3 },
  venueMeta: { fontSize: 12, color: '#7A7595', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 12, fontWeight: '700', color: '#F5A53B' },
  reviews: { fontSize: 11, color: '#7A7595' },
  cbRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 12,
  },
  cbCard: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    padding: 10, alignItems: 'center',
  },
  cbLabel: { fontSize: 9, fontWeight: '700', color: '#7A7595', letterSpacing: 1, marginBottom: 3 },
  cbVal: { fontSize: 22, fontWeight: '800' },
  cbSub: { fontSize: 10, color: '#7A7595' },
  cbArrow: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#231E3A',
    alignItems: 'center', justifyContent: 'center',
  },
  cbArrowText: { fontSize: 16, color: '#7A7595', fontWeight: '800' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11, fontWeight: '600' },
  visitBtn: {
    marginLeft: 'auto',
    backgroundColor: '#7B5CF6',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  visitText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});