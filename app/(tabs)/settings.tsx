import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import {
  Settings,
  Info,
  MessageCircle,
  Star,
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

import AppLanguageModal from '../../components/AppLanguageModal';

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
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const { theme, colors, toggleTheme } = useTheme();
  const { animatedStyle } = useTabSlideAnimation();

  const headerAnimValue = useRef(new Animated.Value(1)).current;
  const contentAnimValue = useRef(new Animated.Value(0)).current;
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleAbout = () => {
    Alert.alert(
      t('settings.aboutTitle'),
      `${t('settings.aboutVersion')}\n\n${t('settings.aboutSubtitle')}\n\n${t(
        'settings.aboutFeatures'
      )}\n\n${t('settings.aboutBuiltWith')}\n\n${t('settings.aboutCopyright')}`,
      [{ text: t('settings.aboutButton') }]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      'Send Feedback',
      `We'd love to hear from you! 💬\n\nHelp us improve Polyglot Dictionary by sharing:\n\n• Feature requests\n• Bug reports\n• Language accuracy feedback\n• UI/UX suggestions\n• General thoughts\n\nYour feedback helps us make the app better for everyone!\n\nContact: feedback@polyglot-dictionary.com`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Send Feedback', onPress: () => {} },
      ]
    );
  };

  const handleRate = () => {
    Alert.alert(
      'Rate Our App ⭐',
      `Enjoying Polyglot Dictionary?\n\nYour rating helps others discover our app and motivates us to keep improving!\n\n⭐⭐⭐⭐⭐\n\n• Quick & accurate translations\n• Beautiful, intuitive interface\n• Regular updates & new features\n• Free with premium features\n\nIt only takes 30 seconds and means the world to us! 🙏`,
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Rate 5 Stars ⭐', onPress: () => {} },
      ]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Policy 🔒',
      `Your Privacy Matters\n\nWe are committed to protecting your privacy:\n\n✅ No personal data collection\n✅ Translations processed securely\n✅ No tracking or analytics\n✅ Local storage only for your convenience\n✅ No ads or data selling\n\nYour translation data stays on your device and is only sent to our secure servers for processing.\n\nLast updated: December 2024\n\nFor full details, visit: polyglot-dictionary.com/privacy`,
      [{ text: 'Understood' }]
    );
  };

  const handleLanguageSupport = () => {
    Alert.alert(
      'Supported Languages 🌍',
      `14 Languages Available:\n\n🌏 Asian: Chinese, Japanese, Korean, Thai, Hindi, Arabic, Indonesian\n\n🌍 European: English, Spanish, French, German, Italian, Portuguese, Russian\n\nNew languages added regularly!\n\nLanguage not available? Let us know:\nlanguages@polyglot-dictionary.com`,
      [{ text: 'Great!' }]
    );
  };

  const handleFeatures = () => {
    Alert.alert(
      'App Features 🚀',
      `Powerful Translation Tools:\n\n🗣️ Voice Input: Speak to translate\n🔊 Text-to-Speech: Hear pronunciations\n❤️ Favorites: Save important translations\n📚 History: Access past translations\n📅 Date Filtering: Find translations by date\n🌙 Dark Mode: Easy on the eyes\n⚡ Instant Results: Lightning-fast translations\n🎯 Accurate: AI-powered precision\n🎨 Beautiful UI: Clean, modern design\n📱 Cross-platform: Works on iOS & Android\n\nMore features coming soon!`,
      [{ text: 'Awesome!' }]
    );
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
            <SettingItem
              icon={<Star size={20} color="#EF4444" />}
              title={t('settings.rate')}
              subtitle={t('settings.rateSubtitle')}
              onPress={handleRate}
              iconColor="#EF4444"
              backgroundColor="#FEF2F2"
            />
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
              Version 1.0.0
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      <AppLanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </Animated.View>
  );
}
