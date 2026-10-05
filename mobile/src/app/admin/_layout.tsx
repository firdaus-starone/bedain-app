import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function AdminLayout() {
  const { isDarkMode } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDarkMode ? '#1e293b' : '#1b61d1',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Dashboard Admin',
          headerTitleAlign: 'center',
        }} 
      />
    </Stack>
  );
}
