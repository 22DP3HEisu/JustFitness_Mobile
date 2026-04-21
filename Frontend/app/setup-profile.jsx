import { StyleSheet, Text, View, ImageBackground, TextInput, TouchableOpacity, Dimensions, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'

const { width, height } = Dimensions.get('window')

const SetupProfileScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  
  // User data from registration
  const userData = {
    name: params.name,
    email: params.email,
    password: params.password,
  }

  const [height, setHeight] = useState('')
  const [heightUnit, setHeightUnit] = useState('cm')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('kg')
  const [gender, setGender] = useState('Male')
  const [goalWeight, setGoalWeight] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const validateForm = () => {
    if (!height || !weight || !goalWeight) {
      Alert.alert('Error', 'Please fill in all fields')
      return false
    }
    if (isNaN(height) || isNaN(weight) || isNaN(goalWeight)) {
      Alert.alert('Error', 'Please enter valid numbers')
      return false
    }
    return true
  }

  const handleContinue = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await fetch('http://192.168.1.100:3000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name.trim(),
          email: userData.email.trim().toLowerCase(),
          password: userData.password,
          phone: '',
          height: parseFloat(height),
          heightUnit: heightUnit,
          weight: parseFloat(weight),
          weightUnit: weightUnit,
          gender: gender,
          goalWeight: parseFloat(goalWeight),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        Alert.alert('Success', 'Profile created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              console.log('User created:', data.data.user)
              router.replace('/(tabs)')
            },
          },
        ])
      } else {
        const errorMessage = data.message || 'Failed to create profile'
        Alert.alert('Error', errorMessage)
      }
    } catch (error) {
      console.error('Profile setup error:', error)
      Alert.alert(
        'Connection Error',
        'Could not connect to server. Please ensure the backend is running on port 3000.'
      )
    } finally {
      setIsLoading(false)
    }
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Text style={styles.title}>Enter data</Text>

            {/* Height Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.inputWithUnitContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithUnit,
                    focusedField === 'height' && styles.inputFocused
                  ]}
                  value={height}
                  onChangeText={setHeight}
                  onFocus={() => setFocusedField('height')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter height"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.unitButton, heightUnit === 'cm' && styles.unitButtonActive]}
                  onPress={() => setHeightUnit('cm')}
                >
                  <Text style={[styles.unitText, heightUnit === 'cm' && styles.unitTextActive]}>cm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, heightUnit === 'in' && styles.unitButtonActive]}
                  onPress={() => setHeightUnit('in')}
                >
                  <Text style={[styles.unitText, heightUnit === 'in' && styles.unitTextActive]}>in</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Weight Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Weight</Text>
              <View style={styles.inputWithUnitContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputWithUnit,
                    focusedField === 'weight' && styles.inputFocused
                  ]}
                  value={weight}
                  onChangeText={setWeight}
                  onFocus={() => setFocusedField('weight')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter weight"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.unitButton, weightUnit === 'kg' && styles.unitButtonActive]}
                  onPress={() => setWeightUnit('kg')}
                >
                  <Text style={[styles.unitText, weightUnit === 'kg' && styles.unitTextActive]}>kg</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, weightUnit === 'lbs' && styles.unitButtonActive]}
                  onPress={() => setWeightUnit('lbs')}
                >
                  <Text style={[styles.unitText, weightUnit === 'lbs' && styles.unitTextActive]}>lbs</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gender Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'Male' && styles.genderButtonActive]}
                  onPress={() => setGender('Male')}
                >
                  <Text style={[styles.genderButtonText, gender === 'Male' && styles.genderButtonTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'Female' && styles.genderButtonActive]}
                  onPress={() => setGender('Female')}
                >
                  <Text style={[styles.genderButtonText, gender === 'Female' && styles.genderButtonTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Goal Weight Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Goal Weight ({weightUnit})</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'goalWeight' && styles.inputFocused
                ]}
                value={goalWeight}
                onChangeText={setGoalWeight}
                onFocus={() => setFocusedField('goalWeight')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter goal weight"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#2C3E50" size="small" />
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  )
}

export default SetupProfileScreen

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  container: {
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 40,
    textAlign: 'center',
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
  inputWithUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWithUnit: {
    flex: 1,
    marginRight: 8,
  },
  unitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  unitButtonActive: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842',
  },
  unitText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  unitTextActive: {
    color: '#2C3E50',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: '#2C3E50',
  },
  continueButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 40,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
})
