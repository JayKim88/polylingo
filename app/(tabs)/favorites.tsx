import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Heart, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useTabSlideAnimation } from '../../hooks/useTabSlideAnimation';
import FavoritesList from '../../components/FavoritesList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { FavoriteItem } from '../../types/dictionary';
import { useTheme } from '../../contexts/ThemeContext';
import { hideTabBar, showTabBar } from './_layout';

export default function FavoritesTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteItem[]>(
    []
  );
  const [favoriteDates, setFavoriteDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const headerAnimValue = useRef(new Animated.Value(1)).current;

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const favs = await StorageService.getFavorites();
      setFavorites(favs);

      // Extract unique dates
      const dates = [
        ...new Set(
          favs.map((fav) => new Date(fav.createdAt).toISOString().split('T')[0])
        ),
      ];
      setFavoriteDates(dates);

      // Show all favorites initially
      setFilteredFavorites(favs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { animatedStyle } = useTabSlideAnimation({
    onFocus: loadFavorites,
  });

  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date);

    if (date) {
      const filtered = favorites.filter(
        (fav) => new Date(fav.createdAt).toISOString().split('T')[0] === date
      );
      setFilteredFavorites(filtered);
    } else {
      setFilteredFavorites(favorites);
    }
  };

  const handleDatePickerSelect = (date: string | null) => {
    handleDateSelect(date);
  };

  const handleRemoveFavorite = async (id: string) => {
    await StorageService.removeFavorite(id);
    loadFavorites();
  };

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const searchAnimValue = useRef(new Animated.Value(0)).current;

  const handleScrollDirectionChange = useCallback(() => {
    if (!isHeaderVisible) return;
    setIsHeaderVisible(false);
    hideTabBar();
    Animated.parallel([
      Animated.timing(headerAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(searchAnimValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnimValue, searchAnimValue, isHeaderVisible]);

  const handlePullDown = useCallback(() => {
    if (isHeaderVisible) return;
    setIsHeaderVisible(true);
    showTabBar();
    Animated.parallel([
      Animated.timing(headerAnimValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(searchAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnimValue, searchAnimValue, isHeaderVisible]);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {/* Modern Header */}
      <Animated.View
        className="px-6 pt-4 pb-2 rounded-b-3xl"
        style={{
          backgroundColor: colors.header,
          transform: [
            {
              translateY: headerAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-72, 0],
              }),
            },
          ],
        }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text
              className="text-sm font-medium opacity-60"
              style={{ color: colors.headerSubTitle }}
            >
              {t('message.savedTranslations')}
            </Text>
            <Text
              className="text-2xl font-bold mt-1"
              style={{ color: colors.headerTitle }}
            >
              {t('favorites.title')}
            </Text>
          </View>
          <TouchableOpacity
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.surface }}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View
        className="flex-1 px-6"
        style={{
          ...animatedStyle,
          marginBottom: -72, // Extend 72px below normal area (behind tabs)
          transform: [
            ...animatedStyle.transform,
            {
              translateY: searchAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -72], // Move up to reveal the hidden part
              }),
            },
          ],
        }}
      >
        <FavoritesList
          favorites={filteredFavorites}
          selectedDate={selectedDate}
          onRemoveFavorite={handleRemoveFavorite}
          onScrollDirectionChange={handleScrollDirectionChange}
          onPullDown={handlePullDown}
          isLoading={isLoading}
          isHeaderVisible={isHeaderVisible}
        />
      </Animated.View>

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        markedDates={favoriteDates}
        onDateSelect={handleDatePickerSelect}
        onClose={() => setShowDatePicker(false)}
      />
    </Animated.View>
  );
}
