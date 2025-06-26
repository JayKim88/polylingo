import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Heart } from 'lucide-react-native';
import CalendarView from '../../components/CalendarView';
import FavoritesList from '../../components/FavoritesList';
import { StorageService } from '../../utils/storage';
import { FavoriteItem } from '../../types/dictionary';

export default function FavoritesTab() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteItem[]>(
    []
  );
  const [favoriteDates, setFavoriteDates] = useState<string[]>([]);

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

  const handleRemoveFavorite = async (id: string) => {
    await StorageService.removeFavorite(id);
    loadFavorites();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Heart size={32} color="#EF4444" fill="#EF4444" />
          <Text style={styles.headerTitle}>좋아요</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          저장한 번역 결과를 날짜별로 확인하세요
        </Text>
      </View>
      <View style={styles.content}>
        <ScrollView>
          <CalendarView
            markedDates={favoriteDates}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            markColor="#EF4444"
          />
          <FavoritesList
            favorites={filteredFavorites}
            selectedDate={selectedDate}
            onRemoveFavorite={handleRemoveFavorite}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 44,
  },
  content: {
    flex: 1,
  },
});
