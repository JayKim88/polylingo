import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { TranslationResult, SearchType } from '../types/dictionary';
import TranslationCard from './TranslationCard';
import { GripVertical } from 'lucide-react-native';

interface DraggableTranslationListProps {
  results: TranslationResult[];
  favorites: string[];
  onFavoriteToggle: () => void;
  onReorder: (newResults: TranslationResult[]) => void;
  searchType: SearchType;
}

export default function DraggableTranslationList({
  results,
  favorites,
  onFavoriteToggle,
  onReorder,
  searchType
}: DraggableTranslationListProps) {
  const isFavorite = (result: TranslationResult) => {
    const id = `${result.sourceText}-${result.sourceLanguage}-${result.targetLanguage}`;
    return favorites.includes(id);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<TranslationResult>) => (
    <View style={[styles.itemContainer, isActive && styles.activeItem]}>
      <TranslationCard
        result={item}
        isFavorite={isFavorite(item)}
        onFavoriteToggle={onFavoriteToggle}
        searchType={searchType}
        onLongPress={drag}
        isDragging={isActive}
      />
    </View>
  );

  if (results.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          검색어를 입력해주세요
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {results.length}개 언어로 번역됨
        </Text>
        <Text style={styles.dragHint}>
          길게 눌러서 순서 변경
        </Text>
      </View>
      
      <DraggableFlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.targetLanguage}-${item.timestamp}`}
        onDragEnd={({ data }) => onReorder(data)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
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
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  dragHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  itemContainer: {
    marginBottom: 12,
  },
  activeItem: {
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});