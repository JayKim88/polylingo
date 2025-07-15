import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import { Heart, Copy, Volume2, VolumeX } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { TranslationResult, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { StorageService } from '../utils/storage';
import { SpeechService } from '../utils/speechService';
import { GoogleIcon } from './GoogleIcon';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

type TranslationState = {
  status: 'loading' | 'timeout' | 'retrying' | 'success' | 'error';
  result?: TranslationResult;
  error?: string;
  retryCount: number;
};

type TranslationCardProps = {
  result: TranslationResult | null; // null인 경우 skeleton 표시
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
  translationState?: TranslationState;
  targetLanguage?: string;
  onRetry?: (targetLang: string) => void;
  onCancel?: (targetLang: string) => void;
};

const SkeletonTranslationCard = ({
  translationState,
  targetLanguage,
  onRetry,
  onCancel,
}: {
  translationState?: TranslationState;
  targetLanguage?: string;
  onRetry?: (targetLang: string) => void;
  onCancel?: (targetLang: string) => void;
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [skeletonOpacity]);

  // translationState가 없으면 기본 로딩 스켈레톤만 표시
  const showRetryControls =
    translationState?.status === 'timeout' ||
    translationState?.status === 'error';
  const isRetrying = translationState?.status === 'retrying';
  const canRetry = translationState && translationState.retryCount < 2;
  const shouldShowLoadingAnimation =
    !translationState ||
    translationState?.status === 'loading' ||
    translationState?.status === 'retrying';

  return (
    <View
      className="rounded-2xl p-5 border"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }}
    >
      {/* Header section */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center flex-1">
          {/* Flag placeholder */}
          <Animated.View
            className="w-8 h-6 rounded mr-3"
            style={{
              backgroundColor: colors.border,
              opacity: shouldShowLoadingAnimation ? skeletonOpacity : 0.3,
            }}
          />
          {/* Language name placeholder */}
          <Animated.View
            className="h-5 w-20 rounded"
            style={{
              backgroundColor: colors.border,
              opacity: shouldShowLoadingAnimation ? skeletonOpacity : 0.3,
            }}
          />
        </View>

        {/* Action buttons placeholder */}
        <View className="flex-row items-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <Animated.View
              key={i}
              className="w-6 h-6 rounded p-2 ml-1"
              style={{
                backgroundColor: colors.border,
                opacity: shouldShowLoadingAnimation ? skeletonOpacity : 0.3,
              }}
            />
          ))}
        </View>
      </View>

      {/* Main content section */}
      <View>
        {/* Translation text placeholder */}
        <Animated.View
          className="h-8 w-full rounded mb-1"
          style={{
            backgroundColor: colors.border,
            opacity: shouldShowLoadingAnimation ? skeletonOpacity : 0.3,
          }}
        />
        {/* Pronunciation placeholder */}
        <Animated.View
          className="h-4 w-2/3 rounded mb-2"
          style={{
            backgroundColor: colors.border,
            opacity: shouldShowLoadingAnimation ? skeletonOpacity : 0.3,
          }}
        />

        {/* Status and retry controls */}
        {showRetryControls && targetLanguage && translationState && (
          <View
            className="mt-4 pt-4 border-t"
            style={{ borderTopColor: colors.borderLight }}
          >
            <Text
              className="text-sm mb-3"
              style={{ color: colors.textSecondary }}
            >
              {translationState?.status === 'timeout'
                ? t('translation.timeout') || 'Translation timed out'
                : t('translation.error') || 'Translation failed'}
              {translationState?.error && `: ${translationState.error}`}
            </Text>

            <View className="flex-row gap-2">
              {canRetry && onRetry && (
                <TouchableOpacity
                  className="flex-1 py-2 px-4 rounded-lg"
                  style={{ backgroundColor: colors.primary }}
                  onPress={() => onRetry(targetLanguage)}
                  disabled={isRetrying}
                >
                  <Text className="text-center text-white font-medium">
                    {isRetrying
                      ? t('translation.retrying') || 'Retrying...'
                      : `${t('translation.retry') || 'Retry'} (${
                          translationState.retryCount + 1
                        }/2)`}
                  </Text>
                </TouchableOpacity>
              )}

              {onCancel && (
                <TouchableOpacity
                  className="py-2 px-4 rounded-lg"
                  style={{ backgroundColor: colors.border }}
                  onPress={() => onCancel(targetLanguage)}
                >
                  <Text
                    className="text-center font-medium"
                    style={{ color: colors.text }}
                  >
                    {t('translation.cancel') || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {!canRetry && (
              <Text
                className="text-xs mt-2 text-center"
                style={{ color: colors.textTertiary }}
              >
                {t('translation.maxRetriesReached') ||
                  'Maximum retries reached'}
              </Text>
            )}
          </View>
        )}

        {isRetrying && (
          <View
            className="mt-4 pt-4 border-t"
            style={{ borderTopColor: colors.borderLight }}
          >
            <Text
              className="text-sm text-center"
              style={{ color: colors.primary }}
            >
              {t('translation.retrying') || 'Retrying translation...'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Google Icon SVG Component
export default function TranslationCard({
  result,
  onFavoriteToggle,
  isFavorite,
  translationState,
  targetLanguage,
  onRetry,
  onCancel,
}: TranslationCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Skeleton 상태인 경우
  if (!result) {
    return (
      <SkeletonTranslationCard
        translationState={translationState}
        targetLanguage={targetLanguage}
        onRetry={onRetry}
        onCancel={onCancel}
      />
    );
  }

  const targetLanguageInfo = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === result.targetLanguage
  );

  const handleFavorite = async () => {
    if (isFavorite) {
      // Remove from favorites
      await StorageService.removeFavoriteByContent(
        result.sourceText,
        result.sourceLanguage,
        result.targetLanguage
      );
    } else {
      // Add to favorites
      await StorageService.addFavorite({
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        sourceText: result.sourceText,
        translatedText: result.translatedText,
        meanings: result.meanings,
      });
    }
    onFavoriteToggle?.();
  };

  const handleCopy = async () => {
    try {
      let textToCopy = result.translatedText;

      if (result.meanings && result.meanings.length > 0) {
        textToCopy = result.meanings
          .map((meaning) => `${meaning.translation} - ${meaning.type}`)
          .join('\n');
      }

      await Clipboard.setStringAsync(textToCopy);
    } catch (error) {
      Alert.alert(t('alert.error'), t('message.copyError'));
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      SpeechService.stop();
      setIsSpeaking(false);
      return;
    }

    if (!SpeechService.isAvailable()) {
      Alert.alert(
        t('alert.info'),
        `${t(
          'message.speechNotSupported'
        )}\n\n${SpeechService.getPlatformInfo()}`
      );
      return;
    }

    try {
      setIsSpeaking(true);
      console.log(
        `🔊 Speaking: "${result.translatedText}" in ${result.targetLanguage}`
      );
      await SpeechService.speak(result.translatedText, result.targetLanguage);
    } catch (error) {
      console.log('🔊 TTS Error:', error);
      Alert.alert(t('alert.error'), t('message.speechError'));
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleGoogleSearch = async () => {
    try {
      const searchQuery = encodeURIComponent(result.translatedText);
      const googleUrl = `https://www.google.com/search?q=${searchQuery}`;

      const canOpen = await Linking.canOpenURL(googleUrl);
      if (canOpen) {
        await Linking.openURL(googleUrl);
      } else {
        Alert.alert(t('alert.error'), t('message.googleSearchError'));
      }
    } catch (error) {
      Alert.alert(t('alert.error'), t('message.googleSearchFailed'));
    }
  };

  return (
    <View
      className="rounded-2xl p-5 border"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center flex-1">
          <Text className="text-2xl mr-3">{targetLanguageInfo?.flag}</Text>
          <Text
            className="text-base font-semibold"
            style={{
              color: colors.text,
            }}
          >
            {targetLanguageInfo?.nativeName}
          </Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="p-2 ml-1"
            onPress={handleFavorite}
            disabled={result.confidence === 0}
          >
            <Heart
              size={20}
              color={isFavorite ? '#EF4444' : MIN_BUTTON_COLOR}
              fill={isFavorite ? '#EF4444' : 'none'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2 ml-1"
            onPress={handleGoogleSearch}
            disabled={result.confidence === 0}
          >
            <GoogleIcon />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2 ml-1"
            onPress={handleCopy}
            disabled={result.confidence === 0}
          >
            <Copy
              size={20}
              color={
                result.confidence === 0
                  ? CONFIDENCE_ZERO_COLOR
                  : MIN_BUTTON_COLOR
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2 ml-1"
            onPress={handleSpeak}
            disabled={result.confidence === 0 || !SpeechService.isAvailable()}
          >
            {isSpeaking ? (
              <VolumeX size={20} color="#6366F1" />
            ) : (
              <Volume2
                size={20}
                color={
                  result.confidence === 0 || !SpeechService.isAvailable()
                    ? CONFIDENCE_ZERO_COLOR
                    : MIN_BUTTON_COLOR
                }
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {result.meanings && result.meanings.length > 1 ? (
        <View>
          <View>
            <Text
              style={{
                color: colors.text,
              }}
              className={`text-2xl font-medium leading-7 mb-1 ${
                result.confidence === 0 ? 'text-red-500 italic' : ''
              }`}
            >
              {result.translatedText}
            </Text>
            {result.pronunciation && (
              <Text
                className="text-sm italic mb-2 tracking-wide"
                style={{ color: colors.primary }}
              >
                {result.pronunciation}
              </Text>
            )}
          </View>
          {result.meanings.slice(0, 5).map((meaning, index) => {
            const isLast =
              index === (result.meanings?.slice(0, 5).length ?? 0) - 1;

            return (
              <View
                key={index}
                style={{
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.borderLight,
                  marginBottom: isLast ? 0 : 12,
                  paddingBottom: isLast ? 0 : 12,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                  }}
                  className="text-lg mb-1"
                >
                  {index + 1}. {meaning.translation}
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  {meaning.type}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View>
          <Text
            style={{
              color: colors.text,
            }}
            className={`text-lg leading-7 mb-1 ${
              result.confidence === 0 ? 'text-red-500 italic' : ''
            }`}
          >
            {result.translatedText}
          </Text>
          {result.pronunciation && (
            <Text
              style={{ color: colors.primary }}
              className="text-sm italic tracking-wide"
            >
              {result.pronunciation}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export const MIN_BUTTON_COLOR = '#9CA3AF';
const CONFIDENCE_ZERO_COLOR = '#D1D5DB';
