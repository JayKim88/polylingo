import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { X, Check, RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../contexts/ThemeContext';

type DatePickerModalProps = {
  visible: boolean;
  selectedDate: string | null;
  markedDates: string[];
  onDateSelect: (date: string | null) => void;
  onClose: () => void;
};

export default function DatePickerModal({
  visible,
  selectedDate,
  markedDates,
  onDateSelect,
  onClose,
}: DatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tempSelectedDate, setTempSelectedDate] = useState<string | null>(
    selectedDate
  );
  const clearButtonScale = useRef(new Animated.Value(1)).current;
  const confirmButtonScale = useRef(new Animated.Value(1)).current;

  const handleDayPress = (day: any) => {
    if (markedDates.includes(day.dateString)) {
      setTempSelectedDate(day.dateString);
    }
  };

  const handleConfirm = () => {
    onDateSelect(tempSelectedDate);
    onClose();
  };

  const handleClear = () => {
    setTempSelectedDate(null);
  };

  const handleCancel = () => {
    setTempSelectedDate(selectedDate);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  };

  const calendarMarkedDates = markedDates.reduce((acc, date) => {
    acc[date] = {
      marked: true,
      dotColor: colors.primary,
    };
    return acc;
  }, {} as any);

  // If there's a selected date, add selection styling
  if (tempSelectedDate) {
    calendarMarkedDates[tempSelectedDate] = {
      ...calendarMarkedDates[tempSelectedDate],
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: '#FFFFFF',
    };
  }

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
          style={{ backgroundColor: colors.background }}
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            className="flex-row justify-between items-center px-5 pt-5 pb-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {t('datePicker.title')}
            </Text>
            <TouchableOpacity onPress={handleCancel} className="p-2">
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-5 pt-6">
            <Text
              className="text-sm font-medium mb-6 text-center"
              style={{ color: colors.textSecondary }}
            >
              {tempSelectedDate
                ? `${t('datePicker.selectedDate')}: ${formatDate(
                    tempSelectedDate
                  )}`
                : t('datePicker.selectDate')}
            </Text>

            <Calendar
              onDayPress={handleDayPress}
              markedDates={calendarMarkedDates}
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: colors.textTertiary,
                dotColor: colors.primary,
                selectedDotColor: '#FFFFFF',
                arrowColor: colors.primary,
                disabledArrowColor: colors.textTertiary,
                monthTextColor: colors.text,
                indicatorColor: colors.primary,
                textDayFontFamily: 'Inter-Regular',
                textMonthFontFamily: 'Inter-SemiBold',
                textDayHeaderFontFamily: 'Inter-Medium',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              className="rounded-2xl shadow-sm mb-5"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                borderRadius: 16,
                overflow: 'hidden',
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
              style={{ transform: [{ scale: clearButtonScale }], flex: 1 }}
            >
              <TouchableOpacity
                className="flex-row items-center justify-center py-3 px-4 rounded-xl gap-2 border"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }}
                onPress={handleClear}
                onPressIn={() => animateButton(clearButtonScale, 0.95)}
                onPressOut={() => animateButton(clearButtonScale, 1)}
                activeOpacity={1}
              >
                <RotateCcw size={18} color={colors.textSecondary} />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.textSecondary }}
                >
                  {t('datePicker.all')}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={{ transform: [{ scale: confirmButtonScale }], flex: 1 }}
            >
              <TouchableOpacity
                className="flex-row items-center justify-center py-3 px-4 rounded-xl gap-2"
                style={{ backgroundColor: colors.primary }}
                onPress={handleConfirm}
                onPressIn={() => animateButton(confirmButtonScale, 0.95)}
                onPressOut={() => animateButton(confirmButtonScale, 1)}
                activeOpacity={1}
              >
                <Check size={18} color="#FFFFFF" />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: '#FFFFFF' }}
                >
                  {t('alert.confirm')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
