import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, Dimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { useAuth } from './_context/AuthContext'

const OnboardingScreen = () => {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)')
    }
  }, [isLoading, isAuthenticated])

  const handleGetStarted = () => {
    router.push('/register')
  }

  return (
    <ImageBackground 
      source={require('../assets/OnboardBG.png')}
      style={styles.backgroundImage}
      resizeMode="cover">
        <StatusBar style="light" />
        <LinearGradient
          colors={['rgba(58, 78, 72, 0.3)', 'rgba(58, 78, 72, 0.7)', 'rgba(58, 78, 72, 0.9)']}
          style={styles.overlay}
          >
          <View style={styles.content}>
            <Text style={styles.title}>JustFitness</Text>
            <Text style={styles.subtitle}>
              We believe your body is your temple.{'\n'}
              Let us help to take care of it!
            </Text>
          </View>
          
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.buttonText}>Get started</Text>
          </TouchableOpacity>
        </LinearGradient>
    </ImageBackground>
  )
}

export default OnboardingScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontFamily: 'RussoOne_400Regular',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  getStartedButton: {
    backgroundColor: '#F5C842',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'RussoOne_400Regular',
    fontWeight: '600',
    color: '#2C3E50',
  },
})
