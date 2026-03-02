import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../src/theme';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { Loader } from '../src/components/ui/Loader';
import { Stepper } from '../src/components/ui/Stepper';
import { Select } from '../src/components/ui/Select';
import { Chip } from '../src/components/ui/Chip';
import { DatePicker } from '../src/components/ui/DatePicker';
import { generateItinerary, ItineraryRequest } from '../src/services/api';
import {
  getBudgetOptions,
  getBudgetEstimate,
  BudgetOptionsResponse,
  BudgetEstimateResponse,
  HotelChoiceOption,
  TransportChoiceOption,
} from '../src/services/budgetApi';
import { saveItinerary } from '../src/services/storage';
import { calculateFare, FareResponse } from '../src/services/fareApi';
import { PAKISTANI_CITIES } from '../src/data/pakistaniCities';
import { getRegionForCity } from '../src/data/cityToRegion';
import ScreenWrapper from '../src/components/ScreenWrapper';

const GREEN = '#01411C';
const GOLD = '#D4AF37';

type Phase = 'form' | 'selecting' | 'confirming';

const TRANSPORT_ICONS: Record<string, string> = {
  flight: '✈️',
  bus: '🚌',
  train: '🚂',
  car: '🚗',
};

const STAR_LABELS: Record<number, string> = {
  1: 'Budget', 2: 'Economy', 3: 'Standard', 4: 'Superior', 5: 'Luxury',
};

const INTEREST_OPTIONS = [
  'mountains', 'lakes', 'hiking', 'camping', 'photography',
  'culture', 'history', 'adventure', 'nature', 'wildlife', 'food', 'shopping',
];

// ── Compact fare row ─────────────────────────────────────────────────────────
function FareRow({ label, icon, expected, available }: {
  label: string; icon: string; expected: number; available: boolean;
}) {
  return (
    <View style={fr.row}>
      <Text style={fr.icon}>{icon}</Text>
      <Text style={fr.label}>{label}</Text>
      {available
        ? <Text style={fr.fare}>PKR {Math.round(expected).toLocaleString()}</Text>
        : <Text style={fr.na}>N/A</Text>}
    </View>
  );
}
const fr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  icon: { fontSize: 18, marginRight: 8, width: 26 },
  label: { flex: 1, fontSize: 13, color: theme.colors.textPrimary, fontWeight: '500' },
  fare: { fontSize: 14, fontWeight: '700', color: GREEN },
  na: { fontSize: 12, color: '#999', fontStyle: 'italic' },
});

