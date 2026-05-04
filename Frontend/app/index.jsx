import i18n from "../lib/i18n";
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useAuth } from './_context/AuthContext';
const OnboardingScreen = () => {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading
  } = useAuth();
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated]);
  const handleGetStarted = () => {
    router.push('/register');
  };
  const handleBrowseMuscles = () => {
    router.push('/muscle-groups');
  };
  return <ImageBackground source={require('../assets/OnboardBG.png')} style={styles.backgroundImage} resizeMode="cover">
        <StatusBar style="light" />
        <LinearGradient colors={['rgba(58, 78, 72, 0.3)', 'rgba(58, 78, 72, 0.7)', 'rgba(58, 78, 72, 0.9)']} style={styles.overlay}>
          <View style={styles.content}>
            <Text style={styles.title}>{i18n.t("ui.justfitness")}</Text>
            <Text style={styles.subtitle}>{i18n.t("ui.we_believe_your_body_is_your_temple")}{'\n'}{i18n.t("ui.let_us_help_to_take_care_of_it")}</Text>
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
              <Text style={styles.buttonText}>{i18n.t("ui.get_started")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBrowseMuscles}>
              <Text style={styles.secondaryButtonText}>{i18n.t("ui.browse_muscle_groups")}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
    </ImageBackground>;
};
export default OnboardingScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  backgroundImage: {
    flex: 1
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 50
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 36,
    fontFamily: 'RussoOne_400Regular',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20
  },
  getStartedButton: {
    backgroundColor: '#F5C842',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center'
  },
  actions: {
    gap: 12,
    marginBottom: 40
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'RussoOne_400Regular',
    fontWeight: '600',
    color: '#2C3E50'
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center'
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
