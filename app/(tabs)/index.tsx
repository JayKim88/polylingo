import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Languages, Globe } from 'lucide-react-native';
import LanguageSelector from '../../components/LanguageSelector';
import SearchTypeSelector from '../../components/SearchTypeSelector';
import SearchInput from '../../components/SearchInput';
import DraggableTranslationList from '../../components/DraggableTranslationList';
import LanguageModal from '../../components/LanguageModal';
import { TranslationAPI } from '../../utils/translationAPI';
import { StorageService } from '../../utils/storage';
import { TranslationResult, SearchType } from '../../types/dictionary';

export default function SearchTab() {
  const [sourceLanguage, setSourceLanguage] = useState('ko');
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('word');
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en', 'ja', 'fr', 'de', 'es']);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      loadSelectedLanguages();
    }, [])
  );

  const loadFavorites = async () => {
    const favs = await StorageService.getFavorites();
    const favIds = favs.map(f => `${f.sourceText}-${f.sourceLanguage}-${f.targetLanguage}`);
    setFavorites(favIds);
  };

  const loadSelectedLanguages = async () => {
    const langs = await StorageService.getSelectedLanguages();
    if (langs.length > 0) {
      setSelectedLanguages(langs);
    }
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;

    setIsLoading(true);
    try {
      const translationResults = await TranslationAPI.translateToMultipleLanguages(
        searchText.trim(),
        sourceLanguage,
        selectedLanguages,
        searchType
      );
      
      setResults(translationResults);
      
      // Add to history
      if (translationResults.length > 0) {
        await StorageService.addToHistory({
          sourceLanguage,
          targetLanguage: 'multiple',
          sourceText: searchText.trim(),
          translatedText: `${translationResults.length} translations`,
          searchType,
        });
      }
    } catch (error) {
      Alert.alert('오류', '번역 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSearchText('');
    setResults([]);
  };

  const isFavorite = (result: TranslationResult) => {
    const id = `${result.sourceText}-${result.sourceLanguage}-${result.targetLanguage}`;
    return favorites.includes(id);
  };

  const handleFavoriteToggle = () => {
    loadFavorites();
  };

  const handleLanguageSelection = async (languages: string[]) => {
    setSelectedLanguages(languages);
    await StorageService.saveSelectedLanguages(languages);
    setShowLanguageModal(false);
  };

  const handleResultsReorder = async (newResults: TranslationResult[]) => {
    setResults(newResults);
    await StorageService.saveLanguageOrder(newResults.map(r => r.targetLanguage));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Globe size={32} color="#6366F1" />
            <Text style={styles.headerTitle}>다국어 사전</Text>
          </View>
          <TouchableOpacity 
            style={styles.languageButton}
            onPress={() => setShowLanguageModal(true)}
          >
            <Languages size={24} color="#6366F1" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {selectedLanguages.length}개 언어로 동시 번역
        </Text>
      </View>

      <View style={styles.content}>
        <LanguageSelector
          selectedLanguage={sourceLanguage}
          onLanguageSelect={setSourceLanguage}
          label="번역할 언어"
        />

        <SearchTypeSelector
          selectedType={searchType}
          onTypeSelect={setSearchType}
        />

        <SearchInput
          value={searchText}
          onChangeText={setSearchText}
          onSearch={handleSearch}
          onClear={handleClear}
          placeholder={searchType === 'word' ? '번역할 단어를 입력하세요...' : '번역할 문장을 입력하세요...'}
          isLoading={isLoading}
        />

        <DraggableTranslationList
          results={results}
          favorites={favorites}
          onFavoriteToggle={handleFavoriteToggle}
          onReorder={handleResultsReorder}
          searchType={searchType}
        />
      </View>

      <LanguageModal
        visible={showLanguageModal}
        selectedLanguages={selectedLanguages}
        onLanguageSelection={handleLanguageSelection}
        onClose={() => setShowLanguageModal(false)}
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
  languageButton: {
    padding: 12,
    backgroundColor: '#EEF2FF',
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
    padding: 20,
  },
});