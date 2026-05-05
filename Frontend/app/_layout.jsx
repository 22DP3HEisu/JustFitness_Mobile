import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { useFonts, RussoOne_400Regular } from '@expo-google-fonts/russo-one'
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './_context/AuthContext';
import { SelectionProvider } from './_context/SelectionContext';

// Automātiskā sākuma ekrāna paslēpšana tiek aizturēta līdz fontu ielādei.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Kļūda tiek ignorēta, ja sākuma ekrāns nav pieejams.
});

export default function RootLayout() {
    const [loaded] = useFonts({
        RussoOne_400Regular
    });

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync().catch(() => {
              // Kļūda tiek ignorēta, ja sākuma ekrāns nav pieejams.
            });
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }
    
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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
                    name="exercises" 
                    options={{ 
                        presentation: 'card',
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
                    name="foods" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="muscle-groups" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="admin-users" 
                    options={{ 
                        presentation: 'card',
                    }} 
                />
                <Stack.Screen 
                    name="admin-user-details" 
                    options={{ 
                        presentation: 'card',
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
                    name="workout-details" 
                    options={{ 
                        presentation: 'card',
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
        </GestureHandlerRootView>
    );
}
