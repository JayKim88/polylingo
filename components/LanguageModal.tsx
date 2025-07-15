import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  Animated,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Language, SUPPORTED_LANGUAGES } from '../types/dictionary';
import { X, Check, GripVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { SubscriptionService } from '../utils/subscriptionService';

type LanguageModalProps = {
  visible: boolean;
  selectedLanguages: string[];
  onLanguageSelection: (languages: string[]) => void;
  onClose: () => void;
};

export default function LanguageModal({
  visible,
  selectedLanguages,
  onLanguageSelection,
  onClose,
}: LanguageModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [tempSelected, setTempSelected] = useState<string[]>(selectedLanguages);
  const [maxSelectable, setMaxSelectable] = useState<number>(3);
  const [isPaidUser, setIsPaidUser] = useState<boolean>(false);
  const cancelButtonScale = useRef(new Animated.Value(1)).current;
  const confirmButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadMaxLanguages = async () => {
      const maxLangs = await SubscriptionService.getMaxLanguages();
      const isPremium = await SubscriptionService.isPremiumUser();

      setMaxSelectable(maxLangs);
      setIsPaidUser(isPremium);
    };

    if (visible) {
      loadMaxLanguages();
    }
  }, [visible]);

  const toggleLanguage = (languageCode: string) => {
    if (tempSelected.includes(languageCode)) {
      setTempSelected(tempSelected.filter((code) => code !== languageCode));
    } else if (tempSelected.length < maxSelectable) {
      setTempSelected([...tempSelected, languageCode]);
    }
  };

  const getSortedLanguages = () => {
    const selectedLanguages = tempSelected
      .map((code) => SUPPORTED_LANGUAGES.find((lang) => lang.code === code)!)
      .filter(Boolean);
    const unselectedLanguages = SUPPORTED_LANGUAGES.filter(
      (lang) => !tempSelected.includes(lang.code)
    );

    return [...selectedLanguages, ...unselectedLanguages];
  };

  const handleConfirm = () => onLanguageSelection(tempSelected);

  const handleCancel = () => {
    setTempSelected(selectedLanguages);
    onClose();
  };

  const animateButton = (scale: Animated.Value, value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const renderLanguageItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<Language>) => {
    const isSelected = tempSelected.includes(item.code);
    const isDisabled = !isSelected && tempSelected.length >= maxSelectable;

    return (
      <View className={`mb-2 ${isActive ? 'opacity-80' : ''}`}>
        <TouchableOpacity
          className="flex-row items-center justify-between p-4 rounded-xl border-2"
          style={{
            backgroundColor: isSelected
              ? colors.primaryContainer
              : isDisabled
              ? colors.borderLight
              : colors.surface,
            borderColor: isSelected
              ? colors.primary
              : isDisabled
              ? colors.border
              : colors.surface,
          }}
          onPress={() => toggleLanguage(item.code)}
          onLongPress={isSelected ? drag : undefined}
          activeOpacity={isDisabled ? 0.5 : 0.7}
          disabled={isDisabled}
        >
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-3">{item.flag}</Text>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: colors.text }}
              >
                {item.name}
              </Text>
              <Text
                className="text-sm mt-0.5"
                style={{ color: colors.textSecondary }}
              >
                {item.nativeName}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            {isSelected && <Check size={20} color={colors.primary} />}
            {isSelected && (
              <View className="ml-2">
                <GripVertical size={16} color={colors.primary} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  useEffect(() => {
    setTempSelected(selectedLanguages);
  }, [selectedLanguages]);

  const buttonAreaHeight =
    48 + // py-6 (24px top + 24px bottom)
    Math.max(insets.bottom, 20) +
    14; // bottom padding calculation

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            className="flex-row justify-between items-center px-5 pt-5 pb-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {t('languageModal.title')}
            </Text>
            <TouchableOpacity onPress={handleCancel} className="p-2">
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View className="flex-1 px-5 pt-6">
            <View className="mb-5">
              <Text
                className="text-sm font-medium mb-2"
                style={{ color: colors.textSecondary }}
              >
                {tempSelected.length > 0
                  ? t('languageModal.selectedLanguages', {
                      count: tempSelected.length,
                    })
                  : t('languageModal.selectPrompt')}
              </Text>
              <Text className="text-xs" style={{ color: colors.textTertiary }}>
                {isPaidUser
                  ? t('languageModal.selectUpToPremium', {
                      count: maxSelectable,
                    })
                  : t('languageModal.selectUpToFree', { count: maxSelectable })}
              </Text>
            </View>
            <DraggableFlatList
              data={getSortedLanguages()}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              onDragBegin={(index) => {
                // Only allow dragging selected languages
                const selectedCount = tempSelected.length;
                if (index >= selectedCount) {
                  return false; // Prevent drag from starting
                }
              }}
              onDragEnd={({ data, from, to }) => {
                // Only allow reordering within selected languages
                const selectedCount = tempSelected.length;

                // If trying to move a selected language outside the selected section, cancel the move
                if (from < selectedCount && to >= selectedCount) {
                  return; // Cancel the drag operation
                }

                // If trying to move an unselected language, cancel the move
                if (from >= selectedCount) {
                  return; // Cancel the drag operation
                }

                // Only reorder within selected languages
                const newSelectedOrder = data
                  .slice(0, selectedCount) // Only take the selected languages portion
                  .map((item) => item.code);

                setTempSelected(newSelectedOrder);
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              containerStyle={{
                paddingBottom: buttonAreaHeight,
              }}
            />
          </View>

          <View
            className="flex-row px-5 py-6 border-t gap-3"
            style={{
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 20) + 14,
            }}
          >
            <Animated.View
              style={{ transform: [{ scale: cancelButtonScale }], flex: 1 }}
            >
              <TouchableOpacity
                className="py-3 px-4 rounded-xl items-center border"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                }}
                onPress={handleCancel}
                onPressIn={() => animateButton(cancelButtonScale, 0.95)}
                onPressOut={() => animateButton(cancelButtonScale, 1)}
                activeOpacity={1}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.textSecondary }}
                >
                  {t('languageModal.cancel')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View
              style={{ transform: [{ scale: confirmButtonScale }], flex: 1 }}
            >
              <TouchableOpacity
                className="py-3 px-4 rounded-xl items-center"
                style={{
                  backgroundColor:
                    tempSelected.length < 2
                      ? colors.textTertiary
                      : colors.primary,
                }}
                onPress={handleConfirm}
                disabled={tempSelected.length < 2}
                onPressIn={() =>
                  tempSelected.length >= 2 &&
                  animateButton(confirmButtonScale, 0.95)
                }
                onPressOut={() => animateButton(confirmButtonScale, 1)}
                activeOpacity={1}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: '#FFFFFF' }}
                >
                  {t('languageModal.confirm')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
