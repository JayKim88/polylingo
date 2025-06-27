import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { FavoriteItem, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { Trash2, Heart } from 'lucide-react-native';

interface FavoritesListProps {
  favorites: FavoriteItem[];
  selectedDate: string | null;
  onRemoveFavorite: (id: string) => void;
}

export default function FavoritesList({
  favorites,
  selectedDate,
  onRemoveFavorite,
}: FavoritesListProps) {
  const handleRemoveFavorite = (id: string, sourceText: string) => {
    Alert.alert(
      '즐겨찾기 삭제',
      `"${sourceText}"을(를) 즐겨찾기에서 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onRemoveFavorite(id),
        },
      ]
    );
  };

  const renderFavoriteItem = (item: FavoriteItem) => {
    const sourceLanguage = SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === item.sourceLanguage
    );
    const targetLanguage = SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === item.targetLanguage
    );

    return (
      <View key={item.id} style={styles.favoriteCard}>
        <View style={styles.favoriteHeader}>
          <View style={styles.languageFlags}>
            <Text style={styles.flag}>{sourceLanguage?.flag}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.flag}>{targetLanguage?.flag}</Text>
          </View>
          <View style={styles.headerActions}>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleRemoveFavorite(item.id, item.sourceText)}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sourceText}>{item.sourceText}</Text>

        {item.meanings && item.meanings.length > 0 ? (
          <View style={styles.meaningsContainer}>
            {item.meanings.slice(0, 3).map((meaning, index) => (
              <View key={index} style={styles.meaningItem}>
                <Text style={styles.meaningTranslation}>
                  {index + 1}. {meaning.translation}
                </Text>
                <Text style={styles.meaningContext}>{meaning.type}</Text>
              </View>
            ))}
            {item.meanings.length > 3 && (
              <Text style={styles.moreText}>
                +{item.meanings.length - 3}개 더
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.translatedText}>{item.translatedText}</Text>
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
    return '전체 즐겨찾기';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.count}>{favorites.length}개</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          favorites.length === 0
            ? styles.emptyContainer
            : styles.contentContainer
        }
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={64} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>
              {selectedDate
                ? '선택한 날짜에 저장된 즐겨찾기가 없습니다'
                : '저장된 즐겨찾기가 없습니다'}
            </Text>
            <Text style={styles.emptySubtitle}>
              검색 결과에서 하트 버튼을 눌러 즐겨찾기에 추가해보세요
            </Text>
          </View>
        ) : (
          favorites.map(renderFavoriteItem)
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
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  count: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
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
  favoriteCard: {
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
  favoriteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageFlags: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 20,
  },
  arrow: {
    fontSize: 16,
    color: '#9CA3AF',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchTypeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  searchTypeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6366F1',
  },
  deleteButton: {
    padding: 8,
  },
  sourceText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  translatedText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    lineHeight: 24,
  },
  meaningsContainer: {
    marginBottom: 12,
  },
  meaningItem: {
    marginBottom: 8,
  },
  meaningTranslation: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  meaningContext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  moreText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6366F1',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'right',
  },
});
