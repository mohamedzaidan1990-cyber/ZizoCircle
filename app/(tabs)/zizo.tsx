import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

const SYSTEM_PROMPT_BASE =
  "You are Zizo, a friendly AI social companion inside Zizo Circle, a Qatar-based social interest matching app built by Bayline Holding WLL. " +
  "Your personality is warm, witty, and locally aware. You help users find people with similar interests nearby, suggest venues in Lusail, The Pearl, West Bay, Katara, Fox Hills and Doha, " +
  "explain how cashback rewards work, and encourage social connections. " +
  "You speak in a casual friendly tone, use occasional emojis, and always keep responses concise — max 3 sentences. " +
  "You NEVER engage in romantic, sexual, or inappropriate conversations — if a user tries, firmly but kindly redirect them to the app's purpose. " +
  "You know Qatar culture, landmarks, popular activities like padel, shisha, chess, coffee, and local lifestyle. " +
  "Always encourage users to connect with matches and visit partner venues to earn cashback. " +
  "You are NOT a dating app assistant — you are a social interest matching assistant.";

const ERROR_REPLY = 'Zizo is taking a break, try again shortly 🔄';

const QUICK_REPLIES = [
  "Show me my matches 🎾",
  "Coffee spots near me ☕",
  "Padel courts in Lusail 🏓",
  "How does cashback work? 💰",
];

type Message = { id: string; from: 'user' | 'zizo'; text: string };
type UserProfile = { name?: string; alias?: string; interests?: string[] };

function TypingDots() {
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
      );
    const animations = [pulse(a, 0), pulse(b, 150), pulse(c, 300)];
    animations.forEach(x => x.start());
    return () => animations.forEach(x => x.stop());
  }, [a, b, c]);

  return (
    <View style={styles.typingRow}>
      <Animated.View style={[styles.dot, { opacity: a }]} />
      <Animated.View style={[styles.dot, { opacity: b }]} />
      <Animated.View style={[styles.dot, { opacity: c }]} />
    </View>
  );
}

export default function ZizoScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', from: 'zizo', text: "Hey! I'm Zizo 👋 I found 4 people near you in Lusail who share your interests. Want me to introduce you?" },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem('zizo_profile').then(cached => {
      if (!cached) return;
      try {
        const data = JSON.parse(cached);
        setProfile({ name: data.name, alias: data.alias, interests: data.interests });
      } catch {
        // ignore malformed cache
      }
    });
  }, []);

  const buildSystemPrompt = () => {
    const ctx: string[] = [];
    if (profile.name)  ctx.push(`The user you are talking to is named ${profile.name}.`);
    if (profile.alias) ctx.push(`Their in-app alias is ${profile.alias}.`);
    if (profile.interests?.length) {
      ctx.push(`Their selected interests are: ${profile.interests.join(', ')}. Tailor suggestions to these interests when relevant.`);
    }
    return ctx.length ? `${SYSTEM_PROMPT_BASE}\n\nUSER CONTEXT: ${ctx.join(' ')}` : SYSTEM_PROMPT_BASE;
  };

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

  const send = async (text?: string) => {
    const t = text || input.trim();
    if (!t || typing) return;

    const userMsg: Message = { id: Date.now().toString(), from: 'user', text: t };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    scrollToEnd();

    // Anthropic requires messages to start with 'user' — strip the UI-only greeting
    const rawHistory = [...messages, userMsg].map(m => ({
      role: m.from === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));
    const apiHistory = rawHistory[0]?.role === 'assistant' ? rawHistory.slice(1) : rawHistory;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: buildSystemPrompt(),
          messages: apiHistory,
        }),
      });

      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const reply: string = data.content?.[0]?.text ?? ERROR_REPLY;
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), from: 'zizo', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), from: 'zizo', text: ERROR_REPLY }]);
    } finally {
      setTyping(false);
      scrollToEnd();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.av}>
          <Text style={styles.avZ}>Z</Text>
          <View style={styles.online} />
        </View>
        <View>
          <Text style={styles.name}>Zizo AI</Text>
          <Text style={[styles.status, typing && styles.statusTyping]}>
            {typing ? '● Typing...' : '● Online now'}
          </Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.msgs} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.row, msg.from === 'user' ? styles.rowUser : styles.rowZizo]}>
            <View style={[styles.bubble, msg.from === 'user' ? styles.bubbleUser : styles.bubbleZizo]}>
              <Text style={[styles.bubbleText, msg.from === 'user' ? styles.textUser : styles.textZizo]}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {typing && (
          <View style={[styles.row, styles.rowZizo]}>
            <View style={[styles.bubble, styles.bubbleZizo, styles.typingBubble]}>
              <TypingDots />
            </View>
          </View>
        )}

        {!typing && (
          <View style={styles.quickRow}>
            {QUICK_REPLIES.map(qr => (
              <TouchableOpacity key={qr} style={styles.qrBtn} onPress={() => send(qr)}>
                <Text style={styles.qrText}>{qr}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask Zizo anything..."
          placeholderTextColor="#7A7595"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          returnKeyType="send"
          editable={!typing}
        />
        <TouchableOpacity
          style={[styles.sendBtn, typing && styles.sendBtnDisabled]}
          onPress={() => send()}
          disabled={typing}
        >
          <Text style={styles.sendTxt}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0914' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 20, paddingTop: 52,
    backgroundColor: '#0F0C1A',
    borderBottomWidth: 1, borderBottomColor: '#231E3A',
  },
  av: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#7B5CF6',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  avZ: { fontSize: 20, fontWeight: '900', color: '#fff' },
  online: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, backgroundColor: '#3BF5C8',
    borderRadius: 5, borderWidth: 2, borderColor: '#0B0914',
  },
  name: { fontSize: 16, fontWeight: '800', color: '#F0EEF8' },
  status: { fontSize: 11, color: '#3BF5C8', fontWeight: '600' },
  statusTyping: { color: '#A78BFA' },
  msgs: { flex: 1 },
  row: { flexDirection: 'row' },
  rowZizo: { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12, marginBottom: 4 },
  bubbleZizo: { backgroundColor: '#181428', borderWidth: 1, borderColor: '#231E3A', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: '#7B5CF6', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  textZizo: { color: '#F0EEF8' },
  textUser: { color: '#fff' },
  typingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#A78BFA' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  qrBtn: { backgroundColor: '#181428', borderWidth: 1, borderColor: '#7B5CF6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  qrText: { fontSize: 12, fontWeight: '600', color: '#A78BFA' },
  inputRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 24, backgroundColor: '#0F0C1A', borderTopWidth: 1, borderTopColor: '#231E3A' },
  input: { flex: 1, backgroundColor: '#181428', borderWidth: 1.5, borderColor: '#231E3A', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#F0EEF8' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7B5CF6', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendTxt: { fontSize: 18, color: '#fff', fontWeight: '800' },
});
