import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Clock, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import HistoryList from '../../components/HistoryList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { HistoryItem } from '../../types/dictionary';
import { useTabSlideAnimation } from '@/hooks/useTabSlideAnimation';
import { useTheme } from '../../contexts/ThemeContext';

export default function HistoryTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadHistory = useCallback(async () => {
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

  return (
    <Animated.View
      style={{
        ...animatedStyle,
        backgroundColor: colors.background,
      }}
    >
      <View
        className="px-5 py-5 border-b shadow-sm"
        style={{
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        }}
      >
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Clock size={32} color="#3B82F6" />
            <Text
              className="text-3xl font-bold ml-3"
              style={{ color: colors.text }}
            >
              {t('history.title')}
            </Text>
          </View>
          <TouchableOpacity
            className="p-3 rounded-xl"
            style={{ backgroundColor: colors.infoContainer }}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        <Text
          className="text-base font-medium ml-11"
          style={{ color: colors.textSecondary }}
        >
          {selectedDate
            ? t('history.dateSubtitle', {
                year: new Date(selectedDate).getFullYear(),
                month: new Date(selectedDate).getMonth() + 1,
                day: new Date(selectedDate).getDate(),
              })
            : t('history.subtitle')}
        </Text>
      </View>
      <HistoryList
        history={filteredHistory}
        selectedDate={selectedDate}
        onClearHistory={handleClearHistory}
        onRemoveHistoryItem={handleRemoveHistoryItem}
      />
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
