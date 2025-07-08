import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Heart, Calendar } from 'lucide-react-native';
import FavoritesList from '../../components/FavoritesList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { FavoriteItem } from '../../types/dictionary';
import { useTranslation } from 'react-i18next';

export default function FavoritesTab() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteItem[]>(
    []
  );
  const [favoriteDates, setFavoriteDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
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
  };

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
    <SafeAreaView
      className="flex-1 bg-slate-50"
      style={{ paddingBottom: insets.bottom - 50 }}
    >
      <View className="px-5 py-5 bg-white border-b border-gray-200 shadow-sm">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Heart size={32} color="#EF4444" fill="#EF4444" />
            <Text className="text-3xl font-bold text-gray-800 ml-3">
              {t('favorites.title')}
            </Text>
          </View>
          <TouchableOpacity
            className="p-3 bg-red-50 rounded-xl"
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <Text className="text-base font-medium text-gray-500 ml-11">
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
    </SafeAreaView>
  );
}
