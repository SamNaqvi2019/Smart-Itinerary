import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../src/theme';
import { PAKISTANI_CITIES } from '../src/data/pakistaniCities';
import { calculateFare, FareResponse, ServiceFare } from '../src/services/fareApi';
import FareMapView from '../src/components/FareMapView';

const GREEN = '#01411C';
const GOLD  = '#D4AF37';

// ── City picker (simple modal-less approach: inline scrollable list) ──────────
function CityPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={picker.wrap}>
      <Text style={picker.label}>{label}</Text>
      <TouchableOpacity style={picker.btn} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <Ionicons name="location-outline" size={16} color={GREEN} style={{ marginRight: 8 }} />
        <Text style={[picker.btnText, !value && picker.placeholder]}>
          {value || `Select ${label}`}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#999" />
      </TouchableOpacity>

      {open && (
        <View style={picker.dropdown}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {PAKISTANI_CITIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[picker.option, value === c.value && picker.optionSelected]}
                onPress={() => {
                  onChange(c.value);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    picker.optionText,
                    value === c.value && picker.optionTextSelected,
                  ]}
                >
                  {c.label}
                </Text>
                {value === c.value && (
                  <Ionicons name="checkmark" size={15} color={GREEN} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── Fare card ─────────────────────────────────────────────────────────────────
function FareCard({ fare, isCheapest }: { fare: ServiceFare; isCheapest: boolean }) {
  const unavailable = !fare.is_available;

  return (
    <View style={[card.wrap, isCheapest && card.wrapBest, unavailable && card.wrapUnavail]}>
      {isCheapest && (
        <View style={card.bestBadge}>
          <Text style={card.bestText}>⭐ Cheapest</Text>
        </View>
      )}

      <View style={card.topRow}>
        <Text style={card.icon}>{fare.icon}</Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[card.service, unavailable && card.dimText]}>{fare.service}</Text>
          <Text style={[card.category, unavailable && card.dimText]}>{fare.category}</Text>
        </View>
        {fare.is_peak_active && (
          <View style={card.surgeBadge}>
            <Text style={card.surgeText}>PEAK</Text>
          </View>
        )}
        {unavailable && (
          <View style={card.unavailBadge}>
            <Text style={card.unavailText}>N/A</Text>
          </View>
        )}
      </View>

      {!unavailable ? (
        <>
          <View style={card.fareRow}>
            <View style={card.fareBlock}>
              <Text style={card.fareLabel}>Min</Text>
              <Text style={card.fareValue}>PKR {Math.round(fare.fare_min).toLocaleString()}</Text>
            </View>
            <View style={[card.fareBlock, card.fareBlockMid]}>
              <Text style={card.fareLabel}>Expected</Text>
              <Text style={[card.fareValue, card.fareExpected]}>
                PKR {Math.round(fare.fare_expected).toLocaleString()}
              </Text>
            </View>
            <View style={card.fareBlock}>
              <Text style={card.fareLabel}>Max</Text>
              <Text style={card.fareValue}>PKR {Math.round(fare.fare_max).toLocaleString()}</Text>
            </View>
          </View>
          <Text style={card.note}>{fare.note}</Text>
        </>
      ) : (
        <Text style={card.unavailReason}>{fare.note}</Text>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function FareCalculatorScreen() {
  const navigation = useNavigation();

  const [origin, setOrigin]     = useState('');
  const [dest, setDest]         = useState('');
  const [numPeople, setNumPeople] = useState(1);
  const [isPeak, setIsPeak]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<FareResponse | null>(null);
  const [error, setError]       = useState('');

  const handleCalculate = async () => {
    if (!origin) { Alert.alert('Missing', 'Please select an origin city.'); return; }
    if (!dest)   { Alert.alert('Missing', 'Please select a destination city.'); return; }
    if (origin === dest) { Alert.alert('Invalid', 'Origin and destination must be different.'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await calculateFare({ origin_city: origin, destination_city: dest, num_people: numPeople, is_peak: isPeak });
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const durationText = result
    ? result.duration_minutes >= 60
      ? `${Math.floor(result.duration_minutes / 60)}h ${result.duration_minutes % 60}m`
      : `${result.duration_minutes} min`
    : '';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Fare Calculator</Text>
          <Text style={styles.headerSub}>Compare Uber, Careem, InDrive, Bykea</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Route card */}
        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <Text style={styles.cardTitle}>Select Route</Text>

          <CityPicker label="Origin City" value={origin} onChange={setOrigin} />
          <View style={styles.swapRow}>
            <View style={styles.dividerLine} />
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={() => { const t = origin; setOrigin(dest); setDest(t); }}
              activeOpacity={0.75}
            >
              <Ionicons name="swap-vertical" size={18} color={GREEN} />
            </TouchableOpacity>
            <View style={styles.dividerLine} />
          </View>
          <CityPicker label="Destination City" value={dest} onChange={setDest} />

          {/* Options row */}
          <View style={styles.optionsRow}>
            {/* People stepper */}
            <View style={styles.peopleBlock}>
              <Text style={styles.optLabel}>Passengers</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setNumPeople(Math.max(1, numPeople - 1))}
                  disabled={numPeople <= 1}
                >
                  <Ionicons name="remove" size={16} color={numPeople <= 1 ? '#ccc' : GREEN} />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{numPeople}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setNumPeople(Math.min(6, numPeople + 1))}
                  disabled={numPeople >= 6}
                >
                  <Ionicons name="add" size={16} color={numPeople >= 6 ? '#ccc' : GREEN} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Peak toggle */}
            <View style={styles.peakBlock}>
              <Text style={styles.optLabel}>Peak Hours</Text>
              <View style={styles.peakRow}>
                <Switch
                  value={isPeak}
                  onValueChange={setIsPeak}
                  trackColor={{ false: '#ddd', true: GREEN + '88' }}
                  thumbColor={isPeak ? GREEN : '#fff'}
                />
                <Text style={[styles.peakLabel, isPeak && { color: GREEN }]}>
                  {isPeak ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          </View>

          {isPeak && (
            <Text style={styles.peakNote}>
              ⚡ Peak hours: 7–10 AM and 5–8 PM. Surge pricing applies.
            </Text>
          )}

          {/* Calculate button */}
          <TouchableOpacity
            style={[styles.calcBtn, loading && { opacity: 0.7 }]}
            onPress={handleCalculate}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="calculator-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.calcBtnText}>Calculate Fares</Text>
              </>
            )}
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* Results */}
        {result && (
          <>
            {/* Map */}
            <View style={styles.mapCard}>
              <FareMapView
                originCity={result.origin_city}
                destinationCity={result.destination_city}
                originCoords={result.origin_coords}
                destinationCoords={result.destination_coords}
                distanceKm={result.distance_km}
                durationMinutes={result.duration_minutes}
                height={280}
              />
            </View>

            {/* Summary strip */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Ionicons name="navigate-outline" size={18} color={GREEN} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.summaryLabel}>Distance</Text>
                  <Text style={styles.summaryValue}>{result.distance_km.toFixed(1)} km</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="time-outline" size={18} color={GREEN} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.summaryLabel}>Est. Duration</Text>
                  <Text style={styles.summaryValue}>{durationText}</Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="trending-down-outline" size={18} color={GOLD} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.summaryLabel}>Cheapest</Text>
                  <Text style={[styles.summaryValue, { color: GOLD }]}>
                    PKR {Math.round(result.cheapest_fare).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Cheapest note */}
            <View style={styles.cheapestNote}>
              <Ionicons name="star" size={14} color={GOLD} />
              <Text style={styles.cheapestNoteText}>
                Best deal: <Text style={{ fontWeight: '700' }}>{result.cheapest_service}</Text>
              </Text>
            </View>

            {/* Fare cards */}
            <Text style={styles.sectionTitle}>All Services</Text>
            {result.fares.map((fare, i) => (
              <FareCard
                key={`${fare.service}-${fare.category}-${i}`}
                fare={fare}
                isCheapest={
                  fare.is_available &&
                  fare.fare_expected === result.cheapest_fare &&
                  `${fare.service} ${fare.category}` === result.cheapest_service
                }
              />
            ))}

            {/* Info note */}
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color="#888" />
              <Text style={styles.infoNoteText}>
                Fares are estimates based on distance. Actual fares may vary with traffic, availability, and app pricing at time of booking.
                {result.is_peak ? ' Peak-hour surge is applied.' : ''}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: GREEN },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 22 },
  backBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 2 },
  scroll:      { flex: 1, backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scrollInner: { padding: 16, paddingBottom: 48, gap: 14 },

  card:        { backgroundColor: '#fff', borderRadius: 18, padding: 18, ...theme.shadows.md, overflow: 'hidden' },
  cardAccent:  { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: GREEN },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 16, marginTop: 6 },

  swapRow:     { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  swapBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: GREEN + '14', alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },

  optionsRow:  { flexDirection: 'row', gap: 14, marginTop: 16 },
  peopleBlock: { flex: 1 },
  peakBlock:   { flex: 1 },
  optLabel:    { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 6 },

  stepper:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.background, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  stepBtn:     { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...theme.shadows.sm },
  stepVal:     { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, minWidth: 20, textAlign: 'center' },

  peakRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.background, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  peakLabel:   { fontSize: 13, fontWeight: '600', color: '#999' },
  peakNote:    { marginTop: 10, fontSize: 12, color: '#E65100', backgroundColor: '#FFF3E0', borderRadius: 8, padding: 10, lineHeight: 18 },

  calcBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: GREEN, borderRadius: 14, paddingVertical: 15, marginTop: 18 },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  errorText:   { marginTop: 12, fontSize: 13, color: theme.colors.error, backgroundColor: theme.colors.errorLight, borderRadius: 8, padding: 10, lineHeight: 18 },

  mapCard:     { borderRadius: 18, overflow: 'hidden', ...theme.shadows.md },

  summaryCard: { backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 16, ...theme.shadows.sm },
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  summaryDivider: { width: 1, height: 36, backgroundColor: theme.colors.border, marginHorizontal: 8 },
  summaryLabel: { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '600' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 2 },

  cheapestNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GOLD + '18', borderRadius: 10, padding: 10 },
  cheapestNoteText: { fontSize: 13, color: '#7A5800' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },

  infoNote:    { flexDirection: 'row', gap: 8, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 12, padding: 12, marginTop: 4 },
  infoNoteText: { flex: 1, fontSize: 11, color: theme.colors.textSecondary, lineHeight: 17 },
});

