import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import React, { useState, useCallback, useMemo } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'
import { useSelection } from './_context/SelectionContext'

/**
 * Item type configurations - easily extensible for new types
 */
const ITEM_TYPE_CONFIG = {
  exercise: {
    endpoint: '/api/exercises',
    defaultTitle: 'Select Exercise',
    icon: (color = "#F5C842") => <MaterialCommunityIcons name="dumbbell" size={20} color={color} />,
    searchPlaceholder: 'Search exercises...',
    emptyText: 'No exercises available',
    createRoute: '/create-exercise',
    createLabel: 'Create New Exercise',
    renderSubtext: (item) => {
      if (item.muscleGroups && item.muscleGroups.length > 0) {
        return item.muscleGroups.map(mg => mg.name).join(', ')
      }
      return null
    }
  },
  muscleGroup: {
    endpoint: '/api/muscle-groups',
    defaultTitle: 'Select Muscle Group',
    icon: (color = "#F5C842") => <MaterialCommunityIcons name="arm-flex" size={20} color={color} />,
    searchPlaceholder: 'Search muscle groups...',
    emptyText: 'No muscle groups available',
    createRoute: null,
    createLabel: null,
    renderSubtext: null
  },
  workout: {
    endpoint: '/api/workouts',
    defaultTitle: 'Select Workout',
    icon: (color = "#F5C842") => <MaterialCommunityIcons name="clipboard-list" size={20} color={color} />,
    searchPlaceholder: 'Search workouts...',
    emptyText: 'No workouts available',
    createRoute: '/create-workout',
    createLabel: 'Create New Workout',
    renderSubtext: (item) => {
      if (item.exerciseCount !== undefined) {
        return `${item.exerciseCount} exercises`
      }
      return null
    }
  },
}

const SelectItemsScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { authFetch } = useAuth()
  const { confirmSelection, cancelSelection } = useSelection()
  
  // Parse params (guaranteed to exist on mount)
  const type = params.type || 'muscleGroup'
  const mode = params.mode || 'single'
  const title = params.title
  const excludedIds = params.excluded ? JSON.parse(params.excluded) : []
  const initialSelected = params.selected ? JSON.parse(params.selected) : []
  
  const typeConfig = ITEM_TYPE_CONFIG[type] || ITEM_TYPE_CONFIG.muscleGroup
  const displayTitle = title || typeConfig.defaultTitle
  
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(initialSelected)

  // Fetch items when screen gains focus (including after creating new item)
  useFocusEffect(
    useCallback(() => {
      fetchItems()
    }, [])
  )

  const fetchItems = async () => {
    try {
      setIsLoading(true)
      const { data } = await authFetch(typeConfig.endpoint)
      if (data.success) {
        setItems(data.data || [])
      }
    } catch (error) {
      console.error(`Error fetching ${type}s:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (item) => {
    if (mode === 'single') {
      setSelectedIds([item.id])
    } else {
      if (selectedIds.includes(item.id)) {
        setSelectedIds(prev => prev.filter(id => id !== item.id))
      } else {
        setSelectedIds(prev => [...prev, item.id])
      }
    }
  }

  const handleConfirm = () => {
    const selectedItems = items.filter(item => selectedIds.includes(item.id))
    confirmSelection(selectedItems)
    router.back()
  }

  const handleCancel = () => {
    cancelSelection()
    router.back()
  }

  const handleCreateNew = () => {
    if (typeConfig.createRoute) {
      router.push(typeConfig.createRoute)
    }
  }

  const filteredItems = useMemo(() => {
    return items
      .filter(item => !excludedIds.includes(item.id))
      .filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  }, [items, searchQuery, excludedIds])

  const renderItem = ({ item }) => {
    const isSelected = selectedIds.includes(item.id)
    const subtext = typeConfig.renderSubtext?.(item)
    
    return (
      <TouchableOpacity
        style={[styles.itemOption, isSelected && styles.itemOptionSelected]}
        onPress={() => handleSelect(item)}
      >
        {typeConfig.icon()}
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          {subtext && (
            <Text style={styles.itemSubtext}>{subtext}</Text>
          )}
        </View>
        {mode === 'single' ? (
          <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        ) : (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#2C3E50" />}
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']}
        style={styles.overlay}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{displayTitle}</Text>
          <TouchableOpacity 
            onPress={handleConfirm} 
            style={styles.headerButton}
            disabled={mode === 'single' && selectedIds.length === 0}
          >
            <Text style={[
              styles.confirmText,
              (mode === 'single' && selectedIds.length === 0) && styles.confirmTextDisabled
            ]}>
              {mode === 'single' ? 'Select' : `Done (${selectedIds.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
          <TextInput
            style={styles.searchInput}
            placeholder={typeConfig.searchPlaceholder}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                {typeConfig.icon()}
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No results found' : typeConfig.emptyText}
                </Text>
              </View>
            }
            ListFooterComponent={
              typeConfig.createRoute ? (
                <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
                  <Ionicons name="add-circle-outline" size={24} color="#F5C842" />
                  <Text style={styles.createButtonText}>{typeConfig.createLabel}</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </LinearGradient>
    </View>
  )
}

export default SelectItemsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A4E48',
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5C842',
    textAlign: 'right',
  },
  confirmTextDisabled: {
    opacity: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  itemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  itemOptionSelected: {
    backgroundColor: 'rgba(245, 200, 66, 0.15)',
    borderColor: '#F5C842',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  itemNameSelected: {
    color: '#F5C842',
  },
  itemDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  itemSubtext: {
    fontSize: 12,
    color: 'rgba(245, 200, 66, 0.7)',
    marginTop: 4,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#F5C842',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5C842',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F5C842',
  },
})
