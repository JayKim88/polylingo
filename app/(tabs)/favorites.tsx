import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Heart, Calendar } from 'lucide-react-native';
import CalendarView from '../../components/CalendarView';
import FavoritesList from '../../components/FavoritesList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { FavoriteItem } from '../../types/dictionary';

export default function FavoritesTab() {
  const insets = useSafeAreaInsets();
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
            <Text className="text-3xl font-bold text-gray-800 ml-3">좋아요</Text>
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
            ? `${new Date(selectedDate).getFullYear()}년 ${
                new Date(selectedDate).getMonth() + 1
              }월 ${new Date(selectedDate).getDate()}일`
            : '저장한 번역 결과를 날짜별로 확인하세요'}
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

