import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { HistoryItem, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { Trash2, Clock, RefreshCw } from 'lucide-react-native';

interface HistoryListProps {
  history: HistoryItem[];
  selectedDate: string | null;
  onClearHistory: () => void;
}

export default function HistoryList({
  history,
  selectedDate,
  onClearHistory,
}: HistoryListProps) {
  const handleClearHistory = () => {
    Alert.alert('기록 삭제', '모든 검색 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: onClearHistory,
      },
    ]);
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  const renderHistoryItem = (item: HistoryItem) => {
    const sourceLanguage = SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === item.sourceLanguage
    );

    return (
      <View key={item.id} style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={styles.languageInfo}>
            <Text style={styles.flag}>{sourceLanguage?.flag}</Text>
            <View style={styles.languageDetails}>
              <Text style={styles.languageName}>
                {sourceLanguage?.nativeName}
              </Text>
              <View style={styles.searchTypeBadge}>
                <Text style={styles.searchTypeText}>
                  {item.searchType === 'word' ? '단어' : '문장'}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.timeAgo}>{formatTimeAgo(item.searchedAt)}</Text>
        </View>

        <Text style={styles.sourceText}>{item.sourceText}</Text>
        {item.searchedData && (
          <ScrollView
            horizontal
            style={{
              flexDirection: 'row',
            }}
            contentContainerStyle={{
              alignItems: 'center',
            }}
          >
            {item.searchedData.map((v) => (
              <Text
                key={v.text}
                style={{
                  borderRadius: 24,
                  width: 'auto',
                  paddingVertical: 2,
                  paddingHorizontal: 4,
                  marginRight: 8,
                  backgroundColor: '#e3e3ff',
                }}
              >
                {v.lng} - {v.text}
              </Text>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const getTitle = () => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      return `${date.getFullYear()}년 ${
        date.getMonth() + 1
      }월 ${date.getDate()}일`;
    }
    return '전체 히스토리';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.count}>{history.length}개</Text>
        </View>

        {history.length > 0 && !selectedDate && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearHistory}
          >
            <Trash2 size={18} color="#EF4444" />
            <Text style={styles.clearButtonText}>전체 삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          history.length === 0 ? styles.emptyContainer : styles.contentContainer
        }
      >
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={64} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>
              {selectedDate
                ? '선택한 날짜에 검색 기록이 없습니다'
                : '검색 기록이 없습니다'}
            </Text>
            <Text style={styles.emptySubtitle}>
              단어나 문장을 검색하면 기록이 여기에 표시됩니다
            </Text>
          </View>
        ) : (
          history.map(renderHistoryItem)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginRight: 8,
  },
  count: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageDetails: {
    flex: 1,
  },
  languageName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 4,
  },
  searchTypeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  searchTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6366F1',
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  sourceText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  translatedText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
});
