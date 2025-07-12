import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

type AppLanguageModalProps = {
  visible: boolean;
  onClose: () => void;
};

const { height } = Dimensions.get('window');

const languages: { code: string; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

export default function AppLanguageModal({
  visible,
  onClose,
}: AppLanguageModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const handleLanguageSelect = async (selectedLanguage: string) => {
    await i18n.changeLanguage(selectedLanguage);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View
          className="rounded-t-3xl px-5 pt-5 pb-8"
          style={{ maxHeight: height * 0.7, backgroundColor: colors.surface }}
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold" style={{ color: colors.text }}>
              {t('settings.appLanguage')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 justify-center items-center"
            >
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                className="flex-row items-center justify-between rounded-2xl p-4 mb-3"
                style={{ backgroundColor: colors.background }}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <View className="flex-1">
                  <Text className="text-lg font-semibold mb-1" style={{ color: colors.text }}>
                    {lang.nativeName}
                  </Text>
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>{lang.name}</Text>
                </View>
                {i18n.language === lang.code && (
                  <View className="w-6 h-6 rounded-full justify-center items-center" style={{ backgroundColor: colors.primary }}>
                    <Check size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
