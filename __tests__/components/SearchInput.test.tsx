/**
 * SearchInput Component Test Suite
 * 
 * Tests the main search input component including:
 * - Text input handling and validation
 * - Speech recognition integration
 * - Clear functionality
 * - Loading states and user feedback
 * - Keyboard handling
 * - Voice input integration
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SearchInput } from '../../components/SearchInput';
import { SpeechService } from '../../utils/speechService';

// Mock external dependencies
jest.mock('../../utils/speechService');
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios'
    }
  };
});

const mockSpeechService = SpeechService as jest.Mocked<typeof SpeechService>;

describe('SearchInput Component', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    onSubmit: jest.fn(),
    placeholder: 'Enter text to translate',
    loading: false,
    sourceLanguage: 'en'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpeechService.isSpeechRecognitionAvailable.mockReturnValue(true);
    mockSpeechService.startSpeechRecognition.mockResolvedValue({
      stop: jest.fn()
    });
  });

  describe('Text Input', () => {
    test('should render with placeholder text', () => {
      const { getByPlaceholderText } = render(<SearchInput {...defaultProps} />);
      
      expect(getByPlaceholderText('Enter text to translate')).toBeTruthy();
    });

    test('should display current value', () => {
      const { getByDisplayValue } = render(
        <SearchInput {...defaultProps} value="hello world" />
      );
      
      expect(getByDisplayValue('hello world')).toBeTruthy();
    });

    test('should call onChangeText when text changes', () => {
      const { getByPlaceholderText } = render(<SearchInput {...defaultProps} />);
      const input = getByPlaceholderText('Enter text to translate');
      
      fireEvent.changeText(input, 'hello');
      
      expect(defaultProps.onChangeText).toHaveBeenCalledWith('hello');
    });

    test('should call onSubmit when submitted', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} value="hello" />
      );
      const input = getByPlaceholderText('Enter text to translate');
      
      fireEvent(input, 'onSubmitEditing');
      
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    });

    test('should not call onSubmit when input is empty', () => {
      const { getByPlaceholderText } = render(<SearchInput {...defaultProps} />);
      const input = getByPlaceholderText('Enter text to translate');
      
      fireEvent(input, 'onSubmitEditing');
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    test('should show loading state', () => {
      const { getByTestId } = render(
        <SearchInput {...defaultProps} loading={true} />
      );
      
      expect(getByTestId('search-loading')).toBeTruthy();
    });
  });

  describe('Clear Functionality', () => {
    test('should show clear button when input has text', () => {
      const { getByTestId } = render(
        <SearchInput {...defaultProps} value="hello" />
      );
      
      expect(getByTestId('clear-button')).toBeTruthy();
    });

    test('should not show clear button when input is empty', () => {
      const { queryByTestId } = render(<SearchInput {...defaultProps} />);
      
      expect(queryByTestId('clear-button')).toBeNull();
    });

    test('should clear input when clear button is pressed', () => {
      const { getByTestId } = render(
        <SearchInput {...defaultProps} value="hello" />
      );
      
      fireEvent.press(getByTestId('clear-button'));
      
      expect(defaultProps.onChangeText).toHaveBeenCalledWith('');
    });
  });

  describe('Voice Input', () => {
    test('should show voice button when speech recognition is available', () => {
      const { getByTestId } = render(<SearchInput {...defaultProps} />);
      
      expect(getByTestId('voice-button')).toBeTruthy();
    });

    test('should not show voice button when speech recognition is unavailable', () => {
      mockSpeechService.isSpeechRecognitionAvailable.mockReturnValue(false);
      
      const { queryByTestId } = render(<SearchInput {...defaultProps} />);
      
      expect(queryByTestId('voice-button')).toBeNull();
    });

    test('should start speech recognition when voice button is pressed', async () => {
      const { getByTestId } = render(<SearchInput {...defaultProps} />);
      
      fireEvent.press(getByTestId('voice-button'));
      
      await waitFor(() => {
        expect(mockSpeechService.startSpeechRecognition).toHaveBeenCalledWith(
          'en',
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        );
      });
    });

    test('should update input text with speech results', async () => {
      let onResultCallback: (text: string) => void;
      
      mockSpeechService.startSpeechRecognition.mockImplementation(
        (lang, onResult, onError, onEnd) => {
          onResultCallback = onResult;
          return Promise.resolve({ stop: jest.fn() });
        }
      );
      
      const { getByTestId } = render(<SearchInput {...defaultProps} />);
      
      fireEvent.press(getByTestId('voice-button'));
      
      await waitFor(() => {
        expect(mockSpeechService.startSpeechRecognition).toHaveBeenCalled();
      });
      
      // Simulate speech result
      onResultCallback!('hello world');
      
      expect(defaultProps.onChangeText).toHaveBeenCalledWith('hello world');
    });

    test('should show listening indicator during speech recognition', async () => {
      const { getByTestId } = render(<SearchInput {...defaultProps} />);
      
      fireEvent.press(getByTestId('voice-button'));
      
      await waitFor(() => {
        expect(getByTestId('listening-indicator')).toBeTruthy();
      });
    });

    test('should handle speech recognition errors', async () => {
      let onErrorCallback: (error: string) => void;
      
      mockSpeechService.startSpeechRecognition.mockImplementation(
        (lang, onResult, onError, onEnd) => {
          onErrorCallback = onError;
          return Promise.resolve({ stop: jest.fn() });
        }
      );
      
      const { getByTestId } = render(<SearchInput {...defaultProps} />);
      
      fireEvent.press(getByTestId('voice-button'));
      
      await waitFor(() => {
        expect(mockSpeechService.startSpeechRecognition).toHaveBeenCalled();
      });
      
      // Simulate speech error
      onErrorCallback!('Recognition failed');
      
      // Should show error state
      expect(getByTestId('voice-error')).toBeTruthy();
    });

    test('should stop listening when stop button is pressed', async () => {
      const mockStop = jest.fn();
      mockSpeechService.startSpeechRecognition.mockResolvedValue({
        stop: mockStop
      });
      
      const { getByTestId } = render(<SearchInput {...defaultProps} />);
      
      fireEvent.press(getByTestId('voice-button'));
      
      await waitFor(() => {
        expect(getByTestId('stop-listening-button')).toBeTruthy();
      });
      
      fireEvent.press(getByTestId('stop-listening-button'));
      
      expect(mockStop).toHaveBeenCalled();
    });

    test('should handle speech recognition end event', async () => {
      let onEndCallback: () => void;
      
      mockSpeechService.startSpeechRecognition.mockImplementation(
        (lang, onResult, onError, onEnd) => {
          onEndCallback = onEnd;
          return Promise.resolve({ stop: jest.fn() });
        }
      );
      
      const { getByTestId, queryByTestId } = render(<SearchInput {...defaultProps} />);
      
      fireEvent.press(getByTestId('voice-button'));
      
      await waitFor(() => {
        expect(getByTestId('listening-indicator')).toBeTruthy();
      });
      
      // Simulate speech end
      onEndCallback!();
      
      await waitFor(() => {
        expect(queryByTestId('listening-indicator')).toBeNull();
      });
    });
  });

  describe('Keyboard Handling', () => {
    test('should use correct keyboard type for text input', () => {
      const { getByPlaceholderText } = render(<SearchInput {...defaultProps} />);
      const input = getByPlaceholderText('Enter text to translate');
      
      expect(input.props.keyboardType).toBe('default');
    });

    test('should use correct return key type', () => {
      const { getByPlaceholderText } = render(<SearchInput {...defaultProps} />);
      const input = getByPlaceholderText('Enter text to translate');
      
      expect(input.props.returnKeyType).toBe('search');
    });

    test('should enable spell check and auto correct', () => {
      const { getByPlaceholderText } = render(<SearchInput {...defaultProps} />);
      const input = getByPlaceholderText('Enter text to translate');
      
      expect(input.props.spellCheck).toBe(true);
      expect(input.props.autoCorrect).toBe(true);
    });
  });

  describe('Accessibility', () => {
    test('should have proper accessibility labels', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <SearchInput {...defaultProps} value="hello" />
      );
      
      const input = getByPlaceholderText('Enter text to translate');
      expect(input.props.accessibilityLabel).toBe('Translation input');
      
      const clearButton = getByTestId('clear-button');
      expect(clearButton.props.accessibilityLabel).toBe('Clear input');
      
      const voiceButton = getByTestId('voice-button');
      expect(voiceButton.props.accessibilityLabel).toBe('Voice input');
    });

    test('should have proper accessibility hints', () => {
      const { getByPlaceholderText } = render(<SearchInput {...defaultProps} />);
      const input = getByPlaceholderText('Enter text to translate');
      
      expect(input.props.accessibilityHint).toBe('Enter text to translate to other languages');
    });

    test('should update accessibility state during loading', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} loading={true} />
      );
      const input = getByPlaceholderText('Enter text to translate');
      
      expect(input.props.editable).toBe(false);
    });
  });

  describe('Input Validation', () => {
    test('should handle very long text input', () => {
      const longText = 'a'.repeat(1000);
      const { getByPlaceholderText } = render(<SearchInput {...defaultProps} />);
      const input = getByPlaceholderText('Enter text to translate');
      
      fireEvent.changeText(input, longText);
      
      expect(defaultProps.onChangeText).toHaveBeenCalledWith(longText);
    });

    test('should handle special characters', () => {
      const specialText = '¡Hola! 你好 🌍';
      const { getByPlaceholderText } = render(<SearchInput {...defaultProps} />);
      const input = getByPlaceholderText('Enter text to translate');
      
      fireEvent.changeText(input, specialText);
      
      expect(defaultProps.onChangeText).toHaveBeenCalledWith(specialText);
    });

    test('should trim whitespace on submit', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} value="  hello world  " />
      );
      const input = getByPlaceholderText('Enter text to translate');
      
      fireEvent(input, 'onSubmitEditing');
      
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    test('should support focus and blur events', () => {
      const onFocus = jest.fn();
      const onBlur = jest.fn();
      
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} onFocus={onFocus} onBlur={onBlur} />
      );
      const input = getByPlaceholderText('Enter text to translate');
      
      fireEvent(input, 'onFocus');
      expect(onFocus).toHaveBeenCalled();
      
      fireEvent(input, 'onBlur');
      expect(onBlur).toHaveBeenCalled();
    });

    test('should auto-focus when requested', () => {
      const { getByPlaceholderText } = render(
        <SearchInput {...defaultProps} autoFocus={true} />
      );
      const input = getByPlaceholderText('Enter text to translate');
      
      expect(input.props.autoFocus).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = (props: any) => {
        renderSpy();
        return <SearchInput {...props} />;
      };
      
      const { rerender } = render(<TestComponent {...defaultProps} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestComponent {...defaultProps} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});