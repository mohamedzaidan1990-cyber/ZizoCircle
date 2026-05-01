import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ZIZO_AVATARS } from '../../components/ZizoAvatars';
import { auth, db } from '../../firebaseConfig';
import useLocation from '../../hooks/useLocation';

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [avatarId, setAvatarId] = useState('male1');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const { location } = useLocation();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const cached = await AsyncStorage.getItem('zizo_profile');
        if (cached) {
          const data = JSON.parse(cached);
          setName(data.name || '');
          setAlias(data.alias || '');
          setEmail(data.email || '');
          setAvatarId(data.avatarId || 'male1');
          setPhotoUri(data.photoUri || null);
          setInterests(data.interests || []);
          return;
        }
        const uid = await AsyncStorage.getItem('zizo_user');
        if (uid) {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            const data = snap.data();
            setName(data.name || '');
            setAlias(data.alias || '');
            setEmail(data.email || '');
            setAvatarId(data.avatarId || 'male1');
            setPhotoUri(data.photoUri || null);
            setInterests(data.interests || []);
            await AsyncStorage.setItem('zizo_profile', JSON.stringify(data));
          }
        }
      } catch (e: any) {
        console.log('Profile error:', e.message);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('zizo_user');
      await AsyncStorage.removeItem('zizo_profile');
      router.replace('/splash' as any);
    } catch (error) {
      Alert.alert('Error', 'Could not log out. Try again.');
    }
  };

  const updateCache = async (updates: any) => {
    const cached = await AsyncStorage.getItem('zizo_profile');
    const data = cached ? JSON.parse(cached) : {};
    await AsyncStorage.setItem('zizo_profile', JSON.stringify({ ...data, ...updates }));
    const uid = await AsyncStorage.getItem('zizo_user');
    if (uid) {
      await updateDoc(doc(db, 'users', uid), updates);
    }
  };

  const selectAvatar = async (id: string) => {
    setAvatarId(id);
    setPhotoUri(null);
    setShowAvatarPicker(false);
    await updateCache({ avatarId: id, photoUri: null });
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setShowAvatarPicker(false);
      await updateCache({ photoUri: uri });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setShowAvatarPicker(false);
      await updateCache({ photoUri: uri });
    }
  };

  const saveName = async () => {
    setEditing(false);
    await updateCache({ name });
  };

  const currentAvatarObj = ZIZO_AVATARS.find(a => a.id === avatarId) || ZIZO_AVATARS[0];
  const AvatarComponent = currentAvatarObj.component;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => editing ? saveName() : setEditing(true)}
        >
          <Text style={styles.editBtnText}>{editing ? '✓ Save' : '✏️ Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setShowAvatarPicker(true)} activeOpacity={0.8}>
            <View style={styles.avatarRing}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarPhoto} />
              ) : (
                <AvatarComponent size={84} />
              )}
            </View>
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditText}>✏️</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{name || '...'}</Text>
          <Text style={styles.userAlias}>{alias}</Text>
          <View style={styles.aliasBadge}>
            <Text style={styles.aliasBadgeText}>🔒 Alias is permanent</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>6</Text>
            <Text style={styles.statLbl}>Matches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>12</Text>
            <Text style={styles.statLbl}>Visits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>QR 228</Text>
            <Text style={styles.statLbl}>Earned</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.qrBtn}
          onPress={() => router.push('/my-qr' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.qrBtnText}>📱 Show My QR Code — Earn Cashback</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={styles.infoInput}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />
              ) : (
                <Text style={styles.infoVal}>{name}</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alias</Text>
              <Text style={styles.infoVal}>{alias}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoVal}>{email}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoVal}>📍 {location}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoVal}>April 2026</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Interests</Text>
          <View style={styles.interestWrap}>
            {interests.length > 0 ? interests.map(i => (
              <View key={i} style={styles.interestChip}>
                <Text style={styles.interestText}>{i}</Text>
              </View>
            )) : (
              <Text style={styles.noInterests}>No interests yet — tap Edit to add!</Text>
            )}
            <TouchableOpacity
              style={styles.addChip}
              onPress={() => router.push({ pathname: '/interests', params: { from: 'profile' } } as any)}
            >
              <Text style={styles.addChipText}>+ Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.infoCard}>
            {[
              { icon: '🔔', label: 'Notifications', val: 'On' },
              { icon: '📍', label: 'Location', val: 'On' },
              { icon: '🔒', label: 'Privacy', val: 'Friends only' },
              { icon: '💰', label: 'Cashback alerts', val: 'On' },
              { icon: '📋', label: 'Terms of Service', val: 'View', onPress: () => router.push({ pathname: '/tos', params: { showActions: 'false' } } as any) },
            ].map((s, i, arr) => (
              <View key={s.label}>
                <TouchableOpacity style={styles.settingRow} onPress={s.onPress}>
                  <Text style={styles.settingIco}>{s.icon}</Text>
                  <Text style={styles.settingLabel}>{s.label}</Text>
                  <Text style={styles.settingVal}>{s.val} →</Text>
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => Alert.alert('Logout', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: handleLogout }
            ])}
          >
            <Text style={styles.logoutText}>🚪 Log Out</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Your Look</Text>
            <Text style={styles.modalSub}>Pick an avatar or upload a photo</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Text style={styles.photoBtnIcon}>🖼️</Text>
                <Text style={styles.photoBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Text style={styles.photoBtnIcon}>📸</Text>
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider}>
              <View style={styles.modalDividerLine} />
              <Text style={styles.modalDividerText}>or choose avatar</Text>
              <View style={styles.modalDividerLine} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              <View style={styles.avatarGrid}>
                {ZIZO_AVATARS.map(a => {
                  const AvatarComp = a.component;
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[
                        styles.avatarOption,
                        avatarId === a.id && !photoUri && styles.avatarOptionSelected
                      ]}
                      onPress={() => selectAvatar(a.id)}
                      activeOpacity={0.7}
                    >
                      <AvatarComp size={60} />
                      <Text style={styles.avatarLabel}>{a.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowAvatarPicker(false)}
            >
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
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#F0EEF8' },
  editBtn: {
    backgroundColor: 'rgba(123,92,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.3)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#A78BFA' },
  avatarSection: { alignItems: 'center', paddingBottom: 20 },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#7B5CF6', padding: 3,
    marginBottom: 4, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarPhoto: { width: 84, height: 84, borderRadius: 42 },
  avatarEditBadge: {
    position: 'absolute', bottom: 4, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#7B5CF6', borderWidth: 2,
    borderColor: '#0B0914', alignItems: 'center', justifyContent: 'center',
  },
  avatarEditText: { fontSize: 12 },
  userName: { fontSize: 20, fontWeight: '800', color: '#F0EEF8', marginBottom: 2, marginTop: 10 },
  userAlias: { fontSize: 14, color: '#A78BFA', fontWeight: '600', marginBottom: 8 },
  aliasBadge: {
    backgroundColor: 'rgba(245,59,143,0.1)',
    borderWidth: 1, borderColor: 'rgba(245,59,143,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  aliasBadgeText: { fontSize: 11, color: '#F53B8F', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#181428',
    borderWidth: 1, borderColor: '#231E3A',
    borderRadius: 16, padding: 12, alignItems: 'center',
  },
  statVal: { fontSize: 16, fontWeight: '800', color: '#F0EEF8', marginBottom: 2 },
  statLbl: { fontSize: 10, color: '#7A7595' },
  qrBtn: {
    backgroundColor: '#7B5CF6', borderRadius: 16,
    padding: 15, alignItems: 'center',
    marginHorizontal: 20, marginBottom: 20,
  },
  qrBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#7A7595', letterSpacing: 1, marginBottom: 10 },
  infoCard: {
    backgroundColor: '#181428', borderWidth: 1,
    borderColor: '#231E3A', borderRadius: 18, padding: 4,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  infoLabel: { fontSize: 14, color: '#7A7595' },
  infoVal: { fontSize: 14, fontWeight: '600', color: '#F0EEF8' },
  infoInput: {
    fontSize: 14, fontWeight: '600', color: '#A78BFA',
    borderBottomWidth: 1, borderBottomColor: '#7B5CF6',
    minWidth: 120, textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: '#231E3A', marginHorizontal: 14 },
  interestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: {
    backgroundColor: 'rgba(123,92,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(123,92,246,0.3)',
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7,
  },
  interestText: { fontSize: 13, fontWeight: '600', color: '#A78BFA' },
  noInterests: { fontSize: 13, color: '#7A7595', fontStyle: 'italic' },
  addChip: {
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#7B5CF6', borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 7,
    borderStyle: 'dashed',
  },
  addChipText: { fontSize: 13, fontWeight: '600', color: '#7B5CF6' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 14,
  },
  settingIco: { fontSize: 18 },
  settingLabel: { flex: 1, fontSize: 14, color: '#F0EEF8' },
  settingVal: { fontSize: 13, color: '#7A7595' },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 16, padding: 16, alignItems: 'center',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0F0C1A',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#F0EEF8', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#7A7595', textAlign: 'center', marginBottom: 16 },
  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  photoBtn: {
    flex: 1, backgroundColor: '#181428',
    borderWidth: 1.5, borderColor: '#7B5CF6',
    borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6,
  },
  photoBtnIcon: { fontSize: 24 },
  photoBtnText: { fontSize: 13, fontWeight: '700', color: '#A78BFA' },
  modalDivider: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 16,
  },
  modalDividerLine: { flex: 1, height: 1, backgroundColor: '#231E3A' },
  modalDividerText: { fontSize: 12, color: '#7A7595' },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, justifyContent: 'center',
  },
  avatarOption: {
    width: 80, alignItems: 'center', gap: 4,
    backgroundColor: '#181428',
    borderWidth: 1.5, borderColor: '#231E3A',
    borderRadius: 16, padding: 8,
  },
  avatarOptionSelected: {
    borderColor: '#7B5CF6',
    backgroundColor: 'rgba(123,92,246,0.15)',
  },
  avatarLabel: { fontSize: 10, color: '#7A7595', fontWeight: '600' },
  modalClose: {
    backgroundColor: '#181428', borderRadius: 14,
    padding: 14, alignItems: 'center', marginTop: 12,
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#7A7595' },
});