const picker = StyleSheet.create({
  wrap:           { marginBottom: 4 },
  label:          { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  btn:            { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: theme.colors.border },
  btnText:        { flex: 1, fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' },
  placeholder:    { color: '#aaa' },
  dropdown:       { marginTop: 4, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', ...theme.shadows.md },
  option:         { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionSelected: { backgroundColor: GREEN + '10' },
  optionText:     { fontSize: 14, color: theme.colors.textPrimary },
  optionTextSelected: { fontWeight: '700', color: GREEN },
});

const card = StyleSheet.create({
  wrap:           { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, ...theme.shadows.sm, borderWidth: 1.5, borderColor: theme.colors.border },
  wrapBest:       { borderColor: GOLD, borderWidth: 2 },
  wrapUnavail:    { opacity: 0.55 },
  bestBadge:      { position: 'absolute', top: 12, right: 12, backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  bestText:       { fontSize: 11, fontWeight: '700', color: '#fff' },
  topRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon:           { fontSize: 26 },
  service:        { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  category:       { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },
  dimText:        { color: '#bbb' },
  surgeBadge:     { backgroundColor: '#DC2626', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  surgeText:      { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  unavailBadge:   { backgroundColor: '#9E9E9E', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  unavailText:    { fontSize: 10, fontWeight: '700', color: '#fff' },
  fareRow:        { flexDirection: 'row', backgroundColor: theme.colors.background, borderRadius: 10, marginBottom: 8 },
  fareBlock:      { flex: 1, alignItems: 'center', paddingVertical: 10 },
  fareBlockMid:   { borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.colors.border },
  fareLabel:      { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 3 },
  fareValue:      { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  fareExpected:   { fontSize: 16, fontWeight: '800', color: GREEN },
  note:           { fontSize: 11, color: theme.colors.textSecondary, fontStyle: 'italic' },
  unavailReason:  { fontSize: 12, color: '#aaa', fontStyle: 'italic', marginTop: 4 },
});
