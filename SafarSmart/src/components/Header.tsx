import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  style?: any;
  language?: 'en' | 'ur';
  onLanguageChange?: (lang: 'en' | 'ur') => void;
  onBack?: () => void;   // show back arrow when provided
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showLogo = true,
  style,
  language,
  onLanguageChange,
  onBack,
}) => {
  return (
    <View style={[styles.header, style]}>
      {/* Back button */}
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ) : showLogo ? (
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      ) : null}

      <Text style={styles.title} numberOfLines={1}>
        {title || 'SafarSmart'}
      </Text>

      {onLanguageChange && (
        <TouchableOpacity
          onPress={() => onLanguageChange(language === 'ur' ? 'en' : 'ur')}
          style={[styles.langBtn, language === 'ur' && styles.langBtnActive]}
          activeOpacity={0.75}
        >
          <Ionicons
            name="language-outline"
            size={14}
            color={language === 'ur' ? '#01411C' : 'rgba(255,255,255,0.9)'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.langText, language === 'ur' && styles.langTextActive]}>
            {language === 'ur' ? 'اردو' : 'EN'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#01411C',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: 0.2,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  langBtnActive: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  langText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  langTextActive: {
    color: '#01411C',
  },
});

export default Header;
