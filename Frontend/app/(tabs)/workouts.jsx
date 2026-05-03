import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useState } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../_context/AuthContext'

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatElapsed = (startTime) => {
  if (!startTime) return '00:00'

  const diff = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000))
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const getWorkoutCounts = (workout) => {
  const exerciseCount = Number(workout.exercise_count ?? workout.exercises?.length ?? 0)
  const setCount = Number(workout.set_count ?? 0)
  return {
    exerciseCount: Number.isFinite(exerciseCount) ? exerciseCount : 0,
    setCount: Number.isFinite(setCount) ? setCount : 0,
  }
}

const getDraftStorageKey = (sessionId) => `workout-session-draft:${sessionId}`

const applyLocalSessionDraft = async (session) => {
  if (!session?.id) return session

  try {
    const storedDraft = await AsyncStorage.getItem(getDraftStorageKey(session.id))
    if (!storedDraft) return session

    const draft = JSON.parse(storedDraft)
    return {
      ...session,
      exerciseLogs: draft.exerciseLogs || session.exerciseLogs,
      localSetDrafts: draft.setDrafts || {},
    }
  } catch (error) {
    console.error('Error loading local workout draft:', error)
    return session
  }
}

const getCompletionExercisesPayload = (session) => (
  (session?.exerciseLogs || []).map((exerciseLog, exerciseIndex) => ({
    exerciseId: exerciseLog.exercise_id,
    notes: exerciseLog.notes ?? null,
    orderIndex: exerciseIndex,
    sets: (exerciseLog.sets || []).map((setLog, setIndex) => {
      const draft = session.localSetDrafts?.[setLog.localId] || {}

      return {
        setNumber: setIndex + 1,
        reps: draft.reps ?? setLog.reps,
        weight: draft.weight ?? setLog.weight,
        restDuration: setLog.rest_duration ?? null,
      }
    }),
  }))
)

