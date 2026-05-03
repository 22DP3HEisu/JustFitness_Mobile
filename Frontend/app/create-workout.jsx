import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams } from 'expo-router'
import React, { useState, useEffect } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'
import { useSelection } from './_context/SelectionContext'

const CreateWorkoutScreen = () => {
  const router = useRouter()
  const { workoutId } = useLocalSearchParams()
  const { authFetch } = useAuth()
  const { setSelectionCallback } = useSelection()
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [isLoadingExisting, setIsLoadingExisting] = useState(!!workoutId)
  
  // Exercises state - each exercise has an array of sets
  const [exercises, setExercises] = useState([])
  const [originalExercises, setOriginalExercises] = useState([])

  // Load existing workout data if editing
  useEffect(() => {
    if (workoutId) {
      loadWorkoutData(workoutId)
    }
  }, [workoutId])

  const loadWorkoutData = async (id) => {
    try {
      const { data } = await authFetch(`/api/workouts/${id}`)
      if (data.success && data.data) {
        const workout = data.data
        setName(workout.name || '')
        setDescription(workout.description || '')
        
        // Map existing exercises with their sets
        if (workout.exercises && Array.isArray(workout.exercises)) {
          const mappedExercises = workout.exercises.map(ex => ({
            id: ex.exercise_id,
            name: ex.exercise_name,
            description: ex.exercise_description,
            difficulty: ex.difficulty,
            muscleGroups: ex.muscleGroups || [],
            tempId: Date.now() + Math.random(),
            sets: ex.sets && Array.isArray(ex.sets) ? ex.sets.map((s) => ({
              id: s.id,
              reps: String(s.reps || '10'),
              weight: String(s.weight || '')
            })) : [{ id: 1, reps: '10', weight: '' }]
          }))
          setExercises(mappedExercises)
          setOriginalExercises(JSON.parse(JSON.stringify(mappedExercises)))
        }
      }
    } catch (error) {
      console.error('Error loading workout:', error)
      Alert.alert('Error', 'Failed to load workout data')
    } finally {
      setIsLoadingExisting(false)
    }
  }

  const openExerciseSelection = () => {
    setSelectionCallback((selectedItems) => {
      if (selectedItems.length > 0) {
        const newExercises = selectedItems.map(item => ({
          ...item,
          tempId: Date.now() + Math.random(),
          sets: [{ id: 1, reps: '10', weight: '' }], // Start with one empty set
        }))
        setExercises(prev => [...prev, ...newExercises])
      }
    })
    router.push({
      pathname: '/select-items',
      params: {
        type: 'exercise',
        mode: 'multi',
        title: 'Select Exercises',
        selected: JSON.stringify([]),
        excluded: JSON.stringify(exercises.map(ex => ex.id)),
      }
    })
  }

  const handleRemoveExercise = (tempId) => {
    setExercises(exercises.filter(ex => ex.tempId !== tempId))
  }

  const handleAddSet = (exerciseTempId) => {
    setExercises(exercises.map(ex => {
      if (ex.tempId === exerciseTempId) {
        const newSetId = Math.max(0, ...ex.sets.map(s => s.id)) + 1
        return {
          ...ex,
          sets: [...ex.sets, { id: newSetId, reps: '10', weight: '' }]
        }
      }
      return ex
    }))
  }

  const handleRemoveSet = (exerciseTempId, setId) => {
    setExercises(exercises.map(ex => {
      if (ex.tempId === exerciseTempId) {
        // Don't allow removing the last set
        if (ex.sets.length <= 1) return ex
        return {
          ...ex,
          sets: ex.sets.filter(s => s.id !== setId)
        }
      }
      return ex
    }))
  }

  const handleUpdateSet = (exerciseTempId, setId, field, value) => {
    setExercises(exercises.map(ex => {
      if (ex.tempId === exerciseTempId) {
        return {
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              return { ...s, [field]: value }
            }
            return s
          })
        }
      }
      return ex
    }))
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a workout name')
      return
    }

    // Build exercises array once, used for both create and update
    const exercisesPayload = exercises.map((exercise, index) => ({
      exercise_id: exercise.id,
      order_index: index,
      sets: exercise.sets.map((set, i) => ({
        set_number: i + 1,
        reps: parseInt(set.reps) || 0,
        weight: set.weight ? parseFloat(set.weight) : null,
        weight_unit: 'kg',
      }))
    }))

    setIsLoading(true)
    try {
      if (workoutId) {
        // Update existing workout — send name, description, and all exercises in one request
        const { data: updateData } = await authFetch(`/api/workouts/${workoutId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            exercises: exercisesPayload,
          }),
        })

        if (!updateData.success) {
          Alert.alert('Error', updateData.message || 'Failed to update workout')
          return
        }
      } else {
        // Create new workout — send name, description, and all exercises in one request
        const { data: workoutData } = await authFetch('/api/workouts', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            exercises: exercisesPayload,
          }),
        })

        if (!workoutData.success) {
          Alert.alert('Error', workoutData.message || 'Failed to create workout')
          return
        }
      }

      Alert.alert(
        'Success',
        workoutId ? 'Workout updated successfully!' : 'Workout created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      )
    } catch (error) {
      console.error('Error saving workout:', error)
      Alert.alert('Error', error.message || 'Failed to save workout')
    } finally {
      setIsLoading(false)
    }
  }

  const renderSet = (exerciseTempId, set, setIndex, totalSets) => (
    <View key={set.id} style={styles.setRow}>
      <View style={styles.setNumber}>
        <Text style={styles.setNumberText}>{setIndex + 1}</Text>
      </View>
      <TextInput
        style={styles.setInput}
        keyboardType="number-pad"
        value={set.reps}
        onChangeText={(value) => handleUpdateSet(exerciseTempId, set.id, 'reps', value)}
        placeholder="0"
        placeholderTextColor="rgba(255,255,255,0.3)"
      />
      <TextInput
        style={styles.setInput}
        keyboardType="decimal-pad"
        value={set.weight}
        onChangeText={(value) => handleUpdateSet(exerciseTempId, set.id, 'weight', value)}
        placeholder="—"
        placeholderTextColor="rgba(255,255,255,0.3)"
      />
      <TouchableOpacity
        onPress={() => handleRemoveSet(exerciseTempId, set.id)}
        style={[styles.setRemoveButton, totalSets <= 1 && styles.setRemoveButtonDisabled]}
        disabled={totalSets <= 1}
      >
        <Ionicons name="close" size={18} color={totalSets <= 1 ? "rgba(255,255,255,0.2)" : "#FF6B6B"} />
      </TouchableOpacity>
    </View>
  )

  const renderSelectedExercise = (exercise, index) => (
    <View key={exercise.tempId} style={styles.selectedExercise}>
      {/* Exercise Header */}
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseNumber}>
          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.selectedExerciseInfo}>
          <Text style={styles.selectedExerciseName}>{exercise.name}</Text>
          {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
            <Text style={styles.exerciseMuscles}>
              {exercise.muscleGroups.map(mg => mg.name).join(', ')}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleRemoveExercise(exercise.tempId)}
          style={styles.removeButton}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Sets Header */}
      <View style={styles.setsHeader}>
        <View style={styles.setsHeaderSetCol}>
          <Text style={styles.setsHeaderText}>Set</Text>
        </View>
        <Text style={styles.setsHeaderLabel}>Reps</Text>
        <Text style={styles.setsHeaderLabel}>Weight</Text>
        <View style={styles.setsHeaderSpacer} />
      </View>

      {/* Sets List */}
      <View style={styles.setsList}>
        {exercise.sets.map((set, setIndex) => 
          renderSet(exercise.tempId, set, setIndex, exercise.sets.length)
        )}
      </View>

      {/* Add Set Button */}
      <TouchableOpacity
        style={styles.addSetButton}
        onPress={() => handleAddSet(exercise.tempId)}
      >
        <Ionicons name="add" size={18} color="#F5C842" />
        <Text style={styles.addSetButtonText}>Add Set</Text>
      </TouchableOpacity>
    </View>
  )

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
          <Text style={styles.headerTitle}>{workoutId ? 'Edit Workout' : 'Create Workout'}</Text>
          <View style={styles.placeholder} />
        </View>

        {isLoadingExisting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>Loading workout...</Text>
          </View>
        ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Workout Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Workout Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'name' && styles.inputFocused
                ]}
                placeholder="e.g., Upper Body, Leg Day, Full Body"
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
                placeholder="Add notes about this workout..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={description}
                onChangeText={setDescription}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Exercises Section */}
            <View style={styles.exercisesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Exercises</Text>
                <TouchableOpacity
                  style={styles.addExerciseButton}
                  onPress={openExerciseSelection}
                >
                  <Ionicons name="add" size={20} color="#2C3E50" />
                  <Text style={styles.addExerciseButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              {exercises.length === 0 ? (
                <View style={styles.noExercises}>
                  <MaterialCommunityIcons name="dumbbell" size={32} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.noExercisesText}>No exercises added yet</Text>
                  <Text style={styles.noExercisesSubtext}>Tap "Add" to include exercises</Text>
                </View>
              ) : (
                <View style={styles.exercisesList}>
                  {exercises.map((exercise, index) => renderSelectedExercise(exercise, index))}
                </View>
              )}
            </View>

            {/* Create/Update Button */}
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
                  <Text style={styles.createButtonText}>
                    {workoutId ? 'Save Changes' : 'Create Workout'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
        )}
      </LinearGradient>
    </View>
  )
}

export default CreateWorkoutScreen

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
    minHeight: 80,
    paddingTop: 16,
  },
  exercisesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5C842',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addExerciseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  noExercises: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  noExercisesText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
  },
  noExercisesSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
  exercisesList: {
    gap: 12,
  },
  selectedExercise: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5C842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
  },
  selectedExerciseInfo: {
    flex: 1,
  },
  selectedExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exerciseMuscles: {
    fontSize: 13,
    color: 'rgba(245, 200, 66, 0.8)',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  // Sets section
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  setsHeaderSetCol: {
    width: 24,
    alignItems: 'center',
  },
  setsHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
  },
  setsHeaderLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  setsHeaderSpacer: {
    width: 26,
  },
  setsList: {
    gap: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  setInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  setRemoveButton: {
    padding: 4,
  },
  setRemoveButtonDisabled: {
    opacity: 0.3,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.4)',
    borderStyle: 'dashed',
  },
  addSetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5C842',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5C842',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
  },
  bottomPadding: {
    height: 40,
  },
})
