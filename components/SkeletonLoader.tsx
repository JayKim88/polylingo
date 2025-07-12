import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export default function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-200)).current;
  const { colors } = useTheme();

  useEffect(() => {
    const shimmer = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const slide = () => {
      Animated.loop(
        Animated.timing(translateX, {
          toValue: 200,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    };

    shimmer();
    slide();
  }, [shimmerAnimation, translateX]);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.borderLight,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Base shimmer */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.border,
          opacity,
        }}
      />
      
      {/* Moving shine effect */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          opacity: 0.6,
          transform: [{ translateX }],
          width: 100,
        }}
      />
    </View>
  );
}

// Skeleton Card Component for Translation Results
export function SkeletonTranslationCard() {
  const { colors } = useTheme();
  
  return (
    <View 
      className="rounded-2xl p-5 mb-3 shadow-sm border"
      style={{ 
        backgroundColor: colors.surface,
        borderColor: colors.border 
      }}
    >
      {/* Header with language and flag */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <SkeletonLoader width={24} height={24} borderRadius={12} />
          <SkeletonLoader width={80} height={16} style={{ marginLeft: 8 }} />
        </View>
        <SkeletonLoader width={24} height={24} borderRadius={12} />
      </View>

      {/* Main translation text */}
      <View className="mb-4">
        <SkeletonLoader width="90%" height={24} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="75%" height={20} />
      </View>

      {/* Pronunciation */}
      <View className="mb-4">
        <SkeletonLoader width={120} height={16} />
      </View>

      {/* Meanings */}
      <View className="mb-4">
        <SkeletonLoader width={60} height={14} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="95%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonLoader width="85%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonLoader width="70%" height={16} />
      </View>

      {/* Action buttons */}
      <View className="flex-row justify-between items-center">
        <SkeletonLoader width={60} height={32} borderRadius={16} />
        <View className="flex-row gap-2">
          <SkeletonLoader width={32} height={32} borderRadius={16} />
          <SkeletonLoader width={32} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}

// Multiple Skeleton Cards
export function SkeletonTranslationList({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonTranslationCard key={index} />
      ))}
    </View>
  );
}