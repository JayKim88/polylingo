import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { TranslationResult, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { Heart, Copy, Volume2, VolumeX } from 'lucide-react-native';
import { StorageService } from '../utils/storage';
import { SpeechService } from '../utils/speechService';
import * as Clipboard from 'expo-clipboard';

interface TranslationCardProps {
  result: TranslationResult;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
}

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
    if (!isFavorite) {
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10B981';
    if (confidence >= 0.5) return '#F59E0B';
    return '#EF4444';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <View className="bg-white rounded-2xl p-5 border border-gray-100">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-row items-center flex-1">
          <Text className="text-2xl mr-3">{targetLanguage?.flag}</Text>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-700">
              {targetLanguage?.nativeName}
            </Text>
            {result.confidence > 0 && (
              <Text
                className="text-xs font-medium mt-0.5"
                style={{ color: getConfidenceColor(result.confidence) }}
              >
                Reliability: {getConfidenceText(result.confidence)}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="p-2 ml-1"
            onPress={handleFavorite}
            disabled={result.confidence === 0}
          >
            <Heart
              size={20}
              color={isFavorite ? '#EF4444' : '#9CA3AF'}
              fill={isFavorite ? '#EF4444' : 'none'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2 ml-1"
            onPress={handleCopy}
            disabled={result.confidence === 0}
          >
            <Copy
              size={20}
              color={result.confidence === 0 ? '#D1D5DB' : '#9CA3AF'}
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
                    ? '#D1D5DB'
                    : '#9CA3AF'
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
