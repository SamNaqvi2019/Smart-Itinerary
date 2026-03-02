import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../src/theme';
import { submitFeedback } from '../src/services/feedbackApi';

const GREEN = '#01411C';
const GOLD  = '#D4AF37';

const STAR_LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent',
};

// ── Star Rating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 10 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={46} color={n <= value ? GOLD : '#CCC'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Success Screen ────────────────────────────────────────────────────────────

function SuccessScreen({ onDone }: { onDone: () => void }) {
  return (
    <View style={suc.root}>
      <View style={suc.iconWrap}>
        <Ionicons name="checkmark-circle" size={84} color={GREEN} />
      </View>
      <Text style={suc.title}>Thank You!</Text>
      <Text style={suc.subtitle}>
        Your feedback helps us make SafarSmart better for every traveller in Pakistan.
      </Text>
      <TouchableOpacity style={suc.btn} onPress={onDone} activeOpacity={0.85}>
        <Text style={suc.btnText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}
const suc = StyleSheet.create({
  root:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: theme.colors.background },
  iconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: GREEN + '14', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title:    { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22, textAlign: 'center', marginBottom: 36 },
  btn:      { backgroundColor: GREEN, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 16 },
  btnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function FeedbackScreen() {
  const navigation = useNavigation();

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [comment, setComment] = useState('');
  const [rating,  setRating]  = useState(0);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please give us a star rating before submitting.');
      return;
    }
    setLoading(true);
    try {
      await submitFeedback({
        type:       'app',
        rating,
        comment:    comment.trim() || undefined,
        user_name:  name.trim()    || undefined,
        user_email: email.trim()   || undefined,
      });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: GREEN }} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Feedback</Text>
          <View style={{ width: 40 }} />
        </View>
        <SuccessScreen onDone={() => {
          // @ts-ignore
          navigation.navigate('Dashboard');
        }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>How are we doing?</Text>
            <Text style={styles.heroSub}>Your feedback shapes the future of SafarSmart</Text>
          </View>

          {/* Rating */}
          <View style={styles.card}>
            <Text style={styles.label}>Your Rating <Text style={styles.required}>*</Text></Text>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <Text style={styles.ratingWord}>{STAR_LABELS[rating]}</Text>
            )}
          </View>

          {/* Name */}
          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={GREEN} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#AAA"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={GREEN} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#AAA"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Thoughts */}
          <View style={styles.card}>
            <Text style={styles.label}>Your Thoughts</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Tell us what you loved or what we can improve…"
              placeholderTextColor="#AAA"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={5}
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/1000</Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (loading || rating === 0) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading || rating === 0}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: GREEN },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  scroll:      { flex: 1, backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scrollInner: { padding: 20, paddingBottom: 40 },

  hero:     { alignItems: 'center', paddingVertical: 28 },
  heroTitle:{ fontSize: 26, fontWeight: '800', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  heroSub:  { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  label:    { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 12 },
  required: { color: '#E53E3E' },

  ratingWord: {
    textAlign: 'center', fontSize: 16, fontWeight: '700', color: GOLD,
    marginTop: 4, letterSpacing: 0.3,
  },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: 12, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1, fontSize: 14, color: theme.colors.textPrimary,
    paddingVertical: 12,
  },

  textArea: {
    backgroundColor: theme.colors.background, borderRadius: 12,
    borderWidth: 1.5, borderColor: theme.colors.border,
    padding: 14, fontSize: 14, color: theme.colors.textPrimary,
    minHeight: 120, lineHeight: 20,
  },
  charCount: { fontSize: 11, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 6 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, borderRadius: 16, paddingVertical: 17, marginTop: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:     { color: '#fff', fontSize: 17, fontWeight: '700' },
});
