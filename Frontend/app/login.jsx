import i18n from "../lib/i18n";
import { StyleSheet, Text, View, ImageBackground, TextInput, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
const {
  width,
  height
} = Dimensions.get('window');
const LoginScreen = () => {
  const router = useRouter();
  const {
    login,
    API_URL
  } = useAuth();
  const [email, setEmail] = useState('gymshark@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const validateForm = () => {
    if (!email || !password) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.please_fill_in_all_fields"));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.please_enter_a_valid_email_address"));
      return false;
    }
    return true;
  };
  const handleLogin = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        console.log('Login successful for:', email);
        // Store the token and user data in context
        await login(data.data.accessToken, data.data.user, data.data.refreshToken);
        router.replace('/(tabs)');
      } else {
        const errorMessage = data.message || i18n.t("ui.invalid_email_or_password");
        Alert.alert(i18n.t("ui.error"), errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(i18n.t("ui.connection_error"), i18n.t("ui.could_not_connect_to_server_please_ensure_the_backend_i"));
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = () => {
    Alert.alert(i18n.t("ui.forgot_password"), i18n.t("ui.password_reset_functionality_will_be_implemented_soon"));
  };
  const handleSignUp = () => {
    router.push('/register');
  };
  const handleBrowseMuscles = () => {
    router.push('/muscle-groups');
  };
  return <ImageBackground source={require('../assets/OnboardBG.png')} style={styles.backgroundImage} resizeMode="cover">
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']} style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.welcomeText}>{i18n.t("ui.welcome_back")}</Text>
            <Text style={styles.title}>{i18n.t("ui.log_in")}</Text>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{i18n.t("ui.email")}</Text>
              <TextInput style={[styles.input, focusedField === 'email' && styles.inputFocused]} value={email} onChangeText={setEmail} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} placeholder={i18n.t("ui.enter_your_email")} placeholderTextColor="rgba(255, 255, 255, 0.6)" keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{i18n.t("ui.password")}</Text>
              <View style={[styles.passwordContainer, focusedField === 'password' && styles.inputFocused]}>
                <TextInput style={styles.passwordInput} value={password} onChangeText={setPassword} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} placeholder={i18n.t("ui.enter_password")} placeholderTextColor="rgba(255, 255, 255, 0.6)" secureTextEntry={!showPassword} />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>{i18n.t("ui.forgot_the_password")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#2C3E50" size="small" /> : <Text style={styles.loginButtonText}>{i18n.t("ui.log_in")}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.browseButton} onPress={handleBrowseMuscles}>
            <Ionicons name="body-outline" size={18} color="#FFFFFF" />
            <Text style={styles.browseButtonText}>{i18n.t("ui.browse_muscle_groups")}</Text>
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

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>{i18n.t("ui.don_t_have_an_account")}</Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>{i18n.t("ui.sign_up")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>;
};
export default LoginScreen;
const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: width,
    height: height
  },
  overlay: {
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between'
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start'
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 12
  },
  forgotPasswordText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  loginButton: {
    backgroundColor: '#F5C842',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 30
  },
  loginButtonDisabled: {
    backgroundColor: 'rgba(245, 200, 66, 0.5)'
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50'
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 8,
    paddingVertical: 13,
    marginTop: -16,
    marginBottom: 24
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF'
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
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  signUpText: {
    fontSize: 16,
    color: '#FFFFFF'
  },
  signUpLink: {
    fontSize: 16,
    color: '#F5C842',
    fontWeight: '600'
  }
});
