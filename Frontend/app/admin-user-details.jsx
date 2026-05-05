// Administratora skats ļauj apskatīt un rediģēt konkrēta lietotāja informāciju.
// Ekrānā administrators var pārbaudīt profila datus, statusu un lietotāja izveidoto saturu.
import i18n from "../lib/i18n";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
const tabs = [{
  key: 'Info',
  labelKey: 'ui.info'
}, {
  key: 'Foods',
  labelKey: 'ui.foods'
}, {
  key: 'Exercises',
  labelKey: 'ui.exercises'
}];
const AdminUserDetailsScreen = () => {
  const router = useRouter();
  const {
    id
  } = useLocalSearchParams();
  const {
    authFetch,
    user: currentUser,
    updateUser
  } = useAuth();
  const [activeTab, setActiveTab] = useState('Info');
  const [selectedUser, setSelectedUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [foods, setFoods] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [selectedMuscleGroupIds, setSelectedMuscleGroupIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const isSelectedUserActive = Boolean(selectedUser?.is_active);
  const isViewingSelf = Number(selectedUser?.id) === Number(currentUser?.id);
  const exerciseMuscleGroupFilters = useMemo(() => {
    const groupsById = new Map();
    for (const exercise of exercises) {
      for (const group of exercise.muscleGroups || []) {
        if (group?.id && !groupsById.has(String(group.id))) {
          groupsById.set(String(group.id), group);
        }
      }
    }
    return Array.from(groupsById.values()).sort((first, second) => first.name.localeCompare(second.name));
  }, [exercises]);
  const shouldShowExerciseMuscleGroupFilters = exerciseMuscleGroupFilters.length > 0;
  const filteredExercises = useMemo(() => {
    if (selectedMuscleGroupIds.length === 0) return exercises;
    return exercises.filter(exercise => {
      const exerciseMuscleGroupIds = (exercise.muscleGroups || []).map(group => String(group.id));
      return selectedMuscleGroupIds.every(selectedId => exerciseMuscleGroupIds.includes(selectedId));
    });
  }, [exercises, selectedMuscleGroupIds]);
  const toggleMuscleGroupFilter = groupId => {
    const normalizedId = String(groupId);
    setSelectedMuscleGroupIds(current => current.includes(normalizedId) ? current.filter(selectedId => selectedId !== normalizedId) : [...current, normalizedId]);
  };
  const loadUser = async () => {
    try {
      setIsLoading(!selectedUser);
      const {
        data
      } = await authFetch(`/api/admin/users/${id}`);
      if (data.success) {
        const nextUser = data.data.user;
        setSelectedUser(nextUser);
        setSettings(data.data.settings);
        setName(nextUser.name || '');
        setEmail(nextUser.email || '');
        setRole(nextUser.role || 'user');
      }
    } catch (error) {
      Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_load_user"));
    } finally {
      setIsLoading(false);
    }
  };
  const loadCreatedItems = async type => {
    try {
      setIsListLoading(true);
      const {
        data
      } = await authFetch(`/api/admin/users/${id}/${type}`);
      if (data.success) {
        if (type === 'foods') {
          setFoods(data.data || []);
        } else {
          setExercises(data.data || []);
        }
      }
    } catch (error) {
      Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_load_data"));
    } finally {
      setIsListLoading(false);
    }
  };
  useFocusEffect(useCallback(() => {
    loadUser();
    if (activeTab === 'Foods') loadCreatedItems('foods');
    if (activeTab === 'Exercises') loadCreatedItems('exercises');
  }, [id, activeTab]));
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.name_is_required"));
      return;
    }
    if (!email.trim().includes('@')) {
      Alert.alert(i18n.t("ui.error"), i18n.t("ui.please_enter_a_valid_email_address"));
      return;
    }
    setIsSaving(true);
    try {
      const {
        data,
        response
      } = await authFetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role
        })
      });
      if (response.ok && data.success) {
        setSelectedUser(data.data);
        if (Number(data.data.id) === Number(currentUser?.id)) {
          await updateUser(data.data);
        }
        Alert.alert(i18n.t("ui.saved"), i18n.t("ui.user_updated_successfully"));
      } else {
        Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_update_user"));
      }
    } catch (error) {
      Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_update_user"));
    } finally {
      setIsSaving(false);
    }
  };
  const handleDeactivateUser = () => {
    if (!selectedUser || Number(selectedUser.id) === Number(currentUser?.id)) return;
    Alert.alert(i18n.t("ui.deactivate_user_account"), i18n.t("ui.deactivate_user_message", {
      name: selectedUser.name || i18n.t("ui.this_user")
    }), [{
      text: i18n.t("ui.cancel"),
      style: 'cancel'
    }, {
      text: i18n.t("ui.deactivate"),
      style: 'destructive',
      onPress: async () => {
        setIsSaving(true);
        try {
          const {
            response,
            data
          } = await authFetch(`/api/admin/users/${selectedUser.id}`, {
            method: 'DELETE'
          });
          if (response.ok && data.success) {
            const nextUser = {
              ...selectedUser,
              is_active: false
            };
            setSelectedUser(nextUser);
            Alert.alert(i18n.t("ui.deactivated"), i18n.t("ui.user_account_deactivated_successfully"));
          } else {
            Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_deactivate_user"));
          }
        } catch (error) {
          Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_deactivate_user"));
        } finally {
          setIsSaving(false);
        }
      }
    }]);
  };
  const handleReactivateUser = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const {
        response,
        data
      } = await authFetch(`/api/admin/users/${selectedUser.id}/reactivate`, {
        method: 'POST'
      });
      if (response.ok && data.success) {
        setSelectedUser(data.data);
        setName(data.data.name || '');
        setEmail(data.data.email || '');
        setRole(data.data.role || 'user');
        Alert.alert(i18n.t("ui.reactivated"), i18n.t("ui.user_account_reactivated_successfully"));
      } else {
        Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_reactivate_user"));
      }
    } catch (error) {
      Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_reactivate_user"));
    } finally {
      setIsSaving(false);
    }
  };
  const renderInfo = () => <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{i18n.t("ui.name")}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={i18n.t("ui.name")} placeholderTextColor="rgba(255, 255, 255, 0.4)" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{i18n.t("ui.email")}</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder={i18n.t("ui.email")} placeholderTextColor="rgba(255, 255, 255, 0.4)" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{i18n.t("ui.role")}</Text>
        <View style={styles.roleRow}>
          {['user', 'admin'].map(option => <TouchableOpacity key={option} style={[styles.roleButton, role === option && styles.roleButtonActive]} onPress={() => setRole(option)} activeOpacity={0.72}>
              <MaterialIcons name={option === 'admin' ? 'admin-panel-settings' : 'person'} size={18} color={role === option ? '#2C3E50' : '#FFFFFF'} />
              <Text style={[styles.roleButtonText, role === option && styles.roleButtonTextActive]}>{option === 'admin' ? i18n.t("ui.admin_role") : i18n.t("ui.user_role")}</Text>
            </TouchableOpacity>)}
        </View>
      </View>

      <View style={styles.metaCard}>
        <Text selectable style={[styles.metaText, !isSelectedUserActive && styles.inactiveMetaText]}>{i18n.t("ui.status")}{isSelectedUserActive ? i18n.t("ui.active") : i18n.t("ui.inactive")}
        </Text>
        <Text selectable style={styles.metaText}>{i18n.t("ui.created_2")}{selectedUser?.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '--'}</Text>
        <Text selectable style={styles.metaText}>{i18n.t("ui.last_login")}{selectedUser?.last_login ? new Date(selectedUser.last_login).toLocaleString() : '--'}</Text>
        <Text selectable style={styles.metaText}>{i18n.t("ui.gender")}{settings?.gender || '--'}</Text>
      </View>

      <TouchableOpacity style={[styles.saveButton, isSaving && styles.disabledButton]} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#2C3E50" /> : <>
            <Ionicons name="checkmark-circle" size={22} color="#2C3E50" />
            <Text style={styles.saveButtonText}>{i18n.t("ui.save_user")}</Text>
          </>}
      </TouchableOpacity>

      {isSelectedUserActive && !isViewingSelf ? <TouchableOpacity style={[styles.deleteButton, isSaving && styles.disabledButton]} onPress={handleDeactivateUser} disabled={isSaving}>
          <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
          <Text style={styles.deleteButtonText}>{i18n.t("ui.deactivate_user_account_2")}</Text>
        </TouchableOpacity> : null}

      {!isSelectedUserActive ? <TouchableOpacity style={[styles.reactivateButton, isSaving && styles.disabledButton]} onPress={handleReactivateUser} disabled={isSaving}>
          <Ionicons name="refresh-circle" size={22} color="#2C3E50" />
          <Text style={styles.reactivateButtonText}>{i18n.t("ui.reactivate_user_account")}</Text>
        </TouchableOpacity> : null}
    </ScrollView>;
  const renderCatalogItem = (item, type) => <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => router.push({
    pathname: type === 'foods' ? '/food-details' : '/exercise-details',
    params: {
      id: item.id
    }
  })} activeOpacity={0.72}>
      <View style={styles.itemIcon}>
        <MaterialCommunityIcons name={type === 'foods' ? 'food-apple' : 'dumbbell'} size={22} color="#F5C842" />
      </View>
      <View style={styles.itemInfo}>
        <Text selectable style={styles.itemName}>{item.name}</Text>
        {type === 'foods' ? <Text selectable style={styles.itemSubtext}>{item.calories_per_100g}{i18n.t("ui.kcal_100g")}</Text> : <Text selectable style={styles.itemSubtext}>{item.muscleGroups?.map(group => group.name).join(', ') || i18n.t("ui.no_muscle_groups")}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
    </TouchableOpacity>;
  const renderItems = type => {
    const data = type === 'foods' ? foods : filteredExercises;
    if (isListLoading) {
      return <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5C842" />
        </View>;
    }
    return <View style={styles.listWrapper}>
        {type === 'exercises' && shouldShowExerciseMuscleGroupFilters ? <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
              <TouchableOpacity style={[styles.filterChip, selectedMuscleGroupIds.length === 0 && styles.filterChipActive]} onPress={() => setSelectedMuscleGroupIds([])} activeOpacity={0.72}>
                <Text style={[styles.filterChipText, selectedMuscleGroupIds.length === 0 && styles.filterChipTextActive]}>{i18n.t("ui.all")}</Text>
              </TouchableOpacity>
              {exerciseMuscleGroupFilters.map(group => {
            const isSelected = selectedMuscleGroupIds.includes(String(group.id));
            return <TouchableOpacity key={group.id} style={[styles.filterChip, isSelected && styles.filterChipActive]} onPress={() => toggleMuscleGroupFilter(group.id)} activeOpacity={0.72}>
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {group.name}
                    </Text>
                  </TouchableOpacity>;
          })}
            </ScrollView>
          </View> : null}

        <FlatList data={data} keyExtractor={item => item.id.toString()} renderItem={({
        item
      }) => renderCatalogItem(item, type)} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} ListEmptyComponent={<Text selectable style={styles.emptyText}>{i18n.t("ui.no_created_items_found")}</Text>} />
      </View>;
  };
  if (isLoading) {
    return <View style={styles.container}>
        <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
          </View>
        </LinearGradient>
      </View>;
  }
  return <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedUser?.name || i18n.t("ui.user")}</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.tabRow}>
          {tabs.map(tab => <TouchableOpacity key={tab.key} style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]} onPress={() => setActiveTab(tab.key)} activeOpacity={0.72}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{i18n.t(tab.labelKey)}</Text>
            </TouchableOpacity>)}
        </View>

        {activeTab === 'Info' && renderInfo()}
        {activeTab === 'Foods' && renderItems('foods')}
        {activeTab === 'Exercises' && renderItems('exercises')}
      </LinearGradient>
    </View>;
};
export default AdminUserDetailsScreen;
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  headerButton: {
    minWidth: 64,
    padding: 8
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center'
  },
  tabRow: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 10
  },
  tabButtonActive: {
    backgroundColor: '#F5C842'
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 14,
    fontWeight: '700'
  },
  tabTextActive: {
    color: '#2C3E50'
  },
  formContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 16
  },
  inputGroup: {
    gap: 8
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  roleButtonActive: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842'
  },
  roleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize'
  },
  roleButtonTextActive: {
    color: '#2C3E50'
  },
  metaCard: {
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  metaText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 13
  },
  inactiveMetaText: {
    color: '#FF6B6B',
    fontWeight: '800'
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5C842',
    borderRadius: 8,
    padding: 16
  },
  disabledButton: {
    opacity: 0.7
  },
  saveButtonText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '800'
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.28)'
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '800'
  },
  reactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5C842',
    borderRadius: 8,
    padding: 16
  },
  reactivateButtonText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '800'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listWrapper: {
    flex: 1
  },
  filterContainer: {
    marginTop: -4,
    marginBottom: 16
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8
  },
  filterChip: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  filterChipActive: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842'
  },
  filterChipText: {
    color: 'rgba(255, 255, 255, 0.76)',
    fontSize: 13,
    fontWeight: '800'
  },
  filterChipTextActive: {
    color: '#2C3E50'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 8
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 200, 66, 0.12)'
  },
  itemInfo: {
    flex: 1,
    gap: 3
  },
  itemName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  itemSubtext: {
    color: 'rgba(245, 200, 66, 0.78)',
    fontSize: 12,
    fontWeight: '600'
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 70
  }
});
