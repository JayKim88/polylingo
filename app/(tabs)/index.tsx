import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { View, Text, Alert, TouchableOpacity, Animated } from 'react-native';
import { Languages, Volume2, Mic, Search, X } from 'lucide-react-native';
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
import { useTabSlideAnimation } from '@/hooks/useTabSlideAnimation';
import { useTheme } from '../../contexts/ThemeContext';
import { hideTabBar, showTabBar } from './_layout';

// AdMob import - 에러 방지를 위해 조건부 로드
let AdMobBanner: any = null;
try {
  AdMobBanner = require('expo-ads-admob').AdMobBanner;
} catch (error) {
  console.log('AdMob not available:', error);
}

export const isPremiumUser = false; // TODO: 실제 프리미엄 체크로 대체

export default function SearchTab() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
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
  const headerAnimValue = useRef(new Animated.Value(1)).current;
  const searchAnimValue = useRef(new Animated.Value(0)).current;
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const voiceButtonScale = useRef(new Animated.Value(1)).current;
  const translateButtonScale = useRef(new Animated.Value(1)).current;

  const MAX_LENGTH = isPremiumUser ? 50 : 30;
  const isInputTooLong = searchText.length > MAX_LENGTH;

  // 시간대에 따라 인사말 결정
  const greetingKey = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'search.goodMorning';
    if (hour < 18) return 'search.goodAfternoon';
    return 'search.goodEvening';
  }, []);

  const loadFavorites = useCallback(async () => {
    const favs = await StorageService.getFavorites();
    const favIds = favs.map(
      (f) => `${f.sourceText}-${f.sourceLanguage}-${f.targetLanguage}`
    );
    setFavorites(favIds);
  }, []);

  const loadSelectedLanguages = useCallback(async () => {
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
  }, []);

  const checkVoiceAvailability = useCallback(() => {
    const available = SpeechService.isSpeechRecognitionAvailable();
    setIsVoiceAvailable(available);
  }, []);

  const handleFocus = useCallback(() => {
    loadFavorites();
    loadSelectedLanguages();
    checkVoiceAvailability();
    showTabBar();
  }, [loadFavorites, loadSelectedLanguages, checkVoiceAvailability]);

  const handleScrollDirectionChange = useCallback(
    (scrollingUp: boolean, scrollY: number) => {
      setIsScrollingUp(scrollingUp);

      // Only hide header when scrolling down and header is currently visible
      if (!scrollingUp && scrollY > 50 && isHeaderVisible) {
        setIsHeaderVisible(false);
        // Hide header and tab bar, move search up when scrolling down
        hideTabBar();
        Animated.parallel([
          Animated.timing(headerAnimValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(searchAnimValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
    [headerAnimValue, searchAnimValue, isHeaderVisible]
  );

  const handlePullDown = useCallback(() => {
    // Show header and tab bar when user pulls down
    if (!isHeaderVisible) {
      setIsHeaderVisible(true);
      showTabBar();
      Animated.parallel([
        Animated.timing(headerAnimValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(searchAnimValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [headerAnimValue, searchAnimValue, isHeaderVisible]);

  const { animatedStyle } = useTabSlideAnimation({
    onFocus: handleFocus,
  });

  useEffect(() => {
    checkVoiceAvailability();
  }, [checkVoiceAvailability]);

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
      Alert.alert(t('alert.error'), t('search.speechNotAvailable'));
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
      Alert.alert(t('alert.error'), t('search.voiceStartError'));
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

  // Render Language Selection Section
  const renderLanguageSection = () => (
    <View style={{ marginBottom: 32 }}>
      <Text
        className="text-sm font-medium mb-4 opacity-70"
        style={{ color: colors.textSecondary }}
      >
        {t('search.translateFrom')}
      </Text>
      <View style={{ marginBottom: 16 }}>
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
      </View>
    </View>
  );

  // Render Search Input Section
  const renderSearchInput = () => (
    <View className="mb-2 mt-4">
      <SearchInput
        value={searchText}
        onChangeText={setSearchText}
        onClear={handleClear}
        onSearch={handleSearch}
        placeholder={
          isVoiceActive ? t('search.listening') : t('search.enterText')
        }
        maxLength={MAX_LENGTH}
        disabled={isVoiceActive}
      />
    </View>
  );

  const animateVoiceButton = (scale: number) => {
    Animated.spring(voiceButtonScale, {
      toValue: scale,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const animateTranslateButton = (scale: number) => {
    Animated.spring(translateButtonScale, {
      toValue: scale,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Render Voice Button
  const renderVoiceButton = () => {
    if (!isVoiceAvailable) return null;

    return (
      <Animated.View
        style={{ transform: [{ scale: voiceButtonScale }], flex: 1 }}
      >
        <TouchableOpacity
          className="h-14 rounded-2xl items-center justify-center"
          style={{
            backgroundColor: isVoiceActive ? '#FF6B6B' : colors.background,
            borderWidth: isVoiceActive ? 0 : 1,
            borderColor: colors.border,
          }}
          onPress={handleVoicePress}
          onPressIn={() => animateVoiceButton(0.95)}
          onPressOut={() => animateVoiceButton(1)}
          activeOpacity={1}
        >
          <View className="flex-row items-center">
            <Mic
              size={16}
              color={isVoiceActive ? '#fff' : colors.textSecondary}
            />
            <Text
              className="ml-2 font-medium text-sm"
              style={{
                color: isVoiceActive ? '#fff' : colors.textSecondary,
              }}
            >
              {isVoiceActive ? t('search.stop') : t('search.voice')}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render Translate Button
  const renderTranslateButton = () => (
    <Animated.View
      style={{ transform: [{ scale: translateButtonScale }], flex: 1 }}
    >
      <TouchableOpacity
        className="h-14 rounded-2xl items-center justify-center"
        style={{
          backgroundColor:
            (!searchText.trim() || isInputTooLong) && !isLoading
              ? colors.background
              : isLoading
              ? '#FF6B6B'
              : colors.text,
          borderWidth:
            (!searchText.trim() || isInputTooLong) && !isLoading ? 1 : 0,
          borderColor: colors.border,
          opacity:
            (!searchText.trim() || isInputTooLong) && !isLoading ? 0.6 : 1,
        }}
        onPress={isLoading ? handleCancelSearch : handleSearch}
        disabled={(!searchText.trim() || isInputTooLong) && !isLoading}
        onPressIn={() => animateTranslateButton(0.95)}
        onPressOut={() => animateTranslateButton(1)}
        activeOpacity={1}
      >
        <View className="flex-row items-center">
          {isLoading ? (
            <X size={16} color="#fff" />
          ) : (
            <Search
              size={16}
              color={
                !searchText.trim() || isInputTooLong
                  ? colors.textSecondary
                  : colors.background
              }
            />
          )}
          <Text
            className="ml-2 font-medium text-sm"
            style={{
              color:
                (!searchText.trim() || isInputTooLong) && !isLoading
                  ? colors.textSecondary
                  : isLoading
                  ? '#fff'
                  : colors.background,
            }}
          >
            {isLoading ? t('search.cancel') : t('search.translate')}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render Action Buttons Section
  const renderActionButtons = () => (
    <View className="flex-row gap-4">
      {renderVoiceButton()}
      {renderTranslateButton()}
    </View>
  );

  // Render Complete Search Card
  const renderSearchCard = () => (
    <View
      className="rounded-3xl my-4"
      style={{ backgroundColor: colors.background }}
    >
      {renderLanguageSection()}
      {renderSearchInput()}
      {renderActionButtons()}
    </View>
  );

  return (
    <Animated.View
      style={{
        backgroundColor: colors.background,
        flex: 1,
      }}
    >
      {/* Modern Header */}
      <Animated.View
        className="px-6 pt-4 pb-2 rounded-b-3xl"
        style={{
          backgroundColor: colors.header,
          transform: [
            {
              translateY: headerAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-72, 0],
              }),
            },
          ],
          // opacity: headerAnimValue,
        }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text
              className="text-sm font-medium opacity-60"
              style={{ color: colors.headerSubTitle }}
            >
              {t(greetingKey)}
            </Text>
            <Text
              className="text-2xl font-bold mt-1"
              style={{ color: colors.headerTitle }}
            >
              {t('search.translateTitle')}
            </Text>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface }}
              onPress={() => setShowVoiceSettingsModal(true)}
            >
              <Volume2 size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface }}
              onPress={() => setShowLanguageModal(true)}
            >
              <Languages size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      {/* Search Card */}
      <Animated.View
        className="px-6"
        style={{
          ...animatedStyle,
          transform: [
            ...animatedStyle.transform,
            {
              translateY: searchAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -72],
              }),
            },
          ],
        }}
      >
        {renderSearchCard()}
      </Animated.View>
      {!isPremiumUser && AdMobBanner && (
        <AdMobBanner
          bannerSize="smartBannerPortrait"
          adUnitID="ca-app-pub-3940256099942544/6300978111" // 테스트용 ID
          servePersonalizedAds={true}
          onDidFailToReceiveAdWithError={(err) => console.log('Banner ad failed to load:', err)}
        />
      )}
      <Animated.View
        className="flex-1 px-6"
        style={{
          ...animatedStyle,
          marginBottom: -72, // Extend 72px below normal area (behind tabs)
          transform: [
            ...animatedStyle.transform,
            {
              translateY: searchAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -72], // Move up to reveal the hidden part
              }),
            },
          ],
        }}
      >
        <TranslationList
          results={results}
          favorites={favorites}
          onFavoriteToggle={loadFavorites}
          scrollY={scrollY}
          onScrollDirectionChange={handleScrollDirectionChange}
          onPullDown={handlePullDown}
          isLoading={isLoading}
          isHeaderVisible={isHeaderVisible}
        />
      </Animated.View>
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
    </Animated.View>
  );
}
