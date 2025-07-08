import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { TranslationResult, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { Heart, Copy, Volume2, VolumeX } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { StorageService } from '../utils/storage';
import { SpeechService } from '../utils/speechService';
import * as Clipboard from 'expo-clipboard';

interface TranslationCardProps {
  result: TranslationResult;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
}

// Google Icon SVG Component
const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 512 512">
    <Path
      d="M32.582 370.734C15.127 336.291 5.12 297.425 5.12 256c0-41.426 10.007-80.291 27.462-114.735C74.705 57.484 161.047 0 261.12 0c69.12 0 126.836 25.367 171.287 66.793l-73.31 73.309c-26.763-25.135-60.276-38.168-97.977-38.168-66.56 0-123.113 44.917-143.36 105.426-5.12 15.36-8.146 31.65-8.146 48.64 0 16.989 3.026 33.28 8.146 48.64l-.303.232h.303c20.247 60.51 76.8 105.426 143.36 105.426 34.443 0 63.534-9.31 86.341-24.67 27.23-18.152 45.382-45.148 51.433-77.032H261.12v-99.142h241.105c3.025 16.757 4.654 34.211 4.654 52.364 0 77.963-27.927 143.592-76.334 188.276-42.356 39.098-100.305 61.905-169.425 61.905-100.073 0-186.415-57.483-228.538-141.032v-.233z"
      fill={MIN_BUTTON_COLOR}
    />
  </Svg>
);

export default function TranslationCard({
  result,
  onFavoriteToggle,
  isFavorite,
}: TranslationCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
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
    <View className="bg-white rounded-2xl p-5 border border-gray-100">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-row items-center flex-1">
          <Text className="text-2xl mr-3">{targetLanguage?.flag}</Text>
          <Text className="text-base font-semibold text-gray-700">
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
        <View className="mb-3">
          <View className="mb-3">
            <Text
              className={`text-2xl font-medium leading-7 text-gray-900 mb-1 ${
                result.confidence === 0 ? 'text-red-500 italic' : ''
              }`}
            >
              {result.translatedText}
            </Text>
            {result.pronunciation && (
              <Text className="text-sm text-indigo-600 italic mb-2 tracking-wide">
                {result.pronunciation}
              </Text>
            )}
          </View>
          {result.meanings.slice(0, 5).map((meaning, index) => (
            <View key={index} className="mb-3 pb-3 border-b border-gray-100">
              <Text className="text-lg text-gray-900 mb-1">
                {index + 1}. {meaning.translation}
              </Text>
              <Text className="text-sm text-gray-500 mb-1">{meaning.type}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="mb-3">
          <Text
            className={`text-lg leading-7 text-gray-900 mb-1 ${
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

      {result.confidence > 0 && (
        <View className="bg-gray-200 rounded-sm overflow-hidden h-1">
          <View
            className="h-full"
            style={{
              width: `${result.confidence * 100}%`,
              backgroundColor: getConfidenceColor(result.confidence),
            }}
          />
        </View>
      )}
    </View>
  );
}

const MIN_BUTTON_COLOR = '#9CA3AF';
const CONFIDENCE_ZERO_COLOR = '#D1D5DB';
