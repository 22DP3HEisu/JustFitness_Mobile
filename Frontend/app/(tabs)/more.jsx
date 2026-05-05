import i18n from "../../lib/i18n";
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../_context/AuthContext';
const MoreScreen = () => {
  const router = useRouter();
  const {
    logout,
    user
  } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Tiek nodrošināta navigācija uz rediģēšanas ekrāniem.
  const handleNavigate = screen => {
    router.push(screen);
  };
  const handleLogout = () => {
    Alert.alert(i18n.t("ui.log_out"), i18n.t("ui.are_you_sure_you_want_to_log_out"), [{
      text: i18n.t("ui.cancel"),
      style: 'cancel'
    }, {
      text: i18n.t("ui.log_out"),
      style: 'destructive',
      onPress: async () => {
        await logout();
        router.replace('/login');
      }
    }]);
  };
  const MenuSection = ({
    title,
    items
  }) => <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.itemsContainer}>
        {items.map((item, index) => <TouchableOpacity key={index} style={[styles.menuItem, index === items.length - 1 && styles.lastMenuItem]} onPress={() => handleNavigate(item.route)} activeOpacity={0.7}>
            <View style={styles.itemContent}>
              <MaterialIcons name={item.icon} size={24} color="#FFFFFF" style={styles.itemIcon} />
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.subtitle && <Text style={styles.itemSubtitle}>{item.subtitle}</Text>}
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>)}
      </View>
    </View>;
  return <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']} style={styles.overlay}>
        
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Konta sadaļa */}
          <MenuSection title={i18n.t("ui.account")} items={[{
          label: i18n.t("ui.account"),
          subtitle: i18n.t("ui.redigejiet_kontu_informaciju"),
          icon: 'person',
          route: '/edit-account'
        }, {
          label: i18n.t("ui.password"),
          subtitle: i18n.t("ui.redigejiet_paroli"),
          icon: 'lock',
          route: '/edit-password'
        }]} />

          {/* Profila sadaļa */}
          <MenuSection title={i18n.t("ui.profile")} items={[{
          label: i18n.t("ui.profile"),
          subtitle: i18n.t("ui.dzimsanas_diena_dzimums_augums"),
          icon: 'person-outline',
          route: '/edit-profile'
        }, {
          label: i18n.t("ui.weight"),
          subtitle: i18n.t("ui.save_current_weight"),
          icon: 'monitor-weight',
          route: '/edit-weight'
        }, {
          label: i18n.t("ui.goals"),
          subtitle: i18n.t("ui.svara_un_uzturs_merki"),
          icon: 'flag',
          route: '/edit-goals'
        }]} />

          <MenuSection title={i18n.t("ui.settings")} items={[{
          label: i18n.t("ui.units"),
          subtitle: i18n.t("ui.svara_auguma_distances_vienibas"),
          icon: 'straighten',
          route: '/edit-units'
        }, {
          label: i18n.t("ui.language"),
          subtitle: i18n.t("ui.izvelieties_aplikacijas_valodu"),
          icon: 'language',
          route: '/edit-language'
        }]} />

          <MenuSection title={i18n.t("ui.library")} items={[{
          label: i18n.t("ui.exercises"),
          subtitle: i18n.t("ui.browse_all_available_exercises"),
          icon: 'fitness-center',
          route: '/exercises'
        }, {
          label: i18n.t("ui.foods"),
          subtitle: i18n.t("ui.browse_all_available_foods"),
          icon: 'restaurant',
          route: '/foods'
        }, {
          label: i18n.t("ui.muscle_groups"),
          subtitle: i18n.t("ui.browse_all_available_muscle_groups"),
          icon: 'accessibility',
          route: '/muscle-groups'
        }]} />

          {isAdmin && <MenuSection title={i18n.t("ui.admin")} items={[{
          label: i18n.t("ui.admin_panel"),
          subtitle: i18n.t("ui.manage_users_and_their_content"),
          icon: 'admin-panel-settings',
          route: '/admin-users'
        }]} />}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <View style={styles.itemContent}>
              <MaterialIcons name="logout" size={24} color="#FF6B6B" style={styles.itemIcon} />
              <View style={styles.itemText}>
                <Text style={styles.logoutLabel}>{i18n.t("ui.log_out")}</Text>
                <Text style={styles.itemSubtitle}>{i18n.t("ui.sign_out_of_your_account")}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>;
};
export default MoreScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A4E48'
  },
  overlay: {
    flex: 1
  },
  scrollContainer: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  section: {
    marginBottom: 20
  },
  sectionHeader: {
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  itemsContainer: {
    backgroundColor: 'rgba(58, 78, 72, 0.5)',
    borderRadius: 12,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  lastMenuItem: {
    borderBottomWidth: 0
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  itemIcon: {
    marginRight: 12
  },
  itemText: {
    flex: 1
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2
  },
  itemSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)'
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
    marginBottom: 24
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 2
  }
});
