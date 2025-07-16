import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

import HistoryList from '../../components/HistoryList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { HistoryItem } from '../../types/dictionary';
import { useTabSlideAnimation } from '@/hooks/useTabSlideAnimation';
import { useTheme } from '../../contexts/ThemeContext';
import { ANIMATION_DURATION, hideTabBar, showTabBar } from './_layout';
import { SubscriptionService } from '@/utils/subscriptionService';
import { NEW_AD_TERM } from './favorites';

export default function HistoryTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { animatedStyle } = useTabSlideAnimation();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [adKey, setAdKey] = useState(0);
  const [lastAdRefresh, setLastAdRefresh] = useState(0);
  const [showAd, setShowAd] = useState(false);

  const headerAnimValue = useRef(new Animated.Value(1)).current;
  const contentAnimValue = useRef(new Animated.Value(0)).current;

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const hist = await StorageService.getHistory();
      setHistory(hist);

      // Extract unique dates
      const dates = [
        ...new Set(
          hist.map(
            (item) => new Date(item.searchedAt).toISOString().split('T')[0]
          )
        ),
      ];
      setHistoryDates(dates);
      setFilteredHistory(hist);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();

      // Generate new ad only if 30 seconds have passed
      const now = Date.now();
      if (now - lastAdRefresh > NEW_AD_TERM) {
        // 30 seconds interval
        setAdKey((prev) => prev + 1);
        setLastAdRefresh(now);
      }
      SubscriptionService.shouldShowAds().then((result) => setShowAd(result));
    }, [loadHistory, lastAdRefresh])
  );

  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date);

    if (date) {
      const filtered = history.filter(
        (item) => new Date(item.searchedAt).toISOString().split('T')[0] === date
      );
      setFilteredHistory(filtered);
    } else {
      setFilteredHistory(history);
    }
  };

  const handleClearHistory = async () => {
    await StorageService.clearHistory();
    setHistory([]);
    setFilteredHistory([]);
    setHistoryDates([]);
    setSelectedDate(null);
  };

  const handleRemoveHistoryItem = async (id: string) => {
    await StorageService.removeHistoryItem(id);
    loadHistory();
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
              {t('history.subtitle')}
            </Text>
            <Text
              className="text-2xl font-bold mt-1"
              style={{ color: colors.headerTitle }}
            >
              {t('history.title')}
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
            unitId={TestIds.BANNER}
            size={BannerAdSize.BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: false,
            }}
            onAdFailedToLoad={(error) => {
              console.log(
                `History banner ad failed to load (key: ${adKey}):`,
                error
              );
            }}
            onAdLoaded={() => {
              console.log(
                `🎯 NEW History banner ad loaded successfully (key: ${adKey})`
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
        <HistoryList
          history={filteredHistory}
          selectedDate={selectedDate}
          onClearHistory={handleClearHistory}
          onRemoveHistoryItem={handleRemoveHistoryItem}
          onScrollDirectionChange={handleScrollDirectionChange}
          onPullDown={handlePullDown}
          isLoading={isLoading}
          isHeaderVisible={isHeaderVisible}
        />
      </Animated.View>

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        markedDates={historyDates}
        onDateSelect={handleDateSelect}
        onClose={() => setShowDatePicker(false)}
      />
    </Animated.View>
  );
}
