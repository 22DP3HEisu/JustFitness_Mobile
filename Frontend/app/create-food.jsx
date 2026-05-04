import i18n from "../lib/i18n";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
const CreateFoodScreen = () => {
  const router = useRouter();
  const {
    authFetch
  } = useAuth();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const parseNumber = value => {
    const normalized = value.replace(',', '.');
    return normalized === '' ? null : parseFloat(normalized);
  };
  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.please_enter_a_food_name"));
      return;
    }
    const caloriesValue = parseNumber(calories);
    const proteinValue = parseNumber(protein);
    const carbsValue = parseNumber(carbs);
    const fatValue = parseNumber(fat);
    if (caloriesValue === null || proteinValue === null || carbsValue === null || fatValue === null) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.please_enter_values_for_calories_protein_carbs_and_fat"));
      return;
    }
    setIsLoading(true);
    try {
      const {
        data
      } = await authFetch('/api/foods', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          caloriesPer100g: caloriesValue,
          proteinPer100g: proteinValue,
          carbsPer100g: carbsValue,
          fatPer100g: fatValue,
          isPublic
        })
      });
      if (data.success) {
        Alert.alert(i18n.t("ui.success"), i18n.t("ui.food_created_successfully"), [{
          text: i18n.t("ui.ok"),
          onPress: () => router.back()
        }]);
      } else {
        Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_create_food"));
      }
    } catch (error) {
      console.error('Error creating food:', error);
      Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_create_food"));
    } finally {
      setIsLoading(false);
    }
  };
  return <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.t("ui.create_food")}</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="food-apple" size={48} color="#F5C842" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("ui.food_name")}</Text>
              <TextInput style={[styles.input, focusedField === 'name' && styles.inputFocused]} placeholder={i18n.t("ui.e_g_chicken_breast_oats_apple")} placeholderTextColor="rgba(255, 255, 255, 0.4)" value={name} onChangeText={setName} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("ui.calories_per_100g")}</Text>
              <TextInput style={[styles.input, focusedField === 'calories' && styles.inputFocused]} placeholder={i18n.t("ui.e_g_165")} placeholderTextColor="rgba(255, 255, 255, 0.4)" keyboardType="decimal-pad" value={calories} onChangeText={setCalories} onFocus={() => setFocusedField('calories')} onBlur={() => setFocusedField(null)} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("ui.protein_per_100g")}</Text>
              <TextInput style={[styles.input, focusedField === 'protein' && styles.inputFocused]} placeholder={i18n.t("ui.e_g_31")} placeholderTextColor="rgba(255, 255, 255, 0.4)" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} onFocus={() => setFocusedField('protein')} onBlur={() => setFocusedField(null)} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("ui.carbs_per_100g")}</Text>
              <TextInput style={[styles.input, focusedField === 'carbs' && styles.inputFocused]} placeholder={i18n.t("ui.e_g_0")} placeholderTextColor="rgba(255, 255, 255, 0.4)" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} onFocus={() => setFocusedField('carbs')} onBlur={() => setFocusedField(null)} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("ui.fat_per_100g")}</Text>
              <TextInput style={[styles.input, focusedField === 'fat' && styles.inputFocused]} placeholder={i18n.t("ui.e_g_3_6")} placeholderTextColor="rgba(255, 255, 255, 0.4)" keyboardType="decimal-pad" value={fat} onChangeText={setFat} onFocus={() => setFocusedField('fat')} onBlur={() => setFocusedField(null)} />
            </View>

            <View style={styles.visibilityCard}>
              <View style={styles.visibilityTextContainer}>
                <Text style={styles.visibilityTitle}>{i18n.t("ui.public_food")}</Text>
                <Text style={styles.visibilityText}>
                  {isPublic ? i18n.t("ui.other_users_can_find_and_use_this_food") : i18n.t("ui.only_you_can_find_and_use_this_food")}
                </Text>
              </View>
              <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{
              false: 'rgba(255, 255, 255, 0.22)',
              true: 'rgba(245, 200, 66, 0.45)'
            }} thumbColor={isPublic ? '#F5C842' : '#FFFFFF'} />
            </View>

            <TouchableOpacity style={[styles.createButton, isLoading && styles.createButtonDisabled]} onPress={handleCreate} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#2C3E50" /> : <>
                  <Ionicons name="checkmark-circle" size={24} color="#2C3E50" />
                  <Text style={styles.createButtonText}>{i18n.t("ui.create_food")}</Text>
                </>}
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>;
};
export default CreateFoodScreen;
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
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  placeholder: {
    width: 40
  },
  keyboardView: {
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  inputGroup: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  inputFocused: {
    borderColor: '#F5C842',
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5C842',
    borderRadius: 12,
    padding: 16
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 24
  },
  visibilityTextContainer: {
    flex: 1
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  visibilityText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.62)',
    marginTop: 3,
    lineHeight: 18
  },
  createButtonDisabled: {
    opacity: 0.7
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50'
  },
  bottomPadding: {
    height: 40
  }
});
