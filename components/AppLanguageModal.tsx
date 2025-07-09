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
          className="bg-white rounded-t-3xl px-5 pt-5 pb-8"
          style={{ maxHeight: height * 0.7 }}
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold text-gray-800">
              {t('settings.appLanguage')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 justify-center items-center"
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                className="flex-row items-center justify-between bg-gray-50 rounded-2xl p-4 mb-3"
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800 mb-1">
                    {lang.nativeName}
                  </Text>
                  <Text className="text-sm text-gray-500">{lang.name}</Text>
                </View>
                {i18n.language === lang.code && (
                  <View className="w-6 h-6 bg-blue-500 rounded-full justify-center items-center">
                    <Check size={16} color="#fff" />
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
