import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { HistoryItem, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { Trash2, Clock, RefreshCw } from 'lucide-react-native';

interface HistoryListProps {
  history: HistoryItem[];
  selectedDate: string | null;
  onClearHistory: () => void;
  onRemoveHistoryItem: (id: string) => void;
}

export default function HistoryList({
  history,
  selectedDate,
  onClearHistory,
  onRemoveHistoryItem,
}: HistoryListProps) {
  const handleClearHistory = () => {
    Alert.alert('기록 삭제', '모든 검색 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: onClearHistory,
      },
    ]);
  };

  const handleRemoveItem = (item: HistoryItem) => {
    Alert.alert('기록 삭제', '이 검색 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => onRemoveHistoryItem(item.id),
      },
    ]);
  };

  const formattedTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;

    return new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderHistoryItem = (item: HistoryItem) => {
    const sourceLanguage = SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === item.sourceLanguage
    );

    return (
      <View key={item.id} className="bg-white rounded-2xl p-5 mb-3 shadow-sm">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center flex-1">
            <Text className="text-xl mr-3">{sourceLanguage?.flag}</Text>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-500 mb-1">
                {sourceLanguage?.nativeName}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <Text className="text-xs text-gray-400">{formattedTime(item.searchedAt)}</Text>
            <TouchableOpacity
              className="p-2 bg-red-50 rounded-lg"
              onPress={() => handleRemoveItem(item)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-base font-semibold text-gray-800 mb-4">{item.sourceText}</Text>
        {item.searchedData && (
          <ScrollView
            horizontal
            className="flex-row"
            contentContainerStyle={{
              alignItems: 'center',
            }}
          >
            {item.searchedData.map((v, index) => (
              <Text
                key={`${v.lng}-${v.text}-${index}`}
                className="rounded-3xl py-0.5 px-1 mr-2 bg-indigo-100 text-xs"
              >
                {v.lng.toUpperCase()} - {v.text}
              </Text>
            ))}
          </ScrollView>
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
    return '전체 히스토리';
  };

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center px-5 py-4 bg-slate-50">
        <View className="flex-row items-center">
          <Text className="text-lg font-bold text-gray-800 mr-2">{getTitle()}</Text>
          <Text className="text-sm font-medium text-gray-500">{history.length}개</Text>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            className="flex-row items-center px-3 py-2 bg-red-50 rounded-lg"
            onPress={handleClearHistory}
          >
            <Trash2 size={18} color="#EF4444" />
            <Text className="text-sm font-semibold text-red-500 ml-1">전체 삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          history.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 } : { paddingVertical: 16 }
        }
      >
        {history.length === 0 ? (
          <View className="items-center">
            <Clock size={64} color="#E5E7EB" />
            <Text className="text-lg font-semibold text-gray-500 mt-4 mb-2 text-center">
              {selectedDate
                ? '선택한 날짜에 검색 기록이 없습니다'
                : '검색 기록이 없습니다'}
            </Text>
            <Text className="text-sm text-gray-400 text-center leading-5">
              단어나 문장을 검색하면 기록이 여기에 표시됩니다
            </Text>
          </View>
        ) : (
          history.map(renderHistoryItem)
        )}
      </ScrollView>
    </View>
  );
}

