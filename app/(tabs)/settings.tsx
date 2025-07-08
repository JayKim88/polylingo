import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Settings,
  Info,
  MessageCircle,
  Star,
  Shield,
  Globe,
  ChevronRight,
  Languages,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import AppLanguageModal from '../../components/AppLanguageModal';

export default function SettingsTab() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

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

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    iconColor = '#6B7280',
    backgroundColor = '#F3F4F6',
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showChevron?: boolean;
    iconColor?: string;
    backgroundColor?: string;
  }) => (
    <TouchableOpacity
      className="flex-row items-center bg-white rounded-2xl p-4 mb-3 shadow-sm"
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
          <Text className="text-base font-semibold text-gray-800 mb-0.5">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-sm text-gray-500">{subtitle}</Text>
          )}
        </View>
      </View>
      {showChevron && <ChevronRight size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50"
      style={{ paddingBottom: insets.bottom - 50 }}
    >
      <View className="px-5 py-5 bg-white border-b border-gray-200">
        <View className="flex-row items-center mb-2">
          <Settings size={32} color="#6B7280" />
          <Text className="text-3xl font-bold text-gray-800 ml-3">
            {t('settings.title')}
          </Text>
        </View>
        <Text className="text-base font-medium text-gray-500 ml-11">
          {t('settings.subtitle')}
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mt-6 px-5">
          <Text className="text-lg font-bold text-gray-700 mb-4">
            {t('settings.appInfo')}
          </Text>
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
          <Text className="text-lg font-bold text-gray-700 mb-4">
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
          <Text className="text-lg font-bold text-gray-700 mb-4">
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
          <Text className="text-base font-medium text-gray-500 mb-2">
            Made with ❤️ for multilingual learners
          </Text>
          <Text className="text-sm text-gray-400">Version 1.0.0</Text>
        </View>
      </ScrollView>

      <AppLanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </SafeAreaView>
  );
}
