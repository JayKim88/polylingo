import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { Heart, Copy, Volume2, VolumeX } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { TranslationResult, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { StorageService } from '../utils/storage';
import { SpeechService } from '../utils/speechService';
import { GoogleIcon } from './GoogleIcon';
import { useTheme } from '@/contexts/ThemeContext';

type TranslationCardProps = {
  result: TranslationResult;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
};

// Google Icon SVG Component
export default function TranslationCard({
  result,
  onFavoriteToggle,
  isFavorite,
}: TranslationCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { colors } = useTheme();
  const targetLanguage = SUPPORTED_LANGUAGES.find(
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
      Alert.alert('오류', '복사 중 오류가 발생했습니다.');
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
        '알림',
        `이 기기에서는 음성 기능을 지원하지 않습니다.\n\n${SpeechService.getPlatformInfo()}`
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
      Alert.alert('오류', '음성 재생 중 오류가 발생했습니다.');
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
        Alert.alert('Error', 'Unable to open Google search');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open Google search');
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10B981';
    if (confidence >= 0.5) return '#F59E0B';
    return '#EF4444';
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
          <Text className="text-2xl mr-3">{targetLanguage?.flag}</Text>
          <Text
            className="text-base font-semibold"
            style={{
              color: colors.text,
            }}
          >
            {targetLanguage?.nativeName}
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
            <Text className="text-sm text-indigo-600 italic tracking-wide">
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
