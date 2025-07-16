import React, { useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Linking,
  Clipboard,
} from 'react-native';
import {
  Settings,
  Info,
  MessageCircle,
  Shield,
  Globe,
  ChevronRight,
  Languages,
  Moon,
  Sun,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTabSlideAnimation } from '@/hooks/useTabSlideAnimation';
import { useTheme } from '../../contexts/ThemeContext';
import { hideTabBar, showTabBar } from './_layout';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

import AppLanguageModal from '../../components/AppLanguageModal';
import SubscriptionModal from '../../components/SubscriptionModal';
import { SubscriptionService } from '../../utils/subscriptionService';
import { VersionService } from '../../utils/version';
import { NEW_AD_TERM } from './favorites';

type SettingItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  iconColor?: string;
  backgroundColor?: string;
};

export default function SettingsTab() {
  const { t } = useTranslation();
  const { animatedStyle } = useTabSlideAnimation();
  const { theme, colors, toggleTheme } = useTheme();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [adKey, setAdKey] = useState(0);
  const [lastAdRefresh, setLastAdRefresh] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const headerAnimValue = useRef(new Animated.Value(1)).current;
  const contentAnimValue = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const handleAbout = () => {
    Alert.alert(
      t('settings.aboutTitle'),
      `${VersionService.getFormattedVersion()}\n\n${t(
        'settings.aboutSubtitle'
      )}\n\n${t('settings.aboutFeatures')}\n\n${t(
        'settings.aboutBuiltWith'
      )}\n\n${t('settings.aboutCopyright')}`,
      [{ text: t('settings.aboutButton') }]
    );
  };

  const handleFeedback = () => {
    Alert.alert(t('feedbackModal.title'), t('feedbackModal.message'), [
      { text: t('alert.later'), style: 'cancel' },
      {
        text: t('settings.feedback'),
        onPress: () => {
          const email = 'yongjae.kim.dev@gmail.com';
          const subject = encodeURIComponent(t('feedbackModal.emailSubject'));
          const body = encodeURIComponent(t('feedbackModal.emailBody'));
          const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

          Linking.openURL(mailtoUrl).catch((err) => {
            // Copy email to clipboard as fallback
            Clipboard.setString(email);
            Alert.alert(
              t('feedbackModal.emailFallbackTitle'),
              t('feedbackModal.emailFallbackMessage'),
              [{ text: t('alert.confirm') }]
            );
          });
        },
      },
    ]);
  };

  const handleRate = () => {
    Alert.alert(t('rateModal.title'), t('rateModal.message'), [
      { text: t('alert.later'), style: 'cancel' },
      { text: t('rateModal.rate'), onPress: () => {} },
    ]);
  };

  const handlePrivacy = () => {
    Alert.alert(t('privacyModal.title'), t('privacyModal.message'), [
      { text: t('alert.confirm') },
    ]);
  };

  const handleLanguageSupport = () => {
    Alert.alert(
      t('languageSupportModal.title'),
      t('languageSupportModal.message'),
      [{ text: t('alert.confirm') }]
    );
  };

  const handleFeatures = () => {
    Alert.alert(t('featuresModal.title'), t('featuresModal.message'), [
      { text: t('alert.confirm') },
    ]);
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const handleAppLanguage = () => {
    setShowLanguageModal(true);
  };

  const handleDevSubscriptionTest = () => {
    Alert.alert('개발 모드 구독 테스트', '테스트할 구독 플랜을 선택하세요', [
      { text: '취소', style: 'cancel' },
      { text: 'Free', onPress: () => testSubscription('free') },
      { text: 'Pro Monthly', onPress: () => testSubscription('pro_monthly') },
      {
        text: 'Pro Max Monthly',
        onPress: () => testSubscription('pro_max_monthly'),
      },
      {
        text: 'Premium Yearly',
        onPress: () => testSubscription('premium_yearly'),
      },
      { text: '일일 사용량 테스트', onPress: () => handleDailyUsageTest() },
    ]);
  };

  const handleDailyUsageTest = () => {
    Alert.alert('일일 사용량 테스트', '테스트할 옵션을 선택하세요', [
      { text: '취소', style: 'cancel' },
      { text: '사용량 리셋 (0으로)', onPress: () => resetDailyUsage() },
      { text: '사용량 95로 설정', onPress: () => setDailyUsage(95) },
      { text: '사용량 99로 설정', onPress: () => setDailyUsage(99) },
      { text: '사용량 100으로 설정', onPress: () => setDailyUsage(100) },
      { text: '테스트용 낮은 한도 (3회)', onPress: () => setTestLowLimit() },
    ]);
  };

  const resetDailyUsage = async () => {
    try {
      await SubscriptionService.resetDailyUsage();
      const usage = await SubscriptionService.getDailyUsage();
      Alert.alert(
        '사용량 리셋 완료',
        `현재 사용량: ${usage.used}/${usage.limit}`
      );
    } catch (error) {
      Alert.alert('오류', '사용량 리셋 중 오류가 발생했습니다.');
    }
  };

  const setDailyUsage = async (count: number) => {
    try {
      await SubscriptionService.setDailyUsage(count);
      const usage = await SubscriptionService.getDailyUsage();
      Alert.alert(
        '사용량 설정 완료',
        `현재 사용량: ${usage.used}/${usage.limit}\n남은 사용량: ${usage.remaining}`
      );
    } catch (error) {
      Alert.alert('오류', '사용량 설정 중 오류가 발생했습니다.');
    }
  };

  const setTestLowLimit = async () => {
    try {
      await SubscriptionService.setTestLowLimit();
      const usage = await SubscriptionService.getDailyUsage();
      Alert.alert(
        '테스트 모드 활성화',
        `일일 한도가 3회로 설정되었습니다.\n현재 사용량: ${usage.used}/${usage.limit}\n\n이제 번역을 3번 하면 한도 제한을 테스트할 수 있습니다.`
      );
    } catch (error) {
      Alert.alert('오류', '테스트 모드 설정 중 오류가 발생했습니다.');
    }
  };

  const testSubscription = async (planId: string) => {
    try {
      console.log('🔍 Settings: Setting subscription to:', planId);
      await SubscriptionService.setSubscriptionWithLanguageReset(planId, true);

      // Verify the subscription was set correctly
      const newSub = await SubscriptionService.getCurrentSubscription();
      console.log(
        '🔍 Settings: Verification - new subscription:',
        newSub?.planId
      );

      setShowAd(newSub?.planId === 'free');

      Alert.alert(
        '테스트 완료',
        `${planId} 구독이 설정되었습니다.\n\n현재 planId: ${newSub?.planId}\n\n언어 선택이 플랜에 맞게 초기화되었습니다.\n화면을 새로고침하여 변경사항을 확인하세요.`
      );
    } catch (error) {
      console.error('🔍 Settings: Error setting subscription:', error);
      Alert.alert('오류', '구독 설정 중 오류가 발생했습니다.');
    }
  };

  const handleScrollDirectionChange = useCallback(() => {
    if (!isHeaderVisible) return;
    setIsHeaderVisible(false);
    hideTabBar();
    Animated.parallel([
      Animated.timing(headerAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnimValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnimValue, contentAnimValue, isHeaderVisible]);

  const handlePullDown = useCallback(() => {
    if (isHeaderVisible) return;
    setIsHeaderVisible(true);
    showTabBar();
    Animated.parallel([
      Animated.timing(headerAnimValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnimValue, contentAnimValue, isHeaderVisible]);

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollingUp = currentScrollY < lastScrollY.current;
    const scrollDiff = Math.abs(currentScrollY - lastScrollY.current);
    lastScrollY.current = currentScrollY;

    const validScrollDiff = scrollDiff > 20;
    if (!validScrollDiff) return;

    // Show header when scrolling up anywhere in the list
    if (scrollingUp) {
      handlePullDown();
    }
    // Hide header when scrolling down with sufficient movement
    else if (!scrollingUp && currentScrollY > 50) {
      handleScrollDirectionChange();
    }
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    iconColor = '#6B7280',
    backgroundColor = '#F3F4F6',
  }: SettingItemProps) => {
    const buttonScale = useRef(new Animated.Value(1)).current;

    const animateButton = (value: number) => {
      Animated.spring(buttonScale, {
        toValue: value,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <TouchableOpacity
          className="flex-row items-center rounded-2xl p-4 mb-3 shadow-sm"
          style={{ backgroundColor: colors.surface }}
          onPress={onPress}
          onPressIn={() => animateButton(0.95)}
          onPressOut={() => animateButton(1)}
          activeOpacity={1}
        >
          <View className="flex-1 flex-row items-center">
            <View
              className="w-11 h-11 justify-center items-center rounded-xl mr-4"
              style={{ backgroundColor }}
            >
              {icon}
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold mb-0.5"
                style={{ color: colors.text }}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  className="text-sm"
                  style={{ color: colors.textSecondary }}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          {showChevron && (
            <ChevronRight size={20} color={colors.textTertiary} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastAdRefresh > NEW_AD_TERM) {
        setAdKey((prev) => prev + 1);
        setLastAdRefresh(now);
      }
      SubscriptionService.shouldShowAds().then((result) => setShowAd(result));
    }, [lastAdRefresh])
  );

  return (
    <Animated.View
      style={{
        backgroundColor: colors.background,
        flex: 1,
      }}
    >
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
              {t('settings.subtitle')}
            </Text>
            <Text
              className="text-2xl font-bold mt-1"
              style={{ color: colors.headerTitle }}
            >
              {t('settings.title')}
            </Text>
          </View>
        </View>
      </Animated.View>
      {showAd && (
        <Animated.View
          className="my-2 flex justify-center items-center h-[50px]"
          style={{
            transform: [
              {
                translateY: contentAnimValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -72],
                }),
              },
            ],
          }}
        >
          <BannerAd
            key={adKey}
            unitId={TestIds.BANNER}
            size={BannerAdSize.BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: false,
            }}
            onAdFailedToLoad={(error) => {
              console.log(
                `Settings banner ad failed to load (key: ${adKey}):`,
                error
              );
            }}
            onAdLoaded={() => {
              console.log(
                `🎯 NEW Settings banner ad loaded successfully (key: ${adKey})`
              );
            }}
          />
        </Animated.View>
      )}
      <Animated.View
        className="flex-1"
        style={{
          ...animatedStyle,
          transform: [
            ...animatedStyle.transform,
            {
              translateY: contentAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -72],
              }),
            },
          ],
        }}
      >
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* App Settings Card */}
          <View className="rounded-3xl mt-4">
            <Text
              className="text-lg font-bold mb-4"
              style={{ color: colors.text }}
            >
              {t('settings.appInfo')}
            </Text>
            <SettingItem
              icon={<Globe size={20} color="#059669" />}
              title={t('settings.appLanguage')}
              subtitle="English, 한국어, 中文"
              onPress={handleAppLanguage}
              iconColor="#059669"
              backgroundColor="#ECFDF5"
            />
            <SettingItem
              icon={
                theme === 'dark' ? (
                  <Sun size={20} color="#F59E0B" />
                ) : (
                  <Moon size={20} color="#6366F1" />
                )
              }
              title={
                theme === 'dark'
                  ? t('settings.lightMode')
                  : t('settings.darkMode')
              }
              subtitle={
                theme === 'dark'
                  ? t('settings.switchToLightTheme')
                  : t('settings.switchToDarkTheme')
              }
              onPress={handleThemeToggle}
              iconColor={theme === 'dark' ? '#F59E0B' : '#6366F1'}
              backgroundColor={theme === 'dark' ? '#FEF3C7' : '#E0E7FF'}
            />
            <SettingItem
              icon={<Settings size={20} color="#8B5CF6" />}
              title={t('subscription.title')}
              subtitle={t('subscription.manage')}
              onPress={() => setShowSubscriptionModal(true)}
              iconColor="#8B5CF6"
              backgroundColor="#F3E8FF"
            />
            {__DEV__ && (
              <SettingItem
                icon={<Settings size={20} color="#F59E0B" />}
                title="구독 테스트 (개발 모드)"
                subtitle="개발 모드에서 구독 상태 테스트"
                onPress={handleDevSubscriptionTest}
                iconColor="#F59E0B"
                backgroundColor="#FEF3C7"
              />
            )}
            <SettingItem
              icon={<Info size={20} color="#6366F1" />}
              title={t('settings.about')}
              subtitle={t('settings.aboutSubtitle')}
              onPress={handleAbout}
              iconColor="#6366F1"
              backgroundColor="#EEF2FF"
            />
            <SettingItem
              icon={<Languages size={20} color="#10B981" />}
              title={t('settings.features')}
              subtitle={t('settings.featuresSubtitle')}
              onPress={handleFeatures}
              iconColor="#10B981"
              backgroundColor="#ECFDF5"
            />
            <SettingItem
              icon={<Globe size={20} color="#059669" />}
              title={t('settings.supportedLanguages')}
              subtitle={t('settings.supportedLanguagesSubtitle')}
              onPress={handleLanguageSupport}
              iconColor="#059669"
              backgroundColor="#ECFDF5"
            />
          </View>

          {/* User Feedback Card */}
          <View className="rounded-3xl mt-4">
            <Text
              className="text-lg font-bold mb-4"
              style={{ color: colors.text }}
            >
              {t('settings.users')}
            </Text>
            <SettingItem
              icon={<MessageCircle size={20} color="#F59E0B" />}
              title={t('settings.feedback')}
              subtitle={t('settings.feedbackSubtitle')}
              onPress={handleFeedback}
              iconColor="#F59E0B"
              backgroundColor="#FFFBEB"
            />
            {/* <SettingItem
              icon={<Star size={20} color="#EF4444" />}
              title={t('settings.rate')}
              subtitle={t('settings.rateSubtitle')}
              onPress={handleRate}
              iconColor="#EF4444"
              backgroundColor="#FEF2F2"
            /> */}
          </View>

          {/* Privacy Card */}
          <View className="rounded-3xl mt-4">
            <Text
              className="text-lg font-bold mb-4"
              style={{ color: colors.text }}
            >
              {t('settings.privacy')}
            </Text>
            <SettingItem
              icon={<Shield size={20} color="#8B5CF6" />}
              title={t('settings.privacyPolicy')}
              subtitle={t('settings.privacyPolicySubtitle')}
              onPress={handlePrivacy}
              iconColor="#8B5CF6"
              backgroundColor="#F3E8FF"
            />
          </View>

          {/* Footer */}
          <View className="items-center mt-10">
            <Text
              className="text-base font-medium mb-2"
              style={{ color: colors.textSecondary }}
            >
              Made with ❤️ for multilingual learners
            </Text>
            <Text className="text-sm" style={{ color: colors.textTertiary }}>
              {VersionService.getFormattedVersion()}
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      <AppLanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscriptionChange={() => {
          // Refresh any subscription-related UI if needed
        }}
      />
    </Animated.View>
  );
}
