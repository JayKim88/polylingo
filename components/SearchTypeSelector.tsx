import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SearchType } from '../types/dictionary';
import { Type, MessageSquare } from 'lucide-react-native';

interface SearchTypeSelectorProps {
  selectedType: SearchType;
  onTypeSelect: (type: SearchType) => void;
}

export default function SearchTypeSelector({ selectedType, onTypeSelect }: SearchTypeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>검색 유형</Text>
      <View style={styles.selector}>
        <TouchableOpacity
          style={[
            styles.option,
            selectedType === 'word' && styles.selectedOption
          ]}
          onPress={() => onTypeSelect('word')}
        >
          <Type 
            size={20} 
            color={selectedType === 'word' ? '#FFFFFF' : '#6B7280'} 
          />
          <Text style={[
            styles.optionText,
            selectedType === 'word' && styles.selectedOptionText
          ]}>
            단어
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.option,
            selectedType === 'sentence' && styles.selectedOption
          ]}
          onPress={() => onTypeSelect('sentence')}
        >
          <MessageSquare 
            size={20} 
            color={selectedType === 'sentence' ? '#FFFFFF' : '#6B7280'} 
          />
          <Text style={[
            styles.optionText,
            selectedType === 'sentence' && styles.selectedOptionText
          ]}>
            문장
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 12,
  },
  selector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  selectedOption: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginLeft: 8,
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
});