import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const LEAVES = ['🍃', '🍂', '🌿', '🍃', '🍂'];
const NUM_LEAVES = 18;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function useFallingLeaf(index: number) {
  const fallAnim = useRef(new Animated.Value(0)).current;
  const driftAnim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const duration = 8000 + (index % 5) * 2000;
    const delay = (index * 400) % 6000;
    const drift = ((index % 7) - 3) * 25;

    const fall = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(fallAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(driftAnim, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ]),
      { resetBeforeIteration: true }
    );

    fall.start();
    return () => fall.stop();
  }, [index, fallAnim, driftAnim]);

  const translateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, SCREEN_HEIGHT + 40],
  });

  const translateX = driftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  const rotate = fallAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', '12deg', '-8deg', '10deg', '0deg'],
  });

  return { translateY, translateX, rotate, opacity };
}

function SingleLeaf({ index }: { index: number }) {
  const { translateY, translateX, rotate, opacity } = useFallingLeaf(index);
  const left = (index * 37) % (SCREEN_WIDTH - 32);
  const leaf = LEAVES[index % LEAVES.length];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.leaf,
        {
          left,
          transform: [{ translateY }, { translateX }, { rotate }],
          opacity,
        },
      ]}
    >
      <Animated.Text style={styles.leafEmoji}>{leaf}</Animated.Text>
    </Animated.View>
  );
}

export function FallingLeaves() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: NUM_LEAVES }, (_, i) => (
        <SingleLeaf key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafEmoji: {
    fontSize: 22,
  },
});

export default FallingLeaves;
