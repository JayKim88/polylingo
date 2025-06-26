import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import {
  TranslationResult,
  SUPPORTED_LANGUAGES,
  SearchType,
} from '../types/dictionary';
import {
  Heart,
  Copy,
  Volume2,
  VolumeX,
  GripVertical,
} from 'lucide-react-native';
import { StorageService } from '../utils/storage';
import { SpeechService } from '../utils/speechService';
import * as Clipboard from 'expo-clipboard';

interface TranslationCardProps {
  result: TranslationResult;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
  searchType: SearchType;
  onLongPress?: () => void;
  isDragging?: boolean;
}

export default function TranslationCard({
  result,
  onFavoriteToggle,
  isFavorite,
  searchType,
  onLongPress,
  isDragging,
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
        searchType: result.searchType,
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
      Alert.alert('알림', '이 브라우저에서는 음성 기능을 지원하지 않습니다.');
      return;
    }

    try {
      setIsSpeaking(true);
      await SpeechService.speak(result.translatedText, result.targetLanguage);
    } catch (error) {
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
    if (confidence >= 0.8) return '높음';
    if (confidence >= 0.5) return '중간';
    return '낮음';
  };

  return (
    <TouchableOpacity
      style={[styles.card, isDragging && styles.draggingCard]}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.languageInfo}>
          <Text style={styles.flag}>{targetLanguage?.flag}</Text>
          <View style={styles.languageDetails}>
            <Text style={styles.languageName}>
              {targetLanguage?.nativeName}
            </Text>
            {result.confidence > 0 && (
              <Text
                style={[
                  styles.confidenceText,
                  { color: getConfidenceColor(result.confidence) },
                ]}
              >
                신뢰도: {getConfidenceText(result.confidence)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
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
            style={styles.actionButton}
            onPress={handleCopy}
            disabled={result.confidence === 0}
          >
            <Copy
              size={20}
              color={result.confidence === 0 ? '#D1D5DB' : '#9CA3AF'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
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
          {onLongPress && (
            <View style={styles.dragHandle}>
              <GripVertical size={20} color="#D1D5DB" />
            </View>
          )}
        </View>
      </View>

      {result.meanings && result.meanings.length > 1 ? (
        <View style={styles.meaningsContainer}>
          <Text
            style={[
              styles.translatedTextWithExample,
              result.confidence === 0 && styles.errorText,
            ]}
          >
            {result.translatedText}
          </Text>
          {result.meanings.slice(0, 5).map((meaning, index) => (
            <View key={index} style={styles.meaningItem}>
              <Text style={styles.meaningTranslation}>
                {index + 1}. {meaning.translation}
              </Text>
              <Text style={styles.meaningContext}>{meaning.type}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text
          style={[
            styles.translatedText,
            result.confidence === 0 && styles.errorText,
          ]}
        >
          {result.translatedText}
        </Text>
      )}

      {result.confidence > 0 && (
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceProgress,
              {
                width: `${result.confidence * 100}%`,
                backgroundColor: getConfidenceColor(result.confidence),
              },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  draggingCard: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageDetails: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  confidenceText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  dragHandle: {
    padding: 8,
    marginLeft: 4,
  },
  translatedText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    lineHeight: 26,
    color: '#111827',
    marginBottom: 12,
  },
  translatedTextWithExample: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 26,
    color: '#111827',
    marginBottom: 12,
    fontWeight: 500,
  },
  errorText: {
    color: '#EF4444',
    fontStyle: 'italic',
  },
  meaningsContainer: {
    marginBottom: 12,
  },
  meaningItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  meaningTranslation: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginBottom: 4,
  },
  meaningContext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  meaningExample: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  confidenceBar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    height: 4,
  },
  confidenceProgress: {
    height: '100%',
  },
});
