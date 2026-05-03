import { Stack, Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, RussoOne_400Regular } from '@expo-google-fonts/russo-one'
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { AuthProvider } from './_context/AuthContext';
import { SelectionProvider } from './_context/SelectionContext';

// Prevent auto-hide before fonts load
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors if splash screen is not available
});

export default function RootLayout() {
    const [loaded] = useFonts({
        RussoOne_400Regular
    });

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync().catch(() => {
              // Ignore errors if splash screen is not available
            });
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }
    
    return (
        <AuthProvider>
        <SelectionProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                    gestureEnabled: false,
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen 
                    name="index" 
                />
                <Stack.Screen 
                    name="register" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="setup-profile" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="login" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="(tabs)" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="create-workout" 
                    options={{ 
                        presentation: 'fullScreenModal',
                        gestureEnabled: true,
                    }} 
                />
                <Stack.Screen 
                    name="create-exercise" 
                    options={{ 
                        presentation: 'fullScreenModal',
                        gestureEnabled: true,
                    }} 
                />
                <Stack.Screen 
                    name="exercise-details" 
                    options={{ 
                        presentation: 'fullScreenModal',
                    }} 
                />
                <Stack.Screen 
                    name="food-details" 
                    options={{ 
                        presentation: 'fullScreenModal',
                    }} 
                />
                <Stack.Screen 
                    name="create-food" 
                    options={{ 
                        presentation: 'fullScreenModal',
                        gestureEnabled: true,
                    }} 
                />
                <Stack.Screen 
                    name="select-items" 
                    options={{ 
                        presentation: 'fullScreenModal',
                        gestureEnabled: true,
                    }} 
                />
                <Stack.Screen 
                    name="workout-session" 
                    options={{ 
                        presentation: 'fullScreenModal',
                        gestureEnabled: true,
                    }} 
                />
                <Stack.Screen 
                    name="edit-account" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="edit-profile" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="edit-units" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="edit-language" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="edit-goals" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
            </Stack>
        </SelectionProvider>
        </AuthProvider>
    );
}
