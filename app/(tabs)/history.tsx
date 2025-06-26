import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Clock } from 'lucide-react-native';
import CalendarView from '../../components/CalendarView';
import HistoryList from '../../components/HistoryList';
import { StorageService } from '../../utils/storage';
import { HistoryItem } from '../../types/dictionary';
import { ScrollView } from 'react-native-gesture-handler';

export default function HistoryTab() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [historyDates, setHistoryDates] = useState<string[]>([]);

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

  const handleClearHistory = async () => {
    await StorageService.clearHistory();
    setHistory([]);
    setFilteredHistory([]);
    setHistoryDates([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Clock size={32} color="#3B82F6" />
          <Text style={styles.headerTitle}>히스토리</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          검색 기록을 날짜별로 확인하세요
        </Text>
      </View>
      <ScrollView>
        <CalendarView
          markedDates={historyDates}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          markColor="#3B82F6"
        />

        <HistoryList
          history={filteredHistory}
          selectedDate={selectedDate}
          onClearHistory={handleClearHistory}
        />
      </ScrollView>
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
