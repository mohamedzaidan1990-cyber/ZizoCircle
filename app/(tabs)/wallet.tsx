import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, runTransaction, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

export default function WalletScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [visits, setVisits] = useState(0);
  const [matches, setMatches] = useState(0);
  const [uid, setUid] = useState('');

  // Redeem modal
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemStep, setRedeemStep] = useState<'enter' | 'code'>('enter');
  const [redeemLoading, setRedeemLoading] = useState(false);

  // Transfer modal
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTab, setTransferTab] = useState<'alias' | 'qr'>('alias');
  const [transferAlias, setTransferAlias] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const cached = await AsyncStorage.getItem('zizo_profile');
        if (cached) {
          const data = JSON.parse(cached);
          setBalance(data.wallet || 0);
          setTotalEarned(data.totalEarned || 0);
          setVisits(data.visits || 0);
          setMatches(data.matches || 0);
        }
        const storedUid = await AsyncStorage.getItem('zizo_user');
        if (storedUid) {
          setUid(storedUid);
          const snap = await getDoc(doc(db, 'users', storedUid));
          if (snap.exists()) {
            const data = snap.data();
            setBalance(data.wallet || 0);
            setTotalEarned(data.totalEarned || 0);
            setVisits(data.visits || 0);
            setMatches(data.matches || 0);
          }
        }
      } catch (e) {
        console.log('Wallet error:', e);
      }
    };
    loadWallet();
  }, []);

  // Generate 6-digit redeem code
  const generateRedeemCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleRedeem = async () => {
    const amount = parseFloat(redeemAmount);
    if (!redeemAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    if (amount > balance) {
      Alert.alert('Insufficient Balance', `Your balance is QR ${balance.toFixed(2)}`);
      return;
    }
    setRedeemLoading(true);
    try {
      const code = generateRedeemCode();
      setRedeemCode(code);
      setRedeemStep('code');
    } finally {
      setRedeemLoading(false);
    }
  };

  const confirmRedeem = async () => {
    const amount = parseFloat(redeemAmount);
    setRedeemLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error('User not found');
        const currentBalance = userSnap.data().wallet || 0;
        if (currentBalance < amount) throw new Error('Insufficient balance');
        transaction.update(userRef, { wallet: currentBalance - amount });
      });
      const newBalance = balance - amount;
      setBalance(newBalance);
      const cached = await AsyncStorage.getItem('zizo_profile');
      if (cached) {
        const data = JSON.parse(cached);
        await AsyncStorage.setItem('zizo_profile', JSON.stringify({ ...data, wallet: newBalance }));
      }
      setShowRedeem(false);
      setRedeemStep('enter');
      setRedeemAmount('');
      setRedeemCode('');
      Alert.alert('✅ Redeemed!', `QR ${amount.toFixed(2)} has been deducted from your wallet.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not process redemption');
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleTransferByAlias = async () => {
    const amount = parseFloat(transferAmount);
    if (!transferAlias || transferAlias === '@') {
      Alert.alert('Error', 'Enter recipient alias');
      return;
    }
    if (!transferAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    if (amount > balance) {
      Alert.alert('Insufficient Balance', `Your balance is QR ${balance.toFixed(2)}`);
      return;
    }
    const alias = transferAlias.startsWith('@') ? transferAlias : `@${transferAlias}`;
    setTransferLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('alias', '==', alias));
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert('Not Found', `No user found with alias ${alias}`);
        return;
      }
      const recipientDoc = snap.docs[0];
      const recipientUid = recipientDoc.id;
      if (recipientUid === uid) {
        Alert.alert('Error', 'You cannot transfer to yourself');
        return;
      }
      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, 'users', uid);
        const recipientRef = doc(db, 'users', recipientUid);
        const senderSnap = await transaction.get(senderRef);
        const recipientSnap = await transaction.get(recipientRef);
        if (!senderSnap.exists() || !recipientSnap.exists()) throw new Error('User not found');
        const senderBalance = senderSnap.data().wallet || 0;
        if (senderBalance < amount) throw new Error('Insufficient balance');
        const recipientBalance = recipientSnap.data().wallet || 0;
        transaction.update(senderRef, { wallet: senderBalance - amount });
        transaction.update(recipientRef, { wallet: recipientBalance + amount });
      });
      const newBalance = balance - amount;
      setBalance(newBalance);
      const cached = await AsyncStorage.getItem('zizo_profile');
      if (cached) {
        const data = JSON.parse(cached);
        await AsyncStorage.setItem('zizo_profile', JSON.stringify({ ...data, wallet: newBalance }));
      }
      setShowTransfer(false);
      setTransferAlias('');
      setTransferAmount('');
      Alert.alert('✅ Transfer Sent!', `QR ${amount.toFixed(2)} sent to ${alias}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleQRScan = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    setScanning(true);
  };

  const onQRScanned = async ({ data }: { data: string }) => {
    setScanning(false);
    if (data.startsWith('@')) {
      setTransferAlias(data);
      setTransferTab('alias');
    } else {
      Alert.alert('Invalid QR', 'Please scan a valid Zizo Circle user QR code');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Zizo Wallet</Text>
        <Text style={styles.subtitle}>Your cashback earnings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View style={styles.balanceLeft}>
              <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.balanceAmount}>QR {balance.toFixed(2)}</Text>
              <Text style={styles.balanceSub}>
                {balance === 0 ? 'Visit a venue to start earning!' : 'Ready to use at any partner venue'}
              </Text>
            </View>
            <View style={styles.zizoWalletAv}>
              <Text style={styles.zizoWalletZ}>Z</Text>
            </View>
          </View>
          <View style={styles.balanceBtns}>
            <TouchableOpacity
              style={styles.balanceBtn}
              onPress={() => { setShowRedeem(true); setRedeemStep('enter'); }}
            >
              <Text style={styles.balanceBtnText}>💳 Redeem</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.balanceBtn, styles.balanceBtnOutline]}
              onPress={() => setShowTransfer(true)}
            >
              <Text style={styles.balanceBtnOutlineText}>📤 Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIco}>🏪</Text>
            <Text style={styles.statVal}>{visits}</Text>
            <Text style={styles.statLbl}>Venue Visits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIco}>🏆</Text>
            <Text style={styles.statVal}>QR {totalEarned.toFixed(0)}</Text>
            <Text style={styles.statLbl}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIco}>✨</Text>
            <Text style={styles.statVal}>{matches}</Text>
            <Text style={styles.statLbl}>Matches</Text>
          </View>
        </View>

        {balance === 0 && visits === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptyText}>
              Visit any partner venue and show your QR code to start earning cashback. Visit with a match to earn 2× more!
            </Text>
            <View style={styles.howRow}>
              <View style={styles.howStep}>
                <Text style={styles.howNum}>1</Text>
                <Text style={styles.howText}>Find a venue</Text>
              </View>
              <View style={styles.howArrow}><Text style={styles.howArrowText}>→</Text></View>
              <View style={styles.howStep}>
                <Text style={styles.howNum}>2</Text>
                <Text style={styles.howText}>Show QR code</Text>
              </View>
              <View style={styles.howArrow}><Text style={styles.howArrowText}>→</Text></View>
              <View style={styles.howStep}>
                <Text style={styles.howNum}>3</Text>
                <Text style={styles.howText}>Earn cashback</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>💡 Earn more with matches</Text>
            <Text style={styles.tipText}>
              Visit venues with your Zizo matches to unlock <Text style={{ color: '#C8F53B', fontWeight: '700' }}>2× cashback</Text> on every visit!
            </Text>
          </View>
        )}

        <View style={styles.txHeader}>
          <Text style={styles.txTitle}>Transaction History</Text>
          <Text style={styles.txCount}>{visits} transactions</Text>
        </View>

        <View style={styles.txEmpty}>
          <Text style={styles.txEmptyText}>No transactions yet — your cashback history will appear here</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ===== REDEEM MODAL ===== */}
      <Modal visible={showRedeem} transparent animationType="slide" onRequestClose={() => setShowRedeem(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {redeemStep === 'enter' ? (
              <>
                <Text style={styles.modalTitle}>💳 Redeem Cashback</Text>
                <Text style={styles.modalSub}>Enter amount to redeem at the venue</Text>
                <Text style={styles.modalBalance}>Available: QR {balance.toFixed(2)}</Text>

                <Text style={styles.inputLabel}>AMOUNT TO REDEEM (QR)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 20.00"
                  placeholderTextColor="#7A7595"
                  keyboardType="decimal-pad"
                  value={redeemAmount}
                  onChangeText={setRedeemAmount}
                />

                <View style={styles.quickAmounts}>
                  {['10', '20', '50', '100'].map(a => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.quickBtn, redeemAmount === a && styles.quickBtnOn]}
                      onPress={() => setRedeemAmount(a)}
                    >
                      <Text style={[styles.quickBtnText, redeemAmount === a && styles.quickBtnTextOn]}>QR {a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.modalBtn, redeemLoading && { opacity: 0.7 }]}
                  onPress={handleRedeem}
                  disabled={redeemLoading}
                >
                  <Text style={styles.modalBtnText}>Generate Code →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>✅ Show this code to staff</Text>
                <Text style={styles.modalSub}>Valid for this transaction only</Text>

                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{redeemCode}</Text>
                  <Text style={styles.codeAmount}>QR {parseFloat(redeemAmount).toFixed(2)}</Text>
                </View>

                <Text style={styles.codeHint}>Ask the venue staff to enter this code to confirm your redemption</Text>

                <TouchableOpacity
                  style={[styles.modalBtn, redeemLoading && { opacity: 0.7 }]}
                  onPress={confirmRedeem}
                  disabled={redeemLoading}
                >
                  <Text style={styles.modalBtnText}>{redeemLoading ? 'Processing...' : 'Confirm Redemption'}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.modalClose} onPress={() => { setShowRedeem(false); setRedeemStep('enter'); }}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== TRANSFER MODAL ===== */}
      <Modal visible={showTransfer} transparent animationType="slide" onRequestClose={() => setShowTransfer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📤 Transfer Cashback</Text>
            <Text style={styles.modalSub}>Send cashback to another Zizo user</Text>
            <Text style={styles.modalBalance}>Available: QR {balance.toFixed(2)}</Text>

            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, transferTab === 'alias' && styles.tabOn]}
                onPress={() => setTransferTab('alias')}
              >
                <Text style={[styles.tabText, transferTab === 'alias' && styles.tabTextOn]}>@ Alias</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, transferTab === 'qr' && styles.tabOn]}
                onPress={() => setTransferTab('qr')}
              >
                <Text style={[styles.tabText, transferTab === 'qr' && styles.tabTextOn]}>📷 Scan QR</Text>
              </TouchableOpacity>
            </View>

            {transferTab === 'alias' ? (
              <>
                <Text style={styles.inputLabel}>RECIPIENT ALIAS</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="@their_alias"
                  placeholderTextColor="#7A7595"
                  value={transferAlias}
                  onChangeText={(t) => {
                    let v = t.replace(/\s/g, '');
                    if (v && !v.startsWith('@')) v = '@' + v;
                    setTransferAlias(v);
                  }}
                  autoCapitalize="none"
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>AMOUNT (QR)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 10.00"
                  placeholderTextColor="#7A7595"
                  keyboardType="decimal-pad"
                  value={transferAmount}
                  onChangeText={setTransferAmount}
                />

                <View style={styles.quickAmounts}>
                  {['5', '10', '20', '50'].map(a => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.quickBtn, transferAmount === a && styles.quickBtnOn]}
                      onPress={() => setTransferAmount(a)}
                    >
                      <Text style={[styles.quickBtnText, transferAmount === a && styles.quickBtnTextOn]}>QR {a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.modalBtn, transferLoading && { opacity: 0.7 }]}
                  onPress={handleTransferByAlias}
                  disabled={transferLoading}
                >
                  <Text style={styles.modalBtnText}>{transferLoading ? 'Sending...' : 'Send Transfer →'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {scanning ? (
                  <View style={styles.scannerBox}>
                    <CameraView
                      style={styles.camera}
                      onBarcodeScanned={onQRScanned}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    />
                    <TouchableOpacity style={styles.cancelScan} onPress={() => setScanning(false)}>
                      <Text style={styles.cancelScanText}>Cancel Scan</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.qrScanCenter}>
                    <Text style={styles.qrScanIcon}>📷</Text>
                    <Text style={styles.qrScanTitle}>Scan their QR Code</Text>
                    <Text style={styles.qrScanSub}>Ask the recipient to show their Zizo QR code from their profile</Text>
                    <TouchableOpacity style={styles.modalBtn} onPress={handleQRScan}>
                      <Text style={styles.modalBtnText}>Open Camera →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            <TouchableOpacity style={styles.modalClose} onPress={() => { setShowTransfer(false); setScanning(false); }}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#F0EEF8' },
  subtitle: { fontSize: 12, color: '#7A7595', marginTop: 2 },
  balanceCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#1A0F35',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.3)',
    borderRadius: 24, padding: 20,
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  balanceLeft: { flex: 1 },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 8 },
  balanceAmount: { fontSize: 38, fontWeight: '900', color: '#C8F53B', marginBottom: 4 },
  balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  zizoWalletAv: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#7B5CF6', alignItems: 'center', justifyContent: 'center',
  },
  zizoWalletZ: { fontSize: 24, fontWeight: '900', color: '#fff' },
  balanceBtns: { flexDirection: 'row', gap: 10 },
  balanceBtn: { flex: 1, backgroundColor: '#7B5CF6', borderRadius: 14, padding: 12, alignItems: 'center' },
  balanceBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  balanceBtnOutline: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  balanceBtnOutlineText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 16, padding: 12, alignItems: 'center',
  },
  statIco: { fontSize: 20, marginBottom: 4 },
  statVal: { fontSize: 15, fontWeight: '800', color: '#F0EEF8', marginBottom: 2 },
  statLbl: { fontSize: 10, color: '#7A7595', textAlign: 'center' },
  emptyCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: 'rgba(123,92,246,0.06)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.2)',
    borderRadius: 20, padding: 20, alignItems: 'center',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#F0EEF8', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#7A7595', lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  howStep: { alignItems: 'center', gap: 4 },
  howNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#7B5CF6', textAlign: 'center',
    lineHeight: 28, fontSize: 13, fontWeight: '800', color: '#fff', overflow: 'hidden',
  },
  howText: { fontSize: 10, color: '#7A7595', textAlign: 'center', maxWidth: 56 },
  howArrow: { paddingBottom: 16 },
  howArrowText: { fontSize: 16, color: '#7A7595' },
  tipCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: 'rgba(200,245,59,0.06)',
    borderWidth: 1, borderColor: 'rgba(200,245,59,0.2)',
    borderRadius: 16, padding: 14,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#C8F53B', marginBottom: 6 },
  tipText: { fontSize: 13, color: '#7A7595', lineHeight: 19 },
  txHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 10,
  },
  txTitle: { fontSize: 16, fontWeight: '800', color: '#F0EEF8' },
  txCount: { fontSize: 12, color: '#7A7595' },
  txEmpty: {
    marginHorizontal: 20, backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A', borderRadius: 16,
    padding: 20, alignItems: 'center',
  },
  txEmptyText: { fontSize: 13, color: '#7A7595', textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0F0C1A',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F0EEF8', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#7A7595', textAlign: 'center', marginBottom: 8 },
  modalBalance: { fontSize: 13, color: '#C8F53B', fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#7A7595', letterSpacing: 1, marginBottom: 8 },
  modalInput: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#F0EEF8',
  },
  quickAmounts: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 20 },
  quickBtn: {
    flex: 1, backgroundColor: '#181428',
    borderWidth: 1.5, borderColor: '#231E3A',
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  quickBtnOn: { backgroundColor: 'rgba(123,92,246,0.18)', borderColor: '#7B5CF6' },
  quickBtnText: { fontSize: 12, fontWeight: '700', color: '#7A7595' },
  quickBtnTextOn: { color: '#F0EEF8' },
  modalBtn: {
    backgroundColor: '#7B5CF6', borderRadius: 16,
    padding: 16, alignItems: 'center',
  },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  modalClose: {
    backgroundColor: '#181428', borderRadius: 14,
    padding: 14, alignItems: 'center', marginTop: 10,
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#7A7595' },
  codeBox: {
    backgroundColor: '#181428', borderWidth: 2,
    borderColor: '#7B5CF6', borderRadius: 20,
    padding: 24, alignItems: 'center', marginVertical: 20,
  },
  codeText: { fontSize: 48, fontWeight: '900', color: '#C8F53B', letterSpacing: 8 },
  codeAmount: { fontSize: 18, fontWeight: '700', color: '#F0EEF8', marginTop: 8 },
  codeHint: { fontSize: 13, color: '#7A7595', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: {
    flex: 1, backgroundColor: '#181428',
    borderWidth: 1.5, borderColor: '#231E3A',
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  tabOn: { backgroundColor: 'rgba(123,92,246,0.18)', borderColor: '#7B5CF6' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#7A7595' },
  tabTextOn: { color: '#F0EEF8' },
  qrScanCenter: { alignItems: 'center', paddingVertical: 20 },
  qrScanIcon: { fontSize: 48, marginBottom: 12 },
  qrScanTitle: { fontSize: 16, fontWeight: '800', color: '#F0EEF8', marginBottom: 8 },
  qrScanSub: { fontSize: 13, color: '#7A7595', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  scannerBox: { height: 250, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  camera: { flex: 1 },
  cancelScan: {
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 12,
    alignItems: 'center', marginTop: 8, borderRadius: 12,
  },
  cancelScanText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});