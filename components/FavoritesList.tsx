import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FavoriteItem, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { Trash2, Heart } from 'lucide-react-native';

interface FavoritesListProps {
  favorites: FavoriteItem[];
  selectedDate: string | null;
  onRemoveFavorite: (id: string) => void;
}

export default function FavoritesList({
  favorites,
  selectedDate,
  onRemoveFavorite,
}: FavoritesListProps) {
  const handleRemoveFavorite = (id: string, sourceText: string) => {
    Alert.alert(
      '즐겨찾기 삭제',
      `"${sourceText}"을(를) 즐겨찾기에서 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onRemoveFavorite(id),
        },
      ]
    );
  };

  const renderFavoriteItem = (item: FavoriteItem) => {
    const sourceLanguage = SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === item.sourceLanguage
    );
    const targetLanguage = SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === item.targetLanguage
    );

    return (
      <View key={item.id} className="bg-white rounded-2xl p-5 mb-3 shadow-sm">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center">
            <Text className="text-xl">{sourceLanguage?.flag}</Text>
            <Text className="text-base text-gray-400 mx-2">→</Text>
            <Text className="text-xl">{targetLanguage?.flag}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-400 text-right">
              {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() => handleRemoveFavorite(item.id, item.sourceText)}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-base font-semibold text-gray-700 mb-2">{item.sourceText}</Text>

        {item.meanings && item.meanings.length > 0 ? (
          <View className="mb-3">
            {item.meanings.slice(0, 3).map((meaning, index) => (
              <View key={index} className="mb-2">
                <Text className="text-base font-semibold text-gray-900 mb-0.5">
                  {index + 1}. {meaning.translation}
                </Text>
                <Text className="text-sm text-gray-500">{meaning.type}</Text>
              </View>
            ))}
            {item.meanings.length > 3 && (
              <Text className="text-sm font-medium text-indigo-600 mt-1">
                +{item.meanings.length - 3}개 더
              </Text>
            )}
          </View>
        ) : (
          <Text className="text-lg text-gray-900 leading-6">{item.translatedText}</Text>
        )}
      </View>
    );
  };

  const getTitle = () => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      return `${date.getFullYear()}년 ${
        date.getMonth() + 1
      }월 ${date.getDate()}일`;
    }
    return '전체 즐겨찾기';
  };

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center px-5 py-4 bg-slate-50">
        <Text className="text-lg font-bold text-gray-900">{getTitle()}</Text>
        <Text className="text-sm font-medium text-gray-500">{favorites.length}개</Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          ...(favorites.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }
            : { paddingVertical: 16 })
        }}
      >
        {favorites.length === 0 ? (
          <View className="items-center">
            <Heart size={64} color="#E5E7EB" />
            <Text className="text-lg font-semibold text-gray-500 mt-4 mb-2 text-center">
              {selectedDate
                ? '선택한 날짜에 저장된 즐겨찾기가 없습니다'
                : '저장된 즐겨찾기가 없습니다'}
            </Text>
            <Text className="text-sm text-gray-400 text-center leading-5">
              검색 결과에서 하트 버튼을 눌러 즐겨찾기에 추가해보세요
            </Text>
          </View>
        ) : (
          favorites.map(renderFavoriteItem)
        )}
      </ScrollView>
    </View>
  );
}

