import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { useTabSlideAnimation } from '../../hooks/useTabSlideAnimation';
import FavoritesList from '../../components/FavoritesList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { FavoriteItem } from '../../types/dictionary';
import { useTheme } from '../../contexts/ThemeContext';
import { ANIMATION_DURATION, hideTabBar, showTabBar } from './_layout';
import { SubscriptionService } from '@/utils/subscriptionService';
import { unitIds } from '@/constants/bannerAds';
import { getDateString } from '@/utils/userService';

/**
 * 3s
 */
export const NEW_AD_TERM = 30000;

export default function FavoritesTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { animatedStyle } = useTabSlideAnimation();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteItem[]>(
    []
  );
  const [favoriteDates, setFavoriteDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [adKey, setAdKey] = useState(0);
  const [lastAdRefresh, setLastAdRefresh] = useState(0);
  const [showAd, setShowAd] = useState(false);

  const contentAnimValue = useRef(new Animated.Value(0)).current;
  const headerAnimValue = useRef(new Animated.Value(1)).current;

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);

    try {
      const favs = await StorageService.getFavorites();
      setFavorites(favs);

      // Extract unique dates
      const dates = [
        ...new Set(favs.map((fav) => getDateString(new Date(fav.createdAt)))),
      ];
      // Use it for marking in calendar
      setFavoriteDates(dates);

      // Show all favorites initially (respect current date filter)
      if (selectedDate) {
        const filtered = favs.filter(
          (fav) => getDateString(new Date(fav.createdAt)) === selectedDate
        );
        setFilteredFavorites(filtered);
      } else {
        setFilteredFavorites(favs);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date);

    if (date) {
      const filtered = favorites.filter(
        (fav) => getDateString(new Date(fav.createdAt)) === date
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

  const handleScrollDirectionChange = useCallback(() => {
    if (!isHeaderVisible) return;
    setIsHeaderVisible(false);
    hideTabBar();
    Animated.parallel([
      Animated.timing(headerAnimValue, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnimValue, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnimValue, contentAnimValue, isHeaderVisible]);

  const handlePullDown = useCallback(() => {
    if (isHeaderVisible) return;
    setIsHeaderVisible(true);
    showTabBar();
    Animated.parallel([
      Animated.timing(headerAnimValue, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnimValue, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnimValue, contentAnimValue, isHeaderVisible]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();

      const now = Date.now();
      if (now - lastAdRefresh > NEW_AD_TERM) {
        setAdKey((prev) => prev + 1);
        setLastAdRefresh(now);
      }

      SubscriptionService.shouldShowAds().then((result) => setShowAd(result));
    }, [loadFavorites, lastAdRefresh])
  );

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
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

      {showAd && (
        <Animated.View
          className="my-2 flex justify-center items-center h-[50px]"
          style={{
            transform: [
              {
                translateY: contentAnimValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -72],
                }),
              },
            ],
          }}
        >
          <BannerAd
            key={adKey}
            unitId={unitIds.favorites}
            size={BannerAdSize.BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: false,
            }}
            onAdFailedToLoad={(error) => {
              console.log(
                `Favorites banner ad failed to load (key: ${adKey}):`,
                error
              );
            }}
            onAdLoaded={() => {
              console.log(
                `🎯 NEW Favorites banner ad loaded successfully (key: ${adKey})`
              );
            }}
          />
        </Animated.View>
      )}
      <Animated.View
        className="flex-1 px-6"
        style={{
          ...animatedStyle,
          marginBottom: -72, // Extend 72px below normal area (behind tabs)
          transform: [
            ...animatedStyle.transform,
            {
              translateY: contentAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -72], // Move up to reveal the hidden part
              }),
            },
          ],
        }}
      >
        <FavoritesList
          key={`favorites-${filteredFavorites.length}-${selectedDate}`}
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
        onDateSelect={handleDateSelect}
        onClose={() => setShowDatePicker(false)}
      />
    </Animated.View>
  );
}
