import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Dimensions, TextInput, Modal, Alert, ActivityIndicator, PanResponder, Animated
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState, useCallback } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from '../_context/AuthContext'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSelection } from '../_context/SelectionContext'
import { Try } from 'expo-router/build/views/Try'

const { width } = Dimensions.get('window')

const MEAL_DEFINITIONS = [
  { id: 'breakfast', label: 'Breakfast', icon: 'weather-sunset-up' },
  { id: 'lunch',     label: 'Lunch',     icon: 'white-balance-sunny' },
  { id: 'dinner',    label: 'Dinner',    icon: 'weather-night' },
  { id: 'snacks',    label: 'Snacks',    icon: 'food-apple' },
]

const CALORIE_GOAL = 1600
const WORKOUT_CALORIES = 0
const WATER_GOAL_ML = 2000

const NutritionScreen = () => {
  const router = useRouter()
  const { authFetch, isAuthenticated } = useAuth()
  const { setSelectionCallback } = useSelection()

  // meals is a map of mealId -> { ...mealDef, items: [], backendId: null }
  const [meals, setMeals] = useState(
    MEAL_DEFINITIONS.reduce((acc, m) => ({ ...acc, [m.id]: { ...m, items: [], backendId: null } }), {})
  )
  const [waterMl, setWaterMl] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [foods, setFoods] = useState([]);
  const [swipedItemId, setSwipedItemId] = useState(null);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  // ── Fetch all meals + their foods ──────────────────────────────────────────
  const fetchNutritionData = async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)

      const { data } = await authFetch('/api/meals')

      if (!data.success) {
        setError(data.message || 'Failed to fetch meals')
        return
      }

      // Merge backend meal records into our fixed meal slots
      const updated = MEAL_DEFINITIONS.reduce((acc, def) => {
        const backendMeal = (data.data || []).find(
          (m) => m.name?.toLowerCase() === def.id
        )
        acc[def.id] = {
          ...def,
          backendId: backendMeal?.id ?? null,
          items: backendMeal?.foods ?? [],
        }
        return acc
      }, {})

      setMeals(updated)
    } catch (err) {
      console.error('Error fetching nutrition:', err)
      setError(err.message || 'Failed to load nutrition data')
    } finally {
      setIsLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchNutritionData()
    }, [isAuthenticated])
  )

  // ── Derived values ─────────────────────────────────────────────────────────
  const allMeals = Object.values(meals)

  const totalMealCalories = allMeals.reduce(
    (sum, meal) => sum + (meal.items ?? []).reduce(
      (s, item) => s + ((item.calories_per_100g ?? 0) * (item.quantity ?? 100) / 100), 
      0
    ),
    0
  )
  const caloriesRemaining = CALORIE_GOAL - totalMealCalories + WORKOUT_CALORIES

  const totalProtein = allMeals.reduce(
    (sum, meal) => sum + (meal.items ?? []).reduce(
      (s, item) => s + ((item.protein_per_100g ?? 0) * (item.quantity ?? 100) / 100), 0
    ), 0
  )
  const totalFat = allMeals.reduce(
    (sum, meal) => sum + (meal.items ?? []).reduce(
      (s, item) => s + ((item.fat_per_100g ?? 0) * (item.quantity ?? 100) / 100), 0
    ), 0
  )
  const totalCarbs = allMeals.reduce(
    (sum, meal) => sum + (meal.items ?? []).reduce(
      (s, item) => s + ((item.carbs_per_100g ?? 0) * (item.quantity ?? 100) / 100), 0
    ), 0
  )
  const macroTotal = totalProtein + totalFat + totalCarbs || 1
  const macros = {
    protein: Math.round((totalProtein / macroTotal) * 100),
    fat:     Math.round((totalFat     / macroTotal) * 100),
    carbs:   Math.round((totalCarbs   / macroTotal) * 100),
  }

  const waterProgress = Math.min(waterMl / WATER_GOAL_ML, 1)

  const getMealCalories = (meal) =>
    (meal.items ?? []).reduce((sum, item) => {
      const caloriesPer100g = item.calories_per_100g ?? 0;
      const portionAmount = item.quantity ?? 100;
      return sum + (caloriesPer100g * portionAmount / 100);
    }, 0)

  // ── Add food ───────────────────────────────────────────────────────────────
  const openFoodSelection = (mealId) => {
    setSelectionCallback(async (selectedItems) => {
      if (!selectedItems || selectedItems.length === 0) return

      console.log(selectedItems);
      
      try {
        // Call API to add foods to the meal (creates meal if it doesn't exist)
        const { data } = await authFetch(`/api/meals/${mealId}/foods`, {
          method: 'POST',
          body: JSON.stringify({
            foods: selectedItems.map(item => ({
              id: item.id,
              quantity: item.quantity || 100
            }))
          })
        })

        if (data.success) {
          // Update state directly with the returned meal data
          const updatedMeal = data.data;
          setMeals(prevMeals => ({
            ...prevMeals,
            [mealId]: {
              ...prevMeals[mealId],
              backendId: updatedMeal.id,
              items: updatedMeal.foods || []
            }
          }));
        } else {
          Alert.alert('Error', data.message || 'Failed to add foods')
        }
      } catch (error) {
        console.error('Error adding foods to meal:', error)
        Alert.alert('Error', error.message || 'Failed to add foods')
      }
    })

    router.push({
      pathname: '/select-items',
      params: {
        type: 'food',
        mode: 'multiple',
        title: 'Select Foods',
        selected: JSON.stringify([]),
        excluded: JSON.stringify([]),
      }
    })
  }

  const handleAddWater = () => {
    setWaterMl((prev) => Math.min(prev + 250, WATER_GOAL_ML))
  }

  const removeFoodItem = async (mealId, foodId) => {
    try {
      const { data } = await authFetch(`/api/meals/${mealId}/foods/${foodId}`, {
          method: 'DELETE'
      })

      if (data.success) {
        setMeals(prevMeals => ({
          ...prevMeals,
          [mealId]: {
            ...prevMeals[mealId],
            items: (prevMeals[mealId]?.items || []).filter(item => item.id !== foodId)
          }
        }))
      }
    } catch (error) {
      console.error('Error removing food item:', error)
    }
    setSwipedItemId(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(58,78,72,0.4)', 'rgba(58,78,72,0.8)', 'rgba(58,78,72,0.97)']}
        style={styles.overlay}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>Loading nutrition data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchNutritionData} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* Macros bar */}
            <Text style={styles.sectionLabel}>Today's macros</Text>
            <View style={styles.macrosBar}>
              <View style={[styles.macroSegment, { flex: macros.protein || 1, backgroundColor: '#4CAF93' }]}>
                <Text style={styles.macroText}>Protein{'\n'}{macros.protein}%</Text>
              </View>
              <View style={[styles.macroSegment, { flex: macros.fat || 1, backgroundColor: '#F5C842' }]}>
                <Text style={[styles.macroText, { color: '#2C3E50' }]}>Fat{'\n'}{macros.fat}%</Text>
              </View>
              <View style={[styles.macroSegment, { flex: macros.carbs || 1, backgroundColor: '#5B8CDB' }]}>
                <Text style={styles.macroText}>Carbs{'\n'}{macros.carbs}%</Text>
              </View>
            </View>

            {/* Water tracker */}
            <View style={styles.card}>
              <View style={styles.waterHeader}>
                <Text style={styles.cardLabel}>Water</Text>
                <TouchableOpacity onPress={handleAddWater} style={styles.addWaterBtn}>
                  <Ionicons name="add" size={18} color="#F5C842" />
                  <Text style={styles.addWaterText}>250ml</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.waterScaleRow}>
                <Text style={styles.waterScaleText}>0</Text>
                <Text style={styles.waterScaleText}>{(WATER_GOAL_ML / 2 / 1000).toFixed(1)}l</Text>
                <Text style={styles.waterScaleText}>{(WATER_GOAL_ML / 1000).toFixed(1)}l</Text>
              </View>
              <View style={styles.waterBarBg}>
                <View style={[styles.waterBarFill, { width: `${waterProgress * 100}%` }]} />
              </View>
              <Text style={styles.waterAmount}>
                {(waterMl / 1000).toFixed(2)}l / {WATER_GOAL_ML / 1000}l
              </Text>
            </View>

            {/* Calories summary */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Calories remaining</Text>
              <View style={styles.calorieRow}>
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{CALORIE_GOAL}</Text>
                  <Text style={styles.calorieItemLabel}>Goal</Text>
                </View>
                <Text style={styles.calorieOperator}>-</Text>
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{totalMealCalories}</Text>
                  <Text style={styles.calorieItemLabel}>Meals</Text>
                </View>
                <Text style={styles.calorieOperator}>+</Text>
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{WORKOUT_CALORIES}</Text>
                  <Text style={styles.calorieItemLabel}>Workouts</Text>
                </View>
                <Text style={styles.calorieOperator}>=</Text>
                <View style={styles.calorieItem}>
                  <Text style={[
                    styles.calorieRemaining,
                    caloriesRemaining < 0 && { color: '#FF6B6B' }
                  ]}>
                    {caloriesRemaining}
                  </Text>
                </View>
              </View>
            </View>

            {/* Meal sections */}
            {allMeals.map((meal) => {
              const mealCals = getMealCalories(meal)
              return (
                <View key={meal.id} style={styles.mealSection}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealTitleRow}>
                      <MaterialCommunityIcons name={meal.icon} size={18} color="#F5C842" />
                      <Text style={styles.mealTitle}>{meal.label}</Text>
                    </View>
                    <Text style={styles.mealCalories}>{mealCals} kcal</Text>
                  </View>

                  {(meal.items ?? []).length === 0 ? (
                    <View style={styles.emptyMeal}>
                      <Text style={styles.emptyMealText}>No foods logged yet</Text>
                    </View>
                  ) : (
                    (meal.items ?? []).map((item, index) => {
                      const isSwipped = swipedItemId === `${meal.id}-${item.id}`;
                      
                      const handleTouchStart = (e) => {
                        setTouchStart({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
                      };
                      
                      const handleTouchEnd = (e) => {
                        const distance = e.nativeEvent.pageX - touchStart.x;
                        // Swiped left at least 50px
                        if (distance < -50) {
                          setSwipedItemId(`${meal.id}-${item.id}`);
                        } else if (distance > 50) {
                          // Swiped right - close
                          setSwipedItemId(null);
                        }
                      };
                      
                      return (
                        <View
                          key={item.id ?? index}
                          style={[
                            styles.foodItemContainer,
                            index === meal.items.length - 1 && { borderBottomWidth: 0 },
                          ]}
                          onTouchStart={handleTouchStart}
                          onTouchEnd={handleTouchEnd}
                        >
                          <TouchableOpacity 
                            style={styles.foodItem}
                            onPress={() => {
                              if (isSwipped) {
                                setSwipedItemId(null)
                                return
                              }

                              router.push({
                                pathname: '/food-details',
                                params: { id: item.food_id ?? item.id },
                              })
                            }}
                            delayPressIn={0}
                            activeOpacity={isSwipped ? 1 : 0.7}
                          >
                            <View style={styles.foodInfo}>
                              <Text style={styles.foodName}>{item.name}</Text>
                              {item.detail ? (
                                <Text style={styles.foodDetail}>{item.detail}</Text>
                              ) : null}
                            </View>
                            <Text style={styles.foodCalories}>{item.calories || item.calories_per_100g * (item.quantity / 100)} kcal</Text>
                          </TouchableOpacity>
                          {isSwipped && (
                            <TouchableOpacity 
                              style={styles.removeButton}
                              onPress={() => removeFoodItem(meal.id, item.id)}
                            >
                              <Ionicons name="trash" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  )}

                  <TouchableOpacity style={styles.addFoodButton} onPress={() => openFoodSelection(meal.id)}>
                    <Ionicons name="add" size={16} color="#F5C842" />
                    <Text style={styles.addFoodText}>Add food</Text>
                  </TouchableOpacity>
                </View>
              )
            })}

            {/* Water section */}
            <View style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTitleRow}>
                  <Ionicons name="water" size={18} color="#5B8CDB" />
                  <Text style={styles.mealTitle}>Water</Text>
                </View>
                <Text style={styles.mealCalories}>{waterMl} ml</Text>
              </View>
              {waterMl > 0 ? (
                <View style={[styles.foodItem, { borderBottomWidth: 0 }]}>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>Water</Text>
                    <Text style={styles.foodDetail}>Still</Text>
                  </View>
                  <Text style={styles.foodCalories}>{waterMl} ml</Text>
                </View>
              ) : (
                <View style={styles.emptyMeal}>
                  <Text style={styles.emptyMealText}>No water logged yet</Text>
                </View>
              )}
              <TouchableOpacity style={styles.addFoodButton} onPress={handleAddWater}>
                <Ionicons name="add" size={16} color="#F5C842" />
                <Text style={styles.addFoodText}>Add 250ml</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </LinearGradient>
    </View>
  )
}

export default NutritionScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3A4E48' },
  overlay: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: { color: '#FF6B6B', fontSize: 14, textAlign: 'center' },
  retryButton: {
    backgroundColor: '#F5C842',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  retryButtonText: { color: '#2C3E50', fontWeight: '600', fontSize: 14 },

  sectionLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  macrosBar: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    height: 52,
  },
  macroSegment: { justifyContent: 'center', alignItems: 'center', paddingVertical: 6 },
  macroText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 15,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10 },

  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addWaterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addWaterText: { color: '#F5C842', fontSize: 13, fontWeight: '500' },
  waterScaleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  waterScaleText: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  waterBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  waterBarFill: { height: '100%', backgroundColor: '#5B8CDB', borderRadius: 4 },
  waterAmount: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6, textAlign: 'right' },

  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieItem: { alignItems: 'center' },
  calorieValue: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  calorieItemLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  calorieOperator: { fontSize: 16, color: 'rgba(255,255,255,0.4)', marginBottom: 12 },
  calorieRemaining: { fontSize: 22, fontWeight: '700', color: '#F5C842' },

  mealSection: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  mealCalories: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },

  emptyMeal: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyMealText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },

  foodItemContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  foodItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  foodInfo: { flex: 1, marginRight: 12 },
  foodName: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  foodDetail: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  foodCalories: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  removeButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },

  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addFoodText: { 
    fontSize: 14,
    color: '#F5C842',
    fontWeight: '500'
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600'
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F5C842',
    alignItems: 'center',
  },
  confirmBtnText: { color: '#2C3E50', fontWeight: '600' },
})
