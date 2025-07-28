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
import mobileAds from 'react-native-google-mobile-ads';

import '../i18n';
import { ThemeProvider } from '../contexts/ThemeContext';
import CustomSplashScreen from '../components/SplashScreen';
import { IAPService } from '@/utils/iapService';
import { SubscriptionService } from '@/utils/subscriptionService';
import { AppState, AppStateStatus } from 'react-native';
import { useSubscription } from '@/hooks/useSubscription';
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
  const { refreshSubscription } = useSubscription();

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
    // Sentry에 앱 상태 변경 추적
    updateAppStateContext(nextAppState);

    if (nextAppState === 'active') {
      try {
        if (IAPService.isIAPAvailable()) {
          await IAPService.checkSubscriptionStatusAndUpdate(true);
        }

        // 사용자 컨텍스트 업데이트
        await initializeUserContext();
      } catch (error) {
        console.error(
          'Error checking subscription on app state change:',
          error
        );
        // 에러 발생 시 안전하게 free plan으로 설정
        try {
          await SubscriptionService.setSubscription('free', {
            isActive: true,
            preserveUsage: true,
          });
        } catch (fallbackError) {
          console.error('Failed to set fallback subscription:', fallbackError);
        }
      }
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const handleSplashComplete = () => setShowCustomSplash(false);

  useEffect(() => {
    // Initialize Google Mobile Ads
    mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        console.log('Google Mobile Ads initialized');
        console.log('Adapter statuses:', adapterStatuses);
      })
      .catch((error) => {
        console.error('Failed to initialize Google Mobile Ads:', error);
      });
  }, []);

  const handleInitializeIAP = async () => {
    try {
      const initPromise = IAPService.initialize();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('IAP initialization timeout')), 5000)
      );

      await Promise.race([initPromise, timeoutPromise]);
      console.log('IAP service initialized successfully');

      await IAPService.checkSubscriptionStatusAndUpdate();

      // 사용자 컨텍스트 초기화
      await initializeUserContext();
    } catch (error) {
      console.error('Failed to initialize IAP service:', error);
      // Ensure we have a fallback subscription
      try {
        await SubscriptionService.setSubscription('free', {
          isActive: true,
          preserveUsage: true,
        });
      } catch (fallbackError) {
        console.error('Failed to set fallback subscription:', fallbackError);
      }
    }
  };

  useEffect(() => {
    handleInitializeIAP();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
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
  );
});
