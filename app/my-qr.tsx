import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function QRCode() {
  const pattern = [
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,1,0,1],
    [0,1,0,1,1,0,0,0,1,0,1,0,1,0,0,0,1,0,1,1,0],
    [1,0,1,0,1,1,1,1,0,1,0,1,0,1,1,1,1,0,1,0,1],
    [0,1,0,1,0,0,0,0,1,0,1,0,1,0,0,0,0,1,0,1,0],
    [1,0,1,1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,1,0,1],
    [0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,0,0,1,0,1,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,0,1,0,1,0,0,1,1,1,1,1,1,1],
  ];

  return (
    <View style={qrStyles.container}>
      <View style={qrStyles.qr}>
        {pattern.map((row, ri) => (
          <View key={ri} style={qrStyles.row}>
            {row.map((cell, ci) => (
              <View key={ci} style={[qrStyles.cell, { backgroundColor: cell ? '#0B0914' : '#fff' }]} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center' },
  qr: { gap: 2 },
  row: { flexDirection: 'row', gap: 2 },
  cell: { width: 10, height: 10, borderRadius: 1 },
});

export default function MyQRScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Zizo QR Code</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', padding: 24 }}>
        <View style={styles.instructCard}>
          <Text style={styles.instructTitle}>How to earn cashback 💰</Text>
          <Text style={styles.instructText}>
            Show this QR code to venue staff when you check out. They scan it and your cashback lands in your wallet within 24 hours!
          </Text>
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <View style={styles.qrLogo}>
              <Text style={styles.qrLogoZ}>Z</Text>
            </View>
            <View>
              <Text style={styles.qrName}>@PadelKing94</Text>
              <Text style={styles.qrSub}>Zizo Circle Member</Text>
            </View>
          </View>
          <QRCode />
          <Text style={styles.qrId}>ID: ZC-2025-PK94-8472</Text>
          <Text style={styles.qrRefresh}>Refreshes every 24 hours for security 🔒</Text>
        </View>

        <View style={styles.ratesCard}>
          <Text style={styles.ratesTitle}>YOUR CASHBACK RATES</Text>
          <View style={styles.ratesRow}>
            <View style={styles.rateItem}>
              <Text style={styles.rateVal}>10–25%</Text>
              <Text style={styles.rateLbl}>Solo Visit</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateItem}>
              <Text style={[styles.rateVal, { color: '#C8F53B' }]}>20–50%</Text>
              <Text style={styles.rateLbl}>With Match</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Tips</Text>
          <Text style={styles.tipText}>• Always scan AFTER paying</Text>
          <Text style={styles.tipText}>• If visiting with a match, both scan separately</Text>
          <Text style={styles.tipText}>• Cashback credits within 24 hours</Text>
          <Text style={styles.tipText}>• Check your wallet for transaction history</Text>
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
  instructCard: {
    width: '100%', backgroundColor: 'rgba(123,92,246,0.1)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.25)',
    borderRadius: 16, padding: 16, marginBottom: 20,
  },
  instructTitle: { fontSize: 14, fontWeight: '700', color: '#A78BFA', marginBottom: 6 },
  instructText: { fontSize: 13, color: '#7A7595', lineHeight: 20 },
  qrCard: {
    width: '100%', backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 16,
  },
  qrHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 20, alignSelf: 'flex-start',
  },
  qrLogo: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#7B5CF6',
    alignItems: 'center', justifyContent: 'center',
  },
  qrLogoZ: { fontSize: 18, fontWeight: '900', color: '#fff' },
  qrName: { fontSize: 16, fontWeight: '800', color: '#F0EEF8' },
  qrSub: { fontSize: 12, color: '#7A7595' },
  qrId: { fontSize: 12, color: '#7A7595', marginTop: 14, fontWeight: '600' },
  qrRefresh: { fontSize: 11, color: '#7A7595', marginTop: 4 },
  ratesCard: {
    width: '100%', backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  ratesTitle: { fontSize: 11, fontWeight: '700', color: '#7A7595', letterSpacing: 1, marginBottom: 12 },
  ratesRow: { flexDirection: 'row', alignItems: 'center' },
  rateItem: { flex: 1, alignItems: 'center' },
  rateVal: { fontSize: 22, fontWeight: '800', color: '#A78BFA' },
  rateLbl: { fontSize: 11, color: '#7A7595', marginTop: 3 },
  rateDivider: { width: 1, height: 40, backgroundColor: '#231E3A' },
  tipsCard: {
    width: '100%', backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 16, padding: 16,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#F0EEF8', marginBottom: 10 },
  tipText: { fontSize: 13, color: '#7A7595', lineHeight: 24 },
});