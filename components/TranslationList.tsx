import React from 'react';
import { View, Text, Animated, ActivityIndicator } from 'react-native';
import { TranslationResult } from '../types/dictionary';
import TranslationCard from './TranslationCard';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import Loading from './Loading';

type TranslationState = {
  status: 'loading' | 'timeout' | 'retrying' | 'success' | 'error';
  result?: TranslationResult;
  error?: string;
  retryCount: number;
};

type TranslationListProps = {
  results: (TranslationResult | null)[];
  favorites: string[];
  onFavoriteToggle: () => void;
  scrollY?: Animated.Value;
  onScrollDirectionChange?: (isScrollingUp: boolean, scrollY: number) => void;
  onPullDown?: () => void;
  isLoading?: boolean;
  isHeaderVisible?: boolean;
  translationStates?: Map<string, TranslationState>;
  targetLanguages?: string[];
  searchText?: string;
  sourceLanguage?: string;
  onRetry?: (targetLang: string) => void;
  onCancel?: (targetLang: string) => void;
};

export default function TranslationList({
  results,
  favorites,
  onFavoriteToggle,
  scrollY,
  onScrollDirectionChange,
  onPullDown,
  isLoading = false,
  isHeaderVisible = true,
  translationStates,
  targetLanguages,
  searchText,
  sourceLanguage,
  onRetry,
  onCancel,
}: TranslationListProps) {
  const lastScrollY = React.useRef(0);
  const lastDirection = React.useRef<boolean | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Fade in animation when results appear
  React.useEffect(() => {
    if (results.length > 0 && !isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [results.length, isLoading, fadeAnim]);
  const isFavorite = (result: TranslationResult) => {
    const id = `${result.sourceText}-${result.sourceLanguage}-${result.targetLanguage}`;
    return favorites.includes(id);
  };

  const handleScrollEvent = ({ nativeEvent }: { nativeEvent: any }) => {
    if (!onScrollDirectionChange) return;

    const currentScrollY = nativeEvent.contentOffset.y;
    const scrollDiff = Math.abs(currentScrollY - lastScrollY.current);

    // 스크롤 변화량이 작으면 무시
    if (scrollDiff < 20) {
      return;
    }

    const isScrollingUp = currentScrollY < lastScrollY.current;

    // Detect pull-down gesture at the top
    if (currentScrollY < -50 && onPullDown) {
      onPullDown();
      lastDirection.current = null; // Reset direction tracking after pull
    }
    // Trigger direction change on scroll down with sufficient movement
    else if (!isScrollingUp && currentScrollY > 50 && scrollDiff > 20) {
      onScrollDirectionChange(false, currentScrollY);
      lastDirection.current = false;
    }
    // Reset direction when scrolling back to top
    else if (currentScrollY <= 10) {
      lastDirection.current = null;
    }
    lastScrollY.current = currentScrollY;
  };

  const resultAvailable = !!results.length;

  if (!resultAvailable && !isLoading) {
    return (
      <View className="flex-1 justify-center items-center pb-32">
        <Text
          className="text-base text-center"
          style={{ color: colors.textTertiary }}
        >
          {t('main.searchPrompt')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 relative">
      {isLoading && (
        <Loading
          isHeaderVisible={isHeaderVisible}
          message={t('loading.searching')}
        />
      )}
      <Animated.View style={{ opacity: fadeAnim }}>
        {resultAvailable && !isLoading && (
          <View className="flex-row justify-start items-center mb-4 px-1">
            <Text
              className="text-base font-semibold"
              style={{ color: colors.text }}
            >
              {t('main.resultsCount', {
                count: results.filter((r) => r !== null).length,
              })}
            </Text>
          </View>
        )}

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          onScroll={
            scrollY
              ? Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  {
                    useNativeDriver: false,
                    listener: handleScrollEvent,
                  }
                )
              : undefined
          }
          scrollEventThrottle={100}
        >
          {results.map((result, index) => {
            const targetLang = targetLanguages?.[index];
            const stateKey =
              targetLang && searchText && sourceLanguage
                ? `${searchText}-${sourceLanguage}-${targetLang}`
                : '';
            const translationState = stateKey
              ? translationStates?.get(stateKey)
              : undefined;

            return (
              <View
                key={
                  result
                    ? `${result.targetLanguage}-${result.timestamp}`
                    : `skeleton-${index}`
                }
                className="mb-4"
              >
                <TranslationCard
                  result={result}
                  isFavorite={result ? isFavorite(result) : false}
                  onFavoriteToggle={onFavoriteToggle}
                  translationState={translationState}
                  targetLanguage={targetLang}
                  onRetry={onRetry}
                  onCancel={onCancel}
                />
              </View>
            );
          })}
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
}
