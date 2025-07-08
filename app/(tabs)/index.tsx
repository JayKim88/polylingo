import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { SpeechService } from '../../utils/speechService';
import { TranslationResult, SUPPORTED_LANGUAGES } from '../../types/dictionary';
import { useTranslation } from 'react-i18next';

export default function SearchTab() {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const { t, i18n } = useTranslation();
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
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<{
    stop: () => void;
  } | null>(null);

  const isEn = i18n.language === 'en';

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      loadSelectedLanguages();
      checkVoiceAvailability();
    }, [])
  );

  // Check voice availability on mount
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
    const langs = await StorageService.getSelectedLanguages();
    if (langs.length > 0) {
      setSelectedLanguages(langs);
    }
  };

  const checkVoiceAvailability = () => {
    const available = SpeechService.isSpeechRecognitionAvailable();
    setIsVoiceAvailable(available);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;

    if (isVoiceActive) {
      await stopVoiceRecording();
    }

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
      Alert.alert(t('alert.error'), t('alert.translationError'));
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
          {t('main.subtitle', { count: selectedLanguages.length })}
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
            label={t('main.sourceLanguageLabel')}
            selectedLanguages={selectedLanguages}
          />

          <SearchInput
            value={searchText}
            onChangeText={setSearchText}
            onSearch={handleSearch}
            onClear={handleClear}
            placeholder={t('main.searchPlaceholder')}
            isLoading={isLoading}
            onVoicePress={handleVoicePress}
            isVoiceActive={isVoiceActive}
            isVoiceAvailable={isVoiceAvailable}
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
