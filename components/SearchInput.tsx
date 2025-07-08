import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onSearch?: () => void;
  placeholder: string;
  isVoiceActive?: boolean;
  editable?: boolean;
}

export default function SearchInput({
  value,
  onChangeText,
  onClear,
  onSearch,
  placeholder,
  isVoiceActive,
  editable = true,
}: SearchInputProps) {
  return (
    <View className="flex-1 flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm min-h-[56px]">
      <Search size={20} color="#9CA3AF" className="mr-3" />
      <TextInput
        className="flex-1 text-lg text-gray-900 leading-[18px] pl-2"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isVoiceActive ? "#EF4444" : "#9CA3AF"}
        keyboardType="default"
        autoCorrect={false}
        autoCapitalize="none"
        textContentType="none"
        returnKeyType="search"
        textAlignVertical="center"
        editable={editable}
        onSubmitEditing={onSearch}
      />
      {value ? (
        <TouchableOpacity onPress={onClear} className="p-1 ml-2">
          <X size={20} color="#9CA3AF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
