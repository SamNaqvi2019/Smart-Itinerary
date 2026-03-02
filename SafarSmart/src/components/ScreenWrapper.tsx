import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Header from './Header';

interface ScreenWrapperProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showLanguageToggle?: boolean;
  onLanguageChange?: (lang: 'en' | 'ur') => void;
  language?: 'en' | 'ur';
  title?: string;
}

const AUTH_SCREENS = ['Splash', 'Login', 'Signup'];

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  showHeader = true,
  showLanguageToggle = false,
  onLanguageChange,
  language = 'en',
  title,
}) => {
  const route = useRoute();
  const navigation = useNavigation();
  const routeName = route.name;

  const isAuthScreen = AUTH_SCREENS.includes(routeName);
  const shouldShowHeader = showHeader && !isAuthScreen;
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {shouldShowHeader && (
        <Header
          title={title}
          showLogo={!canGoBack}
          onBack={canGoBack ? () => navigation.goBack() : undefined}
          language={showLanguageToggle ? language : undefined}
          onLanguageChange={showLanguageToggle ? onLanguageChange : undefined}
        />
      )}
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#01411C',  // SafeAreaView matches header color
  },
  content: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});

export default ScreenWrapper;
