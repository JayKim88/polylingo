import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface CalendarViewProps {
  markedDates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  markColor: string;
}

export default function CalendarView({
  markedDates,
  selectedDate,
  onDateSelect,
  markColor,
}: CalendarViewProps) {
  const { t } = useTranslation();
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
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    // Week day headers
    const weekHeaders = weekDays.map((day, index) => (
      <View key={`header-${index}`} className="flex-1 items-center py-2">
        <Text className="text-sm font-semibold text-gray-500">{day}</Text>
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
      const isToday = dateString === new Date().toISOString().split('T')[0];

      days.push(
        <TouchableOpacity
          key={day}
          className={`relative justify-center items-center ${
            isSelected
              ? 'bg-indigo-600 rounded-lg'
              : isToday
              ? 'bg-gray-100 rounded-lg'
              : ''
          }`}
          style={{ width: '14.28%', aspectRatio: 1 }}
          onPress={() => onDateSelect(isSelected ? null : dateString)}
        >
          <Text
            className={`text-base font-medium ${
              isSelected
                ? 'text-white font-bold'
                : isToday
                ? 'text-indigo-600 font-bold'
                : 'text-gray-700'
            }`}
          >
            {day}
          </Text>
          {isMarked && (
            <View
              className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                isSelected ? 'bg-white' : ''
              }`}
              style={!isSelected ? { backgroundColor: markColor } : {}}
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

  const monthNames = [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ];

  return (
    <View className="bg-white m-5 rounded-2xl p-5 shadow-sm">
      <View className="flex-row justify-between items-center mb-5">
        <TouchableOpacity
          className="p-2 rounded-lg bg-gray-50"
          onPress={() => navigateMonth('prev')}
        >
          <ChevronLeft size={20} color="#6B7280" />
        </TouchableOpacity>

        <Text className="text-lg font-bold text-gray-800">
          {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
        </Text>

        <TouchableOpacity
          className="p-2 rounded-lg bg-gray-50"
          onPress={() => navigateMonth('next')}
        >
          <ChevronRight size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {renderCalendar()}

      <View className="flex-row justify-between items-center pt-4 border-t border-gray-100">
        <View className="flex-row items-center">
          <View
            className="w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: markColor }}
          />
          <Text className="text-sm text-gray-500">기록이 있는 날</Text>
        </View>
        {selectedDate && (
          <TouchableOpacity
            className="px-3 py-1.5 bg-gray-100 rounded-lg"
            onPress={() => onDateSelect(null)}
          >
            <Text className="text-sm font-semibold text-gray-700">
              {t('datePicker.all')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
