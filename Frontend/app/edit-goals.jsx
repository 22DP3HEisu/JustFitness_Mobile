import i18n from "../lib/i18n";
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
import { useState, useEffect } from 'react';
import WeightPickerModal from './_components/WeightPickerModal';
const InputField = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'decimal-pad'
}) => <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <MaterialIcons name={icon} size={20} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
      <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="rgba(255, 255, 255, 0.5)" keyboardType={keyboardType} value={value} onChangeText={onChangeText} />
    </View>
  </View>;
const formatWeight = (weight, unit) => {
  if (weight == null || weight === '') return i18n.t("ui.izvelieties_merka_svaru");
  return `${Number(weight).toFixed(1)} ${unit === 'lb' || unit === 'lbs' ? 'lb' : 'kg'}`;
};
const EditGoalsScreen = () => {
  const router = useRouter();
  const {
    user,
    authFetch
  } = useAuth();
  const [goalWeight, setGoalWeight] = useState('');
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [fatGoal, setFatGoal] = useState('');
  const [carbGoal, setCarbGoal] = useState('');
  const [stepGoal, setStepGoal] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [showGoalWeightModal, setShowGoalWeightModal] = useState(false);
  useEffect(() => {
    loadGoalsData();
  }, [user]);
  const loadGoalsData = async () => {
    if (!user) return;
    try {
      const {
        response,
        data
      } = await authFetch('/api/user/settings');
      if (response.ok && data) {
        setGoalWeight(data.data.goal_weight ? String(data.data.goal_weight) : '');
        setCalorieGoal(data.data.calorie_goal ? String(data.data.calorie_goal) : '');
        setProteinGoal(data.data.protein_goal ? String(data.data.protein_goal) : '');
        setFatGoal(data.data.fat_goal ? String(data.data.fat_goal) : '');
        setCarbGoal(data.data.carb_goal ? String(data.data.carb_goal) : '');
        setStepGoal(data.data.step_goal ? String(data.data.step_goal) : '');
        setWeightUnit(data.data.weight_unit || 'kg');
      }
    } catch (error) {
      console.error('Kļūda ielādējot mērķus:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const validateForm = () => {
    if (goalWeight && isNaN(goalWeight)) {
      Alert.alert(i18n.t("ui.kluda"), i18n.t("ui.ludzu_ievadiet_derigu_svara_merka_vertibu"));
      return false;
    }
    if (calorieGoal && isNaN(calorieGoal)) {
      Alert.alert(i18n.t("ui.kluda"), i18n.t("ui.ludzu_ievadiet_derigu_kaloriju_merka_vertibu"));
      return false;
    }
    if (proteinGoal && isNaN(proteinGoal)) {
      Alert.alert(i18n.t("ui.kluda"), i18n.t("ui.ludzu_ievadiet_derigu_proteina_merka_vertibu"));
      return false;
    }
    if (fatGoal && isNaN(fatGoal)) {
      Alert.alert(i18n.t("ui.kluda"), i18n.t("ui.ludzu_ievadiet_derigu_tauku_merka_vertibu"));
      return false;
    }
    if (carbGoal && isNaN(carbGoal)) {
      Alert.alert(i18n.t("ui.kluda"), i18n.t("ui.ludzu_ievadiet_derigu_oglhidratu_merka_vertibu"));
      return false;
    }
    if (stepGoal && isNaN(stepGoal)) {
      Alert.alert(i18n.t("ui.kluda"), i18n.t("ui.ludzu_ievadiet_derigu_solu_merka_vertibu"));
      return false;
    }
    return true;
  };
  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const {
        response,
        data
      } = await authFetch('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify({
          goalWeight: goalWeight ? parseFloat(goalWeight) : null,
          calorieGoal: calorieGoal ? parseFloat(calorieGoal) : null,
          proteinGoal: proteinGoal ? parseFloat(proteinGoal) : null,
          fatGoal: fatGoal ? parseFloat(fatGoal) : null,
          carbGoal: carbGoal ? parseFloat(carbGoal) : null,
          stepGoal: stepGoal ? parseInt(stepGoal, 10) : null,
          weightUnit: weightUnit
        })
      });
      if (response.ok) {
        Alert.alert(i18n.t("ui.veiksmigi"), i18n.t("ui.merki_atjauninati"));
        router.back();
      } else {
        Alert.alert(i18n.t("ui.kluda"), data.message || i18n.t("ui.neizdevas_atjauninat_merkus"));
      }
    } catch (error) {
      Alert.alert(i18n.t("ui.kluda"), error.message);
    } finally {
      setIsSaving(false);
    }
  };
  if (isLoading) {
    return <SafeAreaView style={styles.container}>
        <LinearGradient colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']} style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
          </View>
        </LinearGradient>
      </SafeAreaView>;
  }
  return <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']} style={styles.overlay}>
        {/* Virsraksts */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{i18n.t("ui.merki")}</Text>
          <View style={{
          width: 28
        }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Svara mērķis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t("ui.svara_merkis")}</Text>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{i18n.t("ui.merka_svars")}</Text>
                <Text style={styles.unitText}>{weightUnit === 'lb' || weightUnit === 'lbs' ? 'lb' : 'kg'}</Text>
              </View>
              <TouchableOpacity style={styles.selectButton} onPress={() => setShowGoalWeightModal(true)}>
                <MaterialIcons name="scale" size={20} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.selectButtonText}>{formatWeight(goalWeight, weightUnit)}</Text>
                <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Uztura mērķi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t("ui.uztura_merki")}</Text>
            
            <InputField label={i18n.t("ui.kaloriju_merkis_kcal")} icon="local-fire-department" value={calorieGoal} onChangeText={setCalorieGoal} placeholder={i18n.t("ui.ievadiet_kaloriju_merki_piem_2000")} />

            <InputField label={i18n.t("ui.proteina_merkis_g")} icon="restaurant" value={proteinGoal} onChangeText={setProteinGoal} placeholder={i18n.t("ui.ievadiet_proteina_merki_piem_150")} />

            <InputField label={i18n.t("ui.tauku_merkis_g")} icon="opacity" value={fatGoal} onChangeText={setFatGoal} placeholder={i18n.t("ui.ievadiet_tauku_merki_piem_65")} />

            <InputField label={i18n.t("ui.oglhidratu_merkis_g")} icon="grain" value={carbGoal} onChangeText={setCarbGoal} placeholder={i18n.t("ui.ievadiet_oglhidratu_merki_piem_225")} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t("ui.aktivitates_merki")}</Text>
            <InputField label={i18n.t("ui.solu_merkis")} icon="directions-walk" value={stepGoal} onChangeText={setStepGoal} placeholder={i18n.t("ui.ievadiet_solu_merki_piem_10000")} keyboardType="number-pad" />
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={18} color="#F5C842" />
            <Text style={styles.infoText}>{i18n.t("ui.atstajiet_tuksu_lai_neuzstaditu_merki_konkretajam_param")}</Text>
          </View>
        </ScrollView>

        {/* Saglabāt pogu */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#2C3E50" /> : <Text style={styles.saveButtonText}>{i18n.t("ui.saglabat_merkus")}</Text>}
          </TouchableOpacity>
        </View>

        <WeightPickerModal visible={showGoalWeightModal} unit={weightUnit} weight={goalWeight} onConfirm={nextWeight => {
        setGoalWeight(String(nextWeight.toFixed(1)));
        setShowGoalWeightModal(false);
      }} onClose={() => setShowGoalWeightModal(false)} />
      </LinearGradient>
    </SafeAreaView>;
};
export default EditGoalsScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A4E48'
  },
  overlay: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  scrollContainer: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20
  },
  section: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5C842',
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 20
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 78, 72, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16
  },
  unitText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '700'
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 78, 72, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
    flex: 1
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    alignItems: 'center'
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
    flex: 1
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)'
  },
  saveButton: {
    backgroundColor: '#F5C842',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  disabledButton: {
    opacity: 0.6
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50'
  }
});
