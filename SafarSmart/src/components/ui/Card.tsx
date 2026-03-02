import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../../theme';

type ShadowLevel = 'none' | 'sm' | 'md' | 'lg';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  shadow?: ShadowLevel;
};

export const Card: React.FC<Props> = ({ children, style, shadow = 'sm' }) => {
  return (
    <View
      style={[
        styles.card,
        shadow !== 'none' && (theme.shadows[shadow] as any),
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
});

export default Card;
