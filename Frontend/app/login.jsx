import { StyleSheet, Text, View, ImageBackground, TextInput, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'

const { width, height } = Dimensions.get('window')

const LoginScreen = () => {
  const router = useRouter()
  const { login, API_URL } = useAuth()
  const [email, setEmail] = useState('gymshark@gmail.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address')
      return false
    }
    return true
  }

  const handleLogin = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('Login successful for:', email)
        // Store the token and user data in context
        await login(data.data.accessToken, data.data.user, data.data.refreshToken)
        router.replace('/(tabs)')
      } else {
        const errorMessage = data.message || 'Invalid email or password'
        Alert.alert('Error', errorMessage)
      }
    } catch (error) {
      console.error('Login error:', error)
      Alert.alert(
        'Connection Error', 
        'Could not connect to server. Please ensure the backend is running on port 3000.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset functionality will be implemented soon.')
  }

  const handleSignUp = () => {
    router.push('/register')
  }

  return (
    <ImageBackground 
      source={require('../assets/OnboardBG.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.title}>Log in</Text>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused
                ]}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[
                styles.passwordContainer,
                focusedField === 'password' && styles.inputFocused
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter password"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? 'eye' : 'eye-off'} 
                    size={20} 
                    color="rgba(255, 255, 255, 0.7)" 
                  />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot the password</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#2C3E50" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Log in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.socialContainer}>
            <Text style={styles.orText}>or Sign up with</Text>
            
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  )
}

export default LoginScreen

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#F5C842',
    borderWidth: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeIcon: {
    paddingRight: 16,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loginButton: {
    backgroundColor: '#F5C842',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 30,
  },
  loginButtonDisabled: {
    backgroundColor: 'rgba(245, 200, 66, 0.5)',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  socialContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  orText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  signUpLink: {
    fontSize: 16,
    color: '#F5C842',
    fontWeight: '600',
  },
})
