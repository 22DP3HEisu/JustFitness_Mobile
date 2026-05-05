import i18n from "../lib/i18n";
import { StyleSheet, Text, View, ImageBackground, TextInput, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
const {
  width,
  height
} = Dimensions.get('window');
const RegisterScreen = () => {
  const router = useRouter();
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('email');
  const validateForm = () => {
    if (!name || !email || !password) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.please_fill_in_all_fields"));
      return false;
    }
    if (password.length < 8) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.password_must_be_at_least_8_characters_long"));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.please_enter_a_valid_email_address"));
      return false;
    }
    return true;
  };
  const handleSignUp = async () => {
    if (!validateForm()) return;

    // Lietotājs tiek novirzīts uz profila izveides lapu kopā ar ievadītajiem datiem.
    router.push({
      pathname: '/setup-profile',
      params: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password
      }
    });
  };
  return <ImageBackground source={require('../assets/OnboardBG.png')} style={styles.backgroundImage} resizeMode="cover">
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']} style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{i18n.t("ui.create_account")}</Text>
          
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{i18n.t("ui.name")}</Text>
              <TextInput style={[styles.input, focusedField === 'name' && styles.inputFocused]} value={name} onChangeText={setName} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} placeholder={i18n.t("ui.enter_your_name")} placeholderTextColor="rgba(255, 255, 255, 0.6)" />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{i18n.t("ui.email")}</Text>
              <TextInput style={[styles.input, focusedField === 'email' && styles.inputFocused]} value={email} onChangeText={setEmail} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} placeholder={i18n.t("ui.enter_your_email")} placeholderTextColor="rgba(255, 255, 255, 0.6)" keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{i18n.t("ui.password")}</Text>
              <View style={styles.passwordContainer}>
                <TextInput style={[styles.passwordInput, focusedField === 'password' && styles.inputFocused]} value={password} onChangeText={setPassword} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} placeholder={i18n.t("ui.enter_password")} placeholderTextColor="rgba(255, 255, 255, 0.6)" secureTextEntry={!showPassword} />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              </View>
              <Text style={styles.passwordHint}>{i18n.t("ui.at_least_8_characters")}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
            <Text style={styles.signUpButtonText}>{i18n.t("ui.sign_up")}</Text>
          </TouchableOpacity>

          <View style={styles.socialContainer}>
            <Text style={styles.orText}>{i18n.t("ui.or_sign_up_with")}</Text>
            
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-facebook" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{i18n.t("ui.already_have_an_account")}</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>{i18n.t("ui.log_in")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>;
};
export default RegisterScreen;
const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1
  },
  overlay: {
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 40
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 40,
    textAlign: 'center'
  },
  formContainer: {
    flex: 1,
    marginBottom: 30
  },
  inputContainer: {
    marginBottom: 24
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF'
  },
  inputFocused: {
    borderColor: '#F5C842',
    borderWidth: 2
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF'
  },
  eyeIcon: {
    paddingRight: 16
  },
  passwordHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 6
  },
  signUpButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30
  },
  signUpButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50'
  },
  socialContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  orText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loginText: {
    fontSize: 16,
    color: '#FFFFFF'
  },
  loginLink: {
    fontSize: 16,
    color: '#F5C842',
    fontWeight: '600'
  }
});
