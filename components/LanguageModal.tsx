import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Language, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { X, Check, GripVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LanguageModalProps {
  visible: boolean;
  selectedLanguages: string[];
  onLanguageSelection: (languages: string[]) => void;
  onClose: () => void;
}

export default function LanguageModal({
  visible,
  selectedLanguages,
  onLanguageSelection,
  onClose,
}: LanguageModalProps) {
  const insets = useSafeAreaInsets();
  const [tempSelected, setTempSelected] = useState<string[]>(selectedLanguages);

  const toggleLanguage = (languageCode: string) => {
    if (tempSelected.includes(languageCode)) {
      setTempSelected(tempSelected.filter((code) => code !== languageCode));
    } else {
      setTempSelected([...tempSelected, languageCode]);
    }
  };

  const getSortedLanguages = () => {
    // 선택된 언어들을 순서대로 정렬하고, 선택되지 않은 언어들을 뒤에 추가
    const selectedLanguages = tempSelected
      .map((code) => SUPPORTED_LANGUAGES.find((lang) => lang.code === code)!)
      .filter(Boolean);
    
    const unselectedLanguages = SUPPORTED_LANGUAGES.filter(
      (lang) => !tempSelected.includes(lang.code)
    );
    
    return [...selectedLanguages, ...unselectedLanguages];
  };

  const handleConfirm = () => {
    onLanguageSelection(tempSelected);
  };

  const handleCancel = () => {
    setTempSelected(selectedLanguages);
    onClose();
  };

  const renderLanguageItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<Language>) => {
    const isSelected = tempSelected.includes(item.code);
    
    return (
      <View className={`mb-2 ${isActive ? 'opacity-80' : ''}`}>
        <TouchableOpacity
          className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
            isSelected 
              ? 'bg-indigo-50 border-indigo-500' 
              : 'bg-gray-50 border-gray-50'
          }`}
          onPress={() => toggleLanguage(item.code)}
          onLongPress={isSelected ? drag : undefined}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-3">{item.flag}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-700">
                {item.name}
              </Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                {item.nativeName}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            {isSelected && <Check size={20} color="#6366F1" />}
            {isSelected && (
              <View className="ml-2">
                <GripVertical size={16} color="#6366F1" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-row justify-between items-center px-5 pt-5 pb-4 border-b border-gray-200">
            <Text className="text-xl font-bold text-gray-900">
              번역할 언어 선택
            </Text>
            <TouchableOpacity onPress={handleCancel} className="p-2">
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-5 pt-6">
            <Text className="text-sm font-medium text-gray-500 mb-5">
              {tempSelected.length > 0 
                ? `${tempSelected.length}개 언어가 선택됨 - 선택된 언어를 길게 눌러서 순서 변경` 
                : '번역할 언어를 선택하세요 (최소 2개)'
              }
            </Text>

            <DraggableFlatList
              data={getSortedLanguages()}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              onDragEnd={({ data }) => {
                // 선택된 언어들만 순서 변경, 선택되지 않은 언어들은 그대로 유지
                const newSelectedOrder = data
                  .filter(item => tempSelected.includes(item.code))
                  .map(item => item.code);
                
                setTempSelected(newSelectedOrder);
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>

          <View
            className="flex-row px-5 py-6 border-t border-gray-200 gap-3 bg-white"
            style={{ paddingBottom: Math.max(insets.bottom, 20) + 14 }}
          >
            <TouchableOpacity
              className="flex-1 py-3 px-4 rounded-xl items-center bg-gray-50 border border-gray-300"
              onPress={handleCancel}
            >
              <Text className="text-sm font-semibold text-gray-500">취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 px-4 rounded-xl items-center ${
                tempSelected.length < 2 ? 'bg-gray-400' : 'bg-indigo-500'
              }`}
              onPress={handleConfirm}
              disabled={tempSelected.length < 2}
            >
              <Text className="text-sm font-semibold text-white">확인</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
