import React from 'react';
import { View, Text, Animated, ActivityIndicator } from 'react-native';
import { TranslationResult } from '../types/dictionary';
import TranslationCard from './TranslationCard';
import { SkeletonTranslationList } from './SkeletonLoader';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

type TranslationListProps = {
  results: TranslationResult[];
  favorites: string[];
  onFavoriteToggle: () => void;
  scrollY?: Animated.Value;
  onScrollDirectionChange?: (isScrollingUp: boolean) => void;
  isLoading?: boolean;
};

export default function TranslationList({
  results,
  favorites,
  onFavoriteToggle,
  scrollY,
  onScrollDirectionChange,
  isLoading = false,
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

  const resultAvailable = !!results.length;

  if (!resultAvailable && !isLoading) {
    return (
      <View className="flex-1 justify-center items-center py-16">
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
        <View
          className="absolute inset-0 z-10 justify-center items-center backdrop-blur-sm"
          style={{ backgroundColor: colors.background }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            className="text-base text-center mt-4 font-medium"
            style={{ color: colors.textSecondary }}
          >
            Searching...
          </Text>
        </View>
      )}
      <Animated.View style={{ opacity: fadeAnim }}>
        {resultAvailable && (
          <View className="flex-row justify-start items-center mb-4 px-1">
            <Text
              className="text-base font-semibold"
              style={{ color: colors.text }}
            >
              {t('main.resultsCount', { count: results.length })}
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
                    listener: ({ nativeEvent }: { nativeEvent: any }) => {
                      if (onScrollDirectionChange) {
                        const currentScrollY = nativeEvent.contentOffset.y;
                        const scrollDiff = Math.abs(
                          currentScrollY - lastScrollY.current
                        );
                        const { contentSize, layoutMeasurement } = nativeEvent;
                        const isAtBottom =
                          currentScrollY >=
                          contentSize.height - layoutMeasurement.height - 10;

                        // 스크롤 변화량이 작으면 무시
                        if (scrollDiff < 20) {
                          return;
                        }

                        const isScrollingUp =
                          currentScrollY < lastScrollY.current;

                        // 스크롤 위치가 0에 가까우면 항상 보이도록 설정
                        if (currentScrollY <= 5) {
                          if (lastDirection.current !== true) {
                            lastDirection.current = true;
                            onScrollDirectionChange(true);
                          }
                        }
                        // 맨 아래에 있으면 숨김 상태 유지
                        else if (isAtBottom) {
                          if (lastDirection.current !== false) {
                            lastDirection.current = false;
                            onScrollDirectionChange(false);
                          }
                        }
                        // 일반적인 스크롤에서만 방향 감지
                        else {
                          if (lastDirection.current !== isScrollingUp) {
                            lastDirection.current = isScrollingUp;
                            onScrollDirectionChange(isScrollingUp);
                          }
                        }
                        lastScrollY.current = currentScrollY;
                      }
                    },
                  }
                )
              : undefined
          }
          scrollEventThrottle={100}
        >
          {results.map((result) => (
            <View
              key={`${result.targetLanguage}-${result.timestamp}`}
              className="mb-6"
            >
              <TranslationCard
                result={result}
                isFavorite={isFavorite(result)}
                onFavoriteToggle={onFavoriteToggle}
              />
            </View>
          ))}
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
}
