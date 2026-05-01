import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

const MATCH_DATA: { [key: string]: any } = {
  '1': { name: 'Layla M.', alias: '@LaylaPadel', init: 'L', pct: 94, dist: '0.8 km', loc: 'Lusail Marina', color: '#7B5CF6', online: true, age: 26, bio: 'Padel addict ☕ Coffee lover 📚 Always up for a good game or great conversation. Lusail based.', interests: ['Padel', 'Coffee', 'Yoga', 'Reading', 'Fitness'], mutualInterests: ['Padel', 'Coffee', 'Yoga'], visits: 24, joined: 'Feb 2025' },
  '2': { name: 'Omar K.', alias: '@OmarChess', init: 'O', pct: 87, dist: '1.2 km', loc: 'Fox Hills', color: '#3BF5C8', online: true, age: 29, bio: 'Chess enthusiast ♟️ Big reader 📖 Coffee shop explorer. Looking for good conversations and good games.', interests: ['Chess', 'Reading', 'Coffee', 'Gaming', 'Backgammon'], mutualInterests: ['Chess', 'Reading', 'Coffee'], visits: 18, joined: 'Mar 2025' },
  '3': { name: 'Sara H.', alias: '@SaraFit', init: 'S', pct: 82, dist: '2.1 km', loc: 'The Pearl', color: '#F53B8F', online: false, age: 24, bio: 'Yoga instructor 🧘 Padel player 🎾 Living life one stretch at a time. The Pearl resident.', interests: ['Yoga', 'Padel', 'Fitness', 'Wellness', 'Coffee'], mutualInterests: ['Yoga', 'Padel'], visits: 31, joined: 'Jan 2025' },
  '4': { name: 'Khalid R.', alias: '@KhalidGoal', init: 'K', pct: 76, dist: '3.0 km', loc: 'Katara', color: '#F5A53B', online: false, age: 28, bio: 'Football fanatic ⚽ Gamer at heart 🎮 Padel weekends 🏓 Always looking for new people to hang with.', interests: ['Football', 'Gaming', 'Padel', 'Card Games', 'Dining Out'], mutualInterests: ['Padel', 'Gaming'], visits: 12, joined: 'Apr 2025' },
};

