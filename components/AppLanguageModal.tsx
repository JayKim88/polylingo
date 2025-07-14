import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
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
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
];

export default function AppLanguageModal({
  visible,
  onClose,
}: AppLanguageModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const animateButton = (scale: Animated.Value, value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleLanguageSelect = async (selectedLanguage: string) => {
    try {
      await i18n.changeLanguage(selectedLanguage);
      console.log(`🌍 Language changed to: ${selectedLanguage}`);
      onClose();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
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
          className="rounded-t-3xl pb-8"
          style={{ maxHeight: height * 0.7, backgroundColor: colors.surface }}
        >
          <View
            className="flex-row justify-between items-center px-5 pt-5 pb-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {t('settings.appLanguage')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 justify-center items-center"
            >
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5 pt-6"
            showsVerticalScrollIndicator={false}
          >
            {languages.map((lang) => {
              const buttonScale = useRef(new Animated.Value(1)).current;

              return (
                <Animated.View
                  key={lang.code}
                  style={{ transform: [{ scale: buttonScale }] }}
                >
                  <TouchableOpacity
                    className="flex-row items-center justify-between rounded-2xl p-4 mb-3"
                    style={{ backgroundColor: colors.background }}
                    onPress={() => handleLanguageSelect(lang.code)}
                    onPressIn={() => animateButton(buttonScale, 0.95)}
                    onPressOut={() => animateButton(buttonScale, 1)}
                    activeOpacity={1}
                  >
                    <View className="flex-1">
                      <Text
                        className="text-lg font-semibold mb-1"
                        style={{ color: colors.text }}
                      >
                        {lang.nativeName}
                      </Text>
                      <Text
                        className="text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        {lang.name}
                      </Text>
                    </View>
                    {i18n.language === lang.code && (
                      <View
                        className="w-6 h-6 rounded-full justify-center items-center"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Check size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
