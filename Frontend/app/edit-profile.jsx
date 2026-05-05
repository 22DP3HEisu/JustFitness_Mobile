// Skats ļauj lietotājam rediģēt profila pamatdatus.
// Tajā tiek mainīts vārds, e-pasts un cita profila informācija, kas tiek attēlota lietotāja kontā.
import i18n from "../lib/i18n";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
import { useState, useEffect } from 'react';
import PickerModal from './_components/PickerModal';
import DatePickerModal from './_components/DatePickerModal';
import HeightPickerModal from './_components/HeightPickerModal';
const parseLocalDate = dateString => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};
const formatDateForApi = date => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const cmToInches = cm => {
  const parsed = Number(cm);
  if (!Number.isFinite(parsed)) return null;
  return parsed / 2.54;
};
const inchesToCm = inches => {
  const parsed = Number(inches);
  if (!Number.isFinite(parsed)) return null;
  return Number((parsed * 2.54).toFixed(1));
};
const splitInches = totalInches => {
  const parsed = Number(totalInches);
  if (!Number.isFinite(parsed)) return {
    feet: '',
    inches: ''
  };
  const feet = Math.floor(parsed / 12);
  const inches = Math.round(parsed - feet * 12);
  return {
    feet: String(feet),
    inches: String(inches)
  };
};
const EditProfileScreen = () => {
  const router = useRouter();
  const {
    user,
    authFetch
  } = useAuth();
  const [birthDate, setBirthDate] = useState(null);
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showHeightModal, setShowHeightModal] = useState(false);
  const genderOptions = [{
    label: i18n.t("ui.choose_gender"),
    value: ''
  }, {
    label: i18n.t("ui.male"),
    value: 'Male'
  }, {
    label: i18n.t("ui.female"),
    value: 'Female'
  }, {
    label: i18n.t("ui.other"),
    value: 'Other'
  }];
  const selectedGenderLabel = genderOptions.find(option => option.value === gender)?.label || genderOptions[0].label;
  const selectedHeightUnitLabel = heightUnit === 'in' ? i18n.t("ui.ft_in") : 'cm';
  useEffect(() => {
    loadProfileData();
  }, [user]);
  const loadProfileData = async () => {
    if (!user) return;
    try {
      const {
        response,
        data
      } = await authFetch('/api/user/settings');
      if (response.ok && data) {
        setBirthDate(parseLocalDate(data.data.birth_date));
        setGender(data.data.gender || '');
        setHeight(data.data.height ? String(data.data.height) : '');
        setHeightUnit(data.data.height_unit || 'cm');
      }
    } catch (error) {
      console.error('Kluda ieladejot profila datus:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const getHeightCm = () => {
    if (!height) return '';
    return heightUnit === 'in' ? inchesToCm(height) : Number(height);
  };
  const formatHeight = () => {
    if (!height) return i18n.t("ui.izvelieties_augumu");
    if (heightUnit === 'in') {
      const {
        feet,
        inches
      } = splitInches(height);
      return `${feet} ft ${inches} in`;
    }
    return `${Number(height)} cm`;
  };
  const handleDateConfirm = selectedDate => {
    setBirthDate(selectedDate);
    setShowDatePicker(false);
  };
  const handleHeightConfirm = heightCm => {
    const nextHeight = heightUnit === 'in' ? cmToInches(heightCm) : heightCm;
    setHeight(String(Number(nextHeight).toFixed(heightUnit === 'in' ? 0 : 1)));
    setShowHeightModal(false);
  };
  const formatDate = date => {
    if (!date) return i18n.t("ui.izvelieties_dzimsanas_dienu");
    return date.toLocaleDateString('lv-LV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const {
        response,
        data
      } = await authFetch('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify({
          birthDate: formatDateForApi(birthDate),
          gender: gender || null,
          height: height ? parseFloat(height) : null,
          heightUnit: heightUnit
        })
      });
      if (response.ok) {
        Alert.alert(i18n.t("ui.success_2"), i18n.t("ui.profile_data_updated"));
        router.back();
      } else {
        Alert.alert(i18n.t("ui.error_2"), data.message || i18n.t("ui.failed_to_update_profile_data"));
      }
    } catch (error) {
      Alert.alert(i18n.t("ui.error_2"), error.message);
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{i18n.t("ui.profile_2")}</Text>
          <View style={{
          width: 28
        }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("ui.birthday")}</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="calendar-today" size={20} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.selectButtonText}>{formatDate(birthDate)}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{i18n.t("ui.gender_2")}</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowGenderModal(true)}>
              <MaterialIcons name="wc" size={20} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.selectButtonText}>{selectedGenderLabel}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{i18n.t("ui.height")}</Text>
              <Text style={styles.unitText}>{selectedHeightUnitLabel}</Text>
            </View>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowHeightModal(true)}>
              <MaterialIcons name="height" size={20} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.selectButtonText}>{formatHeight()}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#2C3E50" /> : <Text style={styles.saveButtonText}>{i18n.t("ui.save_changes")}</Text>}
          </TouchableOpacity>
        </View>

        <DatePickerModal visible={showDatePicker} title={i18n.t("ui.birthday")} value={birthDate} maximumDate={new Date()} onConfirm={handleDateConfirm} onClose={() => setShowDatePicker(false)} />
        <PickerModal visible={showGenderModal} title={i18n.t("ui.gender_2")} selectedValue={gender} options={genderOptions} onValueChange={setGender} onClose={() => setShowGenderModal(false)} />
        <HeightPickerModal visible={showHeightModal} unit={heightUnit} heightCm={getHeightCm()} onConfirm={handleHeightConfirm} onClose={() => setShowHeightModal(false)} />
      </LinearGradient>
    </SafeAreaView>;
};
export default EditProfileScreen;
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
  inputGroup: {
    marginBottom: 24
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
