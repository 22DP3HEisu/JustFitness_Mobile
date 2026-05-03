import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'
import { useState, useEffect } from 'react'

const EditLanguageScreen = () => {
  const router = useRouter()
  const { user, authFetch } = useAuth()
  const [language, setLanguage] = useState('en')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const languages = [
    { label: 'English', value: 'en', flag: '🇬🇧' },
    { label: 'Latviešu', value: 'lv', flag: '🇱🇻' },
    { label: 'Русский', value: 'ru', flag: '🇷🇺' }
  ]

  useEffect(() => {
    loadLanguageData()
  }, [user])

  const loadLanguageData = async () => {
    if (!user) return
    try {
      const { response, data } = await authFetch('/api/user/settings')
      if (response.ok && data) {
        setLanguage(data.language || 'en')
      }
    } catch (error) {
      console.error('Kļūda ielādējot valodu:', error)
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
          language
        })
      })

      if (response.ok) {
        Alert.alert('Veiksmīgi', 'Valoda atjaunināta')
        router.back()
      } else {
        Alert.alert('Kļūda', data.message || 'Neizdevās atjaunināt valodu')
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
        {/* Virsraksts */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Valoda</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.description}>Izvēlieties aplikācijas valodu</Text>

          <View style={styles.languageGrid}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[
                  styles.languageCard,
                  language === lang.value && styles.languageCardSelected
                ]}
                onPress={() => setLanguage(lang.value)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={styles.languageName}>{lang.label}</Text>
                {language === lang.value && (
                  <View style={styles.checkmark}>
                    <MaterialIcons name="check" size={20} color="#F5C842" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={18} color="#F5C842" />
            <Text style={styles.infoText}>Valoda tiks mainīta uzreiz pēc saglabāšanas</Text>
          </View>
        </ScrollView>

        {/* Saglabāt pogu */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#2C3E50" />
            ) : (
              <Text style={styles.saveButtonText}>Saglabāt valodu</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  )
}

export default EditLanguageScreen

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
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  languageCard: {
    width: '48%',
    backgroundColor: 'rgba(58, 78, 72, 0.5)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  languageCardSelected: {
    borderColor: '#F5C842',
    backgroundColor: 'rgba(245, 200, 66, 0.15)',
  },
  languageFlag: {
    fontSize: 40,
    marginBottom: 8,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(58, 78, 72, 0.8)',
    borderRadius: 12,
    padding: 4,
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
