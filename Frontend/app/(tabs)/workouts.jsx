import { StyleSheet, Text, View, ImageBackground, ScrollView, TouchableOpacity, Dimensions, FlatList, ActivityIndicator, Alert } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState, useEffect, useCallback } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from '../_context/AuthContext'
import { useFocusEffect, useRouter } from 'expo-router'

const { width, height } = Dimensions.get('window')

const WorkoutsScreen = () => {
  const router = useRouter()
  const { authFetch, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('Today')
  const [workoutsList, setWorkoutsList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchWorkouts = async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      const { data } = await authFetch('/api/workouts')
      
      if (data.success) {
        setWorkoutsList(data.data || [])
      } else {
        setError(data.message || 'Failed to fetch workouts')
      }
    } catch (err) {
      console.error('Error fetching workouts:', err)
      setError(err.message || 'Failed to load workouts')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch workouts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchWorkouts()
    }, [isAuthenticated])
  )

  const stats = {
    steps: 4045,
    distance: 1.6,
    goal: 10000
  }

  const tabs = ['Today', 'Week', 'Month', 'Year']

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const renderWorkoutItem = ({ item }) => {
    const exerciseCount = item.exercises?.length || 0
    const totalSets = item.exercises?.reduce((sum, ex) => sum + (ex.sets || 0), 0) || 0
    const totalReps = item.exercises?.reduce((sum, ex) => sum + (ex.reps || 0), 0) || 0
    
    return (
      <View style={styles.workoutCard}>
        <View style={styles.workoutHeader}>
          <View style={styles.workoutTitle}>
            <MaterialCommunityIcons name="dumbbell" size={20} color="#F5C842" />
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutName}>{item.name}</Text>
              <Text style={styles.workoutDate}>{formatDate(item.workout_date)}</Text>
            </View>
          </View>
          <TouchableOpacity>
            <Ionicons name="create-outline" size={24} color="#F5C842" />
          </TouchableOpacity>
        </View>

        <View style={styles.workoutStatsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{exerciseCount}</Text>
            <Text style={styles.statLabel}>EXERCISES</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalSets}x</Text>
            <Text style={styles.statLabel}>SETS</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color="#FFFFFF" />
            <Text style={styles.statValue}>{item.duration || '-'}</Text>
            <Text style={styles.statLabel}>min</Text>
          </View>
        </View>

        {item.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText} numberOfLines={2}>{item.description}</Text>
          </View>
        )}
      </View>
    )
  }

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="dumbbell" size={48} color="rgba(255,255,255,0.3)" />
      <Text style={styles.emptyText}>No workouts yet</Text>
      <Text style={styles.emptySubtext}>Tap the + button to create your first workout</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(58, 78, 72, 0.4)', 'rgba(58, 78, 72, 0.8)', 'rgba(58, 78, 72, 0.95)']}
        style={styles.overlay}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
          {/* AI Trainer Section */}
          <View style={styles.aiSection}>
            <View>
              <Text style={styles.aiTitle}>AI Trainer</Text>
              <Text style={styles.aiSubtitle}>Let AI generate workouts for you!</Text>
            </View>
            <TouchableOpacity style={styles.generateButton}>
              <Text style={styles.generateButtonText}>Generate</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <Text style={styles.statNumber}>{stats.steps}</Text>
                <Ionicons name="footsteps" size={20} color="#F5C842" />
              </View>
              <Text style={styles.statCardLabel}>Steps</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <Text style={styles.statNumber}>{stats.distance}km</Text>
              </View>
              <Text style={styles.statCardLabel}>Distance</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <Text style={styles.statNumber}>{stats.goal}</Text>
              </View>
              <Text style={styles.statCardLabel}>Goal</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(stats.steps / stats.goal) * 100}%` }]} />
            </View>
          </View>

          {/* Your Workouts */}
          <Text style={styles.sectionTitle}>Your Workouts</Text>
          <View style={styles.workoutHeaderStats}>
            <View style={[styles.statItem, { alignItems: 'center' }]}>
              <Ionicons name="fitness" size={24} color="#F5C842" />
              <Text style={[styles.statValue, { marginLeft: 8 }]}>{workoutsList.length}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <Text style={styles.thisWeekText}>Total</Text>
            <TouchableOpacity onPress={fetchWorkouts} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color="#F5C842" />
            </TouchableOpacity>
          </View>

          {/* Workouts List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F5C842" />
              <Text style={styles.loadingText}>Loading workouts...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchWorkouts} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={workoutsList}
              renderItem={renderWorkoutItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmptyList}
            />
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-workout')}>
          <Ionicons name="add" size={32} color="#2C3E50" />
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  aiSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  aiSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  generateButton: {
    backgroundColor: '#F5C842',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#F5C842',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F5C842',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  workoutHeaderStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5C842',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  thisWeekText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  listContent: {
    gap: 12,
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  workoutDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  workoutStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  equipmentTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tagText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5C842',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomPadding: {
    height: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: '#FF6B6B',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F5C842',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#2C3E50',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  descriptionContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  descriptionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
})
