import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../contexts/ThemeContext';
import AnimatedLogo from './AnimatedLogo';
import SplashErrorBoundary from './SplashErrorBoundary';
import { VersionService } from '../utils/version';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export default function SplashScreen({
  onAnimationComplete,
}: SplashScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const subtitleFadeAnim = useRef(new Animated.Value(0)).current;
  const accentPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animationSequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),

      Animated.timing(subtitleFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(accentPulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(accentPulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    setTimeout(() => {
      pulseAnimation.start();
    }, 800);

    // Complete splash after 3 seconds
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 4000);

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
    };
  }, [
    fadeAnim,
    scaleAnim,
    titleFadeAnim,
    subtitleFadeAnim,
    accentPulseAnim,
    onAnimationComplete,
  ]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 50,
      }}
    >
      {/* Animated Logo with Language Characters */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          marginBottom: 40,
        }}
      >
        <SplashErrorBoundary>
          <AnimatedLogo />
        </SplashErrorBoundary>
      </Animated.View>

      {/* App Title */}
      <Animated.View
        style={{
          opacity: titleFadeAnim,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.text,
            textAlign: 'center',
            letterSpacing: 0.5,
          }}
        >
          PolyLingo
        </Text>

        {/* Accent line under title */}
        <Animated.View
          style={{
            width: 60,
            height: 3,
            backgroundColor: '#206C43',
            marginTop: 8,
            borderRadius: 2,
            opacity: titleFadeAnim,
          }}
        />
      </Animated.View>

      {/* Subtitle */}
      <Animated.View
        style={{
          opacity: subtitleFadeAnim,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            letterSpacing: 0.3,
            lineHeight: 24,
          }}
        >
          {t('main.subtitle', { count: 5 })}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textTertiary,
            textAlign: 'center',
            marginTop: 8,
            fontStyle: 'italic',
          }}
        >
          AI-powered multilingual translator
        </Text>
      </Animated.View>

      {/* Version info */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 50,
          opacity: subtitleFadeAnim,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: colors.textTertiary,
            textAlign: 'center',
          }}
        >
          {VersionService.getFormattedVersion()}
        </Text>
      </Animated.View>
    </View>
  );
}
