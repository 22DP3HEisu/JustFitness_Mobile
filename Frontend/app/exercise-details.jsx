import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, useWindowDimensions } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from './_context/AuthContext'
import { useSelection } from './_context/SelectionContext'

const getUserId = (user) => user?.id ?? user?.userId ?? user?.user_id

const splitMuscleGroups = (muscleGroups = []) => ({
  primary: muscleGroups.find((group) => group.is_primary) || null,
  secondary: muscleGroups.filter((group) => !group.is_primary),
})

const formatWeight = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

const formatChartDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const ExerciseWeightChart = ({ width, entries }) => {
  const chartEntries = (entries || [])
    .map((entry) => ({
      ...entry,
      topWeight: Number(entry?.topWeight),
    }))
    .filter((entry) => Number.isFinite(entry.topWeight))

  const chartWidth = Math.max(280, Math.min(width - 40, 360))
  const chartHeight = 130
  const plotLeft = 34
  const plotWidth = chartWidth - plotLeft - 8

  if (!chartEntries.length) {
    return (
      <View style={[styles.chart, styles.emptyChart, { width: chartWidth, height: chartHeight + 42 }]}>
        <Text style={styles.emptyChartText}>No completed sessions with weight yet</Text>
      </View>
    )
  }

  const weights = chartEntries.map((entry) => entry.topWeight)
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)
  const padding = Math.max(1, (maxWeight - minWeight) * 0.35)
  const minValue = Math.max(0, Math.floor(minWeight - padding))
  const maxValue = Math.ceil(maxWeight + padding)
  const range = Math.max(1, maxValue - minValue)
  const points = chartEntries.map((entry, index) => {
    const x = chartEntries.length === 1 ? plotLeft + plotWidth / 2 : plotLeft + (index / (chartEntries.length - 1)) * plotWidth
    const y = ((maxValue - entry.topWeight) / range) * chartHeight
    return { x, y }
  })
  const axisLabels = [maxValue, Math.round((maxValue + minValue) / 2), minValue]
  const dateLabels = chartEntries.length <= 3
    ? chartEntries.map((entry, index) => ({ index, label: formatChartDate(entry.date) }))
    : [
        { index: 0, label: formatChartDate(chartEntries[0]?.date) },
        { index: Math.floor(chartEntries.length / 2), label: formatChartDate(chartEntries[Math.floor(chartEntries.length / 2)]?.date) },
        { index: chartEntries.length - 1, label: formatChartDate(chartEntries[chartEntries.length - 1]?.date) },
      ]
  const bestWeight = Math.max(...weights)

  return (
    <View style={[styles.chart, { width: chartWidth, height: chartHeight + 52 }]}>
      {axisLabels.map((label) => (
        <View
          key={label}
          style={[
            styles.chartGridLine,
            {
              top: ((maxValue - label) / range) * chartHeight,
              left: plotLeft,
              width: plotWidth,
            },
          ]}
        >
          <Text selectable style={styles.axisLabel}>{label}</Text>
        </View>
      ))}

      {[0.25, 0.5, 0.75].map((position) => (
        <View key={position} style={[styles.verticalGridLine, { left: plotLeft + plotWidth * position, height: chartHeight }]} />
      ))}

      {points.slice(0, -1).map((point, index) => {
        const next = points[index + 1]
        const dx = next.x - point.x
        const dy = next.y - point.y
        const length = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx) * (180 / Math.PI)

        return (
          <View
            key={index}
            style={[
              styles.lineSegment,
              {
                width: length,
                left: point.x + dx / 2 - length / 2,
                top: point.y + dy / 2 - 1,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        )
      })}

      {points.map((point, index) => {
        const isBest = chartEntries[index].topWeight === bestWeight
        return (
          <View
            key={`point-${index}`}
            style={[
              styles.chartPoint,
              isBest && styles.chartPointBest,
              { left: point.x - 5, top: point.y - 5 },
            ]}
          />
        )
      })}

      <View style={[styles.dateRow, { left: plotLeft, top: chartHeight + 22, width: plotWidth }]}>
        {dateLabels.map(({ index, label }, labelIndex) => (
          <Text
            selectable
            key={`${label}-${index}`}
            style={[
              styles.dateLabel,
              labelIndex === 0 && styles.dateLabelStart,
              labelIndex === dateLabels.length - 1 && styles.dateLabelEnd,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  )
}

const ExerciseDetailsScreen = () => {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const params = useLocalSearchParams()
  const { authFetch, user } = useAuth()
  const { setSelectionCallback } = useSelection()
  const exerciseId = params.id

  const [exercise, setExercise] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [primaryMuscleGroup, setPrimaryMuscleGroup] = useState(null)
  const [secondaryMuscleGroups, setSecondaryMuscleGroups] = useState([])
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [weightHistory, setWeightHistory] = useState([])
  const [isWeightHistoryLoading, setIsWeightHistoryLoading] = useState(false)

  const isOwner = exercise && Number(exercise.user_id) === Number(getUserId(user))

  const hydrateForm = (nextExercise) => {
    const { primary, secondary } = splitMuscleGroups(nextExercise?.muscleGroups || [])
    setName(nextExercise?.name || '')
    setDescription(nextExercise?.description || '')
    setPrimaryMuscleGroup(primary)
    setSecondaryMuscleGroups(secondary)
    setIsPublic(Boolean(nextExercise?.is_public))
  }

  const loadExercise = async () => {
    if (!exerciseId) return

    try {
      setIsLoading(true)
      const { data } = await authFetch(`/api/exercises/${exerciseId}`)
      if (data.success) {
        setExercise(data.data)
        hydrateForm(data.data)
        loadWeightHistory()
      } else {
        Alert.alert('Error', data.message || 'Failed to load exercise')
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load exercise')
    } finally {
      setIsLoading(false)
    }
  }

  const loadWeightHistory = async () => {
    if (!exerciseId) return

    try {
      setIsWeightHistoryLoading(true)
      const { data } = await authFetch(`/api/exercises/${exerciseId}/weight-history?limit=12`)
      if (data.success) {
        setWeightHistory(data.data || [])
      }
    } catch (error) {
      console.error('Error loading exercise weight history:', error)
      setWeightHistory([])
    } finally {
      setIsWeightHistoryLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!isEditing) {
        loadExercise()
      }
    }, [exerciseId, isEditing])
  )

  const openPrimarySelection = () => {
    if (!isOwner || !isEditing) return
    setSelectionCallback((selectedItems) => {
      const selected = selectedItems[0]
      setPrimaryMuscleGroup(selected || null)
      if (selected) {
        setSecondaryMuscleGroups((current) => current.filter((group) => group.id !== selected.id))
      }
    })
    router.push({
      pathname: '/select-items',
      params: {
        type: 'muscleGroup',
        mode: 'single',
        title: 'Primary Muscle Group',
        selected: JSON.stringify(primaryMuscleGroup ? [primaryMuscleGroup.id] : []),
      },
    })
  }

  const openSecondarySelection = () => {
    if (!isOwner || !isEditing) return
    setSelectionCallback((selectedItems) => {
      setSecondaryMuscleGroups(selectedItems)
    })
    router.push({
      pathname: '/select-items',
      params: {
        type: 'muscleGroup',
        mode: 'multiple',
        title: 'Secondary Muscle Groups',
        selected: JSON.stringify(secondaryMuscleGroups.map((group) => group.id)),
        excluded: JSON.stringify(primaryMuscleGroup ? [primaryMuscleGroup.id] : []),
      },
    })
  }

  const handleCancelEdit = () => {
    hydrateForm(exercise)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an exercise name')
      return
    }

    if (!primaryMuscleGroup) {
      Alert.alert('Error', 'Please select a primary muscle group')
      return
    }

    setIsSaving(true)
    try {
      const { data } = await authFetch(`/api/exercises/${exerciseId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          primaryMuscleGroupId: primaryMuscleGroup.id,
          secondaryMuscleGroupIds: secondaryMuscleGroups.map((group) => group.id),
          isPublic,
        }),
      })

      if (data.success) {
        setExercise(data.data)
        hydrateForm(data.data)
        setIsEditing(false)
        Alert.alert('Success', 'Exercise updated successfully')
      } else {
        Alert.alert('Error', data.message || 'Failed to update exercise')
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update exercise')
    } finally {
      setIsSaving(false)
    }
  }

  const renderMuscleGroups = () => {
    const groups = [
      ...(primaryMuscleGroup ? [{ ...primaryMuscleGroup, isPrimary: true }] : []),
      ...secondaryMuscleGroups.map((group) => ({ ...group, isPrimary: false })),
    ]

    if (!groups.length) {
      return <Text style={styles.emptyText}>No muscle groups selected</Text>
    }

    return (
      <View style={styles.tagsContainer}>
        {groups.map((group) => (
          <View key={`${group.isPrimary ? 'primary' : 'secondary'}-${group.id}`} style={[styles.tag, group.isPrimary && styles.primaryTag]}>
            <Text style={[styles.tagText, group.isPrimary && styles.primaryTagText]}>
              {group.name}{group.isPrimary ? ' · Primary' : ''}
            </Text>
          </View>
        ))}
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
          </View>
        </LinearGradient>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Exercise' : 'Exercise'}</Text>
          {isOwner ? (
            <TouchableOpacity
              onPress={isEditing ? handleCancelEdit : () => setIsEditing(true)}
              style={styles.headerButton}
              disabled={isSaving}
            >
              <Text style={styles.headerAction}>{isEditing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerButton} />
          )}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="dumbbell" size={48} color="#F5C842" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Exercise Name</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Exercise name"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                />
              ) : (
                <Text selectable style={styles.displayTitle}>{exercise?.name || 'Untitled exercise'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea, focusedField === 'description' && styles.inputFocused]}
                  value={description}
                  onChangeText={setDescription}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="How to perform this exercise..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              ) : (
                <Text selectable style={styles.descriptionText}>
                  {exercise?.description || 'No description added.'}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Muscle Groups</Text>
              {isEditing ? (
                <>
                  <TouchableOpacity style={styles.selectorField} onPress={openPrimarySelection}>
                    <MaterialCommunityIcons name="arm-flex" size={20} color="#F5C842" />
                    <Text style={primaryMuscleGroup ? styles.selectorText : styles.selectorPlaceholder}>
                      {primaryMuscleGroup?.name || 'Select primary muscle group'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.selectorField, styles.secondarySelector]} onPress={openSecondarySelection}>
                    <MaterialCommunityIcons name="arm-flex-outline" size={20} color="#F5C842" />
                    <Text style={secondaryMuscleGroups.length ? styles.selectorText : styles.selectorPlaceholder}>
                      {secondaryMuscleGroups.length ? `${secondaryMuscleGroups.length} secondary selected` : 'Select secondary muscle groups'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.5)" />
                  </TouchableOpacity>
                </>
              ) : renderMuscleGroups()}
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressTitle}>Top Weight Progress</Text>
                  <Text style={styles.progressSubtitle}>Best set from each completed session</Text>
                </View>
                <MaterialCommunityIcons name="chart-line" size={22} color="#F5C842" />
              </View>

              {isWeightHistoryLoading ? (
                <View style={styles.chartLoading}>
                  <ActivityIndicator color="#F5C842" />
                </View>
              ) : (
                <>
                  <ExerciseWeightChart width={width} entries={weightHistory} />
                  <View style={styles.progressStats}>
                    <View style={styles.progressStat}>
                      <Text selectable style={styles.progressValue}>
                        {weightHistory.length ? `${formatWeight(Math.max(...weightHistory.map((entry) => Number(entry.topWeight))))} kg` : '--'}
                      </Text>
                      <Text style={styles.progressLabel}>Best</Text>
                    </View>
                    <View style={styles.progressStat}>
                      <Text selectable style={styles.progressValue}>{weightHistory.length}</Text>
                      <Text style={styles.progressLabel}>Sessions</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={styles.visibilityCard}>
              <View style={styles.visibilityTextContainer}>
                <Text style={styles.visibilityTitle}>{isPublic ? 'Public exercise' : 'Private exercise'}</Text>
                <Text style={styles.visibilityText}>
                  {isPublic ? 'Other users can find and use this exercise.' : 'Only you can find and use this exercise.'}
                </Text>
              </View>
              {isEditing && (
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.22)', true: 'rgba(245, 200, 66, 0.45)' }}
                  thumbColor={isPublic ? '#F5C842' : '#FFFFFF'}
                />
              )}
            </View>

            <View style={styles.ownerCard}>
              <Ionicons name={isOwner ? 'person-circle' : 'lock-closed'} size={22} color="#F5C842" />
              <Text style={styles.ownerText}>
                {isOwner ? 'You created this exercise.' : 'Only the creator can edit this exercise.'}
              </Text>
            </View>

            {isEditing && (
              <TouchableOpacity style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#2C3E50" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#2C3E50" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  )
}

export default ExerciseDetailsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A4E48',
  },
  overlay: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    minWidth: 64,
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerAction: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
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
    minHeight: 120,
    paddingTop: 16,
  },
  displayTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 15,
    lineHeight: 22,
  },
  selectorField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondarySelector: {
    marginTop: 10,
  },
  selectorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  selectorPlaceholder: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  primaryTag: {
    backgroundColor: '#F5C842',
    borderColor: '#F5C842',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryTagText: {
    color: '#2C3E50',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 200, 66, 0.1)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.25)',
    marginBottom: 24,
  },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 24,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  visibilityText: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  progressSubtitle: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 12,
    marginTop: 3,
  },
  chart: {
    alignSelf: 'center',
    marginTop: 4,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 13,
    textAlign: 'center',
  },
  chartLoading: {
    height: 172,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartGridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  verticalGridLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  axisLabel: {
    position: 'absolute',
    left: -34,
    top: -8,
    width: 28,
    color: 'rgba(255, 255, 255, 0.48)',
    fontSize: 10,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#F5C842',
  },
  chartPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F5C842',
  },
  chartPointBest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5C842',
    borderColor: '#FFFFFF',
  },
  dateRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.52)',
    fontSize: 10,
    textAlign: 'center',
  },
  dateLabelStart: {
    textAlign: 'left',
  },
  dateLabelEnd: {
    textAlign: 'right',
  },
  progressStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  progressStat: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  progressValue: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  ownerText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5C842',
    borderRadius: 8,
    padding: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '800',
  },
  bottomPadding: {
    height: 40,
  },
})
