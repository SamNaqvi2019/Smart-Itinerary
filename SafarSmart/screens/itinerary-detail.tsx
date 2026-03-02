import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../src/theme';
import { getItineraryById, SavedItinerary, saveFeedback } from '../src/services/storage';
import { calculateFare, FareResponse, ServiceFare } from '../src/services/fareApi';
import { calculateBudget, BudgetResponse } from '../src/services/budgetApi';
import RawJSONViewer from '../src/components/RawJSONViewer';
import WeatherCard from '../src/components/WeatherCard';
import TravelOptions from '../src/components/TravelOptions';
import ItineraryMapView from '../src/components/ItineraryMapView';
import { INTERCITY_OPTIONS, INTRACITY_OPTIONS } from '../src/data/transportOptions';
import FloatingChatBot from '../src/components/FloatingChatBot';
import { translateToUrdu } from '../src/utils/translation';

const GREEN = '#01411C';

// ── Date helper ──────────────────────────────────────────────
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return dateString; }
};

// ── Itinerary Overview Text Parser ───────────────────────────
type Block =
  | { type: 'header'; content: string }
  | { type: 'meta'; key: string; value: string }
  | { type: 'note'; content: string }
  | { type: 'day'; content: string }
  | { type: 'timeOfDay'; label: string }
  | { type: 'bullet'; content: string; level: number }
  | { type: 'spacer' }
  | { type: 'text'; content: string };

function parseOverviewText(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip dividers
    if (/^[=\-]{4,}$/.test(trimmed)) continue;

    // Empty → spacer
    if (!trimmed) { blocks.push({ type: 'spacer' }); continue; }

    // Main header
    if (trimmed.match(/^Detailed .* Itinerary for/i)) {
      blocks.push({ type: 'header', content: trimmed }); continue;
    }

    // Day header
    if (/^Day \d+/i.test(trimmed)) {
      blocks.push({ type: 'day', content: trimmed }); continue;
    }

    // Meta lines with colon separator
    const metaMatch = trimmed.match(/^(Interests|Budget level|Departure city|Travel dates|Transport):(.+)/i);
    if (metaMatch) {
      blocks.push({ type: 'meta', key: metaMatch[1].trim(), value: metaMatch[2].trim() }); continue;
    }

    // Note
    if (trimmed.startsWith('Note:')) {
      blocks.push({ type: 'note', content: trimmed.replace(/^Note:\s*/i, '') }); continue;
    }

    // Time-of-day labels
    if (/^(Morning|Evening|Afternoon|Night|Tips?|Tip):?$/i.test(trimmed)) {
      blocks.push({ type: 'timeOfDay', label: trimmed.replace(':', '') }); continue;
    }

    // Bullet points
    const bulletMatch = line.match(/^(\s*)•\s+(.*)/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length;
      blocks.push({ type: 'bullet', content: bulletMatch[2].trim(), level: indent <= 4 ? 1 : 2 });
      continue;
    }

    // Plain text
    if (trimmed) blocks.push({ type: 'text', content: trimmed });
  }

  // Deduplicate consecutive spacers
  return blocks.filter((b, i) => !(b.type === 'spacer' && blocks[i - 1]?.type === 'spacer'));
}

const TIME_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Morning: 'sunny-outline',
  Afternoon: 'partly-sunny-outline',
  Evening: 'moon-outline',
  Night: 'moon-outline',
  Tip: 'bulb-outline',
  Tips: 'bulb-outline',
};

