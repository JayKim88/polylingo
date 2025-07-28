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
  Share,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
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
  FileText,
  Trash2,
  Download,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTabSlideAnimation } from '@/hooks/useTabSlideAnimation';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { hideTabBar, showTabBar } from './_layout';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import AppLanguageModal from '../../components/AppLanguageModal';
import SubscriptionModal from '../../components/SubscriptionModal';
import LegalDocumentModal from '../../components/LegalDocumentModal';
import { SubscriptionService } from '../../utils/subscriptionService';
import { VersionService } from '../../utils/version';
import { NEW_AD_TERM } from './favorites';
import {
  PRIVACY_POLICY_CONTENT,
  TERMS_OF_SERVICE_CONTENT,
} from '../../constants/legalDocuments';
import { StorageService } from '../../utils/storage';
import { TranslationAPI } from '../../utils/translationAPI';
import { UserService } from '../../utils/userService';
import { unitIds } from '@/constants/bannerAds';

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
  const { refreshSubscription } = useSubscription();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
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

          Linking.openURL(mailtoUrl).catch(async (err) => {
            // Copy email to clipboard as fallback
            await Clipboard.setString(email);
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
    setShowPrivacyModal(true);
  };

  const handleTermsOfService = () => {
    setShowTermsModal(true);
  };

  // 실제 Apple ID로 Supabase 테스트
  const handleSupabaseTest = async () => {
    // 사용자에게 Apple ID 입력 받기
    Alert.prompt(
      'Apple ID 입력',
      '실제 Apple ID를 입력하여 Supabase 테스트를 진행합니다',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '테스트',
          onPress: async (appleId) => {
            if (!appleId || !appleId.includes('@')) {
              Alert.alert('오류', '올바른 Apple ID를 입력하세요');
              return;
            }

            try {
              console.log('Starting Supabase test with Apple ID:', appleId);

              // 1. 실제 Apple ID로 사용자 인증
              const user = await UserService.authenticateWithAppleID(appleId);
              console.log('User created:', user);

              if (user) {
                // 2. 구독 동기화 테스트
                const syncResult = await UserService.syncSubscription(
                  'premium_monthly',
                  true
                );
                console.log('Subscription sync result:', syncResult);

                // 3. 사용량 동기화 테스트
                const today = new Date().toISOString().split('T')[0];
                const usageResult = await UserService.syncDailyUsage(today, 5);
                console.log('Usage sync result:', usageResult);

                Alert.alert(
                  '테스트 완료',
                  `✅ 사용자 생성: ${user.appleId}\n✅ 구독 동기화: ${
                    syncResult ? '성공' : '실패'
                  }\n✅ 사용량 동기화: ${
                    usageResult ? '성공' : '실패'
                  }\n\n🔗 Supabase Dashboard에서 데이터를 확인하세요:\nhttps://ebmquokitoxofuznlacz.supabase.co`
                );
              } else {
                Alert.alert('테스트 실패', '사용자 생성에 실패했습니다');
              }
            } catch (error) {
              console.error('Supabase test error:', error);
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              Alert.alert(
                '테스트 에러',
                `오류: ${errorMessage}\n\n콘솔에서 상세 내용을 확인하세요`
              );
            }
          },
        },
      ],
      'plain-text',
      '',
      'email-address'
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      t('settings.deleteAllDataTitle'),
      t('settings.deleteAllDataMessage'),
      [
        { text: t('alert.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAllDataConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored data
              await StorageService.clearAllData();
              // Clear translation cache
              TranslationAPI.clearCache();

              Alert.alert(
                t('settings.deleteAllDataSuccess'),
                t('settings.deleteAllDataSuccessMessage'),
                [{ text: t('alert.confirm') }]
              );
            } catch (error) {
              Alert.alert(t('alert.error'), t('settings.deleteAllDataError'), [
                { text: t('alert.confirm') },
              ]);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const favorites = await StorageService.getFavorites();
      const history = await StorageService.getHistory();

      if (favorites.length === 0 && history.length === 0) {
        Alert.alert(
          t('settings.exportDataTitle'),
          t('settings.noDataToExport'),
          [{ text: t('alert.confirm') }]
        );
        return;
      }

      // Create CSV content
      const csvHeader = `${t('settings.csvType')},${t(
        'settings.csvSourceText'
      )},${t('settings.csvTranslatedText')},${t(
        'settings.csvSourceLanguage'
      )},${t('settings.csvTargetLanguage')},${t('settings.csvDate')}\n`;

      let csvContent = csvHeader;

      // Add favorites to CSV
      favorites.forEach((favorite) => {
        const escapeCsvValue = (value: string) => {
          if (
            value.includes(',') ||
            value.includes('"') ||
            value.includes('\n')
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };

        csvContent += `${escapeCsvValue(
          t('settings.csvFavorite')
        )},${escapeCsvValue(favorite.sourceText)},${escapeCsvValue(
          favorite.translatedText
        )},${escapeCsvValue(favorite.sourceLanguage)},${escapeCsvValue(
          favorite.targetLanguage
        )},${new Date(favorite.createdAt).toLocaleDateString()}\n`;
      });

      // Add history to CSV
      history.forEach((historyItem) => {
        if (historyItem.searchedData && historyItem.searchedData.length > 0) {
          // Multiple translations from history
          historyItem.searchedData.forEach((searchData) => {
            csvContent += `${t('settings.csvHistory')},${
              historyItem.sourceText
            },${searchData.text},${historyItem.sourceLanguage},${
              searchData.lng
            },${new Date(historyItem.searchedAt).toLocaleDateString()}\n`;
          });
        } else {
          // Single translation from history
          csvContent += `${t('settings.csvHistory')},${
            historyItem.sourceText
          },${historyItem.translatedText},${historyItem.sourceLanguage},${
            historyItem.targetLanguage
          },${new Date(historyItem.searchedAt).toLocaleDateString()}\n`;
        }
      });

      const fileName = `polylingo-data-${
        new Date().toISOString().split('T')[0]
      }.csv`;

      // Show export options
      Alert.alert(
        t('settings.exportDataTitle'),
        t('settings.exportDataChooseMethod'),
        [
          { text: t('alert.cancel'), style: 'cancel' },
          {
            text: t('settings.exportViaEmail'),
            onPress: async () => {
              const subject = encodeURIComponent(
                t('settings.exportDataEmailSubject')
              );
              const body = encodeURIComponent(
                `${t('settings.exportDataEmailBody')}\n\n${csvContent}`
              );
              const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

              try {
                await Linking.openURL(mailtoUrl);
              } catch (error) {
                await Clipboard.setString(csvContent);
                Alert.alert(
                  t('settings.exportDataSuccess'),
                  t('settings.exportDataFallbackMessage', { fileName }),
                  [{ text: t('alert.confirm') }]
                );
              }
            },
          },
          {
            text: t('settings.exportViaShare'),
            onPress: async () => {
              try {
                await Share.share({
                  message: `${t(
                    'settings.exportDataEmailBody'
                  )}\n\n${csvContent}`,
                  title: t('settings.exportDataEmailSubject'),
                });
              } catch (error) {
                await Clipboard.setString(csvContent);
                Alert.alert(
                  t('settings.exportDataSuccess'),
                  t('settings.exportDataFallbackMessage', { fileName }),
                  [{ text: t('alert.confirm') }]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('alert.error'), t('settings.exportDataError'), [
        { text: t('alert.confirm') },
      ]);
    }
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
            unitId={unitIds.settings}
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
            {/* {__DEV__ && (
              <SettingItem
                icon={<Settings size={20} color="#EF4444" />}
                title="Sentry 테스트 (개발 모드)"
                subtitle="에러 모니터링 테스트 메시지 전송"
                onPress={() => {
                  testSentryIntegration();
                  Alert.alert(
                    'Sentry 테스트',
                    'Sentry 대시보드에서 테스트 에러를 확인해보세요.',
                    [{ text: '확인' }]
                  );
                }}
                iconColor="#EF4444"
                backgroundColor="#FEE2E2"
              />
            )} */}
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
            <SettingItem
              icon={<FileText size={20} color="#059669" />}
              title={t('settings.termsOfService')}
              subtitle={t('settings.termsOfServiceSubtitle')}
              onPress={handleTermsOfService}
              iconColor="#059669"
              backgroundColor="#ECFDF5"
            />
          </View>

          {/* Data Management Card */}
          <View className="rounded-3xl mt-4">
            <Text
              className="text-lg font-bold mb-4"
              style={{ color: colors.text }}
            >
              {t('settings.dataManagement')}
            </Text>
            <SettingItem
              icon={<Download size={20} color="#3B82F6" />}
              title={t('settings.exportData')}
              subtitle={t('settings.exportDataSubtitle')}
              onPress={handleExportData}
              iconColor="#3B82F6"
              backgroundColor="#EFF6FF"
            />
            <SettingItem
              icon={<Trash2 size={20} color="#EF4444" />}
              title={t('settings.deleteAllData')}
              subtitle={t('settings.deleteAllDataSubtitle')}
              onPress={handleDeleteAllData}
              iconColor="#EF4444"
              backgroundColor="#FEF2F2"
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
        onSubscriptionChange={async () => {
          await refreshSubscription();
          const newSub = await SubscriptionService.getCurrentSubscription();
          setShowAd(newSub?.planId === 'free');
        }}
      />
      <LegalDocumentModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title={t('settings.privacyPolicy')}
        content={PRIVACY_POLICY_CONTENT}
      />
      <LegalDocumentModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title={t('settings.termsOfService')}
        content={TERMS_OF_SERVICE_CONTENT}
      />
    </Animated.View>
  );
}
