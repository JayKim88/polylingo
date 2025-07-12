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

  // const handleAppLanguage = () => {
  //   setShowLanguageModal(true);
  // };

  const handleAbout = () => {
    Alert.alert(
      t('aboutModal.title'),
      `${t('aboutModal.version')}\n\n${t('aboutModal.description')}\n\n${t(
        'aboutModal.features'
      )}`,
      [{ text: t('alert.confirm') }]
    );
  };

  const handleFeedback = () => {
    Alert.alert(t('feedbackModal.title'), t('feedbackModal.message'), [
      { text: t('alert.confirm') },
    ]);
  };

  const handleRate = () => {
    Alert.alert(t('rateModal.title'), t('rateModal.message'), [
      { text: t('alert.later') },
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

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    iconColor = '#6B7280',
    backgroundColor = '#F3F4F6',
  }: SettingItemProps) => (
    <TouchableOpacity
      className="flex-row items-center rounded-2xl p-4 mb-3 shadow-sm"
      style={{ backgroundColor: colors.surface }}
      onPress={onPress}
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
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {showChevron && <ChevronRight size={20} color={colors.textTertiary} />}
    </TouchableOpacity>
  );

  return (
    <Animated.View
      style={{
        ...animatedStyle,
        backgroundColor: colors.background,
      }}
    >
      <View
        className="px-5 py-5 border-b"
        style={{
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        }}
      >
        <View className="flex-row items-center mb-2">
          <Settings size={32} color={colors.textSecondary} />
          <Text
            className="text-3xl font-bold ml-3"
            style={{ color: colors.text }}
          >
            {t('settings.title')}
          </Text>
        </View>
        <Text
          className="text-base font-medium ml-11"
          style={{ color: colors.textSecondary }}
        >
          {t('settings.subtitle')}
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mt-6 px-5">
          <Text
            className="text-lg font-bold mb-4"
            style={{ color: colors.text }}
          >
            {t('settings.appInfo')}
          </Text>
          <SettingItem
            icon={
              theme === 'dark' ? (
                <Sun size={20} color="#F59E0B" />
              ) : (
                <Moon size={20} color="#6366F1" />
              )
            }
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            subtitle={
              theme === 'dark'
                ? 'Switch to light theme'
                : 'Switch to dark theme'
            }
            onPress={handleThemeToggle}
            iconColor={theme === 'dark' ? '#F59E0B' : '#6366F1'}
            backgroundColor={theme === 'dark' ? '#FEF3C7' : '#E0E7FF'}
          />
          {/* <SettingItem
            icon={<Globe size={20} color="#8B5CF6" />}
            title={t('settings.appLanguage')}
            subtitle={t('settings.appLanguageSubtitle')}
            onPress={handleAppLanguage}
            iconColor="#8B5CF6"
            backgroundColor="#F3E8FF"
          /> */}
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

        <View className="mt-6 px-5">
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

        <View className="mt-6 px-5">
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

        <View className="items-center py-10 px-5">
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

      <AppLanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </Animated.View>
  );
}
