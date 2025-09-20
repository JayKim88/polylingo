import { useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useNavigationState } from '@react-navigation/native';

let globalDirection: 'left' | 'right' | 'none' = 'none';
let globalPreviousIndex: number | null = null;
let listeners: Set<() => void> = new Set();

interface UseTabSlideAnimationOptions {
  duration?: number;
  slideDistance?: number;
  includeScale?: boolean;
  onFocus?: () => void;
}

export const useTabSlideAnimation = (
  options: UseTabSlideAnimationOptions = {}
) => {
  const {
    duration = 300,
    slideDistance = 50,
    includeScale = false,
    onFocus,
  } = options;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Track navigation state globally (only one instance will actually track)
  const currentIndex = useNavigationState((state) => state?.index ?? 0);

  useEffect(() => {
    // Update global direction if this is the first hook or index changed
    if (globalPreviousIndex !== null && globalPreviousIndex !== currentIndex) {
      if (currentIndex > globalPreviousIndex) {
        globalDirection = 'right';
      } else if (currentIndex < globalPreviousIndex) {
        globalDirection = 'left';
      }
      globalPreviousIndex = currentIndex;

      // Notify all listeners
      listeners.forEach((listener) => listener());
    } else if (globalPreviousIndex === null) {
      globalPreviousIndex = currentIndex;
    }
  }, [currentIndex]);

  useFocusEffect(
    useCallback(() => {
      onFocus?.();

      const currentDirection = globalDirection;

      let startX = 0;
      if (currentDirection === 'right') {
        startX = slideDistance;
      } else if (currentDirection === 'left') {
        startX = -slideDistance;
      }

      globalDirection = 'none';

      fadeAnim.setValue(0);
      slideAnim.setValue(startX);
      if (includeScale) {
        scaleAnim.setValue(0.95);
      }

      const animations = [
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ];

      if (includeScale) {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          })
        );
      }

      Animated.parallel(animations).start();
    }, [onFocus, duration, slideDistance, includeScale])
  );

  return {
    fadeAnim,
    slideAnim,
    scaleAnim,
    animatedStyle: {
      opacity: fadeAnim,
      transform: [
        {
          translateX: slideAnim.interpolate({
            inputRange: [-slideDistance, 0, slideDistance],
            outputRange: [-slideDistance, 0, slideDistance],
          }),
        },
        ...(includeScale ? [{ scale: scaleAnim }] : []),
      ],
    },
  };
};
