import React from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
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
  isLoading 
}: SearchInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline
          onSubmitEditing={onSearch}
          blurOnSubmit={false}
        />
        {value ? (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <X size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      <TouchableOpacity 
        style={[
          styles.searchButton,
          (isLoading || !value.trim()) && styles.searchButtonDisabled
        ]}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 56,
  },
  searchIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    maxHeight: 120,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: 56,
    height: 56,
    backgroundColor: '#3B82F6',
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});