const REPORT_REASONS = [
  'Inappropriate behavior',
  'Solicitation or illegal services',
  'Harassment or threats',
  'Fake profile / impersonation',
  'Spam or advertising',
  'Underage user',
  'Other',
];

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const match = MATCH_DATA[id as string] || MATCH_DATA['1'];
  const [showReport, setShowReport] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  const submitReport = async () => {
    if (!selectedReason) {
      Alert.alert('Select Reason', 'Please select a reason for reporting');
      return;
    }
    setReporting(true);
    try {
      const uid = await AsyncStorage.getItem('zizo_user');
      await addDoc(collection(db, 'reports'), {
        reportedAlias: match.alias,
        reportedName: match.name,
        reason: selectedReason,
        details: reportDetails,
        reportedBy: uid || 'unknown',
        createdAt: serverTimestamp(),
        status: 'pending',
      });
      setShowReport(false);
      setSelectedReason('');
      setReportDetails('');
      Alert.alert(
        '✅ Report Submitted',
        'Thank you for helping keep Zizo Circle safe. Our team will review this report within 24 hours.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Profile</Text>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => Alert.alert(
            match.name,
            'What would you like to do?',
            [
              { text: '🚩 Report User', style: 'destructive', onPress: () => setShowReport(true) },
              { text: '🚫 Block User', style: 'destructive', onPress: () => Alert.alert('Blocked', `${match.name} has been blocked and will no longer appear in your matches.`) },
              { text: 'Cancel', style: 'cancel' },
            ]
          )}
        >
          <Text style={styles.moreText}>•••</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.avatarRing, { borderColor: match.color }]}>
            <View style={[styles.avatar, { backgroundColor: match.color }]}>
              <Text style={styles.avatarText}>{match.init}</Text>
            </View>
            {match.online && <View style={styles.onlineDot} />}
          </View>
          <Text style={styles.name}>{match.name}</Text>
          <Text style={styles.alias}>{match.alias}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>📍 {match.dist} · {match.loc}</Text>
          </View>
          <View style={[styles.pctBadge, { backgroundColor: match.pct >= 90 ? 'rgba(200,245,59,0.15)' : 'rgba(123,92,246,0.15)' }]}>
            <Text style={[styles.pctText, { color: match.pct >= 90 ? '#C8F53B' : '#A78BFA' }]}>
              ✨ {match.pct}% compatibility match
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{match.pct}%</Text>
            <Text style={styles.statLbl}>Match</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{match.mutualInterests.length}</Text>
            <Text style={styles.statLbl}>Shared</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{match.visits}</Text>
            <Text style={styles.statLbl}>Visits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{match.age}</Text>
            <Text style={styles.statLbl}>Age</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{match.bio}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared Interests 🎯</Text>
          <View style={styles.interestWrap}>
            {match.mutualInterests.map((i: string) => (
              <View key={i} style={[styles.mutualChip, { backgroundColor: match.color + '20', borderColor: match.color + '50' }]}>
                <Text style={[styles.mutualChipText, { color: match.color }]}>✓ {i}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Interests</Text>
          <View style={styles.interestWrap}>
            {match.interests.map((i: string) => (
              <View key={i} style={styles.interestChip}>
                <Text style={styles.interestText}>{i}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.zizoCard}>
          <View style={styles.zizoAv}>
            <Text style={styles.zizoZ}>Z</Text>
            <View style={styles.zizoOnline} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.zizoLabel}>● ZIZO SUGGESTS</Text>
            <Text style={styles.zizoText}>
              You and {match.name.split(' ')[0]} both love {match.mutualInterests[0]}! Try visiting Smash Padel Club together — you'll both earn <Text style={{ color: '#C8F53B', fontWeight: '700' }}>2× cashback</Text> 🎾
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnConnect}
            onPress={() => Alert.alert('Request Sent! 🎉', `Your connection request has been sent to ${match.name}. They'll be notified!`)}
          >
            <Text style={styles.btnConnectText}>✨ Connect with {match.name.split(' ')[0]}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnMessage}
            onPress={() => Alert.alert('Coming Soon', 'Direct messaging coming soon!')}
          >
            <Text style={styles.btnMessageText}>💬 Send Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnReport}
            onPress={() => setShowReport(true)}
          >
            <Text style={styles.btnReportText}>🚩 Report User</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSkip} onPress={() => router.back()}>
            <Text style={styles.btnSkipText}>Not interested</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Report Modal */}
      <Modal visible={showReport} transparent animationType="slide" onRequestClose={() => setShowReport(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🚩 Report User</Text>
            <Text style={styles.modalSub}>Help keep Zizo Circle safe. Reports are reviewed within 24 hours.</Text>

            <Text style={styles.inputLabel}>SELECT REASON</Text>
            <View style={styles.reasonsList}>
              {REPORT_REASONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonRow, selectedReason === r && styles.reasonRowOn]}
                  onPress={() => setSelectedReason(r)}
                >
                  <View style={[styles.reasonRadio, selectedReason === r && styles.reasonRadioOn]}>
                    {selectedReason === r && <View style={styles.reasonRadioDot} />}
                  </View>
                  <Text style={[styles.reasonText, selectedReason === r && styles.reasonTextOn]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>ADDITIONAL DETAILS (OPTIONAL)</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="Describe what happened..."
              placeholderTextColor="#7A7595"
              multiline
              numberOfLines={3}
              value={reportDetails}
              onChangeText={setReportDetails}
            />

            <View style={styles.reportNotice}>
              <Text style={styles.reportNoticeText}>
                ⚠️ False reports may result in your own account being reviewed. Serious violations will be reported to Qatari authorities.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.reportBtn, reporting && { opacity: 0.7 }]}
              onPress={submitReport}
              disabled={reporting}
            >
              <Text style={styles.reportBtnText}>{reporting ? 'Submitting...' : 'Submit Report'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowReport(false); setSelectedReason(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  moreBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', alignItems: 'center', justifyContent: 'center',
  },
  moreText: { fontSize: 14, color: '#7A7595', letterSpacing: 2 },
  hero: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20 },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, alignItems: 'center',
    justifyContent: 'center', marginBottom: 14, position: 'relative',
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, backgroundColor: '#3BF5C8',
    borderRadius: 7, borderWidth: 2, borderColor: '#0B0914',
  },
  name: { fontSize: 24, fontWeight: '800', color: '#F0EEF8', marginBottom: 4 },
  alias: { fontSize: 14, color: '#A78BFA', fontWeight: '600', marginBottom: 8 },
  locationRow: { marginBottom: 12 },
  locationText: { fontSize: 13, color: '#7A7595' },
  pctBadge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  pctText: { fontSize: 14, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 16, padding: 12, alignItems: 'center',
  },
  statVal: { fontSize: 18, fontWeight: '800', color: '#F0EEF8', marginBottom: 2 },
  statLbl: { fontSize: 10, color: '#7A7595' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#7A7595', letterSpacing: 1, marginBottom: 10 },
  bioCard: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 16, padding: 16,
  },
  bioText: { fontSize: 14, color: '#F0EEF8', lineHeight: 22 },
  interestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mutualChip: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  mutualChipText: { fontSize: 13, fontWeight: '700' },
  interestChip: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  interestText: { fontSize: 13, fontWeight: '600', color: '#7A7595' },
  zizoCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: 'rgba(91,60,214,0.2)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.35)',
    borderRadius: 20, padding: 16,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  zizoAv: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#7B5CF6', alignItems: 'center',
    justifyContent: 'center', position: 'relative',
  },
  zizoZ: { fontSize: 18, fontWeight: '900', color: '#fff' },
  zizoOnline: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, backgroundColor: '#3BF5C8',
    borderRadius: 5, borderWidth: 2, borderColor: '#0B0914',
  },
  zizoLabel: { fontSize: 10, fontWeight: '700', color: '#3BF5C8', letterSpacing: 1, marginBottom: 4 },
  zizoText: { fontSize: 13, color: '#F0EEF8', lineHeight: 20 },
  actions: { paddingHorizontal: 20, gap: 10 },
  btnConnect: {
    backgroundColor: '#7B5CF6', borderRadius: 16,
    padding: 17, alignItems: 'center',
  },
  btnConnectText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnMessage: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#7B5CF6', borderRadius: 16,
    padding: 15, alignItems: 'center',
  },
  btnMessageText: { fontSize: 15, fontWeight: '600', color: '#A78BFA' },
  btnReport: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 16, padding: 14, alignItems: 'center',
  },
  btnReportText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  btnSkip: { padding: 12, alignItems: 'center' },
  btnSkipText: { fontSize: 14, color: '#7A7595' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0F0C1A',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F0EEF8', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#7A7595', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#7A7595', letterSpacing: 1, marginBottom: 10 },
  reasonsList: { gap: 8, marginBottom: 4 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 12, padding: 12,
  },
  reasonRowOn: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.06)' },
  reasonRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#4A4560',
    alignItems: 'center', justifyContent: 'center',
  },
  reasonRadioOn: { borderColor: '#EF4444' },
  reasonRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  reasonText: { fontSize: 13, fontWeight: '600', color: '#7A7595' },
  reasonTextOn: { color: '#F0EEF8' },
  detailsInput: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#F0EEF8',
    textAlignVertical: 'top', minHeight: 80,
  },
  reportNotice: {
    backgroundColor: 'rgba(245,163,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(245,163,59,0.2)',
    borderRadius: 12, padding: 12, marginVertical: 14,
  },
  reportNoticeText: { fontSize: 12, color: '#F5A53B', lineHeight: 18 },
  reportBtn: {
    backgroundColor: '#EF4444', borderRadius: 16,
    padding: 16, alignItems: 'center',
  },
  reportBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancelBtn: {
    backgroundColor: '#181428', borderRadius: 14,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#7A7595' },
});