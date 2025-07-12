import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: () => void;
  onClear: () => void;
  placeholder: string;
  isLoading?: boolean;
  maxLength: number;
  disabled?: boolean;
}

export default function SearchInput({
  value,
  onChangeText,
  onSearch,
  onClear,
  placeholder,
  isLoading,
  maxLength,
  disabled = false,
}: SearchInputProps) {
  return (
    <View className="flex-row mb-5">
      <View className="flex-1 flex-row items-center bg-white rounded-2xl px-4 py-323 shadow-sm min-h-[56px] relative">
        <Search size={20} color="#9CA3AF" className="mr-3" />
        <TextInput
          className={`flex-1 text-lg leading-[18px] pl-2 pr-20 ${
            disabled ? 'text-gray-400' : 'text-gray-900'
          }`}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={onSearch}
          keyboardType="default"
          autoCorrect={false}
          autoCapitalize="none"
          textContentType="none"
          returnKeyType="search"
          textAlignVertical="center"
          maxLength={maxLength}
          editable={!disabled}
        />
        <View className="absolute right-4 flex-row items-center h-full">
          {value ? (
            <TouchableOpacity onPress={onClear} className="p-1 mr-1">
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
          <Text className="text-xs text-gray-400">
            {value.length} / {maxLength}
          </Text>
        </View>
      </View>
    </View>
  );
}
