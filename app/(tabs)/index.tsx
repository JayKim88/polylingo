import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Alert, TouchableOpacity, Animated } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Languages, Globe, Mic } from 'lucide-react-native';
import LanguageSelector from '../../components/LanguageSelector';
import SearchInput from '../../components/SearchInput';
import TranslationList from '../../components/TranslationList';
import LanguageModal from '../../components/LanguageModal';
import VoiceSettingsModal from '../../components/VoiceSettingsModal';
import { TranslationAPI } from '../../utils/translationAPI';
import { StorageService } from '../../utils/storage';
import { TranslationResult, SUPPORTED_LANGUAGES } from '../../types/dictionary';

export default function SearchTab() {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('ko');
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    SUPPORTED_LANGUAGES.map((v) => v.code)
  );

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      loadSelectedLanguages();
    }, [])
  );

  const loadFavorites = async () => {
    const favs = await StorageService.getFavorites();
    const favIds = favs.map(
      (f) => `${f.sourceText}-${f.sourceLanguage}-${f.targetLanguage}`
    );
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
      const translationResults =
        await TranslationAPI.translateToMultipleLanguages(
          searchText.trim(),
          sourceLanguage,
          selectedLanguages
        );

      const exceptSourceLngResults = translationResults.filter(
        (v) => v.targetLanguage !== sourceLanguage
      );

      setResults(exceptSourceLngResults);

      const searchedData = exceptSourceLngResults.map((v) => ({
        lng: v.targetLanguage,
        text: v.translatedText,
      }));

      // Add to history
      if (exceptSourceLngResults.length > 0) {
        await StorageService.addToHistory({
          sourceLanguage,
          targetLanguage: 'multiple',
          sourceText: searchText.trim(),
          translatedText: `${exceptSourceLngResults.length} translations`,
          searchedData,
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

  const handleFavoriteToggle = () => {
    loadFavorites();
  };

  const handleLanguageSelection = async (languages: string[]) => {
    setSourceLanguage(languages[0]);
    setSelectedLanguages(languages);
    await StorageService.saveSelectedLanguages(languages);
    setShowLanguageModal(false);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50"
      style={{ paddingBottom: insets.bottom - 50 }}
    >
      <View className="px-5 py-5 bg-white border-b border-gray-200">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Globe size={32} color="#6366F1" />
            <Text className="text-3xl font-bold text-gray-800 ml-3">
              다국어 번역기
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="p-3 bg-amber-100 rounded-xl"
              onPress={() => setShowVoiceSettingsModal(true)}
            >
              <Mic size={24} color="#6366F1" />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-3 bg-indigo-100 rounded-xl"
              onPress={() => setShowLanguageModal(true)}
            >
              <Languages size={24} color="#6366F1" />
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-base font-medium text-gray-500 ml-11">
          {selectedLanguages.length}개 언어로 동시 번역
        </Text>
      </View>

      <View className="flex-1 pt-5 px-5">
        <Animated.View
          style={{
            transform: [
              {
                translateY: isScrollingUp ? 0 : -120,
              },
            ],
            opacity: isScrollingUp ? 1 : 0,
          }}
        >
          <LanguageSelector
            selectedLanguage={sourceLanguage}
            onLanguageSelect={setSourceLanguage}
            label="번역할 언어"
            selectedLanguages={selectedLanguages}
          />

          <SearchInput
            value={searchText}
            onChangeText={setSearchText}
            onSearch={handleSearch}
            onClear={handleClear}
            placeholder="번역할 텍스트를 입력하세요..."
            isLoading={isLoading}
          />
        </Animated.View>

        <Animated.View
          style={{
            flex: 1,
            marginTop: isScrollingUp ? 0 : -170,
          }}
        >
          <TranslationList
            results={results}
            favorites={favorites}
            onFavoriteToggle={handleFavoriteToggle}
            scrollY={scrollY}
            onScrollDirectionChange={(scrollingUp) =>
              setIsScrollingUp(scrollingUp)
            }
          />
        </Animated.View>
      </View>

      <LanguageModal
        visible={showLanguageModal}
        selectedLanguages={selectedLanguages}
        onLanguageSelection={handleLanguageSelection}
        onClose={() => setShowLanguageModal(false)}
      />

      <VoiceSettingsModal
        visible={showVoiceSettingsModal}
        onClose={() => setShowVoiceSettingsModal(false)}
      />
    </SafeAreaView>
  );
}
