import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface OrderBannerProps {
  visible: boolean;
  orderId: string;
  onClose: () => void;
}

export default function OrderBanner({ visible, orderId, onClose }: OrderBannerProps) {
  const translateY = useSharedValue(-200);
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withSpring(50, { damping: 15 });

      const timer = setTimeout(() => {
        hide();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    translateY.value = withTiming(-200, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(setMounted)(false);
        if (onClose) runOnJS(onClose)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <BlurView intensity={80} tint="light" style={styles.blur}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="restaurant" size={24} color="#FF6B6B" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Order In Progress!</Text>
            <Text style={styles.subtitle}>Order #{orderId.slice(-6).toUpperCase()} is being prepared.</Text>
          </View>
          <Pressable onPress={hide} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#666" />
          </Pressable>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  blur: {
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
});
