import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'

const CreateFoodScreen = () => {
  const router = useRouter()
  const { authFetch } = useAuth()

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const parseNumber = (value) => {
    const normalized = value.replace(',', '.')
    return normalized === '' ? null : parseFloat(normalized)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a food name')
      return
    }

    const caloriesValue = parseNumber(calories)
    const proteinValue = parseNumber(protein)
    const carbsValue = parseNumber(carbs)
    const fatValue = parseNumber(fat)

    if (caloriesValue === null || proteinValue === null || carbsValue === null || fatValue === null) {
      Alert.alert('Error', 'Please enter values for calories, protein, carbs, and fat')
      return
    }

    setIsLoading(true)

    try {
      const { data } = await authFetch('/api/foods', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          caloriesPer100g: caloriesValue,
          proteinPer100g: proteinValue,
          carbsPer100g: carbsValue,
          fatPer100g: fatValue,
        }),
      })

      if (data.success) {
        Alert.alert('Success', 'Food created successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ])
      } else {
        Alert.alert('Error', data.message || 'Failed to create food')
      }
    } catch (error) {
      console.error('Error creating food:', error)
      Alert.alert('Error', error.message || 'Failed to create food')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']}
        style={styles.overlay}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Food</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="food-apple" size={48} color="#F5C842" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Food Name *</Text>
              <TextInput
                style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                placeholder="e.g., Chicken Breast, Oats, Apple"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Calories per 100g *</Text>
              <TextInput
                style={[styles.input, focusedField === 'calories' && styles.inputFocused]}
                placeholder="e.g., 165"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="decimal-pad"
                value={calories}
                onChangeText={setCalories}
                onFocus={() => setFocusedField('calories')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Protein per 100g *</Text>
              <TextInput
                style={[styles.input, focusedField === 'protein' && styles.inputFocused]}
                placeholder="e.g., 31"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="decimal-pad"
                value={protein}
                onChangeText={setProtein}
                onFocus={() => setFocusedField('protein')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Carbs per 100g *</Text>
              <TextInput
                style={[styles.input, focusedField === 'carbs' && styles.inputFocused]}
                placeholder="e.g., 0"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="decimal-pad"
                value={carbs}
                onChangeText={setCarbs}
                onFocus={() => setFocusedField('carbs')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fat per 100g *</Text>
              <TextInput
                style={[styles.input, focusedField === 'fat' && styles.inputFocused]}
                placeholder="e.g., 3.6"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="decimal-pad"
                value={fat}
                onChangeText={setFat}
                onFocus={() => setFocusedField('fat')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <TouchableOpacity
              style={[styles.createButton, isLoading && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#2C3E50" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#2C3E50" />
                  <Text style={styles.createButtonText}>Create Food</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  )
}

export default CreateFoodScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A4E48',
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputFocused: {
    borderColor: '#F5C842',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5C842',
    borderRadius: 12,
    padding: 16,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  bottomPadding: {
    height: 40,
  },
})