function ItineraryOverviewCard({ text }: { text: string }) {
  const blocks = parseOverviewText(text);

  return (
    <View style={ov.card}>
      {/* Card title */}
      <View style={ov.titleRow}>
        <View style={ov.titleAccent} />
        <Text style={ov.titleText}>Itinerary Overview</Text>
      </View>

      {blocks.map((block, i) => {
        switch (block.type) {
          case 'header':
            return (
              <View key={i} style={ov.headerBlock}>
                <Ionicons name="map-outline" size={16} color={GREEN} />
                <Text style={ov.headerText}>{block.content}</Text>
              </View>
            );

          case 'meta':
            return (
              <View key={i} style={ov.metaRow}>
                <Text style={ov.metaKey}>{block.key}</Text>
                <Text style={ov.metaValue}>{block.value}</Text>
              </View>
            );

          case 'note':
            return (
              <View key={i} style={ov.noteBlock}>
                <Ionicons name="information-circle-outline" size={15} color={theme.colors.warning} />
                <Text style={ov.noteText}>{block.content}</Text>
              </View>
            );

          case 'day':
            return (
              <View key={i} style={ov.dayBlock}>
                <Text style={ov.dayText}>{block.content}</Text>
              </View>
            );

          case 'timeOfDay': {
            const icon = TIME_ICONS[block.label] || 'time-outline';
            return (
              <View key={i} style={ov.timeRow}>
                <Ionicons name={icon} size={14} color={GREEN} />
                <Text style={ov.timeText}>{block.label}</Text>
              </View>
            );
          }

          case 'bullet':
            return (
              <View key={i} style={[ov.bulletRow, block.level === 2 && ov.subBulletRow]}>
                <View style={[ov.bulletDot, block.level === 2 && ov.subBulletDot]} />
                <Text style={[ov.bulletText, block.level === 2 && ov.subBulletText]}>
                  {block.content}
                </Text>
              </View>
            );

          case 'spacer':
            return <View key={i} style={{ height: 10 }} />;

          case 'text':
            return <Text key={i} style={ov.plainText}>{block.content}</Text>;

          default:
            return null;
        }
      })}
    </View>
  );
}

// ── Overview card styles ──────────────────────────────────────
const ov = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  titleAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: GREEN,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },

  // Header line
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: GREEN + '0D',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: GREEN,
    lineHeight: 20,
  },

  // Meta rows
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  metaKey: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    minWidth: 110,
    textTransform: 'capitalize',
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },

  // Note
  noteBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.warningLight,
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#7C4700',
    lineHeight: 18,
  },

  // Day header
  dayBlock: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 10,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Time of day
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Bullets
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 8,
    marginBottom: 5,
    gap: 8,
  },
  subBulletRow: {
    marginLeft: 24,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN,
    marginTop: 6,
    flexShrink: 0,
  },
  subBulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textSecondary,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  subBulletText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  // Plain text
  plainText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 4,
  },
});

