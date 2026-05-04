import i18n from "../lib/i18n";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useState, useCallback, useMemo } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
import { useSelection } from './_context/SelectionContext';

/**
 * Item type configurations - easily extensible for new types
 */
const ITEM_TYPE_CONFIG = {
  exercise: {
    endpoint: '/api/exercises',
    defaultTitleKey: "ui.select_exercise",
    icon: (color = "#F5C842") => <MaterialCommunityIcons name="dumbbell" size={20} color={color} />,
    searchPlaceholderKey: "ui.search_exercises",
    emptyTextKey: "ui.no_exercises_available",
    createRoute: '/create-exercise',
    createLabelKey: "ui.create_new_exercise",
    supportsQuantity: false,
    renderSubtext: item => {
      if (item.muscleGroups && item.muscleGroups.length > 0) {
        return item.muscleGroups.map(mg => mg.name).join(', ');
      }
      return null;
    }
  },
  muscleGroup: {
    endpoint: '/api/muscle-groups',
    defaultTitleKey: "ui.select_muscle_group",
    icon: (color = "#F5C842") => <MaterialCommunityIcons name="arm-flex" size={20} color={color} />,
    searchPlaceholderKey: "ui.search_muscle_groups",
    emptyTextKey: "ui.no_muscle_groups_available",
    createRoute: null,
    createLabelKey: null,
    supportsQuantity: false,
    renderSubtext: null
  },
  workout: {
    endpoint: '/api/workouts',
    defaultTitleKey: "ui.select_workout",
    icon: (color = "#F5C842") => <MaterialCommunityIcons name="clipboard-list" size={20} color={color} />,
    searchPlaceholderKey: "ui.search_workouts",
    emptyTextKey: "ui.no_workouts_available",
    createRoute: '/create-workout',
    createLabelKey: "ui.create_new_workout",
    supportsQuantity: false,
    renderSubtext: item => {
      if (item.exerciseCount !== undefined) {
        return `${item.exerciseCount} ${i18n.t("ui.exercises_2")}`;
      }
      return null;
    }
  },
  food: {
    endpoint: '/api/foods',
    defaultTitleKey: "ui.select_food",
    icon: (color = "#F5C842") => <MaterialCommunityIcons name="food-apple" size={20} color={color} />,
    searchPlaceholderKey: "ui.search_foods",
    emptyTextKey: "ui.no_foods_available",
    createRoute: '/create-food',
    createLabelKey: "ui.create_new_food",
    supportsQuantity: true,
    quantityUnit: 'g',
    defaultQuantity: 100,
    renderSubtext: item => {
      if (item.calories_per_100g !== undefined) {
        return `${item.calories_per_100g} kcal / 100g`;
      }
      if (item.calories !== undefined) {
        return `${item.calories} kcal`;
      }
      return null;
    }
  }
};
const SelectItemsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    authFetch
  } = useAuth();
  const {
    confirmSelection,
    cancelSelection
  } = useSelection();

  // Parse params (guaranteed to exist on mount)
  const type = params.type || 'muscleGroup';
  const mode = params.mode || 'single';
  const title = params.title;
  const excludedIds = params.excluded ? JSON.parse(params.excluded) : [];
  const initialSelected = params.selected ? JSON.parse(params.selected) : [];
  const typeConfig = ITEM_TYPE_CONFIG[type] || ITEM_TYPE_CONFIG.muscleGroup;
  const displayTitle = title || i18n.t(typeConfig.defaultTitleKey);
  const searchPlaceholder = i18n.t(typeConfig.searchPlaceholderKey);
  const emptyText = i18n.t(typeConfig.emptyTextKey);
  const createLabel = typeConfig.createLabelKey ? i18n.t(typeConfig.createLabelKey) : null;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroupIds, setSelectedMuscleGroupIds] = useState([]);

  // For types with quantity: store as { id, quantity }, otherwise just IDs
  const [selectedIds, setSelectedIds] = useState(initialSelected);
  const [quantities, setQuantities] = useState({}); // { [itemId]: quantity }

  // Fetch items when screen gains focus (including after creating new item)
  useFocusEffect(useCallback(() => {
    fetchItems();
  }, []));
  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const {
        data
      } = await authFetch(typeConfig.endpoint);
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (error) {
      console.error(`Error fetching ${type}s:`, error);
      console.error('Response error details:', error.response ? error.response.data : i18n.t("ui.no_response_data"));
    } finally {
      setIsLoading(false);
    }
  };
  const handleSelect = item => {
    if (mode === 'single') {
      setSelectedIds([item.id]);
      if (typeConfig.supportsQuantity) {
        setQuantities({
          [item.id]: typeConfig.defaultQuantity
        });
      }
    } else {
      if (selectedIds.includes(item.id)) {
        setSelectedIds(prev => prev.filter(id => id !== item.id));
        if (typeConfig.supportsQuantity) {
          setQuantities(prev => {
            const updated = {
              ...prev
            };
            delete updated[item.id];
            return updated;
          });
        }
      } else {
        setSelectedIds(prev => [...prev, item.id]);
        if (typeConfig.supportsQuantity) {
          setQuantities(prev => ({
            ...prev,
            [item.id]: typeConfig.defaultQuantity
          }));
        }
      }
    }
  };
  const handleQuantityChange = (itemId, value) => {
    const numValue = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, numValue)
    }));
  };
  const handleConfirm = () => {
    if (typeConfig.supportsQuantity) {
      // Return items with quantities
      const selectedItems = items.filter(item => selectedIds.includes(item.id)).map(item => ({
        ...item,
        quantity: quantities[item.id] || typeConfig.defaultQuantity
      }));
      confirmSelection(selectedItems);
    } else {
      // Return items without quantities
      const selectedItems = items.filter(item => selectedIds.includes(item.id));
      confirmSelection(selectedItems);
    }
    router.back();
  };
  const handleCancel = () => {
    cancelSelection();
    router.back();
  };
  const handleCreateNew = () => {
    if (typeConfig.createRoute) {
      router.push(typeConfig.createRoute);
    }
  };
  const openItemDetails = item => {
    if (type === 'exercise') {
      router.push({
        pathname: '/exercise-details',
        params: {
          id: item.id
        }
      });
    }
    if (type === 'food') {
      router.push({
        pathname: '/food-details',
        params: {
          id: item.id
        }
      });
    }
  };
  const muscleGroupFilters = useMemo(() => {
    if (type !== 'exercise') return [];
    const groupsById = new Map();
    for (const item of items) {
      for (const group of item.muscleGroups || []) {
        if (group?.id && !groupsById.has(String(group.id))) {
          groupsById.set(String(group.id), group);
        }
      }
    }
    return Array.from(groupsById.values()).sort((first, second) => first.name.localeCompare(second.name));
  }, [items, type]);
  const shouldShowMuscleGroupFilters = type === 'exercise' && muscleGroupFilters.length > 0;
  const toggleMuscleGroupFilter = groupId => {
    const normalizedId = String(groupId);
    setSelectedMuscleGroupIds(current => current.includes(normalizedId) ? current.filter(id => id !== normalizedId) : [...current, normalizedId]);
  };
  const filteredItems = useMemo(() => {
    return items.filter(item => !excludedIds.includes(item.id)).filter(item => {
      if (type !== 'exercise' || selectedMuscleGroupIds.length === 0) return true;
      const itemMuscleGroupIds = (item.muscleGroups || []).map(group => String(group.id));
      return selectedMuscleGroupIds.every(selectedId => itemMuscleGroupIds.includes(selectedId));
    }).filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [items, searchQuery, excludedIds, type, selectedMuscleGroupIds]);
  const renderItem = ({
    item
  }) => {
    const isSelected = selectedIds.includes(item.id);
    const subtext = typeConfig.renderSubtext?.(item);
    const quantity = quantities[item.id] || typeConfig.defaultQuantity;
    return <View>
        <TouchableOpacity style={[styles.itemOption, isSelected && styles.itemOptionSelected]} onPress={() => handleSelect(item)}>
          {typeConfig.icon()}
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
              {item.name}
            </Text>
            {item.description && <Text style={styles.itemDescription} numberOfLines={1}>
                {item.description}
              </Text>}
            {subtext && <Text style={styles.itemSubtext}>{subtext}</Text>}
          </View>
          {(type === 'exercise' || type === 'food') && <TouchableOpacity style={styles.infoButton} onPress={() => openItemDetails(item)} hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }}>
              <Ionicons name="information-circle-outline" size={22} color="rgba(255, 255, 255, 0.65)" />
            </TouchableOpacity>}
          {mode === 'single' ? <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View> : <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#2C3E50" />}
            </View>}
        </TouchableOpacity>
        
        {/* Quantity input - only show for selected items with quantity support */}
        {isSelected && typeConfig.supportsQuantity && <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>{i18n.t("ui.portion")}</Text>
            <View style={styles.quantityInputWrapper}>
              <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(item.id, quantity - 10)}>
                <Ionicons name="remove" size={18} color="#F5C842" />
              </TouchableOpacity>
              
              <TextInput style={styles.quantityInput} value={quantity.toString()} onChangeText={value => handleQuantityChange(item.id, value)} keyboardType="numeric" selectTextOnFocus />
              
              <Text style={styles.quantityUnit}>{typeConfig.quantityUnit}</Text>
              
              <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(item.id, quantity + 10)}>
                <Ionicons name="add" size={18} color="#F5C842" />
              </TouchableOpacity>
            </View>
            
            {/* Show calculated calories if available */}
            {item.calories_per_100g && <Text style={styles.calculatedCalories}>
                ≈ {Math.round(item.calories_per_100g * quantity / 100)}{i18n.t("ui.kcal")}</Text>}
          </View>}
      </View>;
  };
  return <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{displayTitle}</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerButton} disabled={mode === 'single' && selectedIds.length === 0}>
            <Text style={[styles.confirmText, mode === 'single' && selectedIds.length === 0 && styles.confirmTextDisabled]}>
              {mode === 'single' ? i18n.t("ui.select") : `${i18n.t("ui.done")} (${selectedIds.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
          <TextInput style={styles.searchInput} placeholder={searchPlaceholder} placeholderTextColor="rgba(255, 255, 255, 0.4)" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}>
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

        {/* Content */}
        {isLoading ? <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>{i18n.t("ui.loading")}</Text>
          </View> : <FlatList data={filteredItems} keyExtractor={item => item.id.toString()} renderItem={renderItem} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={styles.emptyContainer}>
                {typeConfig.icon()}
                <Text style={styles.emptyText}>
                  {searchQuery || selectedMuscleGroupIds.length > 0 ? i18n.t("ui.no_results_found") : emptyText}
                </Text>
              </View>} ListFooterComponent={typeConfig.createRoute ? <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
                  <Ionicons name="add-circle-outline" size={24} color="#F5C842" />
                  <Text style={styles.createButtonText}>{createLabel}</Text>
                </TouchableOpacity> : null} />}
      </LinearGradient>
    </View>;
};
export default SelectItemsScreen;
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
    padding: 8,
    minWidth: 60
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center'
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5C842',
    textAlign: 'right'
  },
  confirmTextDisabled: {
    opacity: 0.5
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#FFFFFF'
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
    paddingBottom: 100
  },
  itemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  itemOptionSelected: {
    backgroundColor: 'rgba(245, 200, 66, 0.15)',
    borderColor: '#F5C842',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF'
  },
  itemNameSelected: {
    color: '#F5C842'
  },
  itemDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2
  },
  itemSubtext: {
    fontSize: 12,
    color: 'rgba(245, 200, 66, 0.7)',
    marginTop: 4
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center'
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
  infoButton: {
    padding: 4
  },
  radioSelected: {
    borderColor: '#F5C842'
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5C842'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxSelected: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)'
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)'
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F5C842'
  },
  quantityContainer: {
    backgroundColor: 'rgba(245, 200, 66, 0.08)',
    borderWidth: 1,
    borderColor: '#F5C842',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  quantityLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500'
  },
  quantityInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    gap: 8
  },
  quantityButton: {
    padding: 6
  },
  quantityInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingVertical: 8
  },
  quantityUnit: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500'
  },
  calculatedCalories: {
    fontSize: 13,
    color: '#F5C842',
    fontWeight: '600'
  }
});
