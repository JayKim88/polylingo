import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { TranslationResult } from '../types/dictionary';
import TranslationCard from './TranslationCard';

interface TranslationListProps {
  results: TranslationResult[];
  favorites: string[];
  onFavoriteToggle: () => void;
}

export default function TranslationList({
  results,
  favorites,
  onFavoriteToggle,
}: TranslationListProps) {
  const isFavorite = (result: TranslationResult) => {
    const id = `${result.sourceText}-${result.sourceLanguage}-${result.targetLanguage}`;
    return favorites.includes(id);
  };

  if (results.length === 0) {
    return (
      <View className="flex-1 justify-center items-center py-16">
        <Text className="text-base text-gray-400 text-center">
          검색어를 입력해주세요
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row justify-start items-center mb-4 px-1">
        <Text className="text-base font-semibold text-gray-700">
          {results.length}개 언어로 번역됨
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {results.map((result) => (
          <View
            key={`${result.targetLanguage}-${result.timestamp}`}
            className="mb-3"
          >
            <TranslationCard
              result={result}
              isFavorite={isFavorite(result)}
              onFavoriteToggle={onFavoriteToggle}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
