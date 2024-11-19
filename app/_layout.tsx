import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import { MenuProvider } from 'react-native-popup-menu';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <MenuProvider>
      <Stack
        initialRouteName="splash"
        screenOptions={{
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC',
          },
          headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
          headerShadowVisible: false,
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen 
          name="home" 
          options={{ 
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="create" 
          options={{ 
            title: 'New Task',
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="edit/[id]" 
          options={{ 
            title: 'Edit Task',
            presentation: 'modal',
          }} 
        />
      </Stack>
    </MenuProvider>
  );
}
