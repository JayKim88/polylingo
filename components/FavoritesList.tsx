import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { FavoriteItem, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { Trash2, Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../contexts/ThemeContext';
import Loading from './Loading';

type FavoritesListProps = {
  favorites: FavoriteItem[];
  selectedDate: string | null;
  onRemoveFavorite: (id: string) => void;
  onScrollDirectionChange?: () => void;
  onPullDown?: () => void;
  isLoading?: boolean;
  isHeaderVisible?: boolean;
};

export default function FavoritesList({
  favorites,
  selectedDate,
  onRemoveFavorite,
  onScrollDirectionChange,
  onPullDown,
  isLoading = false,
  isHeaderVisible = true,
}: FavoritesListProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const lastScrollY = useRef(0);

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollingUp = currentScrollY < lastScrollY.current;
    const scrollDiff = Math.abs(currentScrollY - lastScrollY.current);
    lastScrollY.current = currentScrollY;

    const validScrollDiff = scrollDiff > 20;
    if (!validScrollDiff) return;

    // Show header when scrolling up anywhere in the list
    if (scrollingUp && onPullDown) {
      onPullDown();
    }
    // Hide header when scrolling down with sufficient movement
    else if (!scrollingUp && currentScrollY > 50 && onScrollDirectionChange) {
      onScrollDirectionChange();
    }
  };

  const handleRemoveFavorite = (id: string, sourceText: string) => {
    Alert.alert(
      t('favorites.deleteTitle'),
      t('favorites.deleteMessage', { item: sourceText }),
      [
        { text: t('alert.cancel'), style: 'cancel' },
        {
          text: t('favorites.delete'),
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
      <View
        key={item.id}
        className="rounded-2xl p-5 mb-3 border"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center">
            <Text className="text-xl">{sourceLanguage?.flag}</Text>
            <Text
              className="text-base mx-2"
              style={{ color: colors.textTertiary }}
            >
              →
            </Text>
            <Text className="text-xl">{targetLanguage?.flag}</Text>
          </View>
          <View className="flex-row items-center gap-x-3">
            <Text
              className="text-xs text-right"
              style={{ color: colors.textTertiary }}
            >
              {new Date(item.createdAt).toLocaleString(
                i18n.language === 'en'
                  ? 'en-US'
                  : i18n.language === 'zh'
                  ? 'zh-CN'
                  : 'ko-KR',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
            </Text>
            <TouchableOpacity
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.errorContainer }}
              onPress={() => handleRemoveFavorite(item.id, item.sourceText)}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row items-center flex-wrap">
          <Text
            className="text-lg font-semibold"
            style={{ color: colors.text }}
          >
            {item.sourceText}
          </Text>
          <Text
            className="text-base mx-2"
            style={{ color: colors.textTertiary }}
          >
            →
          </Text>
          <Text
            className="text-lg font-semibold"
            style={{ color: colors.text }}
          >
            {item.translatedText}
          </Text>
        </View>
        {item.meanings && item.meanings.length > 0 && (
          <View className="mt-4">
            {item.meanings.slice(0, 5).map((meaning, index) => (
              <View key={index} className="mb-2">
                <Text
                  className="text-base font-semibold mb-0.5"
                  style={{ color: colors.text }}
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
            ))}
          </View>
        )}
      </View>
    );
  };

  const getTitle = () => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      if (i18n.language === 'en') {
        return t('favorites.dateSubtitle', {
          month: date.getMonth() + 1,
          day: date.getDate(),
          year: date.getFullYear(),
        });
      } else {
        return t('favorites.dateSubtitle', {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
        });
      }
    }
    return t('favorites.allFavorites');
  };

  return (
    <View className="flex-1 relative">
      {isLoading && (
        <Loading
          isHeaderVisible={isHeaderVisible}
          message={t('loading.loadingFavorites')}
        />
      )}
      <View
        className="flex-row justify-between items-center mt-4 pb-4"
        style={{ backgroundColor: colors.background }}
      >
        <Text className="text-lg font-bold" style={{ color: colors.text }}>
          {getTitle()}
        </Text>
        <Text
          className="text-sm font-medium"
          style={{ color: colors.textSecondary }}
        >
          {t('favorites.count', { count: favorites.length })}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          ...(favorites.length === 0
            ? {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingVertical: 60,
              }
            : { paddingVertical: 16 }),
        }}
      >
        {favorites.length === 0 ? (
          <View
            className="items-center"
            style={{
              marginBottom: isHeaderVisible ? 120 : 0,
            }}
          >
            <Heart size={64} color={colors.borderLight} />
            <Text
              className="text-lg font-semibold mt-4 mb-2 text-center"
              style={{ color: colors.textSecondary }}
            >
              {selectedDate ? t('favorites.emptyDate') : t('favorites.empty')}
            </Text>
            <Text
              className="text-sm text-center leading-5"
              style={{ color: colors.textTertiary }}
            >
              {t('favorites.addHint')}
            </Text>
          </View>
        ) : (
          favorites.map(renderFavoriteItem)
        )}
      </ScrollView>
    </View>
  );
}
