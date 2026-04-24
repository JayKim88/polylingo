import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import * as Sentry from '@sentry/react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

import '../i18n';
import { ThemeProvider } from '../contexts/ThemeContext';
import CustomSplashScreen from '../components/SplashScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import { AppState, AppStateStatus } from 'react-native';
import { TranslationAPI } from '@/utils/translationAPI';
import {
  initializeUserContext,
  updateAppStateContext,
} from '@/utils/sentryUtils';

SplashScreen.preventAutoHideAsync();

// Sentry 초기화
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '', // 환경변수에서 DSN 가져오기
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 1.0, // 개발 단계에서는 100% 샘플링
});

export default Sentry.wrap(function RootLayout() {
  useFrameworkReady();

  const [showCustomSplash, setShowCustomSplash] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    updateAppStateContext(nextAppState);

    if (nextAppState === 'active') {
      await initializeUserContext();
    } else if (nextAppState === 'background') {
      TranslationAPI.clearCache();
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    const handleMemoryWarning = () => {
      TranslationAPI.clearCache();
    };

    const memorySubscription = AppState.addEventListener(
      'memoryWarning',
      handleMemoryWarning
    );

    return () => {
      subscription.remove();
      memorySubscription?.remove();
    };
  }, []);

  const handleSplashComplete = () => setShowCustomSplash(false);

  useEffect(() => {
    // Initialize Google Mobile Ads with optimization
    const initializeAds = async () => {
      try {
        await mobileAds().initialize();

        // 불필요한 어댑터 비활성화 및 설정 최적화
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.T,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });

        console.log('Google Mobile Ads initialized with optimized settings');
      } catch (error) {
        console.error('Failed to initialize Google Mobile Ads:', error);
      }
    };

    initializeAds();
  }, []);

  useEffect(() => {
    // 무료 전환: IAP 초기화 비활성화
    initializeUserContext().catch(console.error);
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {showCustomSplash ? (
            <CustomSplashScreen onAnimationComplete={handleSplashComplete} />
          ) : (
            <>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </>
          )}
        </GestureHandlerRootView>
      </ThemeProvider>
    </ErrorBoundary>
  );
});
