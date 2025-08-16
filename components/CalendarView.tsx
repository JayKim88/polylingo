import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { getDateString } from '@/utils/userService';

type CalendarViewProps = {
  markedDates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  markColor: string;
};

export default function CalendarView({
  markedDates,
  selectedDate,
  onDateSelect,
  markColor,
}: CalendarViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    const days = [];
    const weekDays = t('calendar.weekDays', {
      returnObjects: true,
    }) as string[];

    // Week day headers
    const weekHeaders = weekDays.map((day, index) => (
      <View key={`header-${index}`} className="flex-1 items-center py-2">
        <Text
          className="text-sm font-semibold"
          style={{ color: colors.textSecondary }}
        >
          {day}
        </Text>
      </View>
    ));

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateString(year, month, day);
      const isMarked = markedDates.includes(dateString);
      const isSelected = selectedDate === dateString;
      const isToday = dateString === getDateString();

      days.push(
        <TouchableOpacity
          key={day}
          className="relative justify-center items-center rounded-lg"
          style={{
            width: '14.28%',
            aspectRatio: 1,
            backgroundColor: isSelected
              ? colors.primary
              : isToday
              ? colors.primaryContainer
              : 'transparent',
          }}
          onPress={() => onDateSelect(isSelected ? null : dateString)}
        >
          <Text
            className="text-base font-medium"
            style={{
              color: isSelected
                ? '#FFFFFF'
                : isToday
                ? colors.primary
                : colors.text,
              fontWeight: isSelected || isToday ? 'bold' : 'normal',
            }}
          >
            {day}
          </Text>
          {isMarked && (
            <View
              className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isSelected ? '#FFFFFF' : markColor,
              }}
            />
          )}
        </TouchableOpacity>
      );
    }

    return (
      <View className="mb-4">
        <View className="flex-row mb-2">{weekHeaders}</View>
        <View className="flex-row flex-wrap">{days}</View>
      </View>
    );
  };

  const monthNames = t('calendar.months', { returnObjects: true }) as string[];

  return (
    <View
      className="m-5 rounded-2xl p-5 shadow-sm"
      style={{ backgroundColor: colors.surface }}
    >
      <View className="flex-row justify-between items-center mb-5">
        <TouchableOpacity
          className="p-2 rounded-lg"
          style={{ backgroundColor: colors.background }}
          onPress={() => navigateMonth('prev')}
        >
          <ChevronLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text className="text-lg font-bold" style={{ color: colors.text }}>
          {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
        </Text>

        <TouchableOpacity
          className="p-2 rounded-lg"
          style={{ backgroundColor: colors.background }}
          onPress={() => navigateMonth('next')}
        >
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {renderCalendar()}

      <View
        className="flex-row justify-between items-center pt-4 border-t"
        style={{ borderTopColor: colors.borderLight }}
      >
        <View className="flex-row items-center">
          <View
            className="w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: markColor }}
          />
          <Text className="text-sm" style={{ color: colors.textSecondary }}>
            기록이 있는 날
          </Text>
        </View>
        {selectedDate && (
          <TouchableOpacity
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: colors.background }}
            onPress={() => onDateSelect(null)}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.text }}
            >
              {t('datePicker.all')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
