import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

const INTERESTS = [
  { e: '⚽', l: 'Football' }, { e: '🏀', l: 'Basketball' },
  { e: '🎾', l: 'Tennis' }, { e: '🏓', l: 'Padel' },
  { e: '🏓', l: 'Ping Pong' }, { e: '♟️', l: 'Chess' },
  { e: '🎲', l: 'Backgammon' }, { e: '🃏', l: 'Card Games' },
  { e: '☕', l: 'Coffee Talks' }, { e: '🍽️', l: 'Dining Out' },
  { e: '📚', l: 'Reading' }, { e: '🧘', l: 'Yoga' },
  { e: '🏋️', l: 'Gym & Fitness' }, { e: '🎮', l: 'Gaming' },
  { e: '🎨', l: 'Art & Design' }, { e: '🎵', l: 'Music' },
  { e: '🧗', l: 'Hiking' }, { e: '📸', l: 'Photography' },
  { e: '🎭', l: 'Theatre' }, { e: '🍳', l: 'Cooking' },
  { e: '🎸', l: 'Live Music' }, { e: '🏊', l: 'Swimming' },
  { e: '🚴', l: 'Cycling' }, { e: '🎬', l: 'Movies' },
  { e: '🎯', l: 'Darts' }, { e: '🧩', l: 'Board Games' },
  { e: '🎪', l: 'Scrabble' }, { e: '🎯', l: 'Monopoly & Group Games' },
  { e: '🥊', l: 'Martial Arts' }, { e: '🏌️', l: 'Golf' },
  { e: '🌿', l: 'Nature & Outdoors' }, { e: '💃', l: 'Dancing' },
  { e: '🛹', l: 'Skateboarding' }, { e: '🤿', l: 'Water Sports' },
];

export default function InterestsScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams();
  const isEditing = from === 'profile';
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      // Load existing interests from cache
      const loadExisting = async () => {
        const cached = await AsyncStorage.getItem('zizo_profile');
        if (cached) {
          const data = JSON.parse(cached);
          setSelected(data.interests || []);
        }
      };
      loadExisting();
    }
  }, []);

  const toggle = (label: string) => {
    setSelected(prev =>
      prev.includes(label)
        ? prev.filter(x => x !== label)
        : [...prev, label]
    );
  };

  const save = async () => {
    if (selected.length < 3) {
      Alert.alert('Select More', 'Please select at least 3 interests');
      return;
    }
    setSaving(true);
    try {
      const uid = await AsyncStorage.getItem('zizo_user');
      if (uid) {
        await updateDoc(doc(db, 'users', uid), { interests: selected });
        const cached = await AsyncStorage.getItem('zizo_profile');
        if (cached) {
          const data = JSON.parse(cached);
          await AsyncStorage.setItem('zizo_profile', JSON.stringify({ ...data, interests: selected }));
        }
      }
      if (isEditing) {
        router.back();
      } else {
        router.push('/permissions' as any);
      }
    } catch (e: any) {
      console.log('Error saving interests:', e.message);
      if (isEditing) {
        router.back();
      } else {
        router.push('/permissions' as any);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: isEditing ? '100%' : '57%' }]} />
        </View>
        <Text style={styles.stepText}>{isEditing ? 'Edit' : '4 of 7'}</Text>
      </View>

      <View style={styles.titleWrap}>
        <Text style={styles.title}>{isEditing ? 'Edit your\ninterests ✏️' : 'What are you\ninto? 🔥'}</Text>
        <Text style={styles.subtitle}>
          Pick at least 3. This powers your AI matching.
        </Text>
        <Text style={styles.counter}>
          Selected: <Text style={styles.counterNum}>{selected.length}</Text> (min 3)
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {INTERESTS.map((item) => {
          const isOn = selected.includes(item.l);
          return (
            <TouchableOpacity
              key={item.l}
              style={[styles.chip, isOn && styles.chipOn]}
              onPress={() => toggle(item.l)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipEmoji}>{item.e}</Text>
              <Text style={[styles.chipText, isOn && styles.chipTextOn]}>
                {item.l}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.stickyBtn}>
        <TouchableOpacity
          style={[styles.btnMain, saving && { opacity: 0.7 }]}
          onPress={save}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Text style={styles.btnMainText}>
            {saving ? 'Saving...' : isEditing ? `Save ${selected.length} interests` : `Continue with ${selected.length} interests`}
          </Text>
        </TouchableOpacity>
      </View>
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
  titleWrap: { paddingHorizontal: 24, marginBottom: 16 },
  title: {
    fontSize: 26, fontWeight: '800',
    color: '#F0EEF8', lineHeight: 32, marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: '#7A7595', marginBottom: 8 },
  counter: { fontSize: 12, color: '#7A7595', textAlign: 'right' },
  counterNum: { color: '#A78BFA', fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#181428', borderWidth: 1.5,
    borderColor: '#231E3A', borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  chipOn: {
    backgroundColor: 'rgba(123,92,246,0.18)',
    borderColor: '#7B5CF6',
  },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#7A7595' },
  chipTextOn: { color: '#F0EEF8' },
  stickyBtn: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 24, paddingBottom: 36,
    backgroundColor: 'rgba(11,9,20,0.95)',
  },
  btnMain: {
    backgroundColor: '#7B5CF6',
    borderRadius: 16, padding: 17, alignItems: 'center',
  },
  btnMainText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});