// ── Hotel selection card ──────────────────────────────────────────────────────
function HotelCard({ hotel, selected, onPress }: {
  hotel: HotelChoiceOption; selected: boolean; onPress: () => void;
}) {
  const stars = '⭐'.repeat(Math.max(1, Math.min(5, hotel.star_rating)));
  return (
    <TouchableOpacity
      style={[hc.card, selected && hc.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={hc.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={hc.name} numberOfLines={2}>{hotel.name}</Text>
          <Text style={hc.stars}>{stars} <Text style={hc.tierLabel}>{STAR_LABELS[hotel.star_rating] || ''}</Text></Text>
          <Text style={hc.location}>📍 {hotel.location}</Text>
        </View>
        <View style={[hc.selectDot, selected && hc.selectDotActive]}>
          {selected && <View style={hc.selectDotInner} />}
        </View>
      </View>
      <View style={hc.priceRow}>
        <Text style={hc.priceNight}>PKR {hotel.price_per_night.toLocaleString()} <Text style={hc.perNight}>/night</Text></Text>
        <Text style={hc.priceTotal}>Total: PKR {hotel.total_price.toLocaleString()}</Text>
      </View>
      {hotel.amenities.length > 0 && (
        <View style={hc.amenitiesRow}>
          {hotel.amenities.slice(0, 4).map((a, i) => (
            <View key={i} style={hc.amenityChip}><Text style={hc.amenityText}>{a}</Text></View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
const hc = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: theme.colors.border, ...theme.shadows.sm },
  cardSelected: { borderColor: GREEN, backgroundColor: GREEN + '06' },
  topRow: { flexDirection: 'row', marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4, flex: 1 },
  stars: { fontSize: 13, marginBottom: 2 },
  tierLabel: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '500' },
  location: { fontSize: 12, color: theme.colors.textSecondary },
  selectDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginTop: 2 },
  selectDotActive: { borderColor: GREEN },
  selectDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, marginBottom: 10 },
  priceNight: { fontSize: 16, fontWeight: '700', color: GREEN },
  perNight: { fontSize: 12, fontWeight: '400', color: theme.colors.textSecondary },
  priceTotal: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amenityChip: { backgroundColor: GREEN + '12', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  amenityText: { fontSize: 11, color: GREEN, fontWeight: '500' },
});

// ── Transport selection card ──────────────────────────────────────────────────
function TransportCard({ option, selected, onPress }: {
  option: TransportChoiceOption; selected: boolean; onPress: () => void;
}) {
  const icon = TRANSPORT_ICONS[option.type.toLowerCase()] || '🚐';
  return (
    <TouchableOpacity
      style={[tc.card, selected && tc.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={tc.row}>
        <Text style={tc.icon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={tc.provider}>{option.provider}</Text>
          <Text style={tc.type}>{option.type.charAt(0).toUpperCase() + option.type.slice(1)}</Text>
          <Text style={tc.duration}>⏱ {option.duration}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={tc.ppPrice}>PKR {option.price_per_person.toLocaleString()}</Text>
          <Text style={tc.ppLabel}>per person</Text>
          <Text style={tc.totalPrice}>Total: PKR {option.total_price.toLocaleString()}</Text>
        </View>
        <View style={[tc.selectDot, selected && tc.selectDotActive]}>
          {selected && <View style={tc.selectDotInner} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}
const tc = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: theme.colors.border, ...theme.shadows.sm },
  cardSelected: { borderColor: GREEN, backgroundColor: GREEN + '06' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 28, width: 36, textAlign: 'center' },
  provider: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },
  type: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 2 },
  duration: { fontSize: 12, color: theme.colors.textSecondary },
  ppPrice: { fontSize: 15, fontWeight: '700', color: GREEN },
  ppLabel: { fontSize: 11, color: theme.colors.textSecondary },
  totalPrice: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 2 },
  selectDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  selectDotActive: { borderColor: GREEN },
  selectDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function GenerateItineraryScreen() {
  const navigation = useNavigation();

  // ── Phase state ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('form');

  // ── Form state ────────────────────────────────────────────────────────
  const [destinationCity, setDestinationCity] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [region, setRegion] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [budgetLevel, setBudgetLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [numDays, setNumDays] = useState(3);
  const [transportMode, setTransportMode] = useState('ride_sharing');
  const [travelDate, setTravelDate] = useState<Date | undefined>(undefined);
  const [numPeople, setNumPeople] = useState(1);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ur'>('en');

  // ── Fare preview ──────────────────────────────────────────────────────
  const [fareData, setFareData] = useState<FareResponse | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Phase 2: budget options ───────────────────────────────────────────
  const [budgetOptions, setBudgetOptions] = useState<BudgetOptionsResponse | null>(null);
  const [selectedHotelIndex, setSelectedHotelIndex] = useState<number | null>(null);
  const [selectedTransportIndex, setSelectedTransportIndex] = useState<number | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // ── Phase 3: estimate ─────────────────────────────────────────────────
  const [estimate, setEstimate] = useState<BudgetEstimateResponse | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // ── Final generation ──────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill region when destination changes
  useEffect(() => {
    if (destinationCity) {
      const r = getRegionForCity(destinationCity);
      if (r) setRegion(r);
    }
  }, [destinationCity]);

  // Fare preview debounce
  useEffect(() => {
    if (!departureCity || !destinationCity || departureCity === destinationCity) {
      setFareData(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setFareLoading(true);
      try {
        const data = await calculateFare({
          origin_city: departureCity,
          destination_city: destinationCity,
          num_people: numPeople,
          is_peak: false,
        });
        setFareData(data);
      } catch {
        setFareData(null);
      } finally {
        setFareLoading(false);
      }
    }, 700);
  }, [departureCity, destinationCity, numPeople]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  // ── Phase 1 → Phase 2: fetch options ─────────────────────────────────
  const handleGetOptions = async () => {
    if (!destinationCity.trim()) { setError('Destination city is required'); return; }
    if (numDays < 1 || numDays > 30) { setError('Number of days must be 1–30'); return; }
    setError(null);
    setOptionsLoading(true);
    try {
      const options = await getBudgetOptions({
        destination: destinationCity.trim(),
        num_days: numDays,
        num_travelers: numPeople,
        budget_tier: budgetLevel,
      });
      setBudgetOptions(options);
      setSelectedHotelIndex(null);
      setSelectedTransportIndex(null);
      setPhase('selecting');
    } catch (err: any) {
      setError(err.message || 'Could not fetch hotel & transport options. Check your connection.');
      Alert.alert('Error', err.message || 'Cannot connect to server. Check your connection.');
    } finally {
      setOptionsLoading(false);
    }
  };

  // ── Phase 2 → Phase 3: get estimate ──────────────────────────────────
  const handleGetEstimate = async () => {
    if (selectedHotelIndex === null) { setError('Please select a hotel'); return; }
    if (selectedTransportIndex === null) { setError('Please select a transport option'); return; }
    setError(null);
    setEstimateLoading(true);
    try {
      const est = await getBudgetEstimate({
        budget_request: {
          destination: destinationCity.trim(),
          num_days: numDays,
          num_travelers: numPeople,
          budget_tier: budgetLevel,
        },
        selected_hotel_index: selectedHotelIndex,
        selected_transport_index: selectedTransportIndex,
      });
      setEstimate(est);
      setPhase('confirming');
    } catch (err: any) {
      setError(err.message || 'Could not calculate estimate. Check your connection.');
      Alert.alert('Error', err.message || 'Cannot connect to server. Check your connection.');
    } finally {
      setEstimateLoading(false);
    }
  };

  // ── Phase 3 → Generate itinerary ─────────────────────────────────────
  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const request: ItineraryRequest = {
        destination_city: destinationCity.trim(),
        budget_level: budgetLevel,
        num_days: numDays,
        language: preferredLanguage,
        ...(departureCity.trim() && { departure_city: departureCity.trim() }),
        ...(region.trim() && { region: region.trim() }),
        ...(selectedInterests.length > 0 && { interests: selectedInterests }),
        ...(transportMode && { transport_mode: transportMode }),
        ...(travelDate && { travel_date: travelDate.toISOString().split('T')[0] }),
        ...(numPeople > 0 && { num_of_people: numPeople }),
        // Pass user's selections from the budget planner so the itinerary shows only what they picked
        ...(estimate?.selected_hotel && { selected_hotel_name: estimate.selected_hotel.name }),
        ...(estimate?.selected_transport && { selected_transport_type: `${estimate.selected_transport.provider} (${estimate.selected_transport.type})` }),
      };
      const response = await generateItinerary(request);
      const saved = await saveItinerary(request, response);
      // @ts-ignore
      navigation.navigate('ItineraryDetail', { itineraryId: saved.id });
    } catch (err: any) {
      const msg = err.message || 'Failed to generate itinerary. Check your connection.';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setGenerating(false);
    }
  };

  const previewFares = fareData
    ? fareData.fares.filter((f) => f.is_available).sort((a, b) => a.fare_expected - b.fare_expected).slice(0, 4)
    : [];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper
      title="Plan Your Trip"
      showLanguageToggle
      language={preferredLanguage}
      onLanguageChange={setPreferredLanguage}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ════════════════════════════════════════════════════════════
              PHASE 1 — Trip form
          ════════════════════════════════════════════════════════════ */}
          {phase === 'form' && (
            <>
              <View style={styles.pageIntro}>
                <Text style={styles.pageTitle}>Plan Your Trip</Text>
                <Text style={styles.pageSubtitle}>
                  Fill in your preferences and we'll show you hotel & transport options to choose from
                </Text>
              </View>

              {/* Destination */}
              <Card style={styles.card}>
                <SectionTitle label="Destination" />
                <Select
                  label="Destination City *"
                  value={destinationCity}
                  options={PAKISTANI_CITIES}
                  onValueChange={setDestinationCity}
                  placeholder="Select destination city"
                  style={styles.inputSpacing}
                />
                <Select
                  label="Departure City"
                  value={departureCity}
                  options={PAKISTANI_CITIES}
                  onValueChange={setDepartureCity}
                  placeholder="Select departure city (optional)"
                />
              </Card>

              {/* Fare Preview */}
              {(fareLoading || fareData) && (
                <Card style={styles.card}>
                  <View style={styles.cardTitleRow}>
                    <View style={[styles.cardTitleAccent, { backgroundColor: GOLD }]} />
                    <Text style={styles.cardTitle}>Ride Fare Preview</Text>
                    {fareLoading && <ActivityIndicator size="small" color={GREEN} style={{ marginLeft: 8 }} />}
                  </View>
                  {fareData && !fareLoading && (
                    <>
                      <View style={styles.fareRouteRow}>
                        <Ionicons name="navigate-outline" size={14} color={GREEN} />
                        <Text style={styles.fareRouteText}>{fareData.origin_city} to {fareData.destination_city}</Text>
                        <View style={styles.farePill}><Text style={styles.farePillText}>{fareData.distance_km.toFixed(0)} km</Text></View>
                      </View>
                      {previewFares.map((f, i) => (
                        <FareRow key={`${f.service}-${f.category}-${i}`} label={`${f.service} ${f.category}`} icon={f.icon} expected={f.fare_expected} available={f.is_available} />
                      ))}
                      <View style={styles.cheapestNote}>
                        <Ionicons name="star" size={13} color={GOLD} />
                        <Text style={styles.cheapestNoteText}>Best: {fareData.cheapest_service} — PKR {Math.round(fareData.cheapest_fare).toLocaleString()}</Text>
                      </View>
                    </>
                  )}
                  {fareLoading && <Text style={styles.fareLoadingText}>Calculating fares…</Text>}
                </Card>
              )}

              {/* Budget Tier */}
              <Card style={styles.card}>
                <SectionTitle label="Budget Tier" />
                <Text style={styles.cardDescription}>Select your preferred budget level</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  {(['low', 'medium', 'high'] as const).map((tier) => {
                    const labels = { low: '💰 Low', medium: '✨ Medium', high: '👑 High' };
                    const descs = { low: 'Budget-friendly', medium: 'Comfortable', high: 'Premium luxury' };
                    const selected = budgetLevel === tier;
                    return (
                      <TouchableOpacity
                        key={tier}
                        style={[
                          {
                            flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 2,
                            borderColor: selected ? GREEN : theme.colors.border,
                            backgroundColor: selected ? GREEN + '08' : '#FFF',
                            alignItems: 'center',
                          },
                        ]}
                        onPress={() => setBudgetLevel(tier)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '700', color: selected ? GREEN : theme.colors.textPrimary }}>
                          {labels[tier]}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                          {descs[tier]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>

              {/* Interests */}
              <Card style={styles.card}>
                <SectionTitle label="Interests" />
                <Text style={styles.cardDescription}>Select your travel interests (optional)</Text>
                <View style={styles.chipsContainer}>
                  {INTEREST_OPTIONS.map((interest) => (
                    <Chip key={interest} label={interest} selected={selectedInterests.includes(interest)} onPress={() => toggleInterest(interest)} />
                  ))}
                </View>
              </Card>

              {/* Travel Details */}
              <Card style={styles.card}>
                <SectionTitle label="Travel Details" />
                <Stepper label="Number of Days *" value={numDays} onValueChange={setNumDays} min={1} max={30} style={styles.inputSpacing} />
                <Stepper label="Passengers" value={numPeople} onValueChange={setNumPeople} min={1} max={20} style={styles.inputSpacing} />
                <Select
                  label="Transport Mode"
                  value={transportMode}
                  options={[
                    { label: 'Ride Sharing (Uber / Careem / InDrive)', value: 'ride_sharing' },
                    { label: 'Own Car', value: 'own_car' },
                    { label: 'Public Transport', value: 'public_transport' },
                    { label: 'Mixed', value: 'mixed' },
                  ]}
                  onValueChange={setTransportMode}
                  style={styles.inputSpacing}
                />
                <DatePicker label="Travel Date" value={travelDate} onValueChange={setTravelDate} minimumDate={new Date()} />
              </Card>

              {error && <ErrorBanner message={error} />}

              <Button
                title={optionsLoading ? 'Fetching options…' : 'Get Hotel & Transport Options →'}
                onPress={handleGetOptions}
                disabled={optionsLoading || !destinationCity.trim()}
                loading={optionsLoading}
                size="lg"
                style={styles.generateButton}
              />
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              PHASE 2 — Select hotel + transport
          ════════════════════════════════════════════════════════════ */}
          {phase === 'selecting' && budgetOptions && (
            <>
              <PhaseHeader
                phase={2}
                title="Choose Your Stay & Travel"
                subtitle={`${destinationCity} · ${numDays} day${numDays !== 1 ? 's' : ''} · ${numPeople} traveller${numPeople !== 1 ? 's' : ''}`}
                onBack={() => { setPhase('form'); setError(null); }}
              />

              {/* Hotel options */}
              <Card style={styles.card}>
                <SectionTitle label="🏨  Select a Hotel" />
                {budgetOptions.hotel_options.map((hotel, i) => (
                  <HotelCard
                    key={i}
                    hotel={hotel}
                    selected={selectedHotelIndex === i}
                    onPress={() => setSelectedHotelIndex(i)}
                  />
                ))}
              </Card>

              {/* Transport options */}
              <Card style={styles.card}>
                <SectionTitle label="🚌  Select Transport" />
                {budgetOptions.transport_options.map((opt, i) => (
                  <TransportCard
                    key={i}
                    option={opt}
                    selected={selectedTransportIndex === i}
                    onPress={() => setSelectedTransportIndex(i)}
                  />
                ))}
              </Card>

              {error && <ErrorBanner message={error} />}

              <Button
                title={estimateLoading ? 'Calculating estimate…' : 'Calculate Estimate →'}
                onPress={handleGetEstimate}
                disabled={estimateLoading || selectedHotelIndex === null || selectedTransportIndex === null}
                loading={estimateLoading}
                size="lg"
                style={styles.generateButton}
              />
            </>
          )}

          {/* ════════════════════════════════════════════════════════════
              PHASE 3 — Estimate summary + confirm
          ════════════════════════════════════════════════════════════ */}
          {phase === 'confirming' && estimate && (
            <>
              <PhaseHeader
                phase={3}
                title="Your Cost Estimate"
                subtitle="Review your selections and generate the itinerary"
                onBack={() => { setPhase('selecting'); setError(null); }}
              />

              {/* Selected hotel */}
              <Card style={styles.card}>
                <SectionTitle label="🏨  Selected Hotel" />
                <View style={sum.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={sum.itemName}>{estimate.selected_hotel.name}</Text>
                    <Text style={sum.itemDetail}>
                      {'⭐'.repeat(estimate.selected_hotel.star_rating)} · {estimate.selected_hotel.location}
                    </Text>
                    <Text style={sum.itemDetail}>
                      PKR {estimate.selected_hotel.price_per_night.toLocaleString()} / night × {numDays} nights
                    </Text>
                  </View>
                  <Text style={sum.itemTotal}>PKR {estimate.selected_hotel.total_price.toLocaleString()}</Text>
                </View>
              </Card>

              {/* Selected transport */}
              <Card style={styles.card}>
                <SectionTitle label="🚌  Selected Transport" />
                <View style={sum.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={sum.itemName}>
                      {TRANSPORT_ICONS[estimate.selected_transport.type.toLowerCase()] || '🚐'} {estimate.selected_transport.provider}
                    </Text>
                    <Text style={sum.itemDetail}>{estimate.selected_transport.type} · ⏱ {estimate.selected_transport.duration}</Text>
                    <Text style={sum.itemDetail}>
                      PKR {estimate.selected_transport.price_per_person.toLocaleString()} × {numPeople} traveller{numPeople !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={sum.itemTotal}>PKR {estimate.selected_transport.total_price.toLocaleString()}</Text>
                </View>
              </Card>

              {/* Totals */}
              <Card style={styles.card}>
                <View style={sum.totalRow}>
                  <Text style={sum.totalLabel}>Total Estimated Cost</Text>
                  <Text style={sum.totalValue}>PKR {estimate.total_estimated_cost.toLocaleString()}</Text>
                </View>

                {/* Disclaimer */}
                <View style={sum.disclaimer}>
                  <Text style={sum.disclaimerIcon}>⚠️</Text>
                  <Text style={sum.disclaimerText}>{estimate.note}</Text>
                </View>
              </Card>

              {error && <ErrorBanner message={error} />}

              <Button
                title={generating ? 'Generating your itinerary…' : 'Generate Itinerary →'}
                onPress={handleGenerate}
                disabled={generating}
                loading={generating}
                size="lg"
                style={styles.generateButton}
              />
            </>
          )}

          <View style={styles.footer} />
        </ScrollView>

        {(optionsLoading || estimateLoading || generating) && <Loader overlay />}
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// ── Small reusable sub-components ────────────────────────────────────────────
function SectionTitle({ label }: { label: string }) {
  return (
    <View style={styles.cardTitleRow}>
      <View style={styles.cardTitleAccent} />
      <Text style={styles.cardTitle}>{label}</Text>
    </View>
  );
}

function PhaseHeader({ phase, title, subtitle, onBack }: {
  phase: number; title: string; subtitle: string; onBack: () => void;
}) {
  return (
    <View style={ph.wrapper}>
      <TouchableOpacity onPress={onBack} style={ph.backBtn} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={18} color={GREEN} />
        <Text style={ph.backText}>Back</Text>
      </TouchableOpacity>
      <View style={ph.badge}><Text style={ph.badgeText}>Step {phase} of 3</Text></View>
      <Text style={ph.title}>{title}</Text>
      <Text style={ph.subtitle}>{subtitle}</Text>
    </View>
  );
}
const ph = StyleSheet.create({
  wrapper: { marginBottom: 20, marginTop: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { fontSize: 14, color: GREEN, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', backgroundColor: GREEN + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', color: GREEN },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
});

function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={[styles.card, styles.errorCard]}>
      <Text style={styles.errorText}>⚠️  {message}</Text>
    </View>
  );
}

// ── Summary sub-styles ────────────────────────────────────────────────────────
const sum = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  itemName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  itemDetail: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  itemTotal: { fontSize: 16, fontWeight: '700', color: GREEN, minWidth: 100, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '800', color: GREEN },
  remainingLabel: { fontSize: 14, color: theme.colors.textSecondary },
  remainingValue: { fontSize: 16, fontWeight: '700', color: theme.colors.success },
  remainingNegative: { color: theme.colors.error },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: theme.colors.warningLight, borderRadius: 10, padding: 12, marginTop: 16 },
  disclaimerIcon: { fontSize: 16, marginTop: 1 },
  disclaimerText: { flex: 1, fontSize: 13, color: '#7C4700', lineHeight: 19, fontWeight: '500' },
});

// ── Main styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12, paddingBottom: 40 },

  pageIntro: { marginBottom: 20, marginTop: 4 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },

  card: {
    padding: 20, marginBottom: 16, borderRadius: 16, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  cardTitleAccent: { width: 4, height: 20, borderRadius: 2, backgroundColor: GREEN },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  cardDescription: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12, marginTop: -8 },

  inputSpacing: { marginBottom: 16 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },

  // Budget input
  budgetInputLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 6 },
  budgetInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.surface, marginBottom: 16, minHeight: 50 },
  budgetCurrencyLabel: { fontSize: 14, fontWeight: '700', color: GREEN, paddingLeft: 14, paddingRight: 6 },
  budgetInput: { flex: 1, paddingVertical: 13, paddingRight: 14, fontSize: 15, color: theme.colors.textPrimary },

  // Fare preview
  fareRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  fareRouteText: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  farePill: { backgroundColor: GREEN + '15', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  farePillText: { fontSize: 11, fontWeight: '700', color: GREEN },
  cheapestNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: GOLD + '18', borderRadius: 8, padding: 8 },
  cheapestNoteText: { fontSize: 12, color: '#7A5800', fontWeight: '500', flex: 1 },
  fareLoadingText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 10 },

  errorCard: { backgroundColor: theme.colors.errorLight, borderColor: theme.colors.error, borderWidth: 1 },
  errorText: { color: theme.colors.error, fontSize: 14, lineHeight: 20 },
  generateButton: { marginTop: 4, marginBottom: 8, borderRadius: 14 },
  footer: { height: 16 },
});
