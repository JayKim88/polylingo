import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function TranslationProcessAnimation() {
  const { colors } = useTheme();
  
  // Animation values
  const sourceOpacity = useRef(new Animated.Value(0)).current;
  const arrowOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  
  // State for typing effect
  const [currentTranslationIndex, setCurrentTranslationIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Translation data
  const sourceText = 'Hello';
  const translations = [
    { text: '안녕하세요', lang: 'Korean' },
    { text: '你好', lang: 'Chinese' },
    { text: 'こんにちは', lang: 'Japanese' },
    { text: 'Bonjour', lang: 'French' },
    { text: 'Hola', lang: 'Spanish' },
    { text: 'Привет', lang: 'Russian' },
    { text: 'مرحبا', lang: 'Arabic' },
    { text: 'Guten Tag', lang: 'German' },
  ];

  // Animated values for each translation
  const translationAnimations = useRef(
    translations.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  // Typing effect hook
  useEffect(() => {
    if (!isTyping) return;

    const currentTranslation = translations[currentTranslationIndex];
    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex <= currentTranslation.text.length) {
        setDisplayedText(currentTranslation.text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        
        // Show this translation for a moment, then move to next
        setTimeout(() => {
          setCurrentTranslationIndex((prev) => (prev + 1) % translations.length);
          setDisplayedText('');
        }, 800);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, [currentTranslationIndex, isTyping]);

  // Main animation sequence
  useEffect(() => {
    const animationSequence = Animated.sequence([
      // Phase 1: Show source text
      Animated.timing(sourceOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      
      // Phase 2: Show arrow and logo
      Animated.parallel([
        Animated.timing(arrowOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]);

    // Start the animation sequence
    animationSequence.start(() => {
      // Start typing effect after main animations
      setIsTyping(true);
    });

    // Animate each translation item
    translations.forEach((_, index) => {
      const delay = index * 200; // Stagger the animations
      
      Animated.parallel([
        Animated.timing(translationAnimations[index].opacity, {
          toValue: 0.8,
          duration: 500,
          delay: delay + 1000,
          useNativeDriver: true,
        }),
        Animated.timing(translationAnimations[index].translateY, {
          toValue: 0,
          duration: 500,
          delay: delay + 1000,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <View style={{ width: width * 0.9, alignItems: 'center' }}>
      {/* Source Text */}
      <Animated.View
        style={{
          opacity: sourceOpacity,
          marginBottom: 20,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: colors.primary,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              textAlign: 'center',
            }}
          >
            {sourceText}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            English
          </Text>
        </View>
      </Animated.View>

      {/* Arrow */}
      <Animated.View
        style={{
          opacity: arrowOpacity,
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 24, color: colors.textSecondary }}>↓</Text>
      </Animated.View>

      {/* Central Logo */}
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          marginBottom: 20,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 32 }}>🌍</Text>
        </View>
      </Animated.View>

      {/* Main Translation Display (Typing Effect) */}
      <View
        style={{
          height: 80,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: colors.border,
            minWidth: 150,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              textAlign: 'center',
              minHeight: 24,
            }}
          >
            {displayedText}
            {isTyping && displayedText.length < translations[currentTranslationIndex]?.text.length && (
              <Text style={{ opacity: 0.5 }}>|</Text>
            )}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            {translations[currentTranslationIndex]?.lang}
          </Text>
        </View>
      </View>

      {/* Background Translation Items */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          marginTop: 20,
        }}
      >
        {translations.map((translation, index) => (
          <Animated.View
            key={index}
            style={{
              opacity: translationAnimations[index].opacity,
              transform: [{ translateY: translationAnimations[index].translateY }],
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                margin: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.text,
                  textAlign: 'center',
                }}
              >
                {translation.text}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {translation.lang}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}