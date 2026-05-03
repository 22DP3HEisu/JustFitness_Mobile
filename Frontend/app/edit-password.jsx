import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'
import { useState } from 'react'

// Paroles ievades komponente
const PasswordInput = ({ label, value, onChangeText, showPassword, onToggleShow, icon }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <MaterialIcons name={icon} size={20} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={`Ievadiet ${label.toLowerCase()}`}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        secureTextEntry={!showPassword}
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity onPress={onToggleShow} style={styles.toggleButton}>
        <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="rgba(255, 255, 255, 0.7)" />
      </TouchableOpacity>
    </View>
  </View>
)

const EditPasswordScreen = () => {
  const router = useRouter()
  const { authFetch } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChanging, setIsChanging] = useState(false)

  const handleChangePassword = async () => {
    // Validēē formu
    if (!oldPassword.trim()) {
      Alert.alert('Kļūda', 'Lūdzu ievadiet veco paroli')
      return
    }
    if (!newPassword.trim()) {
      Alert.alert('Kļūda', 'Lūdzu ievadiet jauno paroli')
      return
    }
    if (!confirmPassword.trim()) {
      Alert.alert('Kļūda', 'Lūdzu apstipriniet jauno paroli')
      return
    }
    if (newPassword.length < 8) {
      Alert.alert('Kļūda', 'Jaunā parole ir jābūt vismaz 8 rakstzīmes garai')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Kļūda', 'Jaunā parole un apstiprinājums nesakrīt')
      return
    }

    setIsChanging(true)
    try {
      const { response, data } = await authFetch('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          oldPassword: oldPassword.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim()
        })
      })

      if (response.ok) {
        Alert.alert('Veiksmīgi', 'Parole mainīta', [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ])
      } else {
        Alert.alert('Kļūda', data.message || 'Neizdevās mainīt paroli')
      }
    } catch (error) {
      Alert.alert('Kļūda', error.message)
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']}
        style={styles.overlay}
      >
        {/* Virsraksts */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Paroles maiņa</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.description}>Ievadiet savu vecumu paroli un izvēlieties jaunu paroli</Text>

          {/* Vecā parole */}
          <PasswordInput
            label="Vecā parole"
            value={oldPassword}
            onChangeText={setOldPassword}
            showPassword={showOldPassword}
            onToggleShow={() => setShowOldPassword(!showOldPassword)}
            icon="lock"
          />

          <View style={styles.divider} />

          {/* Jaunā parole */}
          <PasswordInput
            label="Jaunā parole"
            value={newPassword}
            onChangeText={setNewPassword}
            showPassword={showNewPassword}
            onToggleShow={() => setShowNewPassword(!showNewPassword)}
            icon="lock-outline"
          />

          {/* Apstipriniet jauno paroli */}
          <PasswordInput
            label="Apstipriniet jauno paroli"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            showPassword={showConfirmPassword}
            onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
            icon="lock-outline"
          />

          {/* Paroles prasības */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Paroles prasības:</Text>
            <Text style={[styles.requirement, newPassword.length >= 8 && styles.requirementMet]}>
              {newPassword.length >= 8 ? '✓' : '○'} Vismaz 8 rakstzīmes ({newPassword.length})
            </Text>
            <Text style={[styles.requirement, newPassword === confirmPassword && newPassword.length > 0 && styles.requirementMet]}>
              {newPassword === confirmPassword && newPassword.length > 0 ? '✓' : '○'} Paroles sakrīt
            </Text>
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={18} color="#F5C842" />
            <Text style={styles.infoText}>Pēc paroles maiņas jums būs jāpierakstās atkārtoti</Text>
          </View>
        </ScrollView>

        {/* Mainīt paroli pogu */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.changeButton, isChanging && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={isChanging}
          >
            {isChanging ? (
              <ActivityIndicator color="#2C3E50" />
            ) : (
              <>
                <MaterialIcons name="lock-reset" size={20} color="#2C3E50" style={{ marginRight: 8 }} />
                <Text style={styles.changeButtonText}>Mainīt paroli</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  )
}

export default EditPasswordScreen

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
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 78, 72, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  toggleButton: {
    padding: 8,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },
  requirementsBox: {
    backgroundColor: 'rgba(58, 78, 72, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 4,
    marginBottom: 4,
  },
  requirementMet: {
    color: '#4ADE80',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderRadius: 8,
    padding: 12,
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
  changeButton: {
    backgroundColor: '#F5C842',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabledButton: {
    opacity: 0.6,
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
})
