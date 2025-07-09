import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { X, Check, RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

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
  const [tempSelectedDate, setTempSelectedDate] = useState<string | null>(
    selectedDate
  );

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  };

  const calendarMarkedDates = markedDates.reduce((acc, date) => {
    acc[date] = {
      marked: true,
      dotColor: '#6366F1',
    };
    return acc;
  }, {} as any);

  // If there's a selected date, add selection styling
  if (tempSelectedDate) {
    calendarMarkedDates[tempSelectedDate] = {
      ...calendarMarkedDates[tempSelectedDate],
      selected: true,
      selectedColor: '#6366F1',
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
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView
          className="flex-1 bg-white"
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-row justify-between items-center px-5 pt-5 pb-4 border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-900">
              {t('datePicker.title')}
            </Text>
            <TouchableOpacity onPress={handleCancel} className="p-2">
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-5 pt-6">
            <Text className="text-sm font-medium text-gray-500 mb-6 text-center">
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
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#6B7280',
                selectedDayBackgroundColor: '#6366F1',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#6366F1',
                dayTextColor: '#111827',
                textDisabledColor: '#D1D5DB',
                dotColor: '#6366F1',
                selectedDotColor: '#FFFFFF',
                arrowColor: '#6366F1',
                disabledArrowColor: '#D1D5DB',
                monthTextColor: '#111827',
                indicatorColor: '#6366F1',
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
              }}
            />
          </View>

          <View
            className="flex-row px-5 py-6 border-t border-gray-100 gap-3 bg-white"
            style={{ paddingBottom: Math.max(insets.bottom, 20) + 14 }}
          >
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl gap-2 bg-gray-50 border border-gray-200"
              onPress={handleClear}
            >
              <RotateCcw size={18} color="#6B7280" />
              <Text className="text-sm font-semibold text-gray-500">
                {t('datePicker.all')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl gap-2 bg-indigo-500"
              onPress={handleConfirm}
            >
              <Check size={18} color="#FFFFFF" />
              <Text className="text-sm font-semibold text-white">
                {t('alert.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
