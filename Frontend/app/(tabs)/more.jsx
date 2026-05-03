import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useAuth } from '../_context/AuthContext'

const MoreScreen = () => {
  const router = useRouter()
  const { logout } = useAuth()

  // Navigācijai uz rediģēšanas ekrāniem
  const handleNavigate = (screen) => {
    router.push(screen)
  }

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            await logout()
            router.replace('/login')
          },
        },
      ]
    )
  }

  const MenuSection = ({ title, items }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index === items.length - 1 && styles.lastMenuItem
            ]}
            onPress={() => handleNavigate(item.route)}
            activeOpacity={0.7}
          >
            <View style={styles.itemContent}>
              <MaterialIcons name={item.icon} size={24} color="#FFFFFF" style={styles.itemIcon} />
              <View>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.subtitle && <Text style={styles.itemSubtitle}>{item.subtitle}</Text>}
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']}
        style={styles.overlay}
      >
        <View style={styles.header}>
          <Text style={styles.title}>More</Text>
        </View>
        
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Konts sekcija */}
          <MenuSection
            title="Account"
            items={[
              {
                label: 'Account',
                subtitle: 'Rediģējiet kontu informāciju',
                icon: 'person',
                route: '/edit-account'
              },
              {
                label: 'Password',
                subtitle: 'Rediģējiet paroli',
                icon: 'lock',
                route: '/edit-password'
              }
            ]}
          />

          {/* Profila sekcija */}
          <MenuSection
            title="Profile"
            items={[
              {
                label: 'Profile',
                subtitle: 'Dzimšanas diena, dzimums, augums',
                icon: 'person-outline',
                route: '/edit-profile'
              },
              {
                label: 'Weight',
                subtitle: 'Saglabajiet pasreizejo svaru',
                icon: 'monitor-weight',
                route: '/edit-weight'
              }
            ]}
          />

          <MenuSection
            title="Settings"
            items={[
              {
                label: 'Units',
                subtitle: 'Svara, auguma, distances vienības',
                icon: 'straighten',
                route: '/edit-units'
              },
              {
                label: 'Language',
                subtitle: 'Izvēlieties aplikācijas valodu',
                icon: 'language',
                route: '/edit-language'
              }
            ]}
          />

          {/* Mērķu sekcija */}
          <MenuSection
            title="Goals"
            items={[
              {
                label: 'Goals',
                subtitle: 'Svara un uzturs mērķi',
                icon: 'target',
                route: '/edit-goals'
              }
            ]}
          />

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <View style={styles.itemContent}>
              <MaterialIcons name="logout" size={24} color="#FF6B6B" style={styles.itemIcon} />
              <View>
                <Text style={styles.logoutLabel}>Log out</Text>
                <Text style={styles.itemSubtitle}>Sign out of your account</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  )
}

export default MoreScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A4E48',
  },
  overlay: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsContainer: {
    backgroundColor: 'rgba(58, 78, 72, 0.5)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.24)',
    marginTop: 4,
    marginBottom: 24,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 2,
  },
})
