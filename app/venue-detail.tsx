import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const VENUE_DATA: { [key: string]: any } = {
  '1': {
    name: 'Smash Padel Club',
    emoji: '🎾',
    category: 'Sports & Fitness',
    color: '#C8F53B',
    dist: '0.5 km',
    loc: 'Lusail Marina, Lusail City',
    lat: 25.4131,
    lng: 51.4899,
    rating: 4.8,
    reviews: 124,
    cb: 20,
    matchCb: 40,
    desc: "Qatar's premier padel club in Lusail. 8 indoor courts, professional coaching, and the best padel community in the country. Air-conditioned, world-class facilities.",
    hours: 'Mon–Thu: 6AM–12AM\nFri–Sat: 6AM–2AM\nSun: 7AM–11PM',
    tags: ['Padel', 'Fitness', 'Sports', 'Coaching'],
    features: ['8 Courts', 'Pro Coaching', 'Equipment Rental', 'Café', 'Parking', 'AC'],
    matches: ['Layla M.', 'Sara H.', 'Tariq M.'],
  },
  '2': {
    name: 'Sip & Soul Café',
    emoji: '☕',
    category: 'Coffee & Café',
    color: '#F5A53B',
    dist: '0.9 km',
    loc: 'Fox Hills, Lusail City',
    lat: 25.4201,
    lng: 51.4756,
    rating: 4.7,
    reviews: 89,
    cb: 15,
    matchCb: 30,
    desc: 'A cozy specialty coffee shop in Fox Hills. Known for exceptional single-origin brews, a calm reading atmosphere, and the friendliest baristas in Lusail.',
    hours: 'Mon–Thu: 7AM–11PM\nFri–Sat: 7AM–1AM\nSun: 8AM–10PM',
    tags: ['Coffee', 'Reading', 'Work', 'Chill'],
    features: ['Specialty Coffee', 'Free WiFi', 'Reading Corner', 'Outdoor Seating', 'Quiet Zone'],
    matches: ['Layla M.', 'Omar K.', 'Nour A.'],
  },
  '3': {
    name: 'The Bookroom',
    emoji: '📚',
    category: 'Culture & Reading',
    color: '#A78BFA',
    dist: '1.4 km',
    loc: 'The Pearl, Doha',
    lat: 25.3714,
    lng: 51.5243,
    rating: 4.6,
    reviews: 56,
    cb: 10,
    matchCb: 20,
    desc: 'A curated bookshop and reading café at The Pearl. Browse thousands of titles, grab a coffee, and lose yourself in a good book. Regular author events and book clubs.',
    hours: 'Mon–Sun: 9AM–10PM',
    tags: ['Reading', 'Coffee', 'Culture', 'Events'],
    features: ['5000+ Books', 'Coffee Bar', 'Book Club', 'Author Events', 'Kids Section'],
    matches: ['Omar K.', 'Nour A.'],
  },
  '4': {
    name: 'Lusail Yoga Studio',
    emoji: '🧘',
    category: 'Wellness & Spa',
    color: '#3BF5C8',
    dist: '1.1 km',
    loc: 'Lusail City',
    lat: 25.4055,
    lng: 51.4889,
    rating: 4.9,
    reviews: 201,
    cb: 25,
    matchCb: 50,
    desc: "Lusail's top-rated yoga studio offering Hatha, Vinyasa, and hot yoga classes. World-class instructors, state-of-the-art facilities, and a welcoming community.",
    hours: 'Mon–Fri: 6AM–9PM\nSat–Sun: 7AM–7PM',
    tags: ['Yoga', 'Wellness', 'Fitness', 'Meditation'],
    features: ['Hot Yoga', 'Meditation', 'Pro Instructors', 'Changing Rooms', 'Mat Rental'],
    matches: ['Sara H.', 'Layla M.'],
  },
  '5': {
    name: 'Chess & Co',
    emoji: '♟️',
    category: 'Games',
    color: '#A78BFA',
    dist: '1.8 km',
    loc: 'Katara, Doha',
    lat: 25.3732,
    lng: 51.5279,
    rating: 4.5,
    reviews: 43,
    cb: 12,
    matchCb: 24,
    desc: 'Qatar\'s premier chess and board games café. A haven for strategy lovers in the cultural heart of Doha.',
    hours: 'Mon–Sun: 10AM–11PM',
    tags: ['Chess', 'Board Games', 'Strategy'],
    features: ['50+ Games', 'Coaching', 'Tournaments', 'Café'],
    matches: ['Omar K.'],
  },
  '6': {
    name: 'Shisha Lounge QD',
    emoji: '💨',
    category: 'Lounge',
    color: '#F53B8F',
    dist: '2.2 km',
    loc: 'Corniche, Doha',
    lat: 25.2854,
    lng: 51.5310,
    rating: 4.4,
    reviews: 178,
    cb: 18,
    matchCb: 36,
    desc: 'Premium shisha lounge on the Corniche with stunning waterfront views. The ultimate chill spot in Doha.',
    hours: 'Mon–Sun: 4PM–2AM',
    tags: ['Shisha', 'Coffee', 'Views', 'Chill'],
    features: ['Waterfront View', 'Premium Shisha', 'Full Menu', 'Live Music'],
    matches: ['Khalid R.'],
  },
  '7': {
    name: 'Fox Hills Padel',
    emoji: '🏓',
    category: 'Sports',
    color: '#C8F53B',
    dist: '2.5 km',
    loc: 'Fox Hills, Lusail',
    lat: 25.4321,
    lng: 51.4812,
    rating: 4.7,
    reviews: 95,
    cb: 22,
    matchCb: 44,
    desc: 'Modern padel facility in Fox Hills with 6 courts and a vibrant community of players.',
    hours: 'Mon–Sun: 6AM–12AM',
    tags: ['Padel', 'Sports', 'Fitness'],
    features: ['6 Courts', 'Lighting', 'Equipment', 'Café'],
    matches: ['Layla M.', 'Tariq M.'],
  },
  '8': {
    name: 'Grind Coffee Bar',
    emoji: '☕',
    category: 'Coffee',
    color: '#F5A53B',
    dist: '0.7 km',
    loc: 'Lusail Marina',
    lat: 25.4089,
    lng: 51.4923,
    rating: 4.8,
    reviews: 112,
    cb: 17,
    matchCb: 34,
    desc: 'Specialty coffee bar at Lusail Marina. Known for their signature cold brew and stunning marina views.',
    hours: 'Mon–Sun: 7AM–11PM',
    tags: ['Coffee', 'Work', 'Views'],
    features: ['Specialty Coffee', 'WiFi', 'Marina View', 'Outdoor'],
    matches: ['Layla M.', 'Omar K.'],
  },
};

