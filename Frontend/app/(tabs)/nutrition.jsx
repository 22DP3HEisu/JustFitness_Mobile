import i18n from "../../lib/i18n";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useCallback } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../_context/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSelection } from '../_context/SelectionContext';
import DatePickerModal from '../_components/DatePickerModal';
import SwipeToDelete from '../_components/SwipeToDelete';
const {
  width
} = Dimensions.get('window');
const MEAL_DEFINITIONS = [{
  id: 'breakfast',
  labelKey: "ui.breakfast",
  icon: 'weather-sunset-up'
}, {
  id: 'lunch',
  labelKey: "ui.lunch",
  icon: 'white-balance-sunny'
}, {
  id: 'dinner',
  labelKey: "ui.dinner",
  icon: 'weather-night'
}, {
  id: 'snacks',
  labelKey: "ui.snacks",
  icon: 'food-apple'
}];
const CALORIE_GOAL = 1600;
const WORKOUT_CALORIES = 0;
const WATER_GOAL_ML = 2000;
const WATER_QUICK_AMOUNTS = [250, 500, 750];
const formatDateForApi = date => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatDisplayDate = date => {
  const today = new Date();
  const isToday = formatDateForApi(date) === formatDateForApi(today);
  if (isToday) return i18n.t("ui.today");
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
  });
};
const FoodSwipeRow = ({
  item,
  isLast,
  onOpen,
  onDelete
}) => {
  const handlePress = closeSwipe => {
    closeSwipe?.();
    onOpen(item);
  };
  return <SwipeToDelete onDelete={() => onDelete(item)} actionWidth={72} threshold={-160} rightThreshold={36} containerStyle={[styles.foodSwipeContainer, isLast && {
    borderBottomWidth: 0
  }]}>
      {({
      close
    }) => <TouchableOpacity style={[styles.foodItem, isLast && {
      borderBottomWidth: 0
    }]} onPress={() => handlePress(close)} delayPressIn={0} activeOpacity={0.7}>
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{item.name}</Text>
          {item.detail ? <Text style={styles.foodDetail}>{item.detail}</Text> : null}
        </View>
        <Text style={styles.foodCalories}>{item.calories || item.calories_per_100g * (item.quantity / 100)}{i18n.t("ui.kcal")}</Text>
      </TouchableOpacity>}
    </SwipeToDelete>;
};
const NutritionScreen = () => {
  const router = useRouter();
  const {
    authFetch,
    isAuthenticated
  } = useAuth();
  const {
    setSelectionCallback
  } = useSelection();

  // Maltītes tiek glabātas kartē pēc maltītes identifikatora.
  const [meals, setMeals] = useState(MEAL_DEFINITIONS.reduce((acc, m) => ({
    ...acc,
    [m.id]: {
      ...m,
      items: [],
      backendId: null
    }
  }), {}));
  const [waterEntries, setWaterEntries] = useState([]);
  const [customWaterMl, setCustomWaterMl] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Tiek iegūtas visas maltītes un tām piesaistītie ēdieni ────────────────
  const fetchNutritionData = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const dateParam = formatDateForApi(selectedDate);
      const {
        data
      } = await authFetch(`/api/nutrition?date=${dateParam}`);
      if (!data.success) {
        setError(data.message || i18n.t("ui.failed_to_fetch_nutrition"));
        return;
      }
      const nutrition = data.data || {};

      // Servera maltīšu ieraksti tiek apvienoti ar lietotnes fiksētajām maltīšu sadaļām.
      const updated = MEAL_DEFINITIONS.reduce((acc, def) => {
        const backendMeal = (nutrition.meals || []).find(m => m.name?.toLowerCase() === def.id);
        acc[def.id] = {
          ...def,
          backendId: backendMeal?.id ?? null,
          items: backendMeal?.foods ?? []
        };
        return acc;
      }, {});
      setMeals(updated);
      setWaterEntries(nutrition.water?.entries || []);
    } catch (err) {
      console.error('Error fetching nutrition:', err);
      setError(err.message || i18n.t("ui.failed_to_load_nutrition_data"));
    } finally {
      setIsLoading(false);
    }
  };
  useFocusEffect(useCallback(() => {
    fetchNutritionData();
  }, [isAuthenticated, selectedDate]));

  // ── Aprēķinātās vērtības ───────────────────────────────────────────────────
  const allMeals = Object.values(meals);
  const waterMl = waterEntries.reduce((sum, entry) => sum + Number(entry.amount_ml || 0), 0);
  const totalMealCalories = allMeals.reduce((sum, meal) => sum + (meal.items ?? []).reduce((s, item) => s + (item.calories_per_100g ?? 0) * (item.quantity ?? 100) / 100, 0), 0);
  const caloriesRemaining = CALORIE_GOAL - totalMealCalories + WORKOUT_CALORIES;
  const totalProtein = allMeals.reduce((sum, meal) => sum + (meal.items ?? []).reduce((s, item) => s + (item.protein_per_100g ?? 0) * (item.quantity ?? 100) / 100, 0), 0);
  const totalFat = allMeals.reduce((sum, meal) => sum + (meal.items ?? []).reduce((s, item) => s + (item.fat_per_100g ?? 0) * (item.quantity ?? 100) / 100, 0), 0);
  const totalCarbs = allMeals.reduce((sum, meal) => sum + (meal.items ?? []).reduce((s, item) => s + (item.carbs_per_100g ?? 0) * (item.quantity ?? 100) / 100, 0), 0);
  const macroTotal = totalProtein + totalFat + totalCarbs || 1;
  const macros = {
    protein: Math.round(totalProtein / macroTotal * 100),
    fat: Math.round(totalFat / macroTotal * 100),
    carbs: Math.round(totalCarbs / macroTotal * 100)
  };
  const waterProgress = Math.min(waterMl / WATER_GOAL_ML, 1);
  const getMealCalories = meal => (meal.items ?? []).reduce((sum, item) => {
    const caloriesPer100g = item.calories_per_100g ?? 0;
    const portionAmount = item.quantity ?? 100;
    return sum + caloriesPer100g * portionAmount / 100;
  }, 0);

  // ── Ēdiena pievienošana ────────────────────────────────────────────────────
  const openFoodSelection = mealId => {
    setSelectionCallback(async selectedItems => {
      if (!selectedItems || selectedItems.length === 0) return;
      console.log(selectedItems);
      try {
        // Tiek izsaukts API ēdienu pievienošanai maltītei; ja maltīte neeksistē, tā tiek izveidota.
        const {
          data
        } = await authFetch(`/api/meals/${mealId}/foods`, {
          method: 'POST',
          body: JSON.stringify({
            date: formatDateForApi(selectedDate),
            foods: selectedItems.map(item => ({
              id: item.id,
              quantity: item.quantity || 100
            }))
          })
        });
        if (data.success) {
          // Stāvoklis tiek atjaunināts ar servera atgrieztajiem maltītes datiem.
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
          Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_add_foods"));
        }
      } catch (error) {
        console.error('Error adding foods to meal:', error);
        Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_add_foods"));
      }
    });
    router.push({
      pathname: '/select-items',
      params: {
        type: 'food',
        mode: 'multiple',
        title: i18n.t("ui.select_foods"),
        selected: JSON.stringify([]),
        excluded: JSON.stringify([])
      }
    });
  };
  const handleAddWater = async (amountMl = 250) => {
    const amount = parseInt(amountMl, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.please_enter_a_valid_water_amount"));
      return;
    }
    try {
      const {
        data
      } = await authFetch('/api/water', {
        method: 'POST',
        body: JSON.stringify({
          amountMl: amount,
          date: formatDateForApi(selectedDate)
        })
      });
      if (data.success) {
        setWaterEntries(data.data.entries || []);
        setCustomWaterMl('');
      } else {
        Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_log_water"));
      }
    } catch (error) {
      Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_log_water"));
    }
  };
  const handleDeleteWater = async entryId => {
    try {
      const {
        data
      } = await authFetch(`/api/water/${entryId}?date=${formatDateForApi(selectedDate)}`, {
        method: 'DELETE'
      });
      if (data.success) {
        setWaterEntries(data.data.entries || []);
      } else {
        Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_delete_water_log"));
      }
    } catch (error) {
      Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_delete_water_log"));
    }
  };
  const removeFoodItem = async (mealId, foodId) => {
    try {
      const {
        data
      } = await authFetch(`/api/meals/${mealId}/foods/${foodId}`, {
        method: 'DELETE'
      });
      if (data.success) {
        setMeals(prevMeals => ({
          ...prevMeals,
          [mealId]: {
            ...prevMeals[mealId],
            items: (prevMeals[mealId]?.items || []).filter(item => item.id !== foodId)
          }
        }));
      }
    } catch (error) {
      console.error('Error removing food item:', error);
    }
  };

  // ── Skata renderēšana ───────────────────────────────────────────────────────
  return <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58,78,72,0.4)', 'rgba(58,78,72,0.8)', 'rgba(58,78,72,0.97)']} style={styles.overlay}>
        {isLoading ? <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>{i18n.t("ui.loading_nutrition_data")}</Text>
          </View> : error ? <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchNutritionData} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{i18n.t("ui.retry")}</Text>
            </TouchableOpacity>
          </View> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.dateHeader}>
              <TouchableOpacity style={styles.dateNavButton} onPress={() => setSelectedDate(current => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1))}>
                <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#F5C842" />
                <Text style={styles.dateButtonText}>{formatDisplayDate(selectedDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateNavButton} onPress={() => setSelectedDate(current => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1))} disabled={formatDateForApi(selectedDate) === formatDateForApi(new Date())}>
                <Ionicons name="chevron-forward" size={20} color={formatDateForApi(selectedDate) === formatDateForApi(new Date()) ? 'rgba(255,255,255,0.28)' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>

            {/* Makroelementu josla */}
            <Text style={styles.sectionLabel}>{i18n.t("ui.today_s_macros")}</Text>
            <View style={styles.macrosBar}>
              <View style={[styles.macroSegment, {
            flex: macros.protein || 1,
            backgroundColor: '#4CAF93'
          }]}>
                <Text style={styles.macroText}>{i18n.t("ui.protein")}{'\n'}{macros.protein}%</Text>
              </View>
              <View style={[styles.macroSegment, {
            flex: macros.fat || 1,
            backgroundColor: '#F5C842'
          }]}>
                <Text style={[styles.macroText, {
              color: '#2C3E50'
            }]}>{i18n.t("ui.fat")}{'\n'}{macros.fat}%</Text>
              </View>
              <View style={[styles.macroSegment, {
            flex: macros.carbs || 1,
            backgroundColor: '#5B8CDB'
          }]}>
                <Text style={styles.macroText}>{i18n.t("ui.carbs")}{'\n'}{macros.carbs}%</Text>
              </View>
            </View>

            {/* Ūdens patēriņa uzskaite */}
            <View style={styles.card}>
              <View style={styles.waterHeader}>
                <Text style={styles.cardLabel}>{i18n.t("ui.water")}</Text>
                <Text style={styles.waterAmountInline}>{waterMl}{i18n.t("ui.ml")}</Text>
              </View>
              <View style={styles.waterScaleRow}>
                <Text style={styles.waterScaleText}>0</Text>
                <Text style={styles.waterScaleText}>{(WATER_GOAL_ML / 2 / 1000).toFixed(1)}{i18n.t("ui.l")}</Text>
                <Text style={styles.waterScaleText}>{(WATER_GOAL_ML / 1000).toFixed(1)}{i18n.t("ui.l")}</Text>
              </View>
              <View style={styles.waterBarBg}>
                <View style={[styles.waterBarFill, {
              width: `${waterProgress * 100}%`
            }]} />
              </View>
              <Text style={styles.waterAmount}>
                {(waterMl / 1000).toFixed(2)}{i18n.t("ui.l_2")}{WATER_GOAL_ML / 1000}{i18n.t("ui.l")}</Text>
              <View style={styles.waterQuickRow}>
                {WATER_QUICK_AMOUNTS.map(amount => <TouchableOpacity key={amount} onPress={() => handleAddWater(amount)} style={styles.addWaterBtn}>
                    <Ionicons name="add" size={16} color="#F5C842" />
                    <Text style={styles.addWaterText}>{amount}{i18n.t("ui.ml")}</Text>
                  </TouchableOpacity>)}
              </View>
              <View style={styles.customWaterRow}>
                <TextInput style={styles.customWaterInput} placeholder={i18n.t("ui.custom_ml")} placeholderTextColor="rgba(255,255,255,0.4)" value={customWaterMl} onChangeText={setCustomWaterMl} keyboardType="number-pad" />
                <TouchableOpacity style={styles.customWaterButton} onPress={() => handleAddWater(customWaterMl)}>
                  <Text style={styles.customWaterButtonText}>{i18n.t("ui.add")}</Text>
                </TouchableOpacity>
              </View>
              {waterEntries.length > 0 ? <View style={styles.waterEntryList}>
                  {waterEntries.slice(0, 5).map(entry => <View key={entry.id} style={styles.waterEntryRow}>
                      <View style={styles.waterEntryInfo}>
                        <Ionicons name="water" size={16} color="#5B8CDB" />
                        <Text selectable style={styles.waterEntryText}>{entry.amount_ml}{i18n.t("ui.ml")}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteWater(entry.id)} hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8
              }}>
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>)}
                </View> : null}
            </View>

            {/* Kaloriju kopsavilkums */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{i18n.t("ui.calories_remaining")}</Text>
              <View style={styles.calorieRow}>
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{CALORIE_GOAL}</Text>
                  <Text style={styles.calorieItemLabel}>{i18n.t("ui.goal_2")}</Text>
                </View>
                <Text style={styles.calorieOperator}>-</Text>
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{totalMealCalories}</Text>
                  <Text style={styles.calorieItemLabel}>{i18n.t("ui.meals")}</Text>
                </View>
                <Text style={styles.calorieOperator}>+</Text>
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{WORKOUT_CALORIES}</Text>
                  <Text style={styles.calorieItemLabel}>{i18n.t("ui.workouts")}</Text>
                </View>
                <Text style={styles.calorieOperator}>=</Text>
                <View style={styles.calorieItem}>
                  <Text style={[styles.calorieRemaining, caloriesRemaining < 0 && {
                color: '#FF6B6B'
              }]}>
                    {caloriesRemaining}
                  </Text>
                </View>
              </View>
            </View>

            {/* Maltīšu sadaļas */}
            {allMeals.map(meal => {
          const mealCals = getMealCalories(meal);
          return <View key={meal.id} style={styles.mealSection}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealTitleRow}>
                      <MaterialCommunityIcons name={meal.icon} size={18} color="#F5C842" />
                      <Text style={styles.mealTitle}>{i18n.t(meal.labelKey)}</Text>
                    </View>
                    <Text style={styles.mealCalories}>{mealCals}{i18n.t("ui.kcal")}</Text>
                  </View>

                  {(meal.items ?? []).length === 0 ? <View style={styles.emptyMeal}>
                      <Text style={styles.emptyMealText}>{i18n.t("ui.no_foods_logged_yet")}</Text>
                    </View> : (meal.items ?? []).map((item, index) => <FoodSwipeRow key={item.id ?? index} item={item} isLast={index === meal.items.length - 1} onOpen={food => router.push({
              pathname: '/food-details',
              params: {
                id: food.food_id ?? food.id
              }
            })} onDelete={food => removeFoodItem(meal.id, food.id)} />)}

                  <TouchableOpacity style={styles.addFoodButton} onPress={() => openFoodSelection(meal.id)}>
                    <Ionicons name="add" size={16} color="#F5C842" />
                    <Text style={styles.addFoodText}>{i18n.t("ui.add_food")}</Text>
                  </TouchableOpacity>
                </View>;
        })}

            <View style={{
          height: 100
        }} />
          </ScrollView>}
      </LinearGradient>
      <DatePickerModal visible={showDatePicker} title={i18n.t("ui.nutrition_date")} value={selectedDate} maximumDate={new Date()} onConfirm={date => {
      setSelectedDate(date);
      setShowDatePicker(false);
    }} onClose={() => setShowDatePicker(false)} />
    </View>;
};
export default NutritionScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A4E48'
  },
  overlay: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#F5C842',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4
  },
  retryButtonText: {
    color: '#2C3E50',
    fontWeight: '600',
    fontSize: 14
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  dateNavButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  dateButton: {
    flex: 1,
    minHeight: 42,
    marginHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.22)'
  },
  dateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  sectionLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8
  },
  macrosBar: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    height: 52
  },
  macroSegment: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6
  },
  macroText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 15
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  cardLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 10
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  waterAmountInline: {
    color: '#5B8CDB',
    fontSize: 14,
    fontWeight: '700'
  },
  addWaterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 200, 66, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.22)'
  },
  addWaterText: {
    color: '#F5C842',
    fontSize: 13,
    fontWeight: '500'
  },
  waterScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  waterScaleText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)'
  },
  waterBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  waterBarFill: {
    height: '100%',
    backgroundColor: '#5B8CDB',
    borderRadius: 4
  },
  waterAmount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    textAlign: 'right'
  },
  waterQuickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  customWaterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10
  },
  customWaterInput: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)'
  },
  customWaterButton: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5C842'
  },
  customWaterButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '800'
  },
  waterEntryList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  waterEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  waterEntryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  waterEntryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  calorieItem: {
    alignItems: 'center'
  },
  calorieValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  calorieItemLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2
  },
  calorieOperator: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 12
  },
  calorieRemaining: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5C842'
  },
  mealSection: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden'
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)'
  },
  emptyMeal: {
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  emptyMealText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic'
  },
  foodSwipeContainer: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  foodInfo: {
    flex: 1,
    marginRight: 12
  },
  foodName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500'
  },
  foodDetail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2
  },
  foodCalories: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500'
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12
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
    alignItems: 'center'
  },
  confirmBtnText: {
    color: '#2C3E50',
    fontWeight: '600'
  }
});
