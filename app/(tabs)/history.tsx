import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Clock, Calendar } from 'lucide-react-native';
import CalendarView from '../../components/CalendarView';
import HistoryList from '../../components/HistoryList';
import DatePickerModal from '../../components/DatePickerModal';
import { StorageService } from '../../utils/storage';
import { HistoryItem } from '../../types/dictionary';
import { ScrollView } from 'react-native-gesture-handler';

export default function HistoryTab() {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Clock size={32} color="#3B82F6" />
            <Text style={styles.headerTitle}>히스토리</Text>
          </View>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {selectedDate
            ? `${new Date(selectedDate).getFullYear()}년 ${
                new Date(selectedDate).getMonth() + 1
              }월 ${new Date(selectedDate).getDate()}일`
            : '검색 기록을 날짜별로 확인하세요'}
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginLeft: 12,
  },
  calendarButton: {
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
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