const WorkoutsScreen = () => {
  const router = useRouter()
  const { authFetch, isAuthenticated } = useAuth()

  const [workoutsList, setWorkoutsList] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [elapsedTime, setElapsedTime] = useState('00:00')

  const fetchWorkouts = async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [{ data: workoutsData }, { data: ongoingData }] = await Promise.all([
        authFetch('/api/workouts'),
        authFetch('/api/workouts/session/ongoing'),
      ])

      if (workoutsData.success) {
        setWorkoutsList(workoutsData.data || [])
      } else {
        setError(workoutsData.message || 'Failed to fetch workouts')
      }

      setActiveSession(ongoingData.success ? await applyLocalSessionDraft(ongoingData.data) : null)
    } catch (err) {
      console.error('Error fetching workouts:', err)
      setError(err.message || 'Failed to load workouts')
    } finally {
      setIsLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts()
    }, [isAuthenticated])
  )

  useEffect(() => {
    if (!activeSession?.started_at) {
      setElapsedTime('00:00')
      return undefined
    }

    const startTime = new Date(activeSession.started_at)
    setElapsedTime(formatElapsed(startTime))

    const interval = setInterval(() => {
      setElapsedTime(formatElapsed(startTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeSession?.started_at])

  const openActiveWorkout = (session = activeSession) => {
    if (!session) return
    router.push({
      pathname: '/workout-session',
      params: { sessionId: session.id },
    })
  }

  const startWorkout = async (workoutId) => {
    try {
      const { data: ongoingData } = await authFetch('/api/workouts/session/ongoing')

      const existingSession = ongoingData.success && ongoingData.data
        ? await applyLocalSessionDraft(ongoingData.data)
        : null

      if (existingSession) {
        Alert.alert(
          'Active workout',
          `You already have "${existingSession.workout.name}" running.`,
          [
            {
              text: 'Open',
              onPress: () => openActiveWorkout(existingSession),
            },
            {
              text: 'Finish & start',
              onPress: async () => {
                try {
                  await authFetch(`/api/workouts/session/${existingSession.id}/complete`, {
                    method: 'POST',
                    body: JSON.stringify({
                      exercises: getCompletionExercisesPayload(existingSession),
                    }),
                  })
                  await AsyncStorage.removeItem(getDraftStorageKey(existingSession.id))

                  const { data: startData } = await authFetch(`/api/workouts/${workoutId}/start`, {
                    method: 'POST',
                  })

                  if (startData.success) {
                    setActiveSession(null)
                    openActiveWorkout(startData.data)
                  } else {
                    Alert.alert('Error', startData.message || 'Failed to start workout')
                  }
                } catch (error) {
                  console.error('Error starting workout:', error)
                  Alert.alert('Error', error.message || 'Failed to start workout')
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        )
        return
      }

      const { data: startData } = await authFetch(`/api/workouts/${workoutId}/start`, {
        method: 'POST',
      })

      if (startData.success) {
        setActiveSession(startData.data)
        openActiveWorkout(startData.data)
      } else {
        Alert.alert('Error', startData.message || 'Failed to start workout')
      }
    } catch (error) {
      console.error('Error starting workout:', error)
      Alert.alert('Error', error.message || 'Failed to check active workout')
    }
  }

  const totalExercises = workoutsList.reduce((sum, workout) => sum + getWorkoutCounts(workout).exerciseCount, 0)
  const totalSets = workoutsList.reduce((sum, workout) => sum + getWorkoutCounts(workout).setCount, 0)

  const renderActiveWorkout = () => {
    if (!activeSession) return null

    const workout = activeSession.workout || {}
    const sessionExercises = activeSession.exerciseLogs || workout.exercises || []
    const setCount = sessionExercises.reduce((sum, exercise) => sum + (Array.isArray(exercise.sets) ? exercise.sets.length : 0), 0)

    return (
      <TouchableOpacity style={styles.activePanel} onPress={() => openActiveWorkout()} activeOpacity={0.82}>
        <View style={styles.activeHeader}>
          <View style={styles.activeStatus}>
            <View style={styles.liveDot} />
            <Text style={styles.activeStatusText}>Active now</Text>
          </View>
          <Text style={styles.activeTimer}>{elapsedTime}</Text>
        </View>

        <View style={styles.activeBody}>
          <View style={styles.activeIcon}>
            <MaterialCommunityIcons name="dumbbell" size={24} color="#2C3E50" />
          </View>
          <View style={styles.activeInfo}>
            <Text selectable style={styles.activeTitle}>{workout.name || 'Workout'}</Text>
            <Text style={styles.activeMeta}>{sessionExercises.length} exercises - {setCount} sets</Text>
          </View>
          <Ionicons name="expand-outline" size={22} color="#F5C842" />
        </View>

        <View style={styles.activeActions}>
          <TouchableOpacity style={styles.resumeButton} onPress={() => openActiveWorkout()}>
            <Ionicons name="play" size={16} color="#2C3E50" />
            <Text style={styles.resumeButtonText}>Resume</Text>
          </TouchableOpacity>
          <Text style={styles.minimizedText}>Minimized active workout</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderWorkoutCard = (item) => {
    const { exerciseCount, setCount } = getWorkoutCounts(item)

    return (
      <View key={item.id} style={styles.workoutCard}>
        <View style={styles.workoutTopRow}>
          <View style={styles.workoutIcon}>
            <MaterialCommunityIcons name="clipboard-pulse-outline" size={22} color="#F5C842" />
          </View>
          <View style={styles.workoutInfo}>
            <Text selectable style={styles.workoutName}>{item.name}</Text>
            <Text style={styles.workoutMeta}>Created {formatDate(item.created_at)}</Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push({
              pathname: '/create-workout',
              params: { workoutId: item.id },
            })}
          >
            <Ionicons name="create-outline" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text selectable style={styles.workoutDescription} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.workoutBottomRow}>
          <View style={styles.workoutPills}>
            <View style={styles.pill}>
              <Ionicons name="fitness-outline" size={14} color="#F5C842" />
              <Text style={styles.pillText}>{exerciseCount} exercises</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="repeat-outline" size={14} color="#F5C842" />
              <Text style={styles.pillText}>{setCount} sets</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startButton} onPress={() => startWorkout(item.id)}>
            <Ionicons name="play" size={18} color="#2C3E50" />
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.97)']} style={styles.overlay}>
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Training</Text>
              <Text style={styles.title}>Workouts</Text>
            </View>
            <TouchableOpacity style={styles.headerCreateButton} onPress={() => router.push('/create-workout')}>
              <Ionicons name="add" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>

          {renderActiveWorkout()}

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{workoutsList.length}</Text>
              <Text style={styles.summaryLabel}>Plans</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalExercises}</Text>
              <Text style={styles.summaryLabel}>Exercises</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalSets}</Text>
              <Text style={styles.summaryLabel}>Sets</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Workout Plans</Text>
            <TouchableOpacity onPress={fetchWorkouts} style={styles.refreshButton}>
              <Ionicons name="refresh" size={18} color="#F5C842" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color="#F5C842" />
              <Text style={styles.stateText}>Loading workouts...</Text>
            </View>
          ) : error ? (
            <View style={styles.stateContainer}>
              <Ionicons name="alert-circle" size={42} color="#FF6B6B" />
              <Text selectable style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchWorkouts} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : workoutsList.length ? (
            <View style={styles.workoutList}>
              {workoutsList.map(renderWorkoutCard)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="dumbbell" size={42} color="rgba(255,255,255,0.32)" />
              <Text style={styles.emptyText}>No workouts yet</Text>
              <Text style={styles.emptySubtext}>Create a plan, add exercises, then start tracking sessions.</Text>
              <TouchableOpacity style={styles.emptyCreateButton} onPress={() => router.push('/create-workout')}>
                <Ionicons name="add" size={18} color="#2C3E50" />
                <Text style={styles.emptyCreateButtonText}>Create Workout</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  )
}

export default WorkoutsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A4E48',
  },
  overlay: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: 'rgba(245, 200, 66, 0.8)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
  },
  headerCreateButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F5C842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePanel: {
    backgroundColor: 'rgba(245, 200, 66, 0.12)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.35)',
    gap: 12,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27AE60',
  },
  activeStatusText: {
    color: 'rgba(255, 255, 255, 0.74)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  activeTimer: {
    color: '#F5C842',
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  activeBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5C842',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeInfo: {
    flex: 1,
  },
  activeTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  activeMeta: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 13,
    marginTop: 2,
  },
  activeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  resumeButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5C842',
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  resumeButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '900',
  },
  minimizedText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  workoutList: {
    gap: 12,
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.11)',
    gap: 12,
  },
  workoutTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workoutIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 200, 66, 0.14)',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  workoutMeta: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  workoutDescription: {
    color: 'rgba(255, 255, 255, 0.68)',
    fontSize: 13,
    lineHeight: 19,
  },
  workoutBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  workoutPills: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillText: {
    color: 'rgba(255, 255, 255, 0.74)',
    fontSize: 12,
    fontWeight: '700',
  },
  startButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F5C842',
    borderRadius: 8,
    paddingHorizontal: 13,
  },
  startButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '900',
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    gap: 12,
  },
  stateText: {
    color: 'rgba(255, 255, 255, 0.66)',
    fontSize: 14,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F5C842',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#2C3E50',
    fontWeight: '900',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 12,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 13,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyCreateButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5C842',
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 18,
  },
  emptyCreateButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '900',
  },
})
