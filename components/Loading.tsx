import { useTheme } from '@/contexts/ThemeContext';
import { ActivityIndicator, Text, View } from 'react-native';

type LoadingProps = {
  isHeaderVisible: boolean;
  message?: string;
};

const Loading = ({ isHeaderVisible, message = 'Searching...' }: LoadingProps) => {
  const { colors } = useTheme();

  return (
    <View
      className={`${
        isHeaderVisible ? 'pb-32' : 'pb-0'
      } absolute inset-0 z-10 justify-center items-center backdrop-blur-sm`}
      style={{ backgroundColor: colors.background }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        className="text-base text-center mt-4 font-medium"
        style={{ color: colors.textSecondary }}
      >
        {message}
      </Text>
    </View>
  );
};

export default Loading;
