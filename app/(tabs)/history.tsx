import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Clock, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
// AdMob import - 에러 방지를 위해 조건부 로드
let AdMobBanner: any = null;
try {
  AdMobBanner = require('expo-ads-admob').AdMobBanner;
} catch (error) {
  console.log('AdMob not available in history:', error);
}

import HistoryList from '../../components/HistoryList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { HistoryItem } from '../../types/dictionary';
import { useTabSlideAnimation } from '@/hooks/useTabSlideAnimation';
import { useTheme } from '../../contexts/ThemeContext';
import { hideTabBar, showTabBar } from './_layout';
import { isPremiumUser } from './index';

export default function HistoryTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const headerAnimValue = useRef(new Animated.Value(1)).current;
  const searchAnimValue = useRef(new Animated.Value(0)).current;
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

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

      // Show all history initially
      setFilteredHistory(hist);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { animatedStyle } = useTabSlideAnimation({
    onFocus: loadHistory,
  });

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

  const handleDatePickerSelect = (date: string | null) => {
    handleDateSelect(date);
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
    // Show header and tab bar when user pulls down
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

      {!isPremiumUser && AdMobBanner && (
        <AdMobBanner
          bannerSize="smartBannerPortrait"
          adUnitID="ca-app-pub-3940256099942544/6300978111" // 테스트용 ID
          servePersonalizedAds={true}
          onDidFailToReceiveAdWithError={(err) => console.log('History banner ad failed to load:', err)}
        />
      )}

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        markedDates={historyDates}
        onDateSelect={handleDatePickerSelect}
        onClose={() => setShowDatePicker(false)}
      />
    </Animated.View>
  );
}
