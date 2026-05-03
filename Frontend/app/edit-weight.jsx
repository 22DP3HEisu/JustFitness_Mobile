import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { useAuth } from './_context/AuthContext'
import WeightPickerModal from './_components/WeightPickerModal'

const formatWeight = (weight, unit) => {
  if (weight == null || weight === '') return 'Izvēlieties svaru'
  return `${Number(weight).toFixed(1)} ${unit === 'lb' || unit === 'lbs' ? 'lb' : 'kg'}`
}

const formatUpdatedAt = (dateString) => {
  if (!dateString) return 'Nav saglabāta svara'
  return new Date(dateString).toLocaleDateString('lv-LV', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const EditWeightScreen = () => {
  const router = useRouter()
  const { user, authFetch } = useAuth()
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('kg')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)

  useEffect(() => {
    loadWeightData()
  }, [user])

  const loadWeightData = async () => {
    if (!user) return
    try {
      const { response, data } = await authFetch('/api/user/weight')
      if (response.ok && data?.data) {
        setWeightUnit(data.data.unit || 'kg')
        setWeight(data.data.latest?.weight != null ? String(Number(data.data.latest.weight).toFixed(1)) : '')
        setUpdatedAt(data.data.latest?.created_at || null)
      }
    } catch (error) {
      console.error('Kļūda ielādējot svaru:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!weight) {
      Alert.alert('Kļūda', 'Lūdzu izvēlieties svaru')
      return
    }

    setIsSaving(true)
    try {
      const { response, data } = await authFetch('/api/user/weight', {
        method: 'POST',
        body: JSON.stringify({
          weight: Number(weight),
          weightUnit
        })
      })

      if (response.ok) {
        Alert.alert('Veiksmīgi', 'Svars saglabāts')
        setUpdatedAt(data.data.created_at)
        router.back()
      } else {
        Alert.alert('Kļūda', data.message || 'Neizdevās saglabāt svaru')
      }
    } catch (error) {
      Alert.alert('Kļūda', error.message)
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
          <Text style={styles.title}>Svars</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Pašreizējais svars</Text>
              <Text style={styles.unitText}>{weightUnit === 'lb' || weightUnit === 'lbs' ? 'lb' : 'kg'}</Text>
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowWeightModal(true)}
            >
              <MaterialIcons name="monitor-weight" size={20} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.selectButtonText}>{formatWeight(weight, weightUnit)}</Text>
              <MaterialIcons name="expand-more" size={24} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="history" size={18} color="#F5C842" />
            <Text style={styles.infoText}>Pēdējais ieraksts: {formatUpdatedAt(updatedAt)}</Text>
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
              <Text style={styles.saveButtonText}>Saglabāt svaru</Text>
            )}
          </TouchableOpacity>
        </View>

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
      </LinearGradient>
    </SafeAreaView>
  )
}

export default EditWeightScreen

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
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  unitText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '700',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 78, 72, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
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
