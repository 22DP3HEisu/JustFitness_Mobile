import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'
import { useState, useEffect } from 'react'
import PickerModal from './_components/PickerModal'

const EditUnitsScreen = () => {
  const router = useRouter()
  const { user, authFetch } = useAuth()
  const [weightUnit, setWeightUnit] = useState('kg')
  const [heightUnit, setHeightUnit] = useState('cm')
  const [distanceUnit, setDistanceUnit] = useState('km')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showHeightModal, setShowHeightModal] = useState(false)
  const [showDistanceModal, setShowDistanceModal] = useState(false)

  const weightOptions = [
    { label: 'Kilogrami (kg)', value: 'kg' },
    { label: 'Marcinas (lb)', value: 'lb' },
  ]
  const heightOptions = [
    { label: 'Centimetri (cm)', value: 'cm' },
    { label: 'Collas (in)', value: 'in' },
  ]
  const distanceOptions = [
    { label: 'Kilometri (km)', value: 'km' },
    { label: 'Judzes (mi)', value: 'mi' },
  ]

  useEffect(() => {
    loadUnitsData()
  }, [user])

  const loadUnitsData = async () => {
    if (!user) return
    try {
      const { response, data } = await authFetch('/api/user/settings')
      if (response.ok && data) {
        setWeightUnit(data.data.weight_unit || 'kg')
        setHeightUnit(data.data.height_unit || 'cm')
        setDistanceUnit(data.data.distance_unit || 'km')
      }
    } catch (error) {
      console.error('Kluda ieladejot vienibas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { response, data } = await authFetch('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify({
          weightUnit,
          heightUnit,
          distanceUnit
        })
      })

      if (response.ok) {
        Alert.alert('Veiksmigi', 'Vienibas atjauninatas')
        router.back()
      } else {
        Alert.alert('Kluda', data.message || 'Neizdevas atjauninat vienibas')
      }
    } catch (error) {
      Alert.alert('Kluda', error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']}
          style={styles.overlay}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
          </View>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']}
        style={styles.overlay}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Vienibas</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.pickerGroup} onPress={() => setShowWeightModal(true)}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="scale" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.icon} />
              <Text style={styles.label}>Svara vieniba</Text>
            </View>
            <View style={styles.buttonContainer}>
              <Text style={styles.selectedValue}>{weightUnit === 'kg' ? 'Kilogrami (kg)' : 'Marcinas (lb)'}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerGroup} onPress={() => setShowHeightModal(true)}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="height" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.icon} />
              <Text style={styles.label}>Auguma vieniba</Text>
            </View>
            <View style={styles.buttonContainer}>
              <Text style={styles.selectedValue}>{heightUnit === 'cm' ? 'Centimetri (cm)' : 'Collas (in)'}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerGroup} onPress={() => setShowDistanceModal(true)}>
            <View style={styles.labelContainer}>
              <MaterialIcons name="directions-run" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.icon} />
              <Text style={styles.label}>Distances vieniba</Text>
            </View>
            <View style={styles.buttonContainer}>
              <Text style={styles.selectedValue}>{distanceUnit === 'km' ? 'Kilometri (km)' : 'Judzes (mi)'}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </View>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={18} color="#F5C842" />
            <Text style={styles.infoText}>Izvelieties velamas mervienibas jusu personigajiem iestatijumiem</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#2C3E50" />
            ) : (
              <Text style={styles.saveButtonText}>Saglabat izmainas</Text>
            )}
          </TouchableOpacity>
        </View>

        <PickerModal
          visible={showWeightModal}
          title="Svara vieniba"
          selectedValue={weightUnit}
          options={weightOptions}
          onValueChange={setWeightUnit}
          onClose={() => setShowWeightModal(false)}
        />
        <PickerModal
          visible={showHeightModal}
          title="Auguma vieniba"
          selectedValue={heightUnit}
          options={heightOptions}
          onValueChange={setHeightUnit}
          onClose={() => setShowHeightModal(false)}
        />
        <PickerModal
          visible={showDistanceModal}
          title="Distances vieniba"
          selectedValue={distanceUnit}
          options={distanceOptions}
          onValueChange={setDistanceUnit}
          onClose={() => setShowDistanceModal(false)}
        />
      </LinearGradient>
    </SafeAreaView>
  )
}

export default EditUnitsScreen

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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  pickerGroup: {
    marginBottom: 28,
    backgroundColor: 'rgba(58, 78, 72, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  buttonContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(58, 78, 72, 0.4)',
  },
  selectedValue: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    backgroundColor: '#F5C842',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
})
