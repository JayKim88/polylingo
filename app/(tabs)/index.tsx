import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  Animated,
  Keyboard,
} from 'react-native';
import { Languages, Volume2, Mic, Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import SearchInput from '../../components/SearchInput';
import TranslationList from '../../components/TranslationList';
import LanguageModal from '../../components/LanguageModal';
import VoiceSettingsModal from '../../components/VoiceSettingsModal';
import CircularUsageButton from '../../components/CircularUsageButton';
import UsageDetailModal from '../../components/UsageDetailModal';
import { TranslationAPI } from '../../utils/translationAPI';
import { StorageService } from '../../utils/storage';
import { SpeechService } from '../../utils/speechService';
import { TranslationResult, SUPPORTED_LANGUAGES } from '../../types/dictionary';
import { useTabSlideAnimation } from '@/hooks/useTabSlideAnimation';
import { useTheme } from '../../contexts/ThemeContext';
import { hideTabBar, showTabBar } from './_layout';
import { SubscriptionService } from '../../utils/subscriptionService';
import { IAPService } from '../../utils/iapService';

import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

export const isPremiumUser = true; // TODO: 실제 프리미엄 체크로 대체

export default function SearchTab() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [searchText, setSearchText] = useState('');
  // 개별 번역 상태 관리
  type TranslationState = {
    status: 'loading' | 'timeout' | 'retrying' | 'success' | 'error';
    result?: TranslationResult;
    error?: string;
    retryCount: number;
    abortController?: AbortController;
    timeoutId?: ReturnType<typeof setTimeout>;
  };

  const [results, setResults] = useState<(TranslationResult | null)[]>([]);
  const [translationStates, setTranslationStates] = useState<
    Map<string, TranslationState>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState(false);
  const [showUsageDetailModal, setShowUsageDetailModal] = useState(false);
  const [usageRefreshTrigger, setUsageRefreshTrigger] = useState(0);
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
  const [showBannerAd, setShowBannerAd] = useState(false);
  const [shouldShowAds, setShouldShowAds] = useState(true);
  const [adKey, setAdKey] = useState(0); // 새로운 광고를 위한 키
  const headerAnimValue = useRef(new Animated.Value(1)).current;
  const searchAnimValue = useRef(new Animated.Value(0)).current;
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const voiceButtonScale = useRef(new Animated.Value(1)).current;
  const translateButtonScale = useRef(new Animated.Value(1)).current;

  const MAX_LENGTH = 50;
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

  const handleFocus = useCallback(async () => {
    loadFavorites();
    loadSelectedLanguages();
    checkVoiceAvailability();
    showTabBar();
    setIsHeaderVisible(true);

    // Initialize IAP service with timeout
    try {
      const initPromise = IAPService.initialize();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('IAP initialization timeout')), 5000)
      );

      const initialized = await Promise.race([initPromise, timeoutPromise]);

      if (initialized) {
        // Only check subscription status if initialization succeeded
        setTimeout(async () => {
          try {
            await IAPService.checkSubscriptionStatus();
          } catch (statusError) {
            console.warn('Subscription status check failed:', statusError);
            // Ensure we have a fallback to free plan
            await SubscriptionService.setSubscription('free', true);
          }
        }, 1000); // Delay to avoid blocking UI
      }
    } catch (error) {
      console.error('Failed to initialize IAP service:', error);
      // Ensure we have a fallback subscription
      try {
        await SubscriptionService.setSubscription('free', true);
      } catch (fallbackError) {
        console.error('Failed to set fallback subscription:', fallbackError);
      }
    }

    // Check if ads should be shown
    const shouldShow = await SubscriptionService.shouldShowAds();
    setShouldShowAds(shouldShow);
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

    // Cleanup IAP service on unmount
    return () => {
      IAPService.cleanup().catch(console.error);
    };
  }, [checkVoiceAvailability]);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    if (selectedLanguages.length === 0) return;

    // 키보드 닫기
    Keyboard.dismiss();

    // 선택된 언어들 중 소스 언어 제외
    const targetLanguages = selectedLanguages.filter(
      (lang) => lang !== sourceLanguage
    );

    // 일일 사용량 확인 (번역할 언어 수 전달)
    const canUse = await SubscriptionService.incrementDailyUsage(
      targetLanguages.length
    );
    if (!canUse) {
      const usage = await SubscriptionService.getDailyUsage();
      Alert.alert(
        t('subscription.usageExceeded'),
        t('subscription.upgradeRequired') +
          `\n\n${t('subscription.dailyUsage', {
            used: usage.used,
            limit: usage.limit,
          })}`
      );
      return;
    }

    // Trigger usage refresh immediately after usage increment
    setUsageRefreshTrigger((prev) => prev + 1);

    if (isVoiceActive) {
      await stopVoiceRecording();
    }

    setResults([]);
    setIsLoading(true);

    // Clear previous translation states
    setTranslationStates(new Map());

    // Create new AbortController for this search
    const abortController = new AbortController();
    setSearchAbortController(abortController);

    // UI 업데이트를 먼저 반영
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      // 각 언어별로 개별 번역 요청
      const translationPromises = targetLanguages.map(async (targetLang) => {
        const result = await translateSingleLanguage(
          targetLang,
          searchText,
          sourceLanguage,
          0
        );

        if (result && !abortController.signal.aborted) {
          // 순서대로 결과 업데이트
          const languageIndex = targetLanguages.indexOf(targetLang);
          if (languageIndex !== -1) {
            setResults((prevResults) => {
              const newResults = [...prevResults];
              newResults[languageIndex] = result;

              return newResults;
            });

            // 첫 번째 결과가 나오면 로딩 상태 해제
            setIsLoading(false);
          }
        }

        return result;
      });

      // 모든 번역 완료 대기 (히스토리 저장용)
      const translationResults = await Promise.allSettled(translationPromises);

      // Check if search was cancelled before processing results
      if (abortController.signal.aborted) {
        return;
      }

      // 성공한 번역들만 필터링
      const successfulTranslations = translationResults
        .filter(
          (result) => result.status === 'fulfilled' && result.value !== null
        )
        .map(
          (result) =>
            (result as PromiseFulfilledResult<TranslationResult>).value
        );

      if (successfulTranslations.length > 0) {
        // Show banner ad after successful search with new ad (if ads should be shown)
        if (shouldShowAds) {
          setShowBannerAd(true);
          setAdKey((prev) => prev + 1); // 새로운 광고 요청
        }

        const searchedData = successfulTranslations.map((v) => ({
          lng: v.targetLanguage,
          text: v.translatedText,
        }));

        await StorageService.addToHistory({
          sourceLanguage,
          targetLanguage: 'multiple',
          sourceText: searchText.trim(),
          translatedText: `${successfulTranslations.length} translations`,
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
    // 키보드 닫기
    Keyboard.dismiss();

    // Cancel ongoing search if active
    if (searchAbortController) {
      searchAbortController.abort();
      setSearchAbortController(null);
    }

    // Clear results and reset states
    handleClear();
  };

  // 개별 언어 번역 함수
  const translateSingleLanguage = async (
    targetLang: string,
    searchText: string,
    sourceLanguage: string,
    retryCount: number = 0
  ) => {
    const stateKey = `${searchText}-${sourceLanguage}-${targetLang}`;

    // 상태 초기화
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (!abortController.signal.aborted) {
        setTranslationStates((prev) => {
          const newMap = new Map(prev);
          const currentState = newMap.get(stateKey);
          if (currentState && currentState.status === 'loading') {
            newMap.set(stateKey, {
              ...currentState,
              status: 'timeout',
            });
          }
          return newMap;
        });
      }
    }, 10000);

    setTranslationStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(stateKey, {
        status: retryCount > 0 ? 'retrying' : 'loading',
        retryCount,
        abortController,
        timeoutId,
      });
      return newMap;
    });

    try {
      const result = await TranslationAPI.translate(
        searchText.trim(),
        sourceLanguage,
        targetLang,
        { provider: translationProvider }
      );

      clearTimeout(timeoutId);

      if (!abortController.signal.aborted) {
        const translationResult = {
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

        setTranslationStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(stateKey, {
            status: 'success',
            result: translationResult,
            retryCount,
          });
          return newMap;
        });

        return translationResult;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (!abortController.signal.aborted) {
        setTranslationStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(stateKey, {
            status: 'error',
            error: (error as Error).message,
            retryCount,
          });
          return newMap;
        });
      }
    }

    return null;
  };

  // 개별 재시도 함수
  const retryTranslation = async (targetLang: string) => {
    const stateKey = `${searchText}-${sourceLanguage}-${targetLang}`;
    const currentState = translationStates.get(stateKey);

    if (!currentState || currentState.retryCount >= 2) return;

    const result = await translateSingleLanguage(
      targetLang,
      searchText,
      sourceLanguage,
      currentState.retryCount + 1
    );

    if (result) {
      // Update results array
      const targetLanguages = selectedLanguages.filter(
        (lang) => lang !== sourceLanguage
      );
      const languageIndex = targetLanguages.indexOf(targetLang);

      if (languageIndex !== -1) {
        setResults((prevResults) => {
          const newResults = [...prevResults];
          newResults[languageIndex] = result;
          return newResults;
        });
      }
    }
  };

  // 개별 취소 함수
  const cancelSingleTranslation = (targetLang: string) => {
    const stateKey = `${searchText}-${sourceLanguage}-${targetLang}`;
    const currentState = translationStates.get(stateKey);

    if (currentState?.abortController) {
      currentState.abortController.abort();
      if (currentState.timeoutId) {
        clearTimeout(currentState.timeoutId);
      }
    }

    const targetLanguages = selectedLanguages.filter(
      (lang) => lang !== sourceLanguage
    );
    const languageIndex = targetLanguages.indexOf(targetLang);

    // 먼저 결과를 null로 설정 (스켈레톤으로 즉시 전환)
    if (languageIndex !== -1) {
      setResults((prevResults) => {
        const newResults = [...prevResults];
        newResults[languageIndex] = null;
        return newResults;
      });
    }

    // 그 다음 상태 삭제 (requestAnimationFrame을 사용하여 다음 프레임에서 실행)
    requestAnimationFrame(() => {
      setTranslationStates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(stateKey);
        return newMap;
      });
    });
  };

  const handleClear = async () => {
    // 키보드 닫기
    Keyboard.dismiss();

    // Cancel all ongoing translations
    translationStates.forEach((state) => {
      if (state.abortController) {
        state.abortController.abort();
      }
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }
    });

    // Cancel main search if active
    if (searchAbortController) {
      searchAbortController.abort();
      setSearchAbortController(null);
    }

    setSearchText('');
    setResults([]);
    setTranslationStates(new Map()); // Clear translation states
    setIsLoading(false);
    setShowBannerAd(false); // Hide banner when clearing

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
    <View className="mt-4">
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
  const renderTranslateButton = () => {
    const showCancelButton = isLoading;

    return (
      <Animated.View
        style={{ transform: [{ scale: translateButtonScale }], flex: 1 }}
      >
        <TouchableOpacity
          className="h-14 rounded-2xl items-center justify-center"
          style={{
            backgroundColor:
              (!searchText.trim() || isInputTooLong) && !showCancelButton
                ? colors.background
                : showCancelButton
                ? '#FF6B6B'
                : colors.text,
            borderWidth:
              (!searchText.trim() || isInputTooLong) && !showCancelButton
                ? 1
                : 0,
            borderColor: colors.border,
            opacity:
              (!searchText.trim() || isInputTooLong) && !showCancelButton
                ? 0.6
                : 1,
          }}
          onPress={showCancelButton ? handleCancelSearch : handleSearch}
          disabled={(!searchText.trim() || isInputTooLong) && !showCancelButton}
          onPressIn={() => animateTranslateButton(0.95)}
          onPressOut={() => animateTranslateButton(1)}
          activeOpacity={1}
        >
          <View className="flex-row items-center">
            {showCancelButton ? (
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
                  (!searchText.trim() || isInputTooLong) && !showCancelButton
                    ? colors.textSecondary
                    : showCancelButton
                    ? '#fff'
                    : colors.background,
              }}
            >
              {showCancelButton ? t('search.cancel') : t('search.translate')}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

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

  const commonAnimatedStyles = {
    ...animatedStyle,
    transform: [
      ...animatedStyle.transform,
      {
        translateY: searchAnimValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -72], // Move up to reveal the hidden part
        }),
      },
    ],
  };

  useEffect(() => {
    if (results.length > 0) return;
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
  }, [results.length, isHeaderVisible, headerAnimValue, searchAnimValue]);

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
            <CircularUsageButton
              onPress={() => setShowUsageDetailModal(true)}
              size={44}
              refreshTrigger={usageRefreshTrigger}
            />
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
      <Animated.View className="px-6" style={commonAnimatedStyles}>
        {renderSearchCard()}
      </Animated.View>
      {shouldShowAds && showBannerAd && (
        <Animated.View
          className="px-6 my-2 flex justify-center items-center h-[50px]"
          style={{
            transform: [
              {
                translateY: searchAnimValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -72],
                }),
              },
            ],
          }}
        >
          <BannerAd
            key={adKey} // 매 검색마다 새로운 광고 컴포넌트 생성
            unitId={TestIds.BANNER}
            size={BannerAdSize.BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: false,
            }}
            onAdFailedToLoad={(error) => {
              console.log(`Banner ad failed to load (key: ${adKey}):`, error);
            }}
            onAdLoaded={() => {
              console.log(
                `🎯 NEW Banner ad loaded successfully (key: ${adKey})`
              );
            }}
          />
        </Animated.View>
      )}
      <Animated.View
        className="flex-1 px-6"
        style={{
          ...commonAnimatedStyles,
          marginBottom: -72, // Extend 72px below normal area (behind tabs)
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
          translationStates={translationStates}
          targetLanguages={selectedLanguages.filter(
            (lang) => lang !== sourceLanguage
          )}
          searchText={searchText}
          sourceLanguage={sourceLanguage}
          onRetry={retryTranslation}
          onCancel={cancelSingleTranslation}
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
      <UsageDetailModal
        visible={showUsageDetailModal}
        onClose={() => setShowUsageDetailModal(false)}
      />
    </Animated.View>
  );
}
