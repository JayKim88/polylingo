import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
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

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

      // IAP 초기화 성공 후 구독 상태 확인 및 동기화
      await syncSubscriptionStatus();
    } catch (error) {
      console.error('Failed to initialize IAP service:', error);
      // IAP 실패 시에도 서버와 동기화 시도
      await syncSubscriptionStatus();

      // Ensure we have a fallback subscription
      try {
        await SubscriptionService.setSubscription('free', true);
      } catch (fallbackError) {
        console.error('Failed to set fallback subscription:', fallbackError);
      }
    }
  };

  // 서버와 구독 상태 동기화
  const syncSubscriptionStatus = async () => {
    try {
      // 1. Apple 구독 상태 확인 (실제 구독 취소 여부 감지)
      if (IAPService.isIAPAvailable()) {
        console.log('Checking Apple subscription status...');
        await IAPService.checkSubscriptionStatusAndUpdate();
      }

      // 2. 서버와 로컬 구독 상태 동기화
      const currentSubscription =
        await SubscriptionService.getCurrentSubscription();

      if (currentSubscription) {
        await SubscriptionService.setSubscription(
          currentSubscription.planId,
          currentSubscription.isActive
        );
      } else {
        console.log('No subscription found, setting to free plan');
        await SubscriptionService.setSubscription('free', true);
      }
    } catch (error) {
      console.error('Failed to sync subscription status:', error);
      try {
        await SubscriptionService.setSubscription('free', true);
      } catch (fallbackError) {
        console.error('Failed to set fallback subscription:', fallbackError);
      }
    }
  };

  useEffect(() => {
    if (showCustomSplash) return;
    handleInitializeIAP();
  }, [showCustomSplash]);

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
}
