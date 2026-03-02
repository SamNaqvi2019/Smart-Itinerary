import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';

interface LoaderProps {
  overlay?: boolean;
  size?: 'small' | 'large';
}

export const Loader: React.FC<LoaderProps> = ({ overlay = false, size = 'large' }) => {
  if (overlay) {
    return (
      <Modal transparent visible={true} animationType="fade">
        <View style={styles.overlay}>
          <ActivityIndicator size={size} color={theme.colors.primary} />
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Loader;

