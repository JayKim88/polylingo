import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { X, Check, RotateCcw } from 'lucide-react-native';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: string | null;
  markedDates: string[];
  onDateSelect: (date: string | null) => void;
  onClose: () => void;
}

export default function DatePickerModal({
  visible,
  selectedDate,
  markedDates,
  onDateSelect,
  onClose,
}: DatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [tempSelectedDate, setTempSelectedDate] = useState<string | null>(selectedDate);

  const handleDayPress = (day: any) => {
    setTempSelectedDate(day.dateString);
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
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
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
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Text style={styles.title}>날짜 선택</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.subtitle}>
              {tempSelectedDate 
                ? `선택된 날짜: ${formatDate(tempSelectedDate)}` 
                : '날짜를 선택하세요 (선택 안함 = 전체 보기)'
              }
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
              style={styles.calendar}
            />
          </View>

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClear}
            >
              <RotateCcw size={18} color="#6B7280" />
              <Text style={styles.clearButtonText}>전체 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  calendar: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  clearButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#6366F1',
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});