// ── Main Screen ───────────────────────────────────────────────
export default function ItineraryDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  // @ts-ignore
  const { itineraryId } = route.params;

  const [itinerary, setItinerary] = useState<SavedItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJSON, setShowJSON] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isUrdu, setIsUrdu] = useState(false);
  const [translatedData, setTranslatedData] = useState<any>(null);

  // Feedback
  const [fbRating, setFbRating] = useState(0);
  const [fbComment, setFbComment] = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSubmitted, setFbSubmitted] = useState(false);

  // Fare data
  const [fareData, setFareData]       = useState<FareResponse | null>(null);
  const [fareLoading, setFareLoading] = useState(false);

  // Budget data
  const [budgetData, setBudgetData]       = useState<BudgetResponse | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

  useEffect(() => { loadItinerary(); }, [itineraryId]);

  // Fetch fares when itinerary with departure city is loaded
  useEffect(() => {
    if (!itinerary) return;
    const dep = itinerary.request.departure_city;
    const dst = itinerary.request.destination_city;
    if (dep && dst && dep !== dst) {
      setFareLoading(true);
      calculateFare({
        origin_city: dep,
        destination_city: dst,
        num_people: itinerary.request.num_of_people || 1,
        is_peak: false,
      })
        .then(setFareData)
        .catch(() => setFareData(null))
        .finally(() => setFareLoading(false));
    }
  }, [itinerary]);

  // Fetch budget when itinerary loads
  useEffect(() => {
    if (!itinerary) return;
    const dest = itinerary.request.destination_city;
    if (!dest) return;
    const rawLevel = (itinerary.request.budget_level || 'medium').toLowerCase();
    const level: 'low' | 'medium' | 'high' =
      rawLevel.includes('low') ? 'low' : rawLevel.includes('high') ? 'high' : 'medium';
    setBudgetLoading(true);
    calculateBudget({
      destination_city: dest,
      origin_city: itinerary.request.departure_city || undefined,
      budget_level: level,
      num_days: itinerary.response.days?.length || 3,
      num_people: itinerary.request.num_of_people || 1,
      travel_date: itinerary.request.travel_date || undefined,
    })
      .then(setBudgetData)
      .catch(() => setBudgetData(null))
      .finally(() => setBudgetLoading(false));
  }, [itinerary]);

  useEffect(() => {
    if (itinerary && isUrdu) translateItinerary();
    else setTranslatedData(null);
  }, [itinerary, isUrdu]);

  const translateItinerary = async () => {
    if (!itinerary) return;
    try {
      const response = itinerary.response;
      const translated = {
        ...response,
        days: await Promise.all(
          (response.days || []).map(async (day: any) => ({
            ...day,
            places: await Promise.all((day.places || []).map((place: any) => translateToUrdu(place))),
            description: await translateToUrdu(day.description || ''),
          }))
        ),
        pretty_itinerary_text: response.pretty_itinerary_text
          ? await translateToUrdu(response.pretty_itinerary_text)
          : undefined,
      };
      setTranslatedData(translated);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedData(null);
    }
  };

  const loadItinerary = async () => {
    try {
      if (itineraryId) {
        const data = await getItineraryById(itineraryId);
        setItinerary(data);
        if (data?.feedback) {
          setFbRating(data.feedback.rating);
          setFbComment(data.feedback.comment);
          setFbSubmitted(true);
        }
      }
    } catch (error) {
      console.error('Failed to load itinerary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!fbRating) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.');
      return;
    }
    setFbSubmitting(true);
    try {
      await saveFeedback(itineraryId, fbRating, fbComment.trim());
      setFbSubmitted(true);
    } catch {
      Alert.alert('Error', 'Could not save feedback. Please try again.');
    } finally {
      setFbSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centerBox}>
          <Ionicons name="hourglass-outline" size={48} color={theme.colors.border} />
          <Text style={styles.loadingText}>Loading itinerary…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!itinerary) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.notFoundText}>Itinerary not found</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const request = itinerary.request;
  const response = isUrdu && translatedData ? translatedData : itinerary.response;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Green Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, isUrdu && styles.headerBtnActive]}
              onPress={() => setIsUrdu(!isUrdu)}
              activeOpacity={0.75}
            >
              <Ionicons name="language-outline" size={14} color={isUrdu ? GREEN : 'rgba(255,255,255,0.9)'} />
              <Text style={[styles.headerBtnText, isUrdu && styles.headerBtnTextActive]}>
                {isUrdu ? 'اردو' : 'Urdu'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, showMap && styles.headerBtnActive]}
              onPress={() => setShowMap(!showMap)}
              activeOpacity={0.75}
            >
              <Ionicons name="map-outline" size={14} color={showMap ? GREEN : 'rgba(255,255,255,0.9)'} />
              <Text style={[styles.headerBtnText, showMap && styles.headerBtnTextActive]}>Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setShowJSON(!showJSON)}
              activeOpacity={0.75}
            >
              <Ionicons name={showJSON ? 'eye-off-outline' : 'code-outline'} size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.headerBtnText}>{showJSON ? 'Hide' : 'JSON'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.headerDestination}>{request.destination_city}</Text>
        <View style={styles.headerMetaRow}>
          <View style={styles.headerPill}>
            <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerPillText}>{response.days?.length ?? 0} days</Text>
          </View>
          {response.num_spots_considered && (
            <View style={styles.headerPill}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.headerPillText}>{response.num_spots_considered} spots</Text>
            </View>
          )}
          {response.total_estimated_cost && (
            <View style={[styles.headerPill, styles.headerPillGold]}>
              <Text style={styles.headerPillGoldText}>
                PKR {response.total_estimated_cost?.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Raw JSON */}
        {showJSON && <View style={{ marginBottom: 16 }}><RawJSONViewer data={itinerary} /></View>}

        {/* Full Trip Map */}
        {showMap && (() => {
          const allSpots = (response.days || []).flatMap((d: any) => d.spot_locations || []);
          return allSpots.length > 0 ? (
            <SectionCard title="🗺️ Trip Map">
              <ItineraryMapView spots={allSpots} height={300} />
              <Text style={styles.mapHint}>
                {allSpots.length} locations plotted · connected by visit order
              </Text>
            </SectionCard>
          ) : (
            <SectionCard title="🗺️ Trip Map">
              <Text style={styles.mapHint}>No coordinate data available for this itinerary.</Text>
            </SectionCard>
          );
        })()}

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="wallet-outline" size={20} color={GREEN} />
            <Text style={styles.summaryLabel}>Total Cost</Text>
            <Text style={styles.summaryValue}>
              {response.total_estimated_cost?.toLocaleString() ?? '—'}{' '}
              <Text style={styles.summaryCurrency}>{response.currency}</Text>
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar-outline" size={20} color={GREEN} />
            <Text style={styles.summaryLabel}>Travel Window</Text>
            <Text style={styles.summaryValue} numberOfLines={2}>
              {response.travel_window || request.travel_date || 'Not specified'}
            </Text>
          </View>
        </View>

        {/* Budget Breakdown */}
        {response.budget_breakdown && (
          <SectionCard title="💰 Budget Breakdown">
            <View style={styles.budgetGrid}>
              {Object.entries(response.budget_breakdown).map(([cat, amount]) => (
                <View key={cat} style={styles.budgetCell}>
                  <Text style={styles.budgetCat}>{cat}</Text>
                  <Text style={styles.budgetAmt}>
                    {typeof amount === 'number' ? amount.toLocaleString() : String(amount)}{' '}
                    <Text style={styles.budgetCur}>{response.currency}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Hotels */}
        {response.recommended_hotels && response.recommended_hotels.length > 0 && (
          <SectionCard title="🏨 Recommended Hotels">
            {response.recommended_hotels.map((hotel: any, i: number) => (
              <View key={i} style={styles.hotelRow}>
                <View style={styles.hotelIconBg}>
                  <Ionicons name="bed-outline" size={14} color={GREEN} />
                </View>
                <Text style={styles.hotelText}>{hotel}</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Weather */}
        {response.weather_considerations && (
          <WeatherCard weatherText={response.weather_considerations} />
        )}

        {/* Itinerary Overview — parsed rich text */}
        {response.pretty_itinerary_text && (
          <ItineraryOverviewCard text={response.pretty_itinerary_text} />
        )}

        {/* Day-by-Day Timeline */}
        <SectionCard title="🗓️ Day-by-Day Plan">
          {response.days.map((day: any, index: number) => (
            <View key={index} style={[styles.dayContainer, index < response.days.length - 1 && styles.dayBorder]}>
              {/* Day header */}
              <View style={styles.dayHeader}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{day.day}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayLabel}>Day {day.day}</Text>
                  {day.date && <Text style={styles.dayDate}>{formatDate(day.date)}</Text>}
                </View>
              </View>

              {/* Places chips */}
              {day.places && day.places.length > 0 && (
                <View style={styles.chipsWrap}>
                  {day.places.map((place: any, pi: number) => (
                    <View key={pi} style={styles.placeChip}>
                      <Ionicons name="location-outline" size={11} color="#fff" />
                      <Text style={styles.placeChipText}>{place}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Description */}
              {day.description && (
                <Text style={styles.dayDesc}>{day.description}</Text>
              )}

              {/* Images */}
              {day.images && day.images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagesRow}
                >
                  {day.images.slice(0, 6).map((img: any, ii: number) => (
                    <Image
                      key={ii}
                      source={{ uri: img }}
                      style={styles.dayImage}
                      onError={() => {}}
                    />
                  ))}
                </ScrollView>
              )}

              {/* Per-day mini map */}
              {showMap && day.spot_locations && day.spot_locations.length > 0 && (
                <View style={styles.dayMapWrap}>
                  <ItineraryMapView
                    spots={day.spot_locations}
                    dayLabel={`Day ${day.day}`}
                    height={200}
                  />
                </View>
              )}
            </View>
          ))}
        </SectionCard>

        {/* Travel Options */}
        <View style={{ marginBottom: 16 }}>
          <TravelOptions intercityOptions={INTERCITY_OPTIONS} intracityOptions={INTRACITY_OPTIONS} />
        </View>

        {/* Transport Costs */}
        {response.transport_costs && (
          <SectionCard title="🚗 Transport Details">
            <View style={styles.transportRow}>
              <Text style={styles.transportLabel}>Total Cost</Text>
              <Text style={styles.transportValue}>
                {response.transport_costs.total_cost?.toLocaleString()} {response.currency}
              </Text>
            </View>
            {response.transport_costs.total_distance && (
              <View style={styles.transportRow}>
                <Text style={styles.transportLabel}>Total Distance</Text>
                <Text style={styles.transportValue}>
                  {response.transport_costs.total_distance} km
                </Text>
              </View>
            )}
            {response.transport_costs.detailed_rides?.length > 0 && (
              <View style={styles.ridesBlock}>
                <Text style={styles.ridesTitle}>Ride Details</Text>
                {response.transport_costs.detailed_rides.map((ride: any, i: number) => (
                  <View key={i} style={styles.rideCard}>
                    <View style={styles.rideRoute}>
                      <Ionicons name="navigate-outline" size={14} color={GREEN} />
                      <Text style={styles.rideRouteText}>
                        {ride.origin} → {ride.destination}
                      </Text>
                    </View>
                    <Text style={styles.rideDetails}>
                      {ride.distance_km} km  •  {ride.estimated_time}  •  PKR {ride.cost_breakdown?.expected?.toLocaleString()}
                    </Text>
                    {ride.google_maps_link && (
                      <TouchableOpacity
                        style={styles.mapsBtn}
                        onPress={() => Linking.openURL(ride.google_maps_link)}
                      >
                        <Ionicons name="map-outline" size={13} color={GREEN} />
                        <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        )}

        {/* ── Ride Fare Comparison ── */}
        {(fareLoading || fareData) && (
          <SectionCard title="🚗 Ride Fare Comparison">
            {fareLoading && (
              <ActivityIndicator size="small" color={GREEN} style={{ marginVertical: 12 }} />
            )}
            {fareData && !fareLoading && (
              <>
                <View style={styles.fareRouteRow}>
                  <Ionicons name="navigate-outline" size={13} color={GREEN} />
                  <Text style={styles.fareRouteText}>
                    {fareData.origin_city} → {fareData.destination_city}
                  </Text>
                  <View style={styles.farePill}>
                    <Text style={styles.farePillText}>{fareData.distance_km.toFixed(0)} km</Text>
                  </View>
                </View>

                <View style={styles.fareGrid}>
                  {fareData.fares.map((f: ServiceFare, i: number) => (
                    <View
                      key={`${f.service}-${f.category}-${i}`}
                      style={[
                        styles.fareCard,
                        !f.is_available && styles.fareCardUnavail,
                        f.is_available && `${f.service} ${f.category}` === fareData.cheapest_service && styles.fareCardBest,
                      ]}
                    >
                      <Text style={styles.fareCardIcon}>{f.icon}</Text>
                      <Text style={styles.fareCardService}>{f.service}</Text>
                      <Text style={styles.fareCardCategory}>{f.category}</Text>
                      {f.is_available ? (
                        <Text style={styles.fareCardPrice}>
                          PKR {Math.round(f.fare_expected).toLocaleString()}
                        </Text>
                      ) : (
                        <Text style={styles.fareCardNA}>N/A</Text>
                      )}
                      {f.is_available && `${f.service} ${f.category}` === fareData.cheapest_service && (
                        <Text style={styles.fareCardBestLabel}>Best</Text>
                      )}
                    </View>
                  ))}
                </View>

                <View style={styles.fareCheapestStrip}>
                  <Ionicons name="star" size={14} color="#D4AF37" />
                  <Text style={styles.fareCheapestText}>
                    Cheapest: {fareData.cheapest_service} — PKR {Math.round(fareData.cheapest_fare).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.fareDisclaimer}>
                  Fares are estimates based on distance. Actual fares may vary.
                </Text>
              </>
            )}
          </SectionCard>
        )}

        {/* ── Comprehensive Budget Planner ── */}
        {(budgetLoading || budgetData) && (
          <SectionCard title="💰 Budget Planner">
            {budgetLoading && (
              <ActivityIndicator size="small" color={GREEN} style={{ marginVertical: 12 }} />
            )}
            {budgetData && !budgetLoading && (() => {
              const b = budgetData;
              return (
                <>
                  {/* Header row */}
                  <View style={styles.bpHeader}>
                    <View style={styles.bpLevelBadge}>
                      <Text style={styles.bpLevelText}>
                        {b.budget_level.charAt(0).toUpperCase() + b.budget_level.slice(1)} Budget
                      </Text>
                    </View>
                    {b.is_peak_season && (
                      <View style={styles.bpPeakBadge}>
                        <Ionicons name="flame-outline" size={11} color="#C62828" />
                        <Text style={styles.bpPeakText}>Peak Season</Text>
                      </View>
                    )}
                    <Text style={styles.bpDays}>{b.num_days}d · {b.num_people} pax</Text>
                  </View>

                  {/* Note if intercity transport included */}
                  {b.totals.transport > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Ionicons name="information-circle-outline" size={13} color={theme.colors.textSecondary} />
                      <Text style={{ fontSize: 11, color: theme.colors.textSecondary, flex: 1 }}>
                        Includes intercity travel cost. Itinerary total above covers local expenses only.
                      </Text>
                    </View>
                  )}

                  {/* Grand total strip */}
                  <View style={styles.bpTotalStrip}>
                    <View>
                      <Text style={styles.bpTotalLabel}>Total Budget</Text>
                      <Text style={styles.bpTotalAmount}>
                        PKR {b.totals.grand_total.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.bpPerPersonBox}>
                      <Text style={styles.bpPerPersonLabel}>Per Person</Text>
                      <Text style={styles.bpPerPersonAmount}>
                        PKR {b.totals.per_person.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Cost breakdown grid */}
                  <Text style={styles.bpSectionLabel}>Cost Breakdown</Text>
                  <View style={styles.bpBreakGrid}>
                    {[
                      { icon: 'bed-outline', label: 'Hotel', val: b.totals.accommodation },
                      { icon: 'car-outline', label: 'Transport', val: b.totals.transport },
                      { icon: 'restaurant-outline', label: 'Food', val: b.totals.food },
                      { icon: 'ticket-outline', label: 'Activities', val: b.totals.activities },
                    ].map((item) => (
                      <View key={item.label} style={styles.bpBreakCell}>
                        <View style={styles.bpBreakIcon}>
                          <Ionicons name={item.icon as any} size={16} color={GREEN} />
                        </View>
                        <Text style={styles.bpBreakLabel}>{item.label}</Text>
                        <Text style={styles.bpBreakVal}>
                          PKR {item.val.toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Contingency row */}
                  <View style={styles.bpContingencyRow}>
                    <Ionicons name="shield-outline" size={13} color={GREEN} />
                    <Text style={styles.bpContingencyText}>
                      10% contingency buffer: PKR {b.totals.contingency.toLocaleString()}
                    </Text>
                  </View>

                  {/* Recommended hotel */}
                  <Text style={styles.bpSectionLabel}>Recommended Hotel</Text>
                  <View style={styles.bpHotelCard}>
                    <View style={styles.bpHotelTop}>
                      <Ionicons name="star" size={14} color="#D4AF37" />
                      <Text style={styles.bpHotelName} numberOfLines={1}>{b.recommended_hotel.name}</Text>
                      {b.recommended_hotel.is_peak_priced && (
                        <View style={styles.bpPeakBadge}>
                          <Text style={styles.bpPeakText}>Peak</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.bpHotelStats}>
                      <View style={styles.bpHotelStat}>
                        <Text style={styles.bpHotelStatLabel}>Per Night</Text>
                        <Text style={styles.bpHotelStatVal}>
                          PKR {b.recommended_hotel.price_per_night.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.bpHotelStat}>
                        <Text style={styles.bpHotelStatLabel}>{b.num_days} Nights</Text>
                        <Text style={styles.bpHotelStatVal}>
                          PKR {b.recommended_hotel.price_total.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.bpHotelStat}>
                        <Text style={styles.bpHotelStatLabel}>Per Person</Text>
                        <Text style={styles.bpHotelStatVal}>
                          PKR {b.recommended_hotel.price_per_person.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Other hotel options */}
                  {b.hotels.length > 1 && (
                    <>
                      <Text style={styles.bpSectionLabel}>All Hotel Options</Text>
                      {b.hotels.map((h, i) => (
                        <View key={i} style={styles.bpHotelRow}>
                          <View style={styles.bpHotelTierDot} />
                          <Text style={styles.bpHotelRowName} numberOfLines={1}>{h.name}</Text>
                          <Text style={styles.bpHotelRowPrice}>PKR {h.price_per_night.toLocaleString()}/night</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Food breakdown */}
                  <Text style={styles.bpSectionLabel}>Daily Food ({b.food.label})</Text>
                  <View style={styles.bpFoodGrid}>
                    {[
                      { label: 'Breakfast', val: b.food.breakfast },
                      { label: 'Lunch', val: b.food.lunch },
                      { label: 'Dinner', val: b.food.dinner },
                      { label: 'Snacks', val: b.food.snacks },
                    ].map((item) => (
                      <View key={item.label} style={styles.bpFoodCell}>
                        <Text style={styles.bpFoodLabel}>{item.label}</Text>
                        <Text style={styles.bpFoodVal}>PKR {item.val.toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.bpFoodTotal}>
                    <Text style={styles.bpFoodTotalLabel}>PKR {b.food.daily_per_person.toLocaleString()} / person / day</Text>
                    <Text style={styles.bpFoodTotalAll}>Total Food: PKR {b.food.total.toLocaleString()}</Text>
                  </View>

                  {/* Savings tips */}
                  {b.savings_tips.length > 0 && (
                    <>
                      <Text style={styles.bpSectionLabel}>💡 Money-Saving Tips</Text>
                      {b.savings_tips.map((tip, i) => (
                        <View key={i} style={styles.bpTipRow}>
                          <View style={styles.bpTipDot} />
                          <Text style={styles.bpTipText}>{tip}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </SectionCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Floating ChatBot */}
      <FloatingChatBot
        itineraryData={{
          ...itinerary.response,
          destination_city: request.destination_city,
          departure_city: request.departure_city,
        }}
      />
    </SafeAreaView>
  );
}

// ── Reusable Section Card ─────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sc.card}>
      <View style={sc.titleRow}>
        <View style={sc.accent} />
        <Text style={sc.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  accent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: GREEN,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
});

// ── Main styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GREEN,
  },

  // Center states
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.error,
  },
  goBackBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  goBackText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerBtnActive: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  headerBtnText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  headerBtnTextActive: {
    color: GREEN,
  },
  headerDestination: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  headerMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  headerPillText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  headerPillGold: {
    backgroundColor: theme.colors.gold,
  },
  headerPillGoldText: {
    fontSize: 12,
    color: '#3D2E00',
    fontWeight: '700',
  },

  // Content area
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  contentInner: {
    padding: 16,
    paddingTop: 20,
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    ...theme.shadows.sm,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  summaryCurrency: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },

  // Budget
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  budgetCell: {
    width: '47%',
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 12,
  },
  budgetCat: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 4,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  budgetAmt: {
    fontSize: 15,
    fontWeight: '700',
    color: GREEN,
  },
  budgetCur: {
    fontSize: 11,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },

  // Hotels
  hotelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  hotelIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: GREEN + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  hotelText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },

  // Day-by-Day
  dayContainer: {
    paddingBottom: 20,
    marginBottom: 16,
  },
  dayBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dayBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  dayDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    marginLeft: 50,
  },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: GREEN,
    borderRadius: 20,
  },
  placeChipText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  dayDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginLeft: 50,
    marginBottom: 10,
  },
  imagesRow: {
    marginLeft: 50,
    marginTop: 6,
  },
  dayImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: theme.colors.background,
  },

  // Transport
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  transportLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  transportValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  ridesBlock: {
    marginTop: 16,
  },
  ridesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  rideCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  rideRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rideRouteText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  rideDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 20,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 20,
    marginTop: 4,
  },
  mapsBtnText: {
    fontSize: 12,
    color: GREEN,
    fontWeight: '600',
  },

  // Fare section
  fareRouteRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  fareRouteText:   { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  farePill:        { backgroundColor: GREEN + '15', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  farePillText:    { fontSize: 11, fontWeight: '700', color: GREEN },
  fareGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  fareCard:        {
    width: '47%', backgroundColor: theme.colors.background,
    borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.border,
  },
  fareCardBest:    { borderColor: '#D4AF37', backgroundColor: '#D4AF3710' },
  fareCardUnavail: { opacity: 0.45 },
  fareCardIcon:    { fontSize: 22, marginBottom: 4 },
  fareCardService: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  fareCardCategory:{ fontSize: 11, color: theme.colors.textSecondary, marginBottom: 6 },
  fareCardPrice:   { fontSize: 14, fontWeight: '800', color: GREEN },
  fareCardNA:      { fontSize: 12, color: '#999', fontStyle: 'italic' },
  fareCardBestLabel:{ fontSize: 10, fontWeight: '700', color: '#D4AF37', marginTop: 4 },
  fareCheapestStrip:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D4AF3718', borderRadius: 10, padding: 10, marginBottom: 8 },
  fareCheapestText: { fontSize: 13, color: '#7A5800', fontWeight: '600', flex: 1 },
  fareDisclaimer:   { fontSize: 11, color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center' },

  // Budget Planner
  bpHeader:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bpLevelBadge:    { backgroundColor: GREEN + '18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  bpLevelText:     { fontSize: 12, fontWeight: '700', color: GREEN },
  bpPeakBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBEE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  bpPeakText:      { fontSize: 11, fontWeight: '600', color: '#C62828' },
  bpDays:          { marginLeft: 'auto' as any, fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },
  bpTotalStrip:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: GREEN, borderRadius: 14, padding: 16, marginBottom: 16 },
  bpTotalLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 3 },
  bpTotalAmount:   { fontSize: 22, fontWeight: '800', color: '#fff' },
  bpPerPersonBox:  { alignItems: 'flex-end' },
  bpPerPersonLabel:{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 3 },
  bpPerPersonAmount:{ fontSize: 16, fontWeight: '700', color: '#D4AF37' },
  bpSectionLabel:  { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  bpBreakGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  bpBreakCell:     { width: '47%', backgroundColor: theme.colors.background, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  bpBreakIcon:     { width: 36, height: 36, borderRadius: 10, backgroundColor: GREEN + '12', alignItems: 'center', justifyContent: 'center' },
  bpBreakLabel:    { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' },
  bpBreakVal:      { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  bpContingencyRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GREEN + '0D', borderRadius: 10, padding: 10, marginBottom: 4 },
  bpContingencyText:{ fontSize: 12, color: GREEN, fontWeight: '500', flex: 1 },
  bpHotelCard:     { backgroundColor: '#D4AF3710', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#D4AF3744', marginBottom: 4 },
  bpHotelTop:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  bpHotelName:     { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  bpHotelStats:    { flexDirection: 'row', gap: 8 },
  bpHotelStat:     { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  bpHotelStatLabel:{ fontSize: 10, color: theme.colors.textSecondary, marginBottom: 3 },
  bpHotelStatVal:  { fontSize: 13, fontWeight: '700', color: GREEN },
  bpHotelRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  bpHotelTierDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN + '60' },
  bpHotelRowName:  { flex: 1, fontSize: 13, color: theme.colors.textPrimary },
  bpHotelRowPrice: { fontSize: 12, fontWeight: '600', color: GREEN },
  bpFoodGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bpFoodCell:      { flex: 1, minWidth: '45%', backgroundColor: theme.colors.background, borderRadius: 10, padding: 10 },
  bpFoodLabel:     { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 2 },
  bpFoodVal:       { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  bpFoodTotal:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 },
  bpFoodTotalLabel:{ fontSize: 12, color: GREEN, fontWeight: '600' },
  bpFoodTotalAll:  { fontSize: 12, color: theme.colors.textSecondary },
  bpTipRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  bpTipDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4AF37', marginTop: 6, flexShrink: 0 },
  bpTipText:       { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },

  // Map
  mapHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  dayMapWrap: {
    marginLeft: 50,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
});
