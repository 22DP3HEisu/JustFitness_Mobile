import i18n from "../lib/i18n";
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
import { useState, useEffect } from 'react';
const EditAccountScreen = () => {
  const router = useRouter();
  const {
    user,
    authFetch,
    updateUser
  } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);
  const handleSaveAccount = async () => {
    // Validēē formu
    if (!name.trim()) {
      Alert.alert(i18n.t("ui.kluda"), i18n.t("ui.ludzu_ievadiet_vardu"));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert(i18n.t("ui.kluda"), i18n.t("ui.ludzu_ievadiet_derigu_e_pasta_adresi"));
      return;
    }
    setIsSaving(true);
    try {
      const {
        response,
        data
      } = await authFetch('/api/user', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim()
        })
      });
      if (response.ok) {
        // Atjaunina lietotāja datus kontekstā
        await updateUser({
          ...user,
          name: name.trim(),
          email: email.trim()
        });
        Alert.alert(i18n.t("ui.veiksmigi"), i18n.t("ui.konts_atjauninats"));
      } else {
        Alert.alert(i18n.t("ui.kluda"), data.message || i18n.t("ui.neizdevas_atjauninat_kontu"));
      }
    } catch (error) {
      Alert.alert(i18n.t("ui.kluda"), error.message);
    } finally {
      setIsSaving(false);
    }
  };
  return <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']} style={styles.overlay}>
        {/* Virsraksts */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{i18n.t("ui.account")}</Text>
          <View style={{
          width: 28
        }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Konta dati sekcija */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t("ui.konta_informacija")}</Text>

            {/* Vārda lauks */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("ui.vards")}</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder={i18n.t("ui.ievadiet_vardu")} placeholderTextColor="rgba(255, 255, 255, 0.5)" value={name} onChangeText={setName} />
              </View>
            </View>

            {/* E-pasta lauks */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t("ui.email_2")}</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder={i18n.t("ui.ievadiet_e_pasta_adresi")} placeholderTextColor="rgba(255, 255, 255, 0.5)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              </View>
            </View>

            {/* Saglabāt konta datus pogu */}
            <TouchableOpacity style={[styles.actionButton, isSaving && styles.disabledButton]} onPress={handleSaveAccount} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#2C3E50" /> : <>
                  <MaterialIcons name="save" size={20} color="#2C3E50" style={{
                marginRight: 8
              }} />
                  <Text style={styles.actionButtonText}>{i18n.t("ui.saglabat_konta_datus")}</Text>
                </>}
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={18} color="#F5C842" />
            <Text style={styles.infoText}>{i18n.t("ui.jus_varat_rediget_savu_vardu_un_e_pasta_adresi")}</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>;
};
export default EditAccountScreen;
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
    marginBottom: 28
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
  toggleButton: {
    padding: 8,
    marginLeft: 4
  },
  requirementsBox: {
    backgroundColor: 'rgba(58, 78, 72, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8
  },
  requirement: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 4
  },
  requirementMet: {
    color: '#4ADE80'
  },
  actionButton: {
    backgroundColor: '#F5C842',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12
  },
  disabledButton: {
    opacity: 0.6
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 20
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
    flex: 1
  }
});
