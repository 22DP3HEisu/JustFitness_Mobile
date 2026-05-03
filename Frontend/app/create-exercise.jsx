import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'
import { useSelection } from './_context/SelectionContext'

const CreateExerciseScreen = () => {
  const router = useRouter()
  const { authFetch } = useAuth()
  const { setSelectionCallback } = useSelection()
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [primaryMuscleGroup, setPrimaryMuscleGroup] = useState(null)
  const [secondaryMuscleGroups, setSecondaryMuscleGroups] = useState([])
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const openPrimarySelection = () => {
    setSelectionCallback((selectedItems) => {
      if (selectedItems.length > 0) {
        const selected = selectedItems[0]
        setPrimaryMuscleGroup(selected)
        // Remove from secondary if it was there
        setSecondaryMuscleGroups(prev => prev.filter(mg => mg.id !== selected.id))
      }
    })
    router.push({
      pathname: '/select-items',
      params: {
        type: 'muscleGroup',
        mode: 'single',
        title: 'Primary Muscle Group',
        selected: JSON.stringify(primaryMuscleGroup ? [primaryMuscleGroup.id] : []),
      }
    })
  }

  const openSecondarySelection = () => {
    setSelectionCallback((selectedItems) => {
      setSecondaryMuscleGroups(selectedItems)
    })
    router.push({
      pathname: '/select-items',
      params: {
        type: 'muscleGroup',
        mode: 'multiple',
        title: 'Secondary Muscle Groups',
        selected: JSON.stringify(secondaryMuscleGroups.map(mg => mg.id)),
        excluded: JSON.stringify(primaryMuscleGroup ? [primaryMuscleGroup.id] : []),
      }
    })
  }

  const removePrimaryMuscleGroup = () => {
    setPrimaryMuscleGroup(null)
  }

  const removeSecondaryMuscleGroup = (muscleGroupId) => {
    setSecondaryMuscleGroups(prev => prev.filter(mg => mg.id !== muscleGroupId))
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an exercise name')
      return
    }

    if (!primaryMuscleGroup) {
      Alert.alert('Error', 'Please select a primary muscle group')
      return
    }

    setIsLoading(true)
    try {
      const { data } = await authFetch('/api/exercises', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          primaryMuscleGroupId: primaryMuscleGroup.id,
          secondaryMuscleGroupIds: secondaryMuscleGroups.map(mg => mg.id),
          isPublic,
        }),
      })

      if (data.success) {
        Alert.alert(
          'Success',
          'Exercise created successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        )
      } else {
        Alert.alert('Error', data.message || 'Failed to create exercise')
      }
    } catch (error) {
      console.error('Error creating exercise:', error)
      Alert.alert('Error', error.message || 'Failed to create exercise')
    } finally {
      setIsLoading(false)
    }
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Exercise</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="dumbbell" size={48} color="#F5C842" />
            </View>

            {/* Exercise Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Exercise Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'name' && styles.inputFocused
                ]}
                placeholder="e.g., Bench Press, Squats, Pull-ups"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  focusedField === 'description' && styles.inputFocused
                ]}
                placeholder="How to perform this exercise..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={description}
                onChangeText={setDescription}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Primary Muscle Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Primary Muscle Group *</Text>
              <TouchableOpacity 
                style={styles.selectorField}
                onPress={openPrimarySelection}
              >
                <MaterialCommunityIcons name="arm-flex" size={20} color="#F5C842" />
                {primaryMuscleGroup ? (
                  <View style={styles.selectedItemContainer}>
                    <Text style={styles.selectedItemText}>{primaryMuscleGroup.name}</Text>
                    <TouchableOpacity 
                      onPress={removePrimaryMuscleGroup}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.6)" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.selectorPlaceholder}>Tap to select primary muscle group</Text>
                )}
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            </View>

            {/* Secondary Muscle Groups */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Secondary Muscle Groups (Optional)</Text>
              <TouchableOpacity 
                style={styles.selectorField}
                onPress={openSecondarySelection}
              >
                <MaterialCommunityIcons name="arm-flex-outline" size={20} color="#F5C842" />
                {secondaryMuscleGroups.length > 0 ? (
                  <Text style={styles.selectorText}>
                    {secondaryMuscleGroups.length} selected
                  </Text>
                ) : (
                  <Text style={styles.selectorPlaceholder}>Tap to select secondary muscle groups</Text>
                )}
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
              
              {/* Selected secondary muscle groups tags */}
              {secondaryMuscleGroups.length > 0 && (
                <View style={styles.tagsContainer}>
                  {secondaryMuscleGroups.map((mg) => (
                    <View key={mg.id} style={styles.tag}>
                      <Text style={styles.tagText}>{mg.name}</Text>
                      <TouchableOpacity onPress={() => removeSecondaryMuscleGroup(mg.id)}>
                        <Ionicons name="close-circle" size={16} color="#2C3E50" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.visibilityCard}>
              <View style={styles.visibilityTextContainer}>
                <Text style={styles.visibilityTitle}>Public exercise</Text>
                <Text style={styles.visibilityText}>
                  {isPublic ? 'Other users can find and use this exercise.' : 'Only you can find and use this exercise.'}
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: 'rgba(255, 255, 255, 0.22)', true: 'rgba(245, 200, 66, 0.45)' }}
                thumbColor={isPublic ? '#F5C842' : '#FFFFFF'}
              />
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#F5C842" />
              <Text style={styles.infoText}>
                This exercise will be available to add to any of your workouts.
              </Text>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, isLoading && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#2C3E50" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#2C3E50" />
                  <Text style={styles.createButtonText}>Create Exercise</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  )
}

export default CreateExerciseScreen

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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputFocused: {
    borderColor: '#F5C842',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectorPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  selectedItemContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F5C842',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5C842',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2C3E50',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.3)',
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 24,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  visibilityText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.62)',
    marginTop: 3,
    lineHeight: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5C842',
    borderRadius: 12,
    padding: 16,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  bottomPadding: {
    height: 40,
  },
})
