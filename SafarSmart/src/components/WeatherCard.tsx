import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Card } from './ui/Card';

interface WeatherCardProps {
  weatherText: string;
}

interface ParsedWeather {
  location: string;
  current: {
    temperature: string;
    condition: string;
    humidity: string;
    wind: string;
    precipitation: string;
  };
  forecast: Array<{
    date: string;
    condition: string;
    tempRange: string;
    rain?: string;
  }>;
  warnings: string[];
}

const parseWeatherText = (text: string): ParsedWeather | null => {
  try {
    const result: ParsedWeather = {
      location: '',
      current: {
        temperature: '',
        condition: '',
        humidity: '',
        wind: '',
        precipitation: '',
      },
      forecast: [],
      warnings: [],
    };

    // Extract location
    const locationMatch = text.match(/Weather for ([^:]+):/);
    if (locationMatch) {
      result.location = locationMatch[1].trim();
    }

    // Extract current conditions
    const currentMatch = text.match(/\*Current Conditions:\*\s*([^|]+)\|/);
    if (currentMatch) {
      const currentStr = currentMatch[1].trim();
      const tempMatch = currentStr.match(/(-?\d+\.?\d*)°C/);
      if (tempMatch) {
        result.current.temperature = `${tempMatch[1]}°C`;
      }
      const conditionMatch = currentStr.match(/°C,\s*([^|]+)/);
      if (conditionMatch) {
        result.current.condition = conditionMatch[1].trim();
      }
    }

    // Extract humidity
    const humidityMatch = text.match(/(\d+)% humidity/);
    if (humidityMatch) {
      result.current.humidity = `${humidityMatch[1]}%`;
    }

    // Extract wind
    const windMatch = text.match(/Wind:\s*([^|]+)/);
    if (windMatch) {
      result.current.wind = windMatch[1].trim();
    }

    // Extract precipitation
    const precipMatch = text.match(/Precipitation:\s*([^|]+)/);
    if (precipMatch) {
      result.current.precipitation = precipMatch[1].trim();
    }

    // Extract forecast
    const forecastMatch = text.match(/\*Forecast:\*\s*(.+?)(?:\s*\*Warnings:|$)/s);
    if (forecastMatch) {
      const forecastStr = forecastMatch[1];
      const forecastItems = forecastStr.split('|').map(item => item.trim()).filter(Boolean);
      
      forecastItems.forEach(item => {
        const dateMatch = item.match(/(Dec \d+):\s*(.+?),\s*([^,]+)/);
        if (dateMatch) {
          result.forecast.push({
            date: dateMatch[1],
            condition: dateMatch[2].trim(),
            tempRange: dateMatch[3].trim(),
            rain: item.match(/(\d+\.?\d*)mm rain/)?.[1] ? `${item.match(/(\d+\.?\d*)mm rain/)?.[1]}mm` : undefined,
          });
        }
      });
    }

    // Extract warnings
    const warningsMatch = text.match(/\*Warnings:\*\s*(.+?)$/s);
    if (warningsMatch) {
      const warningsStr = warningsMatch[1];
      // Split by periods and filter meaningful warnings
      const warningSentences = warningsStr
        .split(/\.\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 10);
      
      result.warnings = warningSentences;
    }

    return result;
  } catch (error) {
    console.error('Error parsing weather text:', error);
    return null;
  }
};

const getWeatherIcon = (condition: string): string => {
  const lower = condition.toLowerCase();
  if (lower.includes('snow')) return '❄️';
  if (lower.includes('rain')) return '🌧️';
  if (lower.includes('cloud') || lower.includes('overcast')) return '☁️';
  if (lower.includes('sun') || lower.includes('clear')) return '☀️';
  if (lower.includes('wind')) return '💨';
  return '🌤️';
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ weatherText }) => {
  const parsed = parseWeatherText(weatherText);

  if (!parsed) {
    // Fallback: display raw text if parsing fails
    return (
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>🌤️ Weather Information</Text>
        <Text style={styles.fallbackText}>{weatherText}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.locationText}>{parsed.location}</Text>
        <Text style={styles.headerSubtext}>Current Weather</Text>
      </View>

      {/* Current Stats Row */}
      <View style={styles.currentStats}>
        <View style={styles.temperatureContainer}>
          <Text style={styles.temperature}>{parsed.current.temperature}</Text>
          <Text style={styles.conditionIcon}>
            {getWeatherIcon(parsed.current.condition)}
          </Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Humidity</Text>
            <Text style={styles.statValue}>{parsed.current.humidity}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Wind</Text>
            <Text style={styles.statValue}>{parsed.current.wind}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Precipitation</Text>
            <Text style={styles.statValue}>{parsed.current.precipitation}</Text>
          </View>
        </View>
      </View>

      {/* Forecast List */}
      {parsed.forecast.length > 0 && (
        <View style={styles.forecastContainer}>
          <Text style={styles.forecastTitle}>Forecast</Text>
          <View style={styles.forecastList}>
            {parsed.forecast.map((item, index) => (
              <View key={index} style={styles.forecastItem}>
                <View style={styles.forecastDateContainer}>
                  <Text style={styles.forecastDate}>{item.date}</Text>
                  <Text style={styles.forecastIcon}>
                    {getWeatherIcon(item.condition)}
                  </Text>
                </View>
                <View style={styles.forecastDetails}>
                  <Text style={styles.forecastCondition}>{item.condition}</Text>
                  <Text style={styles.forecastTemp}>{item.tempRange}</Text>
                  {item.rain && (
                    <Text style={styles.forecastRain}>💧 {item.rain}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Warnings Section */}
      {parsed.warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          <Text style={styles.warningsTitle}>⚠️ Important Warnings</Text>
          {parsed.warnings.map((warning, index) => (
            <View key={index} style={styles.warningItem}>
              <Text style={styles.warningBullet}>•</Text>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  fallbackText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  locationText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  currentStats: {
    marginBottom: 20,
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  temperature: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: 12,
  },
  conditionIcon: {
    fontSize: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  forecastContainer: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  forecastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  forecastList: {
    gap: 12,
  },
  forecastItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    alignItems: 'center',
  },
  forecastDateContainer: {
    width: 80,
    alignItems: 'center',
    marginRight: 12,
  },
  forecastDate: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  forecastIcon: {
    fontSize: 24,
  },
  forecastDetails: {
    flex: 1,
  },
  forecastCondition: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  forecastTemp: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  forecastRain: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  warningsContainer: {
    padding: 16,
    backgroundColor: '#FFF3E0', // Light orange background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  warningsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.warning,
    marginBottom: 12,
  },
  warningItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  warningBullet: {
    fontSize: 16,
    color: theme.colors.warning,
    marginRight: 8,
    marginTop: 2,
    fontWeight: '700',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037', // Dark brown for readability on orange
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default WeatherCard;

