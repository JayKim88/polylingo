import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Heart, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useTabSlideAnimation } from '../../hooks/useTabSlideAnimation';
import FavoritesList from '../../components/FavoritesList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { FavoriteItem } from '../../types/dictionary';
import { useTheme } from '../../contexts/ThemeContext';

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

  const loadFavorites = useCallback(async () => {
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

  return (
    <Animated.View 
      style={{
        ...animatedStyle,
        backgroundColor: colors.background
      }}
    >
      <View 
        className="px-5 py-5 border-b shadow-sm"
        style={{
          backgroundColor: colors.surface,
          borderBottomColor: colors.border
        }}
      >
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Heart size={32} color="#EF4444" fill="#EF4444" />
            <Text 
              className="text-3xl font-bold ml-3"
              style={{ color: colors.text }}
            >
              {t('favorites.title')}
            </Text>
          </View>
          <TouchableOpacity
            className="p-3 rounded-xl"
            style={{ backgroundColor: colors.errorContainer }}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <Text 
          className="text-base font-medium ml-11"
          style={{ color: colors.textSecondary }}
        >
          {selectedDate
            ? t('favorites.dateSubtitle', {
                year: new Date(selectedDate).getFullYear(),
                month: new Date(selectedDate).getMonth() + 1,
                day: new Date(selectedDate).getDate(),
              })
            : t('favorites.subtitle')}
        </Text>
      </View>
      <View className="flex-1">
        <FavoritesList
          favorites={filteredFavorites}
          selectedDate={selectedDate}
          onRemoveFavorite={handleRemoveFavorite}
        />
      </View>
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
