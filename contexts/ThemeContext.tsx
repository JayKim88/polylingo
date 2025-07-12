import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { StorageService } from '../utils/storage';

export type Theme = 'light' | 'dark';

interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  primaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  shadow: string;
  success: string;
  successContainer: string;
  warning: string;
  warningContainer: string;
  error: string;
  errorContainer: string;
  info: string;
  infoContainer: string;
}

const lightTheme: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#6366F1',
  primaryContainer: '#EEF2FF',
  secondary: '#64748B',
  secondaryContainer: '#F1F5F9',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  shadow: '#000000',
  success: '#10B981',
  successContainer: '#ECFDF5',
  warning: '#F59E0B',
  warningContainer: '#FFFBEB',
  error: '#EF4444',
  errorContainer: '#FEF2F2',
  info: '#3B82F6',
  infoContainer: '#EFF6FF',
};

const darkTheme: ThemeColors = {
  background: '#222123',
  surface: '#1E2124',
  primary: '#6366F1',
  primaryContainer: '#2A2B2E',
  secondary: '#A1A1A1',
  secondaryContainer: '#2A2B2E',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textTertiary: '#888888',
  border: '#3A3B3E',
  borderLight: '#404040',
  shadow: '#000000',
  success: '#22C55E',
  successContainer: '#2A2B2E',
  warning: '#F59E0B',
  warningContainer: '#2A2B2E',
  error: '#EF4444',
  errorContainer: '#2A2B2E',
  info: '#3B82F6',
  infoContainer: '#2A2B2E',
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await StorageService.getTheme();
      setThemeState(savedTheme);
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    await StorageService.saveTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const colors = theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
