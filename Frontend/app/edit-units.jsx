// Skats ļauj lietotājam izvēlēties svara, auguma un distances mērvienības.
// Mērvienību izvēle ietekmē to, kā lietotnē tiek rādīts svars, augums, distance un ar tiem saistītie aprēķini.
import i18n from "../lib/i18n";
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
import { useState, useEffect } from 'react';
import PickerModal from './_components/PickerModal';
const EditUnitsScreen = () => {
  const router = useRouter();
  const {
    user,
    authFetch
  } = useAuth();
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [distanceUnit, setDistanceUnit] = useState('km');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showHeightModal, setShowHeightModal] = useState(false);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const weightOptions = [{
    label: i18n.t("ui.kilograms_kg"),
    value: 'kg'
  }, {
    label: i18n.t("ui.pounds_lb"),
    value: 'lb'
  }];
  const heightOptions = [{
    label: i18n.t("ui.centimeters_cm"),
    value: 'cm'
  }, {
    label: i18n.t("ui.inches_in"),
    value: 'in'
  }];
  const distanceOptions = [{
    label: i18n.t("ui.kilometers_km"),
    value: 'km'
  }, {
    label: i18n.t("ui.miles_mi"),
    value: 'mi'
  }];
  useEffect(() => {
    loadUnitsData();
  }, [user]);
  const loadUnitsData = async () => {
    if (!user) return;
    try {
      const {
        response,
        data
      } = await authFetch('/api/user/settings');
      if (response.ok && data) {
        setWeightUnit(data.data.weight_unit || 'kg');
        setHeightUnit(data.data.height_unit || 'cm');
        setDistanceUnit(data.data.distance_unit || 'km');
      }
    } catch (error) {
      console.error('Kluda ieladejot vienibas:', error);
    } finally {
      setIsLoading(false);
    }
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
          weightUnit,
          heightUnit,
          distanceUnit
        })
      });
      if (response.ok) {
        Alert.alert(i18n.t("ui.success_2"), i18n.t("ui.units_updated"));
        router.back();
      } else {
        Alert.alert(i18n.t("ui.error_2"), data.message || i18n.t("ui.failed_to_update_units"));
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
          <Text style={styles.title}>{i18n.t("ui.units_2")}</Text>
          <View style={{
          width: 28
        }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.pickerGroup} onPress={() => setShowWeightModal(true)}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="scale" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.icon} />
              <Text style={styles.label}>{i18n.t("ui.weight_unit")}</Text>
            </View>
            <View style={styles.buttonContainer}>
              <Text style={styles.selectedValue}>{weightUnit === 'kg' ? i18n.t("ui.kilograms_kg") : i18n.t("ui.pounds_lb")}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerGroup} onPress={() => setShowHeightModal(true)}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="height" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.icon} />
              <Text style={styles.label}>{i18n.t("ui.height_unit")}</Text>
            </View>
            <View style={styles.buttonContainer}>
              <Text style={styles.selectedValue}>{heightUnit === 'cm' ? i18n.t("ui.centimeters_cm") : i18n.t("ui.inches_in")}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerGroup} onPress={() => setShowDistanceModal(true)}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="directions-run" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.icon} />
              <Text style={styles.label}>{i18n.t("ui.distance_unit")}</Text>
            </View>
            <View style={styles.buttonContainer}>
              <Text style={styles.selectedValue}>{distanceUnit === 'km' ? i18n.t("ui.kilometers_km") : i18n.t("ui.miles_mi")}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </View>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={18} color="#F5C842" />
            <Text style={styles.infoText}>{i18n.t("ui.choose_preferred_units_for_your_personal_settings")}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#2C3E50" /> : <Text style={styles.saveButtonText}>{i18n.t("ui.save_changes")}</Text>}
          </TouchableOpacity>
        </View>

        <PickerModal visible={showWeightModal} title={i18n.t("ui.weight_unit")} selectedValue={weightUnit} options={weightOptions} onValueChange={setWeightUnit} onClose={() => setShowWeightModal(false)} />
        <PickerModal visible={showHeightModal} title={i18n.t("ui.height_unit")} selectedValue={heightUnit} options={heightOptions} onValueChange={setHeightUnit} onClose={() => setShowHeightModal(false)} />
        <PickerModal visible={showDistanceModal} title={i18n.t("ui.distance_unit")} selectedValue={distanceUnit} options={distanceOptions} onValueChange={setDistanceUnit} onClose={() => setShowDistanceModal(false)} />
      </LinearGradient>
    </SafeAreaView>;
};
export default EditUnitsScreen;
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
  pickerGroup: {
    marginBottom: 28,
    backgroundColor: 'rgba(58, 78, 72, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden'
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  icon: {
    marginRight: 8
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  buttonContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(58, 78, 72, 0.4)'
  },
  selectedValue: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8
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
