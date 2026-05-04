import i18n from "../lib/i18n";
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
const statusFilters = ['All', 'Active', 'Inactive'];
const AdminUsersScreen = () => {
  const router = useRouter();
  const {
    authFetch
  } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const {
        data
      } = await authFetch('/api/admin/users');
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading admin users:', error);
    } finally {
      setIsLoading(false);
    }
  };
  useFocusEffect(useCallback(() => {
    loadUsers();
  }, []));
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter(user => {
      if (statusFilter === 'Active') return Boolean(user.is_active);
      if (statusFilter === 'Inactive') return !Boolean(user.is_active);
      return true;
    }).filter(user => {
      if (!query) return true;
      return user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query);
    });
  }, [users, searchQuery, statusFilter]);
  const renderUser = ({
    item
  }) => {
    const isActive = Boolean(item.is_active);
    return <TouchableOpacity style={styles.userRow} onPress={() => router.push({
      pathname: '/admin-user-details',
      params: {
        id: item.id
      }
    })} activeOpacity={0.72}>
        <View style={styles.avatar}>
          <MaterialIcons name={item.role === 'admin' ? 'admin-panel-settings' : 'person'} size={22} color="#F5C842" />
        </View>
        <View style={styles.userInfo}>
          <Text selectable style={styles.userName}>{item.name}</Text>
          <Text selectable style={styles.userEmail}>{item.email}</Text>
          <View style={styles.badgeRow}>
            <Text style={styles.roleText}>{item.role === 'admin' ? i18n.t("ui.admin_role") : i18n.t("ui.user_role")}</Text>
            {!isActive ? <Text style={styles.inactiveText}>{i18n.t("ui.inactive")}</Text> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
      </TouchableOpacity>;
  };
  return <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.t("ui.admin_panel")}</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
          <TextInput style={styles.searchInput} placeholder={i18n.t("ui.search_users")} placeholderTextColor="rgba(255, 255, 255, 0.4)" value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <View style={styles.filterRow}>
          {statusFilters.map(filter => <TouchableOpacity key={filter} style={[styles.filterButton, statusFilter === filter && styles.filterButtonActive]} onPress={() => setStatusFilter(filter)} activeOpacity={0.72}>
              <Text style={[styles.filterText, statusFilter === filter && styles.filterTextActive]}>{i18n.t(`ui.${filter.toLowerCase()}`)}</Text>
            </TouchableOpacity>)}
        </View>

        {isLoading ? <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>{i18n.t("ui.loading_users")}</Text>
          </View> : <FlatList data={filteredUsers} keyExtractor={item => item.id.toString()} renderItem={renderUser} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} ListEmptyComponent={<Text selectable style={styles.emptyText}>{i18n.t("ui.no_users_found")}</Text>} />}
      </LinearGradient>
    </View>;
};
export default AdminUsersScreen;
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#FFFFFF'
  },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 10
  },
  filterButtonActive: {
    backgroundColor: '#F5C842'
  },
  filterText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 14,
    fontWeight: '800'
  },
  filterTextActive: {
    color: '#2C3E50'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 8
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 200, 66, 0.12)'
  },
  userInfo: {
    flex: 1,
    gap: 3
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 13
  },
  roleText: {
    color: '#F5C842',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  inactiveText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 70
  }
});
