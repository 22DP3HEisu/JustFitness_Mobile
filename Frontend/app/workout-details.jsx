import i18n from "../lib/i18n";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
const formatDate = dateString => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};
const formatVolume = value => {
  const volume = Number(value || 0);
  if (volume >= 1000) return `${(volume / 1000).toFixed(volume >= 10000 ? 0 : 1)}k`;
  return String(Math.round(volume));
};
const getChartDateLabels = entries => {
  if (entries.length <= 3) {
    return entries.map((entry, index) => ({
      index,
      label: formatDate(entry.completed_at)
    }));
  }
  return [{
    index: 0,
    label: formatDate(entries[0]?.completed_at)
  }, {
    index: Math.floor(entries.length / 2),
    label: formatDate(entries[Math.floor(entries.length / 2)]?.completed_at)
  }, {
    index: entries.length - 1,
    label: formatDate(entries[entries.length - 1]?.completed_at)
  }];
};
const formatSet = set => {
  const reps = Number(set.reps || 0);
  const weight = set.weight === null || set.weight === undefined || set.weight === '' ? null : Number(set.weight);
  if (!weight) return `${reps} reps`;
  const formattedWeight = Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
  return `${reps} reps x ${formattedWeight} kg`;
};
const VolumeLineChart = ({
  width,
  sessions
}) => {
  const chartEntries = (sessions || []).map(session => ({
    ...session,
    totalVolume: Number(session?.total_volume)
  })).filter(session => Number.isFinite(session.totalVolume));
  const chartWidth = Math.max(280, Math.min(width - 40, 360));
  const chartHeight = 130;
  const plotLeft = 38;
  const plotWidth = chartWidth - plotLeft - 8;
  if (!chartEntries.length) {
    return <View style={[styles.chart, styles.emptyChart, {
      width: chartWidth,
      height: chartHeight + 42
    }]}>
        <Text style={styles.emptyChartText}>{i18n.t("ui.no_completed_sessions_yet")}</Text>
      </View>;
  }
  const volumes = chartEntries.map(entry => entry.totalVolume);
  const minVolume = Math.min(...volumes);
  const maxVolume = Math.max(...volumes);
  const padding = Math.max(1, (maxVolume - minVolume) * 0.35);
  const minValue = Math.max(0, Math.floor(minVolume - padding));
  const maxValue = Math.ceil(maxVolume + padding);
  const range = Math.max(1, maxValue - minValue);
  const points = chartEntries.map((entry, index) => {
    const x = chartEntries.length === 1 ? plotLeft + plotWidth / 2 : plotLeft + index / (chartEntries.length - 1) * plotWidth;
    const y = (maxValue - entry.totalVolume) / range * chartHeight;
    return {
      x,
      y
    };
  });
  const axisLabels = [maxValue, Math.round((maxValue + minValue) / 2), minValue];
  const dateLabels = getChartDateLabels(chartEntries);
  const bestVolume = Math.max(...volumes);
  return <View style={[styles.chart, {
    width: chartWidth,
    height: chartHeight + 52
  }]}>
      {axisLabels.map(label => <View key={label} style={[styles.chartGridLine, {
      top: (maxValue - label) / range * chartHeight,
      left: plotLeft,
      width: plotWidth
    }]}>
          <Text selectable style={styles.axisLabel}>{formatVolume(label)}</Text>
        </View>)}

      {[0.25, 0.5, 0.75].map(position => <View key={position} style={[styles.verticalGridLine, {
      left: plotLeft + plotWidth * position,
      height: chartHeight
    }]} />)}

      {points.slice(0, -1).map((point, index) => {
      const next = points[index + 1];
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return <View key={index} style={[styles.lineSegment, {
        width: length,
        left: point.x + dx / 2 - length / 2,
        top: point.y + dy / 2 - 1,
        transform: [{
          rotate: `${angle}deg`
        }]
      }]} />;
    })}

      {points.map((point, index) => {
      const isBest = chartEntries[index].totalVolume === bestVolume;
      return <View key={`point-${index}`} style={[styles.chartPoint, isBest && styles.chartPointBest, {
        left: point.x - 5,
        top: point.y - 5
      }]} />;
    })}

      <View style={[styles.dateRow, {
      left: plotLeft,
      top: chartHeight + 22,
      width: plotWidth
    }]}>
        {dateLabels.map(({
        index,
        label
      }, labelIndex) => <Text selectable key={`${label}-${index}`} style={[styles.dateLabel, labelIndex === 0 && styles.dateLabelStart, labelIndex === dateLabels.length - 1 && styles.dateLabelEnd]}>
            {label}
          </Text>)}
      </View>
    </View>;
};
const WorkoutDetailsScreen = () => {
  const router = useRouter();
  const {
    width
  } = useWindowDimensions();
  const {
    workoutId
  } = useLocalSearchParams();
  const {
    authFetch
  } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const fetchDetails = async () => {
    if (!workoutId) return;
    try {
      setIsLoading(true);
      setError('');
      const {
        data
      } = await authFetch(`/api/workouts/${workoutId}/details`);
      if (!data.success) {
        setError(data.message || i18n.t("ui.failed_to_fetch_workout_details"));
        return;
      }
      setWorkout(data.data?.workout || null);
      setRecentSessions(data.data?.recentSessions || []);
    } catch (fetchError) {
      console.error('Error fetching workout details:', fetchError);
      setError(fetchError.message || i18n.t("ui.failed_to_fetch_workout_details"));
    } finally {
      setIsLoading(false);
    }
  };
  useFocusEffect(useCallback(() => {
    fetchDetails();
  }, [workoutId]));
  const exercises = workout?.exercises || [];
  const setCount = useMemo(() => exercises.reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0), [exercises]);
  const handleDeleteWorkout = () => {
    if (!workoutId || isDeleting) return;
    Alert.alert(i18n.t("ui.delete_workout"), `Delete ${workout?.name || i18n.t("ui.this_workout")}? This will also remove its logged sessions.`, [{
      text: i18n.t("ui.cancel"),
      style: 'cancel'
    }, {
      text: i18n.t("ui.delete"),
      style: 'destructive',
      onPress: async () => {
        try {
          setIsDeleting(true);
          const {
            response,
            data
          } = await authFetch(`/api/workouts/${workoutId}`, {
            method: 'DELETE'
          });
          if (response.ok && data.success) {
            Alert.alert(i18n.t("ui.deleted"), i18n.t("ui.workout_deleted_successfully"), [{
              text: i18n.t("ui.ok"),
              onPress: () => router.replace('/(tabs)/workouts')
            }]);
          } else {
            Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_delete_workout"));
          }
        } catch (deleteError) {
          Alert.alert(i18n.t("ui.error"), deleteError.message || i18n.t("ui.failed_to_delete_workout"));
        } finally {
          setIsDeleting(false);
        }
      }
    }]);
  };
  const renderExercise = (exercise, exerciseIndex) => <View key={exercise.id || `${exercise.exercise_id}-${exerciseIndex}`} style={styles.exercisePanel}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseNumber}>
          <Text style={styles.exerciseNumberText}>{exerciseIndex + 1}</Text>
        </View>
        <View style={styles.exerciseInfo}>
          <Text selectable style={styles.exerciseName}>{exercise.exercise_name || exercise.name || i18n.t("ui.exercise")}</Text>
          <Text style={styles.exerciseMeta}>{exercise.sets?.length || 0}{i18n.t("ui.sets")}</Text>
        </View>
      </View>

      <View style={styles.setList}>
        {(exercise.sets || []).map((set, setIndex) => <View key={set.id || setIndex} style={styles.setRow}>
            <Text style={styles.setNumber}>{i18n.t("ui.set")}{setIndex + 1}</Text>
            <Text style={styles.setValue}>{formatSet(set)}</Text>
          </View>)}
      </View>
    </View>;
  return <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.94)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.t("ui.workout_details")}</Text>
          <TouchableOpacity onPress={() => router.push({
          pathname: '/create-workout',
          params: {
            workoutId
          }
        })} style={styles.headerButton} disabled={!workoutId}>
            <Text style={styles.headerAction}>{i18n.t("ui.edit")}</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.stateText}>{i18n.t("ui.loading_workout")}</Text>
          </View> : error ? <View style={styles.stateContainer}>
            <Ionicons name="alert-circle" size={42} color="#FF6B6B" />
            <Text selectable style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchDetails} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{i18n.t("ui.retry")}</Text>
            </TouchableOpacity>
          </View> : <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.titleBlock}>
              <Text selectable style={styles.workoutTitle}>{workout?.name || i18n.t("ui.workout")}</Text>
              {workout?.description ? <Text selectable style={styles.workoutDescription}>{workout.description}</Text> : null}
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{exercises.length}</Text>
                <Text style={styles.summaryLabel}>{i18n.t("ui.exercises")}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{setCount}</Text>
                <Text style={styles.summaryLabel}>{i18n.t("ui.sets_2")}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{recentSessions.length}</Text>
                <Text style={styles.summaryLabel}>{i18n.t("ui.sessions")}</Text>
              </View>
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressTitle}>{i18n.t("ui.total_volume")}</Text>
                  <Text style={styles.progressSubtitle}>{i18n.t("ui.completed_workout_sessions")}</Text>
                </View>
                <MaterialCommunityIcons name="chart-line" size={22} color="#F5C842" />
              </View>
              <VolumeLineChart width={width} sessions={recentSessions} />
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text selectable style={styles.progressValue}>
                    {recentSessions.length ? `${formatVolume(Math.max(...recentSessions.map(session => Number(session.total_volume || 0))))} kg` : '--'}
                  </Text>
                  <Text style={styles.progressLabel}>{i18n.t("ui.best")}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text selectable style={styles.progressValue}>{recentSessions.length}</Text>
                  <Text style={styles.progressLabel}>{i18n.t("ui.sessions")}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{i18n.t("ui.exercises_sets")}</Text>
              <Text style={styles.sectionMeta}>{i18n.t("ui.view_only")}</Text>
            </View>

            {exercises.length ? <View style={styles.exerciseList}>
                {exercises.map(renderExercise)}
              </View> : <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>{i18n.t("ui.no_exercises_in_this_workout")}</Text>
              </View>}

            <TouchableOpacity style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]} onPress={handleDeleteWorkout} disabled={isDeleting}>
              {isDeleting ? <ActivityIndicator color="#FF6B6B" /> : <>
                  <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                  <Text style={styles.deleteButtonText}>{i18n.t("ui.delete_workout_2")}</Text>
                </>}
            </TouchableOpacity>
          </ScrollView>}
      </LinearGradient>
    </View>;
};
export default WorkoutDetailsScreen;
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
    fontWeight: '800',
    textAlign: 'center'
  },
  headerAction: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right'
  },
  content: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
    gap: 18
  },
  titleBlock: {
    gap: 6
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900'
  },
  workoutDescription: {
    color: 'rgba(255, 255, 255, 0.66)',
    fontSize: 14,
    lineHeight: 20
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10
  },
  summaryItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 3
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900'
  },
  progressSubtitle: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 12,
    marginTop: 3
  },
  chart: {
    alignSelf: 'center',
    marginTop: 4
  },
  chartGridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  verticalGridLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)'
  },
  axisLabel: {
    position: 'absolute',
    left: -38,
    top: -8,
    width: 32,
    color: 'rgba(255, 255, 255, 0.48)',
    fontSize: 10,
    textAlign: 'right',
    fontVariant: ['tabular-nums']
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#F5C842'
  },
  chartPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F5C842'
  },
  chartPointBest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5C842',
    borderColor: '#FFFFFF'
  },
  dateRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dateLabel: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.52)',
    fontSize: 10,
    textAlign: 'center'
  },
  dateLabelStart: {
    textAlign: 'left'
  },
  dateLabelEnd: {
    textAlign: 'right'
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyChartText: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 13,
    textAlign: 'center'
  },
  progressStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  progressStat: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  progressValue: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  progressLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900'
  },
  sectionMeta: {
    color: 'rgba(245, 200, 66, 0.78)',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  exerciseList: {
    gap: 12
  },
  exercisePanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  exerciseNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 200, 66, 0.14)'
  },
  exerciseNumberText: {
    color: '#F5C842',
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  exerciseInfo: {
    flex: 1
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900'
  },
  exerciseMeta: {
    color: 'rgba(255, 255, 255, 0.52)',
    fontSize: 12,
    marginTop: 2
  },
  setList: {
    gap: 8
  },
  setRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)'
  },
  setNumber: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 12,
    fontWeight: '800'
  },
  setValue: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right'
  },
  emptyList: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center'
  },
  emptyListText: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 14,
    fontWeight: '700'
  },
  deleteButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.28)'
  },
  deleteButtonDisabled: {
    opacity: 0.7
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '900'
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24
  },
  stateText: {
    color: 'rgba(255, 255, 255, 0.66)',
    fontSize: 14
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#F5C842',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#2C3E50',
    fontWeight: '900',
    fontSize: 14
  }
});
