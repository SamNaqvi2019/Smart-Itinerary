import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface StepperProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  style?: any;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onValueChange,
  min = 1,
  max = 30,
  label,
  style,
}) => {
  const decrement = () => {
    if (value > min) {
      onValueChange(value - 1);
    }
  };

  const increment = () => {
    if (value < max) {
      onValueChange(value + 1);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={decrement}
          disabled={value <= min}
          style={[styles.button, value <= min && styles.buttonDisabled]}
        >
          <Text style={[styles.buttonText, value <= min && styles.buttonTextDisabled]}>−</Text>
        </TouchableOpacity>
        <View style={styles.valueContainer}>
          <Text style={styles.value}>{value}</Text>
        </View>
        <TouchableOpacity
          onPress={increment}
          disabled={value >= max}
          style={[styles.button, value >= max && styles.buttonDisabled]}
        >
          <Text style={[styles.buttonText, value >= max && styles.buttonTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  button: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  buttonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

export default Stepper;

