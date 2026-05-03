import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'

const getUserId = (user) => user?.id ?? user?.userId ?? user?.user_id

const formatNutritionValue = (value) => {
  const number = Number(value || 0)
  return Number.isInteger(number) ? number.toString() : number.toFixed(1)
}

const FoodDetailsScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { authFetch, user } = useAuth()
  const foodId = params.id

  const [food, setFood] = useState(null)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const isOwner = food && Number(food.user_id) === Number(getUserId(user))

  const hydrateForm = (nextFood) => {
    setName(nextFood?.name || '')
    setCalories(formatNutritionValue(nextFood?.calories_per_100g))
    setProtein(formatNutritionValue(nextFood?.protein_per_100g))
    setCarbs(formatNutritionValue(nextFood?.carbs_per_100g))
    setFat(formatNutritionValue(nextFood?.fat_per_100g))
    setIsPublic(Boolean(nextFood?.is_public))
  }

  const parseNumber = (value) => {
    const normalized = value.replace(',', '.')
    return normalized === '' ? null : parseFloat(normalized)
  }

  const loadFood = async () => {
    if (!foodId) return

    try {
      setIsLoading(true)
      const { data } = await authFetch(`/api/foods/${foodId}`)
      if (data.success) {
        setFood(data.data)
        hydrateForm(data.data)
      } else {
        Alert.alert('Error', data.message || 'Failed to load food')
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load food')
    } finally {
      setIsLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!isEditing) {
        loadFood()
      }
    }, [foodId, isEditing])
  )

  const handleCancelEdit = () => {
    hydrateForm(food)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a food name')
      return
    }

    const caloriesValue = parseNumber(calories)
    const proteinValue = parseNumber(protein)
    const carbsValue = parseNumber(carbs)
    const fatValue = parseNumber(fat)

    if ([caloriesValue, proteinValue, carbsValue, fatValue].some((value) => value === null || Number.isNaN(value))) {
      Alert.alert('Error', 'Please enter valid values for calories, protein, carbs, and fat')
      return
    }

    setIsSaving(true)
    try {
      const { data } = await authFetch(`/api/foods/${foodId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          caloriesPer100g: caloriesValue,
          proteinPer100g: proteinValue,
          carbsPer100g: carbsValue,
          fatPer100g: fatValue,
          isPublic,
        }),
      })

      if (data.success) {
        setFood(data.data)
        hydrateForm(data.data)
        setIsEditing(false)
        Alert.alert('Success', 'Food updated successfully')
      } else {
        Alert.alert('Error', data.message || 'Failed to update food')
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update food')
    } finally {
      setIsSaving(false)
    }
  }

  const renderNutritionDisplay = () => {
    const nutrients = [
      { label: 'Calories', value: food?.calories_per_100g, unit: 'kcal', color: '#F5C842' },
      { label: 'Protein', value: food?.protein_per_100g, unit: 'g', color: '#4CAF93' },
      { label: 'Carbs', value: food?.carbs_per_100g, unit: 'g', color: '#5B8CDB' },
      { label: 'Fat', value: food?.fat_per_100g, unit: 'g', color: '#FF9F68' },
    ]

    return (
      <View style={styles.nutritionGrid}>
        {nutrients.map((nutrient) => (
          <View key={nutrient.label} style={styles.nutritionTile}>
            <View style={[styles.nutritionAccent, { backgroundColor: nutrient.color }]} />
            <Text style={styles.nutritionValue}>
              {formatNutritionValue(nutrient.value)}
              <Text style={styles.nutritionUnit}> {nutrient.unit}</Text>
            </Text>
            <Text style={styles.nutritionLabel}>{nutrient.label}</Text>
          </View>
        ))}
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
          </View>
        </LinearGradient>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Food' : 'Food'}</Text>
          {isOwner ? (
            <TouchableOpacity
              onPress={isEditing ? handleCancelEdit : () => setIsEditing(true)}
              style={styles.headerButton}
              disabled={isSaving}
            >
              <Text style={styles.headerAction}>{isEditing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="food-apple" size={48} color="#F5C842" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Food Name</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Food name"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                />
              ) : (
                <Text selectable style={styles.displayTitle}>{food?.name || 'Untitled food'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nutrition per 100g</Text>
              {isEditing ? (
                <View style={styles.editGrid}>
                  <View style={styles.editCell}>
                    <Text style={styles.inputLabel}>Calories</Text>
                    <TextInput
                      style={[styles.input, focusedField === 'calories' && styles.inputFocused]}
                      value={calories}
                      onChangeText={setCalories}
                      onFocus={() => setFocusedField('calories')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    />
                  </View>
                  <View style={styles.editCell}>
                    <Text style={styles.inputLabel}>Protein</Text>
                    <TextInput
                      style={[styles.input, focusedField === 'protein' && styles.inputFocused]}
                      value={protein}
                      onChangeText={setProtein}
                      onFocus={() => setFocusedField('protein')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    />
                  </View>
                  <View style={styles.editCell}>
                    <Text style={styles.inputLabel}>Carbs</Text>
                    <TextInput
                      style={[styles.input, focusedField === 'carbs' && styles.inputFocused]}
                      value={carbs}
                      onChangeText={setCarbs}
                      onFocus={() => setFocusedField('carbs')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    />
                  </View>
                  <View style={styles.editCell}>
                    <Text style={styles.inputLabel}>Fat</Text>
                    <TextInput
                      style={[styles.input, focusedField === 'fat' && styles.inputFocused]}
                      value={fat}
                      onChangeText={setFat}
                      onFocus={() => setFocusedField('fat')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    />
                  </View>
                </View>
              ) : renderNutritionDisplay()}
            </View>

            <View style={styles.visibilityCard}>
              <View style={styles.visibilityTextContainer}>
                <Text style={styles.visibilityTitle}>{isPublic ? 'Public food' : 'Private food'}</Text>
                <Text style={styles.visibilityText}>
                  {isPublic ? 'Other users can find and use this food.' : 'Only you can find and use this food.'}
                </Text>
              </View>
              {isEditing && (
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.22)', true: 'rgba(245, 200, 66, 0.45)' }}
                  thumbColor={isPublic ? '#F5C842' : '#FFFFFF'}
                />
              )}
            </View>

            <View style={styles.ownerCard}>
              <Ionicons name={isOwner ? 'person-circle' : 'lock-closed'} size={22} color="#F5C842" />
              <Text style={styles.ownerText}>
                {isOwner ? 'You created this food.' : 'Only the creator can edit this food.'}
              </Text>
            </View>

            {isEditing && (
              <TouchableOpacity style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#2C3E50" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#2C3E50" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  )
}

export default FoodDetailsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A4E48',
  },
  overlay: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerButton: {
    minWidth: 64,
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerAction: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
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
  displayTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  nutritionTile: {
    width: '48%',
    minHeight: 98,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  nutritionAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  nutritionValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  nutritionUnit: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  nutritionLabel: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  editGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  editCell: {
    width: '48%',
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.25)',
    marginBottom: 24,
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 24,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  visibilityText: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  ownerText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5C842',
    borderRadius: 8,
    padding: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '800',
  },
  bottomPadding: {
    height: 40,
  },
})