export default function VenueDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const venue = VENUE_DATA[id as string] || VENUE_DATA['1'];

  const openDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}&travelmode=driving`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  const openLocation = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venue Details</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={openLocation}>
          <Text style={styles.shareText}>📍</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: venue.color + '15' }]}>
          <Text style={styles.heroEmoji}>{venue.emoji}</Text>
          <Text style={styles.heroName}>{venue.name}</Text>
          <Text style={styles.heroCategory}>{venue.category}</Text>
          <TouchableOpacity style={styles.heroMeta} onPress={openLocation}>
            <Text style={styles.heroMetaText}>📍 {venue.dist} · {venue.loc}</Text>
          </TouchableOpacity>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {venue.rating}</Text>
            <Text style={styles.reviews}>({venue.reviews} reviews)</Text>
          </View>
        </View>

        <View style={styles.cbSection}>
          <View style={[styles.cbCard, { backgroundColor: venue.color + '10', borderColor: venue.color + '30' }]}>
            <Text style={styles.cbLabel}>SOLO VISIT</Text>
            <Text style={[styles.cbVal, { color: venue.color }]}>{venue.cb}%</Text>
            <Text style={styles.cbSub}>cashback to wallet</Text>
          </View>
          <View style={styles.cbPlus}>
            <Text style={styles.cbPlusText}>VS</Text>
          </View>
          <View style={[styles.cbCard, { backgroundColor: 'rgba(200,245,59,0.1)', borderColor: 'rgba(200,245,59,0.3)' }]}>
            <Text style={styles.cbLabel}>WITH MATCH</Text>
            <Text style={[styles.cbVal, { color: '#C8F53B' }]}>{venue.matchCb}%</Text>
            <Text style={styles.cbSub}>2× cashback!</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.descText}>{venue.desc}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureWrap}>
            {venue.features.map((f: string) => (
              <View key={f} style={[styles.featureChip, { backgroundColor: venue.color + '12' }]}>
                <Text style={[styles.featureText, { color: venue.color }]}>✓ {f}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opening Hours</Text>
          <View style={styles.card}>
            <Text style={styles.hoursText}>{venue.hours}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Matches Visit Here 🎯</Text>
          <View style={styles.card}>
            <Text style={styles.matchVisitText}>
              {venue.matches.join(', ')} {venue.matches.length === 1 ? 'visits' : 'visit'} this venue — invite them and earn{' '}
              <Text style={{ color: '#C8F53B', fontWeight: '700' }}>{venue.matchCb}% cashback</Text> together!
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagWrap}>
            {venue.tags.map((t: string) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btnVisit, { backgroundColor: venue.color }]}
            onPress={() => Alert.alert('🎉 Check-in Successful!', `You've checked in at ${venue.name}! Your ${venue.cb}% cashback will be credited to your Zizo Wallet within 24 hours.`)}
          >
            <Text style={styles.btnVisitText}>📍 Check In & Earn {venue.cb}%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnInvite}
            onPress={() => Alert.alert('Invite a Match', "Choose a match to invite to this venue — you'll both earn 2× cashback!")}
          >
            <Text style={styles.btnInviteText}>✨ Invite a Match — Earn {venue.matchCb}%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnDirections}
            onPress={openDirections}
          >
            <Text style={styles.btnDirectionsText}>🗺️ Get Directions on Google Maps</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 30 }} />
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
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: '#7A7595' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#F0EEF8' },
  shareBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', alignItems: 'center', justifyContent: 'center',
  },
  shareText: { fontSize: 18, color: '#7A7595' },
  hero: {
    alignItems: 'center', padding: 28,
    marginHorizontal: 20, borderRadius: 24,
    marginBottom: 16,
  },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#F0EEF8', marginBottom: 4 },
  heroCategory: { fontSize: 13, color: '#7A7595', marginBottom: 8 },
  heroMeta: { marginBottom: 8 },
  heroMetaText: { fontSize: 13, color: '#7A7595' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { fontSize: 14, fontWeight: '700', color: '#F5A53B' },
  reviews: { fontSize: 12, color: '#7A7595' },
  cbSection: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 20, marginBottom: 20,
  },
  cbCard: {
    flex: 1, borderWidth: 1, borderRadius: 16,
    padding: 14, alignItems: 'center',
  },
  cbLabel: { fontSize: 9, fontWeight: '700', color: '#7A7595', letterSpacing: 1, marginBottom: 4 },
  cbVal: { fontSize: 28, fontWeight: '900' },
  cbSub: { fontSize: 11, color: '#7A7595', marginTop: 2 },
  cbPlus: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', alignItems: 'center', justifyContent: 'center',
  },
  cbPlusText: { fontSize: 10, color: '#7A7595', fontWeight: '800' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700',
    color: '#7A7595', letterSpacing: 1, marginBottom: 10,
  },
  card: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 16, padding: 16,
  },
  descText: { fontSize: 14, color: '#F0EEF8', lineHeight: 22 },
  hoursText: { fontSize: 14, color: '#F0EEF8', lineHeight: 24 },
  matchVisitText: { fontSize: 14, color: '#F0EEF8', lineHeight: 22 },
  featureWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureChip: { borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  featureText: { fontSize: 13, fontWeight: '600' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  tagText: { fontSize: 13, fontWeight: '600', color: '#7A7595' },
  actions: { paddingHorizontal: 20, gap: 10 },
  btnVisit: { borderRadius: 16, padding: 17, alignItems: 'center' },
  btnVisitText: { fontSize: 16, fontWeight: '700', color: '#000' },
  btnInvite: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#7B5CF6', borderRadius: 16,
    padding: 15, alignItems: 'center',
  },
  btnInviteText: { fontSize: 15, fontWeight: '600', color: '#A78BFA' },
  btnDirections: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#3BF5C8', borderRadius: 16,
    padding: 15, alignItems: 'center',
  },
  btnDirectionsText: { fontSize: 15, fontWeight: '600', color: '#3BF5C8' },
});