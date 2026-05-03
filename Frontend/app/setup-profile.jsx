import { StyleSheet, Text, View, ImageBackground, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import { MaterialIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'
import DatePickerModal from './_components/DatePickerModal'
import HeightPickerModal from './_components/HeightPickerModal'
import PickerModal from './_components/PickerModal'
import WeightPickerModal from './_components/WeightPickerModal'

const cmToInches = (cm) => {
  const parsed = Number(cm)
  if (!Number.isFinite(parsed)) return null
  return parsed / 2.54
}

const inchesToCm = (inches) => {
  const parsed = Number(inches)
  if (!Number.isFinite(parsed)) return null
  return Number((parsed * 2.54).toFixed(1))
}

const splitInches = (totalInches) => {
  const parsed = Number(totalInches)
  if (!Number.isFinite(parsed)) return { feet: '', inches: '' }
  const feet = Math.floor(parsed / 12)
  const inches = Math.round(parsed - feet * 12)
  return { feet: String(feet), inches: String(inches) }
}

const formatDateForApi = (date) => {
  if (!date) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDate = (date) => {
  if (!date) return 'Choose birthday'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const formatHeight = (heightValue, unit) => {
  if (!heightValue) return 'Choose height'
  if (unit === 'in') {
    const { feet, inches } = splitInches(heightValue)
    return `${feet} ft ${inches} in`
  }
  return `${Number(heightValue).toFixed(1)} cm`
}

const formatWeight = (weightValue, unit, emptyLabel) => {
  if (!weightValue) return emptyLabel
  return `${Number(weightValue).toFixed(1)} ${unit === 'lb' || unit === 'lbs' ? 'lb' : 'kg'}`
}

const convertWeightUnit = (value, fromUnit, toUnit) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || fromUnit === toUnit) return value
  const fromPounds = fromUnit === 'lb' || fromUnit === 'lbs'
  const toPounds = toUnit === 'lb' || toUnit === 'lbs'
  if (fromPounds && !toPounds) return String((parsed * 0.45359237).toFixed(1))
  if (!fromPounds && toPounds) return String((parsed / 0.45359237).toFixed(1))
  return value
}

const SetupProfileScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { login } = useAuth()
  
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
  const [birthDate, setBirthDate] = useState(null)
  const [goalWeight, setGoalWeight] = useState('')
  const [calorieGoal, setCalorieGoal] = useState('')
  const [proteinGoal, setProteinGoal] = useState('')
  const [fatGoal, setFatGoal] = useState('')
  const [carbGoal, setCarbGoal] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false)
  const [showHeightModal, setShowHeightModal] = useState(false)
  const [showHeightUnitModal, setShowHeightUnitModal] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showWeightUnitModal, setShowWeightUnitModal] = useState(false)
  const [showGoalWeightModal, setShowGoalWeightModal] = useState(false)

  const heightUnitOptions = [
    { label: 'Centimeters (cm)', value: 'cm' },
    { label: 'Feet / inches', value: 'in' },
  ]

  const weightUnitOptions = [
    { label: 'Kilograms (kg)', value: 'kg' },
    { label: 'Pounds (lb)', value: 'lb' },
  ]

  const getHeightCm = () => {
    if (!height) return ''
    return heightUnit === 'in' ? inchesToCm(height) : Number(height)
  }

  const handleHeightConfirm = (heightCm) => {
    const nextHeight = heightUnit === 'in' ? cmToInches(heightCm) : heightCm
    setHeight(String(Number(nextHeight).toFixed(heightUnit === 'in' ? 0 : 1)))
    setShowHeightModal(false)
  }

  const handleHeightUnitChange = (nextUnit) => {
    if (height) {
      const currentCm = heightUnit === 'in' ? inchesToCm(height) : Number(height)
      const nextHeight = nextUnit === 'in' ? cmToInches(currentCm) : currentCm
      setHeight(String(Number(nextHeight).toFixed(nextUnit === 'in' ? 0 : 1)))
    }
    setHeightUnit(nextUnit)
  }

  const handleWeightUnitChange = (nextUnit) => {
    setWeight((currentWeight) => convertWeightUnit(currentWeight, weightUnit, nextUnit))
    setGoalWeight((currentGoalWeight) => convertWeightUnit(currentGoalWeight, weightUnit, nextUnit))
    setWeightUnit(nextUnit)
  }

  const validateForm = () => {
    if (!height || !weight || !goalWeight) {
      Alert.alert('Error', 'Please fill in height, weight, and goal weight')
      return false
    }
    if (isNaN(height) || isNaN(weight) || isNaN(goalWeight)) {
      Alert.alert('Error', 'Please enter valid numbers for height, weight, and goal weight')
      return false
    }
    // Nutrition goals are optional, but if provided, must be valid numbers
    if (calorieGoal && isNaN(calorieGoal)) {
      Alert.alert('Error', 'Please enter a valid number for calorie goal')
      return false
    }
    if (proteinGoal && isNaN(proteinGoal)) {
      Alert.alert('Error', 'Please enter a valid number for protein goal')
      return false
    }
    if (fatGoal && isNaN(fatGoal)) {
      Alert.alert('Error', 'Please enter a valid number for fat goal')
      return false
    }
    if (carbGoal && isNaN(carbGoal)) {
      Alert.alert('Error', 'Please enter a valid number for carb goal')
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
          height: parseFloat(height),
          birthDate: formatDateForApi(birthDate),
          heightUnit: heightUnit,
          weight: parseFloat(weight),
          weightUnit: weightUnit,
          gender: gender,
          goalWeight: parseFloat(goalWeight),
          calorieGoal: calorieGoal ? parseFloat(calorieGoal) : null,
          proteinGoal: proteinGoal ? parseFloat(proteinGoal) : null,
          fatGoal: fatGoal ? parseFloat(fatGoal) : null,
          carbGoal: carbGoal ? parseFloat(carbGoal) : null,
          language: 'en'
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await login(data.data.accessToken, data.data.user, data.data.refreshToken)

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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Birthday</Text>
              <TouchableOpacity style={styles.selectButton} onPress={() => setShowBirthDatePicker(true)}>
                <MaterialIcons name="calendar-today" size={20} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.selectButtonText}>{formatDate(birthDate)}</Text>
                <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.pickerGrid}>
                <TouchableOpacity style={[styles.selectButton, styles.pickerValueButton]} onPress={() => setShowHeightModal(true)}>
                  <MaterialIcons name="height" size={20} color="rgba(255, 255, 255, 0.7)" />
                  <Text style={styles.selectButtonText}>{formatHeight(height, heightUnit)}</Text>
                  <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectButton, styles.unitSelectButton]} onPress={() => setShowHeightUnitModal(true)}>
                  <Text style={styles.unitSelectText}>{heightUnit === 'in' ? 'ft / in' : 'cm'}</Text>
                  <MaterialIcons name="expand-more" size={22} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Weight</Text>
              <View style={styles.pickerGrid}>
                <TouchableOpacity style={[styles.selectButton, styles.pickerValueButton]} onPress={() => setShowWeightModal(true)}>
                  <MaterialIcons name="monitor-weight" size={20} color="rgba(255, 255, 255, 0.7)" />
                  <Text style={styles.selectButtonText}>{formatWeight(weight, weightUnit, 'Choose weight')}</Text>
                  <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectButton, styles.unitSelectButton]} onPress={() => setShowWeightUnitModal(true)}>
                  <Text style={styles.unitSelectText}>{weightUnit === 'lb' || weightUnit === 'lbs' ? 'lb' : 'kg'}</Text>
                  <MaterialIcons name="expand-more" size={22} color="rgba(255, 255, 255, 0.5)" />
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Goal Weight</Text>
              <TouchableOpacity style={styles.selectButton} onPress={() => setShowGoalWeightModal(true)}>
                <MaterialIcons name="scale" size={20} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.selectButtonText}>{formatWeight(goalWeight, weightUnit, 'Choose goal weight')}</Text>
                <Text style={styles.inlineUnitText}>{weightUnit === 'lb' || weightUnit === 'lbs' ? 'lb' : 'kg'}</Text>
                <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            </View>

            {/* Nutrition Goals Section */}
            <Text style={styles.sectionTitle}>Daily Nutrition Goals (Optional)</Text>

            {/* Calorie Goal Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Daily Calorie Goal</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'calorieGoal' && styles.inputFocused
                ]}
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                onFocus={() => setFocusedField('calorieGoal')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., 2000"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Protein Goal Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Daily Protein Goal (g)</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'proteinGoal' && styles.inputFocused
                ]}
                value={proteinGoal}
                onChangeText={setProteinGoal}
                onFocus={() => setFocusedField('proteinGoal')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., 150"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Fat Goal Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Daily Fat Goal (g)</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'fatGoal' && styles.inputFocused
                ]}
                value={fatGoal}
                onChangeText={setFatGoal}
                onFocus={() => setFocusedField('fatGoal')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., 65"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Carb Goal Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Daily Carb Goal (g)</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'carbGoal' && styles.inputFocused
                ]}
                value={carbGoal}
                onChangeText={setCarbGoal}
                onFocus={() => setFocusedField('carbGoal')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g., 225"
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
        <DatePickerModal
          visible={showBirthDatePicker}
          title="Birthday"
          value={birthDate}
          maximumDate={new Date()}
          onConfirm={(selectedDate) => {
            setBirthDate(selectedDate)
            setShowBirthDatePicker(false)
          }}
          onClose={() => setShowBirthDatePicker(false)}
        />
        <HeightPickerModal
          visible={showHeightModal}
          unit={heightUnit}
          heightCm={getHeightCm()}
          onConfirm={handleHeightConfirm}
          onClose={() => setShowHeightModal(false)}
        />
        <PickerModal
          visible={showHeightUnitModal}
          title="Height unit"
          selectedValue={heightUnit}
          options={heightUnitOptions}
          onValueChange={handleHeightUnitChange}
          onClose={() => setShowHeightUnitModal(false)}
        />
        <WeightPickerModal
          visible={showWeightModal}
          unit={weightUnit}
          weight={weight}
          onConfirm={(nextWeight) => {
            setWeight(String(nextWeight.toFixed(1)))
            setShowWeightModal(false)
          }}
          onClose={() => setShowWeightModal(false)}
        />
        <PickerModal
          visible={showWeightUnitModal}
          title="Weight unit"
          selectedValue={weightUnit}
          options={weightUnitOptions}
          onValueChange={handleWeightUnitChange}
          onClose={() => setShowWeightUnitModal(false)}
        />
        <WeightPickerModal
          visible={showGoalWeightModal}
          unit={weightUnit}
          weight={goalWeight}
          onConfirm={(nextWeight) => {
            setGoalWeight(String(nextWeight.toFixed(1)))
            setShowGoalWeightModal(false)
          }}
          onClose={() => setShowGoalWeightModal(false)}
        />
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5C842',
    marginTop: 32,
    marginBottom: 16,
    textAlign: 'left',
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
  selectButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  selectButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  pickerGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerValueButton: {
    flex: 1,
  },
  unitSelectButton: {
    minWidth: 92,
    justifyContent: 'center',
  },
  unitSelectText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  inlineUnitText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 8,
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
