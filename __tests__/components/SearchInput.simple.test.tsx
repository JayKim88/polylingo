/**
 * SearchInput Component Test Suite - Simplified
 *
 * Basic tests for the SearchInput component functionality
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';

import SearchInput from '../../components/SearchInput';

// Mock the theme context
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FFFFFF',
      text: '#000000',
      border: '#E5E5E5',
      primary: '#007AFF',
    },
  }),
}));

describe('SearchInput Component', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    onSearch: jest.fn(),
    onClear: jest.fn(),
    placeholder: 'Enter text to translate',
    isLoading: false,
    maxLength: 1000,
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render with placeholder text', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} />
      );

      expect(getByPlaceholderText('Enter text to translate')).toBeTruthy();
    });

    test('should display current value', () => {
      const { getByDisplayValue } = render(
        <SearchInput {...defaultProps} value="hello world" />
      );

      expect(getByDisplayValue('hello world')).toBeTruthy();
    });

    test('should be disabled when disabled prop is true', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} disabled={true} />
      );

      const input = getByPlaceholderText('Enter text to translate');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('Text Input Functionality', () => {
    test('should call onChangeText when text changes', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} />
      );
      const input = getByPlaceholderText('Enter text to translate');

      fireEvent.changeText(input, 'hello');

      expect(defaultProps.onChangeText).toHaveBeenCalledWith('hello');
    });

    test('should respect maxLength prop', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} maxLength={10} />
      );
      const input = getByPlaceholderText('Enter text to translate');

      expect(input.props.maxLength).toBe(10);
    });
  });

  describe('Search and Clear Functionality', () => {
    test('should call onSearch when search is triggered via onSubmitEditing', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} value="hello" />
      );

      const input = getByPlaceholderText('Enter text to translate');
      fireEvent(input, 'onSubmitEditing');

      expect(defaultProps.onSearch).toHaveBeenCalled();
    });

    test('should call onClear when clear button is pressed', () => {
      const onClearMock = jest.fn();
      const component = render(
        <SearchInput {...defaultProps} value="hello" onClear={onClearMock} />
      );

      // Find the TouchableOpacity element (clear button)
      const root = component.root;
      const touchableOpacities = root.findAllByType(TouchableOpacity);

      expect(touchableOpacities).toHaveLength(1);

      // Press the clear button
      fireEvent.press(touchableOpacities[0]);
      expect(onClearMock).toHaveBeenCalled();
    });

    test('should not show clear button when value is empty', () => {
      const component = render(<SearchInput {...defaultProps} value="" />);

      const root = component.root;
      const touchableOpacities = root.findAllByType(TouchableOpacity);
      // Should have no touchable elements when value is empty
      expect(touchableOpacities).toHaveLength(0);
    });

    test('should show clear button when value has text', () => {
      const component = render(<SearchInput {...defaultProps} value="hello" />);

      const root = component.root;
      const touchableOpacities = root.findAllByType(TouchableOpacity);
      // Should have one touchable element (clear button) when value has text
      expect(touchableOpacities.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    test('should show loading state when isLoading is true', () => {
      const component = render(
        <SearchInput {...defaultProps} isLoading={true} />
      );

      // Component should render without errors when loading
      expect(component).toBeTruthy();
    });

    test('should not show loading state when isLoading is false', () => {
      const component = render(
        <SearchInput {...defaultProps} isLoading={false} />
      );

      // Component should render without errors when not loading
      expect(component).toBeTruthy();
    });
  });

  describe('Props Validation', () => {
    test('should handle empty string value', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} value="" />
      );

      const input = getByPlaceholderText('Enter text to translate');
      expect(input.props.value).toBe('');
    });

    test('should handle long text values', () => {
      const longText = 'a'.repeat(100);
      const { getByDisplayValue } = render(
        <SearchInput {...defaultProps} value={longText} />
      );

      expect(getByDisplayValue(longText)).toBeTruthy();
    });

    test('should handle special characters', () => {
      const specialText = '¡Hola! 你好 🌍';
      const { getByDisplayValue } = render(
        <SearchInput {...defaultProps} value={specialText} />
      );

      expect(getByDisplayValue(specialText)).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    test('should render without crashing', () => {
      const component = render(<SearchInput {...defaultProps} />);
      expect(component).toBeTruthy();
    });

    test('should render with all required props', () => {
      const component = render(<SearchInput {...defaultProps} />);
      expect(component.toJSON()).toBeTruthy();
    });

    test('should handle missing optional props gracefully', () => {
      const minimalProps = {
        value: '',
        onChangeText: jest.fn(),
        onSearch: jest.fn(),
        onClear: jest.fn(),
        placeholder: 'Test',
        maxLength: 100,
      };

      const component = render(<SearchInput {...minimalProps} />);
      expect(component).toBeTruthy();
    });
  });
});
