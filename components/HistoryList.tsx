import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { HistoryItem, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { Trash2, Clock, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

type HistoryListProps = {
  history: HistoryItem[];
  selectedDate: string | null;
  onClearHistory: () => void;
  onRemoveHistoryItem: (id: string) => void;
};

export default function HistoryList({
  history,
  selectedDate,
  onClearHistory,
  onRemoveHistoryItem,
}: HistoryListProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const handleClearHistory = () => {
    Alert.alert(t('history.deleteTitle'), t('history.deleteAllMessage'), [
      { text: t('alert.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: onClearHistory,
      },
    ]);
  };

  const handleRemoveItem = (item: HistoryItem) => {
    Alert.alert(t('history.deleteTitle'), t('history.deleteItemMessage'), [
      { text: t('alert.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
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

    if (minutes < 1) return t('history.justNow');
    if (minutes < 60) return t('history.timeAgo', { minutes });
    if (hours < 24) return t('history.hourAgo', { hours });

    return new Date(timestamp).toLocaleString(
      i18n.language === 'en' ? 'en-US' : 'ko-KR',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  const renderHistoryItem = (item: HistoryItem) => {
    const sourceLanguage = SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === item.sourceLanguage
    );

    return (
      <View
        key={item.id}
        className="rounded-2xl p-5 mb-3 border"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center flex-1">
            <Text className="text-xl mr-3">{sourceLanguage?.flag}</Text>
            <View className="flex-1">
              <Text
                className="text-sm font-semibold mb-1"
                style={{ color: colors.textSecondary }}
              >
                {sourceLanguage?.nativeName}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-xs" style={{ color: colors.textTertiary }}>
              {formattedTime(item.searchedAt)}
            </Text>
            <TouchableOpacity
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.errorContainer }}
              onPress={() => handleRemoveItem(item)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text
          className="text-base font-semibold mb-4"
          style={{ color: colors.text }}
        >
          {item.sourceText}
        </Text>
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
                className="rounded-3xl py-0.5 px-1 mr-2 text-xs"
                style={{
                  backgroundColor: colors.primaryContainer,
                  color: colors.text,
                }}
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
      if (i18n.language === 'en') {
        return t('history.dateSubtitle', {
          month: date.getMonth() + 1,
          day: date.getDate(),
          year: date.getFullYear(),
        });
      } else {
        return t('history.dateSubtitle', {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
        });
      }
    }
    return t('history.allHistory');
  };

  return (
    <View className="flex-1">
      <View
        className="flex-row justify-between items-center px-5 py-4"
        style={{ backgroundColor: colors.background }}
      >
        <View className="flex-row items-center">
          <Text
            className="text-lg font-bold mr-2"
            style={{ color: colors.text }}
          >
            {getTitle()}
          </Text>
          <Text
            className="text-sm font-medium"
            style={{ color: colors.textSecondary }}
          >
            {t('history.count', { count: history.length })}
          </Text>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            className="flex-row items-center px-3 py-2 rounded-lg"
            style={{ backgroundColor: colors.errorContainer }}
            onPress={handleClearHistory}
          >
            <Trash2 size={18} color="#EF4444" />
            <Text
              className="text-sm font-semibold ml-1"
              style={{ color: colors.error }}
            >
              {t('history.clearAll')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          history.length === 0
            ? {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 60,
              }
            : { paddingVertical: 16 }
        }
      >
        {history.length === 0 ? (
          <View className="items-center">
            <Clock size={64} color={colors.borderLight} />
            <Text
              className="text-lg font-semibold mt-4 mb-2 text-center"
              style={{ color: colors.textSecondary }}
            >
              {selectedDate ? t('history.emptyDate') : t('history.empty')}
            </Text>
            <Text
              className="text-sm text-center leading-5"
              style={{ color: colors.textTertiary }}
            >
              {t('history.searchHint')}
            </Text>
          </View>
        ) : (
          history.map(renderHistoryItem)
        )}
      </ScrollView>
    </View>
  );
}
