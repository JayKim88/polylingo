import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Clock, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import HistoryList from '../../components/HistoryList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { HistoryItem } from '../../types/dictionary';

export default function HistoryTab() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
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
  };

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
    <SafeAreaView
      className="flex-1 bg-slate-50"
      style={{ paddingBottom: insets.bottom - 50 }}
    >
      <View className="px-5 py-5 bg-white border-b border-gray-200 shadow-sm">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Clock size={32} color="#3B82F6" />
            <Text className="text-3xl font-bold text-gray-800 ml-3">
              {t('history.title')}
            </Text>
          </View>
          <TouchableOpacity
            className="p-3 bg-blue-50 rounded-xl"
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        <Text className="text-base font-medium text-gray-500 ml-11">
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
    </SafeAreaView>
  );
}
