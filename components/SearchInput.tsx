import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Search, X } from 'lucide-react-native';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: () => void;
  onClear: () => void;
  placeholder: string;
  isLoading?: boolean;
}

export default function SearchInput({
  value,
  onChangeText,
  onSearch,
  onClear,
  placeholder,
  isLoading,
}: SearchInputProps) {
  return (
    <View className="flex-row mb-5">
      <View className="flex-1 flex-row items-center bg-white rounded-2xl px-4 py-3 mr-3 shadow-sm min-h-[56px]">
        <Search size={20} color="#9CA3AF" className="mr-3" />
        <TextInput
          className="flex-1 text-lg text-gray-900 leading-[18px] pl-2"
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
        />
        {value ? (
          <TouchableOpacity onPress={onClear} className="p-1 ml-2">
            <X size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        className={`justify-center items-center rounded-2xl shadow-sm w-16 h-16 ${
          isLoading || !value.trim() ? 'bg-gray-400' : 'bg-blue-500'
        }`}
        onPress={onSearch}
        disabled={isLoading || !value.trim()}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Search size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}
