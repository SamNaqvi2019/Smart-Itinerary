import React, { useState, useCallback } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../src/theme';
import { getSavedItineraries, deleteItinerary, SavedItinerary } from '../src/services/storage';

const GREEN = '#01411C';

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const INFO_ROWS = (request: any, response: any) => {
  const origin = request.departure_city || '';
  const dest = request.destination_city || '';
  const route = origin && dest ? `${origin} → ${dest}` : (dest || origin || '—');
  return [
    {
      icon: 'navigate-outline' as const,
      label: 'Route',
      value: route,
    },
    {
      icon: 'people-outline' as const,
      label: 'Travellers',
      value: String(request.num_of_people || 1),
    },
    {
      icon: 'time-outline' as const,
      label: 'Duration',
      value: `${response.days?.length || request.num_days || '?'} days`,
    },
    {
      icon: 'calendar-outline' as const,
      label: 'Saved',
      value: request.travel_date || '—',
    },
  ];
};

export default function SavedItinerariesScreen() {
  const navigation = useNavigation();
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadItineraries = async () => {
    try {
      const data = await getSavedItineraries();
      setItineraries(data);
    } catch (error) {
      console.error('Failed to load itineraries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadItineraries(); }, []));

  const handleRefresh = () => { setRefreshing(true); loadItineraries(); };

  const handleDelete = (id: string, destination: string) => {
    Alert.alert(
      'Delete Trip',
      `Remove the itinerary for ${destination}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try { await deleteItinerary(id); loadItineraries(); }
            catch { Alert.alert('Error', 'Failed to delete itinerary'); }
          },
        },
      ]
    );
  };

  const handleView = (itinerary: SavedItinerary) => {
    // @ts-ignore
    navigation.navigate('ItineraryDetail', { itineraryId: itinerary.id });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Green Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>My Trips</Text>
            <Text style={styles.headerCount}>
              {loading ? '…' : `${itineraries.length} saved ${itineraries.length === 1 ? 'trip' : 'trips'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            // @ts-ignore
            onPress={() => navigation.navigate('GenerateItinerary')}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerBox}>
            <Ionicons name="hourglass-outline" size={48} color={theme.colors.border} />
            <Text style={styles.loadingText}>Loading your trips…</Text>
          </View>
        ) : itineraries.length === 0 ? (
          <View style={styles.centerBox}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="airplane-outline" size={40} color={GREEN} />
            </View>
            <Text style={styles.emptyTitle}>No saved trips yet</Text>
            <Text style={styles.emptySubtext}>
              Generate your first itinerary and it will appear here
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              // @ts-ignore
              onPress={() => navigation.navigate('GenerateItinerary')}
              activeOpacity={0.85}
            >
              <Ionicons name="airplane-outline" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Plan a Trip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={GREEN}
                colors={[GREEN]}
              />
            }
          >
            {itineraries.map((itinerary) => {
              const req = itinerary.request;
              const res = itinerary.response;
              const createdDate = itinerary.createdAt ? formatDate(itinerary.createdAt) : '';
              const rows = INFO_ROWS(req, res);

              return (
                <TouchableOpacity
                  key={itinerary.id}
                  style={styles.card}
                  activeOpacity={0.92}
                  onPress={() => handleView(itinerary)}
                >
                  {/* Card top strip */}
                  <View style={styles.cardStrip}>
                    <View style={styles.cardStripLeft}>
                      <View style={styles.destinationIconBg}>
                        <Ionicons name="location" size={18} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={styles.cardDestination}>{req.destination_city}</Text>
                        {createdDate ? (
                          <Text style={styles.cardDate}>Planned on {createdDate}</Text>
                        ) : null}
                      </View>
                    </View>
                    {res.total_estimated_cost ? (
                      <View style={styles.costBadge}>
                        <Text style={styles.costText}>
                          PKR {res.total_estimated_cost?.toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Info grid */}
                  <View style={styles.infoGrid}>
                    {rows.map((row, idx) => (
                      <View
                        key={row.label}
                        style={[styles.infoCell, idx === 0 && styles.infoCellFull]}
                      >
                        <View style={styles.infoCellIcon}>
                          <Ionicons name={row.icon} size={14} color={GREEN} />
                        </View>
                        <Text style={styles.infoCellLabel}>{row.label}</Text>
                        <Text style={styles.infoCellValue} numberOfLines={1}>{row.value}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => handleView(itinerary)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.viewBtnText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(itinerary.id, req.destination_city)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GREEN,
  },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content area
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  listContent: {
    padding: 16,
    paddingTop: 20,
  },

  // Loading / Empty
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: GREEN + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GREEN,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Trip Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  cardStrip: {
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  destinationIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDestination: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  costBadge: {
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  costText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3D2E00',
  },

  // Info grid (2x2)
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 14,
    gap: 10,
  },
  infoCell: {
    width: '47%',
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  infoCellFull: {
    width: '100%',
  },
  infoCellIcon: {
    marginBottom: 2,
  },
  infoCellLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCellValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    paddingTop: 0,
  },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
  },
  viewBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
