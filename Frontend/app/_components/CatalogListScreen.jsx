import i18n from "../../lib/i18n";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../_context/AuthContext';
const CatalogListScreen = ({
  title,
  endpoint,
  detailRoute,
  searchPlaceholder,
  emptyText,
  iconName,
  renderSubtext,
  enableMuscleGroupFilter = false
}) => {
  const router = useRouter();
  const {
    authFetch
  } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroupIds, setSelectedMuscleGroupIds] = useState([]);
  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const {
        data
      } = await authFetch(endpoint);
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (error) {
      console.error(`Error fetching ${title.toLowerCase()}:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  useFocusEffect(useCallback(() => {
    fetchItems();
  }, []));
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      if (!enableMuscleGroupFilter || selectedMuscleGroupIds.length === 0) return true;
      const itemMuscleGroupIds = (item.muscleGroups || []).map(group => String(group.id));
      return selectedMuscleGroupIds.every(selectedId => itemMuscleGroupIds.includes(selectedId));
    }).filter(item => {
      if (!query) return true;
      return item.name?.toLowerCase().includes(query);
    });
  }, [items, searchQuery, enableMuscleGroupFilter, selectedMuscleGroupIds]);
  const muscleGroupFilters = useMemo(() => {
    if (!enableMuscleGroupFilter) return [];
    const groupsById = new Map();
    for (const item of items) {
      for (const group of item.muscleGroups || []) {
        if (group?.id && !groupsById.has(String(group.id))) {
          groupsById.set(String(group.id), group);
        }
      }
    }
    return Array.from(groupsById.values()).sort((first, second) => first.name.localeCompare(second.name));
  }, [items, enableMuscleGroupFilter]);
  const shouldShowMuscleGroupFilters = enableMuscleGroupFilter && muscleGroupFilters.length > 0;
  const toggleMuscleGroupFilter = groupId => {
    const normalizedId = String(groupId);
    setSelectedMuscleGroupIds(current => current.includes(normalizedId) ? current.filter(id => id !== normalizedId) : [...current, normalizedId]);
  };
  const openDetails = item => {
    router.push({
      pathname: detailRoute,
      params: {
        id: item.id
      }
    });
  };
  const renderItem = ({
    item
  }) => {
    const subtext = renderSubtext?.(item);
    return <TouchableOpacity style={styles.itemRow} onPress={() => openDetails(item)} activeOpacity={0.72}>
        <View style={styles.itemIcon}>
          <MaterialCommunityIcons name={iconName} size={22} color="#F5C842" />
        </View>
        <View style={styles.itemInfo}>
          <Text selectable style={styles.itemName}>{item.name}</Text>
          {item.description && <Text selectable style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>}
          {subtext && <Text selectable style={styles.itemSubtext}>{subtext}</Text>}
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
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
          <TextInput style={styles.searchInput} placeholder={searchPlaceholder} placeholderTextColor="rgba(255, 255, 255, 0.4)" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{
          top: 8,
          bottom: 8,
          left: 8,
          right: 8
        }}>
              <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>}
        </View>

        {shouldShowMuscleGroupFilters ? <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
              <TouchableOpacity style={[styles.filterChip, selectedMuscleGroupIds.length === 0 && styles.filterChipActive]} onPress={() => setSelectedMuscleGroupIds([])} activeOpacity={0.72}>
                <Text style={[styles.filterChipText, selectedMuscleGroupIds.length === 0 && styles.filterChipTextActive]}>{i18n.t("ui.all")}</Text>
              </TouchableOpacity>
              {muscleGroupFilters.map(group => {
            const isSelected = selectedMuscleGroupIds.includes(String(group.id));
            return <TouchableOpacity key={group.id} style={[styles.filterChip, isSelected && styles.filterChipActive]} onPress={() => toggleMuscleGroupFilter(group.id)} activeOpacity={0.72}>
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {group.name}
                    </Text>
                  </TouchableOpacity>;
          })}
            </ScrollView>
          </View> : null}

        {isLoading ? <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>{i18n.t("ui.loading")}</Text>
          </View> : <FlatList data={filteredItems} keyExtractor={item => item.id.toString()} renderItem={renderItem} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic" ListEmptyComponent={<View style={styles.emptyContainer}>
                <MaterialCommunityIcons name={iconName} size={34} color="#F5C842" />
                <Text selectable style={styles.emptyText}>{searchQuery || selectedMuscleGroupIds.length > 0 ? i18n.t("ui.no_results_found") : emptyText}</Text>
              </View>} />}
      </LinearGradient>
    </View>;
};
export default CatalogListScreen;
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)'
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  itemDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.58)',
    lineHeight: 18
  },
  itemSubtext: {
    fontSize: 12,
    color: 'rgba(245, 200, 66, 0.78)',
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 70,
    gap: 14
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center'
  }
});
