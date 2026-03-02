import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: string; // 'eye' | 'eye-off' or Ionicons name
  onRightIconPress?: () => void;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  containerStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  error,
  ...textInputProps
}) => {
  const [focused, setFocused] = useState(false);

  const getRightIconName = (): keyof typeof Ionicons.glyphMap => {
    if (rightIcon === 'eye') return 'eye-outline';
    if (rightIcon === 'eye-off') return 'eye-off-outline';
    return (rightIcon as keyof typeof Ionicons.glyphMap) || 'eye-outline';
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={focused ? theme.colors.primary : theme.colors.textSecondary}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeftIcon : null, style]}
          placeholderTextColor={theme.colors.textSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...textInputProps}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconBtn} activeOpacity={0.6}>
            <Ionicons
              name={getRightIconName()}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    minHeight: 50,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FAFFFE',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  leftIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  inputWithLeftIcon: {
    paddingLeft: 10,
  },
  rightIconBtn: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 2,
  },
});

export default Input;
