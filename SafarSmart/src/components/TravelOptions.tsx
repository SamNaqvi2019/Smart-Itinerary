import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { theme } from '../theme';
import { Card } from './ui/Card';

interface TransportOption {
  type: string;
  name: string;
  website?: string;
  app_link?: string;
  availability: string;
  notes: string;
}

interface TravelOptionsProps {
  intercityOptions: TransportOption[];
  intracityOptions: TransportOption[];
}

const getTransportIcon = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'bus':
      return '🚌';
    case 'train':
      return '🚂';
    case 'flight':
      return '✈️';
    case 'ride_hailing':
      return '🚗';
    case 'bike':
      return '🏍️';
    default:
      return '🚦';
  }
};

const TransportCard: React.FC<{ option: TransportOption; isIntercity: boolean }> = ({
  option,
  isIntercity,
}) => {
  const handlePress = async () => {
    const url = option.website || option.app_link;
    if (url) {
      // Remove markdown link formatting if present
      const cleanUrl = url.replace(/\[([^\]]+)\]\(([^)]+)\)/, '$2');
      try {
        const canOpen = await Linking.canOpenURL(cleanUrl);
        if (canOpen) {
          await Linking.openURL(cleanUrl);
        } else {
          console.warn('Cannot open URL:', cleanUrl);
        }
      } catch (error) {
        console.error('Error opening URL:', error);
      }
    }
  };

  return (
    <Card style={styles.transportCard}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={styles.cardContent}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getTransportIcon(option.type)}</Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.transportName}>{option.name}</Text>
            <Text style={styles.transportType}>
              {option.type.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Availability:</Text>
            <Text style={styles.infoValue}>{option.availability}</Text>
          </View>
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{option.notes}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            onPress={handlePress}
            style={styles.bookButton}
            activeOpacity={0.8}
          >
            <Text style={styles.bookButtonText}>
              {isIntercity ? 'Book Now' : 'Download App'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Card>
  );
};

export const TravelOptions: React.FC<TravelOptionsProps> = ({
  intercityOptions,
  intracityOptions,
}) => {
  return (
    <View style={styles.container}>
      {/* Getting There Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🚌</Text>
          <Text style={styles.sectionTitle}>Getting There (Intercity)</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Options for traveling between cities
        </Text>
        <View style={styles.optionsList}>
          {intercityOptions.map((option, index) => (
            <TransportCard key={index} option={option} isIntercity={true} />
          ))}
        </View>
      </View>

      {/* Getting Around Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🚗</Text>
          <Text style={styles.sectionTitle}>Getting Around (Intracity)</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Options for traveling within the city
        </Text>
        <View style={styles.optionsList}>
          {intracityOptions.map((option, index) => (
            <TransportCard key={index} option={option} isIntercity={false} />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  optionsList: {
    gap: 12,
  },
  transportCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardContent: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 28,
  },
  nameContainer: {
    flex: 1,
  },
  transportName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  transportType: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    width: 100,
  },
  infoValue: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  notesContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  cardFooter: {
    marginTop: 8,
  },
  bookButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TravelOptions;

