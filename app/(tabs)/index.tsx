import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Languages, Globe, Volume2, Mic, Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import SearchInput from '../../components/SearchInput';
import TranslationList from '../../components/TranslationList';
import LanguageModal from '../../components/LanguageModal';
import VoiceSettingsModal from '../../components/VoiceSettingsModal';
import { TranslationAPI } from '../../utils/translationAPI';
import { StorageService } from '../../utils/storage';
import { SpeechService } from '../../utils/speechService';
import { TranslationResult, SUPPORTED_LANGUAGES } from '../../types/dictionary';

export const isPremiumUser = true; // TODO: 실제 프리미엄 체크로 대체

export default function SearchTab() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState(selectedLanguages[0]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<{
    stop: () => void;
  } | null>(null);
  const [translationProvider, setTranslationProvider] = useState<
    'default' | 'claude'
  >('claude');
  const [searchAbortController, setSearchAbortController] =
    useState<AbortController | null>(null);

  const isEn = i18n.language === 'en';
  const MAX_LENGTH = isPremiumUser ? 50 : 30;
  const isInputTooLong = searchText.length > MAX_LENGTH;

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      loadSelectedLanguages();
      checkVoiceAvailability();
    }, [])
  );

  useEffect(() => {
    checkVoiceAvailability();
  }, []);

  const loadFavorites = async () => {
    const favs = await StorageService.getFavorites();
    const favIds = favs.map(
      (f) => `${f.sourceText}-${f.sourceLanguage}-${f.targetLanguage}`
    );
    setFavorites(favIds);
  };

  const loadSelectedLanguages = async () => {
    const cachedlangs = await StorageService.getSelectedLanguages();

    if (cachedlangs.length > 0) {
      setSelectedLanguages(cachedlangs);
      setSourceLanguage(cachedlangs[0]);
      return;
    }
    const defaultLanguages = SUPPORTED_LANGUAGES.map((v) => v.code).slice(0, 2);

    setSelectedLanguages(defaultLanguages);
    setSourceLanguage(defaultLanguages[0]);
    await StorageService.saveSelectedLanguages(defaultLanguages);
  };

  const checkVoiceAvailability = () => {
    const available = SpeechService.isSpeechRecognitionAvailable();
    setIsVoiceAvailable(available);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    if (selectedLanguages.length === 0) return;

    if (isVoiceActive) {
      await stopVoiceRecording();
    }

    // Create new AbortController for this search
    const abortController = new AbortController();
    setSearchAbortController(abortController);

    setIsLoading(true);
    try {
      const translationResults = await Promise.all(
        selectedLanguages.map(async (targetLang) => {
          // Check if search was cancelled
          if (abortController.signal.aborted) {
            throw new Error('Search cancelled');
          }

          const result = await TranslationAPI.translate(
            searchText.trim(),
            sourceLanguage,
            targetLang,
            { provider: translationProvider }
          );
          return {
            sourceLanguage,
            targetLanguage: targetLang,
            sourceText: searchText.trim(),
            translatedText: result.translation,
            meanings: result.meanings,
            confidence:
              result.translation === '번역을 찾을 수 없습니다' ? 0 : 0.9,
            timestamp: Date.now(),
            pronunciation: result.pronunciation,
          };
        })
      );

      // Check if search was cancelled before processing results
      if (abortController.signal.aborted) {
        return;
      }

      const exceptSourceLngResults = translationResults.filter(
        (v) => v.targetLanguage !== sourceLanguage
      );
      setResults(exceptSourceLngResults);
      const searchedData = exceptSourceLngResults.map((v) => ({
        lng: v.targetLanguage,
        text: v.translatedText,
      }));
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
      if ((error as Error).message !== 'Search cancelled') {
        Alert.alert(t('alert.error'), t('alert.translationError'));
      }
    } finally {
      setIsLoading(false);
      setSearchAbortController(null);
    }
  };

  const handleCancelSearch = () => {
    if (!searchAbortController) return;
    searchAbortController.abort();
    setSearchAbortController(null);
    setIsLoading(false);
  };

  const handleClear = async () => {
    setSearchText('');
    setResults([]);
    if (isVoiceActive) {
      await stopVoiceRecording();
    }
  };

  const handleLanguageSelection = async (languages: string[]) => {
    console.log('📱 Language selection changed:', languages);
    setSourceLanguage(languages[0]);
    setSelectedLanguages(languages);
    await StorageService.saveSelectedLanguages(languages);
    console.log('📱 Languages saved to storage:', languages);
    setShowLanguageModal(false);
  };

  const startVoiceRecording = async () => {
    if (!isVoiceAvailable) {
      Alert.alert(
        t('alert.error'),
        'Speech recognition is not available on this device'
      );
      return;
    }

    setIsVoiceActive(true);

    try {
      const recognition = await SpeechService.startSpeechRecognition(
        sourceLanguage,
        (text: string) => {
          setSearchText(text);
        },
        (error: string) => {
          Alert.alert(t('alert.error'), error);
          setIsVoiceActive(false);
          setSpeechRecognition(null);
        },
        () => {
          setIsVoiceActive(false);
          setSpeechRecognition(null);
        }
      );

      recognition && setSpeechRecognition(recognition);
    } catch (error) {
      Alert.alert(t('alert.error'), 'Failed to start voice recognition');
      setIsVoiceActive(false);
      setSpeechRecognition(null);
    }
  };

  const stopVoiceRecording = async () => {
    if (!speechRecognition) return;
    await speechRecognition.stop();
    setSpeechRecognition(null);
    setIsVoiceActive(false);
  };

  const handleVoicePress = () =>
    isVoiceActive ? stopVoiceRecording() : startVoiceRecording();

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50"
      style={{ paddingBottom: insets.bottom - 50 }}
    >
      <View className="px-5 py-5 bg-white border-b border-gray-200">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Globe size={32} color="#6366F1" />
            <Text
              className={`${
                isEn ? 'text-[16px]' : 'text-3xl'
              } font-bold text-gray-800 ml-3`}
            >
              {t('main.title')}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="p-3 bg-amber-100 rounded-xl"
              onPress={() => setShowVoiceSettingsModal(true)}
            >
              <Volume2 size={24} color="#6366F1" />
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
          {t('main.subtitle', { count: selectedLanguages.length })}
        </Text>
      </View>
      <View className="flex-1 pt-5 px-5">
        <View className="flex-row items-center mb-3 gap-3"></View>
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
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            {t('main.sourceLanguageLabel')}
          </Text>
          <View className="flex flex-row gap-x-2">
            <LanguageSelector
              selectedLanguage={sourceLanguage}
              onLanguageSelect={setSourceLanguage}
              selectedLanguages={selectedLanguages}
              onOpen={async () => {
                if (isVoiceActive) {
                  await stopVoiceRecording();
                }
              }}
            />
            {isVoiceAvailable && (
              <TouchableOpacity
                className={`justify-center items-center rounded-2xl shadow-sm w-16 h-16 ${
                  isVoiceActive ? 'bg-red-500' : 'bg-green-500'
                }`}
                onPress={handleVoicePress}
              >
                <Mic size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className={`justify-center items-center rounded-2xl shadow-sm w-16 h-16 ${
                isLoading
                  ? 'bg-red-500'
                  : !searchText.trim() || isInputTooLong
                  ? 'bg-gray-400'
                  : 'bg-blue-500'
              }`}
              onPress={isLoading ? handleCancelSearch : handleSearch}
              disabled={(!searchText.trim() || isInputTooLong) && !isLoading}
            >
              {isLoading ? (
                <X size={20} color="#fff" />
              ) : (
                <Search size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center gap-3 mb-5">
            <SearchInput
              value={searchText}
              onChangeText={setSearchText}
              onClear={handleClear}
              onSearch={handleSearch}
              placeholder={
                isVoiceActive ? 'Speak now' : t('main.searchPlaceholder')
              }
              maxLength={MAX_LENGTH}
              disabled={isVoiceActive}
            />
          </View>
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
            onFavoriteToggle={loadFavorites}
            scrollY={scrollY}
            onScrollDirectionChange={(scrollingUp) =>
              setIsScrollingUp(scrollingUp)
            }
            isLoading={isLoading}
          />
        </Animated.View>
      </View>
      <LanguageModal
        visible={showLanguageModal}
        selectedLanguages={selectedLanguages}
        onLanguageSelection={handleLanguageSelection}
        onClose={() => setShowLanguageModal(false)}
        isPaidUser={isPremiumUser}
      />
      <VoiceSettingsModal
        visible={showVoiceSettingsModal}
        onClose={() => setShowVoiceSettingsModal(false)}
      />
    </SafeAreaView>
  );
}
