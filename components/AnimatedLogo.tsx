import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function AnimatedLogo() {
  const { colors } = useTheme();

  // Animation values for each language character
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const charactersOpacity = useRef(new Animated.Value(0)).current;
  const centerLogoScale = useRef(new Animated.Value(0)).current;

  // Language characters with their positions
  const languageCharacters = [
    { char: 'A', angle: 0, lang: 'English' },
    { char: '한', angle: 45, lang: 'Korean' },
    { char: '中', angle: 90, lang: 'Chinese' },
    { char: 'あ', angle: 135, lang: 'Japanese' },
    { char: 'А', angle: 180, lang: 'Russian' },
    { char: 'ع', angle: 225, lang: 'Arabic' },
    { char: 'ß', angle: 270, lang: 'German' },
    { char: 'ñ', angle: 315, lang: 'Spanish' },
  ];

  const logoSize = Math.min(width * 0.6, 240);
  const radius = logoSize / 3;
  const centerX = logoSize / 2;
  const centerY = logoSize / 2;

  useEffect(() => {
    // Delay to ensure all values are properly initialized
    const initDelay = setTimeout(() => {
      // Animation sequence
      const animationSequence = Animated.sequence([
        // Phase 1: Show center logo
        Animated.spring(centerLogoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),

        // Phase 2: Show surrounding characters
        Animated.timing(charactersOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]);

      // Start rotation animation (continuous)
      const rotationAnimation = Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      );

      // Start pulse animation (continuous)
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      // Start all animations
      animationSequence.start();
      rotationAnimation.start();
      pulseAnimation.start();

      // Cleanup function
      return () => {
        rotationAnimation.stop();
        pulseAnimation.stop();
      };
    }, 100); // Small delay to ensure proper initialization

    return () => {
      clearTimeout(initDelay);
    };
  }, []);

  // Calculate character positions
  const getCharacterPosition = (angle: number) => {
    const radian = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(radian);
    const y = centerY + radius * Math.sin(radian);
    return { x, y };
  };

  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterSpin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <View
      style={{
        width: logoSize,
        height: logoSize,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Center logo with pulse animation */}
      <Animated.View
        style={{
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: colors.border,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ scale: centerLogoScale }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {/* Pulse effect background */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.primary,
            opacity: pulseAnim.interpolate({
              inputRange: [0.8, 1],
              outputRange: [0.1, 1],
            }),
            transform: [{ scale: pulseAnim }],
          }}
        />

        {/* Center emoji */}
        <Text style={{ fontSize: 32 }}>🌍</Text>
      </Animated.View>

      {/* Rotating language characters */}
      <Animated.View
        style={{
          position: 'absolute',
          width: logoSize,
          height: logoSize,
          transform: [{ rotate: spin }],
          opacity: charactersOpacity,
        }}
      >
        {languageCharacters.map((item, index) => {
          const position = getCharacterPosition(item.angle);
          return (
            <Animated.View
              key={index}
              style={{
                position: 'absolute',
                left: position.x - 15,
                top: position.y - 15,
                width: 30,
                height: 30,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Animated.Text
                style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: colors.text,
                  transform: [{ rotate: counterSpin }],
                }}
              >
                {item.char}
              </Animated.Text>
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* Connecting lines effect (simplified) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: logoSize,
          height: logoSize,
          opacity: charactersOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.2],
          }),
        }}
      >
        {languageCharacters.map((item, index) => {
          const position = getCharacterPosition(item.angle);
          return (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: 1,
                height:
                  Math.sqrt(
                    Math.pow(centerX - position.x, 2) +
                      Math.pow(centerY - position.y, 2)
                  ) - 45,
                backgroundColor: colors.border,
                opacity: 0.3,
                transform: [
                  {
                    rotate: `${
                      Math.atan2(centerY - position.y, centerX - position.x) +
                      Math.PI / 2
                    }rad`,
                  },
                ],
              }}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}
