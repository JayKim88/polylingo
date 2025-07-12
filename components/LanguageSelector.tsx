import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Language, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type LanguageSelectorProps = {
  selectedLanguage: string;
  onLanguageSelect: (languageCode: string) => void;
  selectedLanguages: string[];
  onOpen: () => void;
};

export default function LanguageSelector({
  selectedLanguage,
  onLanguageSelect,
  selectedLanguages,
  onOpen,
}: LanguageSelectorProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = React.useState(false);

  const selectedLang = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === selectedLanguage
  );

  useEffect(() => {
    if (!isVisible) return;
    onOpen();
  }, [isVisible]);

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      className={`flex-row items-center p-4 rounded-xl mb-2 ${
        item.code === selectedLanguage ? 'bg-blue-50' : ''
      }`}
      onPress={() => {
        onLanguageSelect(item.code);
        setIsVisible(false);
      }}
    >
      <Text className="text-2xl">{item.flag}</Text>
      <View className="flex-1 ml-3">
        <Text className="text-base font-semibold text-gray-700">
          {item.name}
        </Text>
        <Text className="text-sm text-gray-500 mt-0.5">{item.nativeName}</Text>
      </View>
    </TouchableOpacity>
  );

  const filteredLanguages = selectedLanguages
    .map((code) => SUPPORTED_LANGUAGES.find((lang) => lang.code === code)!)
    .filter(Boolean);

  return (
    <View className="mb-4 flex-1">
      <TouchableOpacity
        className="flex-row items-center p-3 bg-white rounded-2xl px-4 py-3 shadow-sm min-h-[56px]"
        onPress={() => setIsVisible(true)}
      >
        <Text className="text-2xl mr-3">{selectedLang?.flag}</Text>
        <Text className="flex-1 text-base text-gray-700 font-medium">
          {selectedLang?.name}
        </Text>
        <ChevronDown size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-5 w-[90%] max-h-[70%]">
            <Text className="text-lg font-bold text-center mb-5 text-gray-900">
              {t('sourceLanguage.title')}
            </Text>
            <FlatList
              data={filteredLanguages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              className="max-h-[400px]"
            />
            <TouchableOpacity
              className="mt-4 p-3 bg-gray-100 rounded-xl items-center"
              onPress={() => setIsVisible(false)}
            >
              <Text className="text-base text-gray-700 font-semibold">
                {t('sourceLanguage.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
