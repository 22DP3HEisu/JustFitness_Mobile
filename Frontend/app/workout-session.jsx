// Aktīvās treniņa sesijas skats nodrošina vingrinājumu un setu žurnāla aizpildīšanu.
// Lietotājs treniņa laikā ievada atkārtojumus, svaru un pabeidz sesiju, lai rezultāti tiktu saglabāti vēsturē.
import i18n from "../lib/i18n";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './_context/AuthContext';
import { useSelection } from './_context/SelectionContext';
const formatElapsed = startTime => {
  if (!startTime) return '00:00';
  const diff = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor(diff % 3600 / 60);
  const seconds = diff % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
const normalizeDrafts = exerciseLogs => {
  const drafts = {};
  for (const exerciseLog of exerciseLogs || []) {
    for (const set of exerciseLog.sets || []) {
      drafts[set.localId] = {
        reps: String(set.reps ?? ''),
        weight: set.weight === null || set.weight === undefined ? '' : String(set.weight)
      };
    }
  }
  return drafts;
};
const createLocalId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const getDraftStorageKey = sessionId => `workout-session-draft:${sessionId}`;
const normalizeSessionLogs = exerciseLogs => (exerciseLogs || []).map(exerciseLog => ({
  ...exerciseLog,
  localId: String(exerciseLog.id ?? createLocalId('exercise')),
  sets: (exerciseLog.sets || []).map(set => ({
    ...set,
    localId: String(set.id ?? createLocalId('set'))
  }))
}));
const WorkoutSessionScreen = () => {
  const router = useRouter();
  const {
    authFetch,
    isAuthenticated
  } = useAuth();
  const {
    setSelectionCallback
  } = useSelection();
  const [session, setSession] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [setDrafts, setSetDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const replaceWithWorkouts = () => {
    router.replace('/(tabs)/workouts');
  };
  const dismissSessionModal = () => {
    if (router.canGoBack?.()) {
      router.back();
      return;
    }
    replaceWithWorkouts();
  };
  const persistLocalDraft = () => {
    if (!session?.id || !isDraftHydrated) return Promise.resolve();
    return AsyncStorage.setItem(getDraftStorageKey(session.id), JSON.stringify({
      exerciseLogs,
      setDrafts
    }));
  };
  const minimizeSession = ({
    persistDraft = true
  } = {}) => {
    if (!persistDraft) {
      dismissSessionModal();
      return;
    }
    persistLocalDraft().catch(error => {
      console.error('Error saving local workout draft:', error);
    }).finally(dismissSessionModal);
  };
  const applySessionPayload = (payload, draft = null) => {
    const normalizedExerciseLogs = normalizeSessionLogs(payload?.exerciseLogs || []);
    const nextExerciseLogs = draft?.exerciseLogs || normalizedExerciseLogs;
    const nextSetDrafts = draft?.setDrafts || normalizeDrafts(nextExerciseLogs);
    setSession(payload);
    setWorkout(payload?.workout || null);
    setExerciseLogs(nextExerciseLogs);
    setSetDrafts(nextSetDrafts);
    setStartTime(payload?.started_at ? new Date(payload.started_at) : null);
  };
  const loadLocalDraft = async sessionId => {
    try {
      const storedDraft = await AsyncStorage.getItem(getDraftStorageKey(sessionId));
      return storedDraft ? JSON.parse(storedDraft) : null;
    } catch (error) {
      console.error('Error loading local workout draft:', error);
      return null;
    }
  };
  const clearLocalDraft = async sessionId => {
    try {
      await AsyncStorage.removeItem(getDraftStorageKey(sessionId));
    } catch (error) {
      console.error('Error clearing local workout draft:', error);
    }
  };
  const fetchOngoingWorkout = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setIsDraftHydrated(false);
      const {
        data
      } = await authFetch('/api/workouts/session/ongoing');
      if (data.success && data.data) {
        const localDraft = await loadLocalDraft(data.data.id);
        applySessionPayload(data.data, localDraft);
        setIsDraftHydrated(true);
      } else {
        minimizeSession();
      }
    } catch (error) {
      console.error('Error fetching ongoing workout:', error);
      Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_load_workout_session"));
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (!startTime) return undefined;
    setElapsedTime(formatElapsed(startTime));
    const interval = setInterval(() => {
      setElapsedTime(formatElapsed(startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  useEffect(() => {
    if (!session?.id || !isDraftHydrated) return undefined;
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(getDraftStorageKey(session.id), JSON.stringify({
        exerciseLogs,
        setDrafts
      })).catch(error => {
        console.error('Error saving local workout draft:', error);
      });
    }, 150);
    return () => clearTimeout(timeout);
  }, [exerciseLogs, setDrafts, isDraftHydrated, session?.id]);
  useFocusEffect(useCallback(() => {
    if (session?.id) return;
    fetchOngoingWorkout();
  }, [isAuthenticated, session?.id]));
  const sessionTotals = useMemo(() => {
    const setCount = exerciseLogs.reduce((sum, exerciseLog) => sum + (exerciseLog.sets?.length || 0), 0);
    return {
      exerciseCount: exerciseLogs.length,
      setCount
    };
  }, [exerciseLogs]);
  const updateDraft = (setLocalId, field, value) => {
    setSetDrafts(prev => ({
      ...prev,
      [setLocalId]: {
        ...prev[setLocalId],
        [field]: value
      }
    }));
  };
  const addSet = async exerciseLog => {
    const lastSet = exerciseLog.sets?.[exerciseLog.sets.length - 1];
    const lastDraft = lastSet ? setDrafts[lastSet.localId] : null;
    const newSet = {
      localId: createLocalId('set'),
      set_number: (exerciseLog.sets?.length || 0) + 1,
      reps: parseInt(lastDraft?.reps, 10) || 10,
      weight: lastDraft?.weight ? parseFloat(lastDraft.weight) : null,
      rest_duration: null
    };
    setExerciseLogs(prev => prev.map(item => item.localId === exerciseLog.localId ? {
      ...item,
      sets: [...(item.sets || []), newSet]
    } : item));
    setSetDrafts(prev => ({
      ...prev,
      [newSet.localId]: {
        reps: String(newSet.reps),
        weight: newSet.weight === null || newSet.weight === undefined ? '' : String(newSet.weight)
      }
    }));
  };
  const removeSet = async (setLog, totalSets) => {
    if (totalSets <= 1) return;
    setExerciseLogs(prev => prev.map(exerciseLog => ({
      ...exerciseLog,
      sets: (exerciseLog.sets || []).filter(set => set.localId !== setLog.localId)
    })));
    setSetDrafts(prev => {
      const updated = {
        ...prev
      };
      delete updated[setLog.localId];
      return updated;
    });
  };
  const openExerciseSelection = () => {
    if (!session) return;
    setSelectionCallback(selectedItems => {
      if (!selectedItems.length) return;
      const newExerciseLogs = selectedItems.map(item => {
        const setLocalId = createLocalId('set');
        return {
          localId: createLocalId('exercise'),
          exercise_id: item.id,
          exercise_name: item.name,
          exercise_description: item.description || null,
          notes: null,
          sets: [{
            localId: setLocalId,
            set_number: 1,
            reps: 10,
            weight: null,
            rest_duration: null
          }]
        };
      });
      setExerciseLogs(prev => [...prev, ...newExerciseLogs]);
      setSetDrafts(prev => {
        const drafts = {
          ...prev
        };
        for (const exerciseLog of newExerciseLogs) {
          for (const set of exerciseLog.sets) {
            drafts[set.localId] = {
              reps: String(set.reps),
              weight: ''
            };
          }
        }
        return drafts;
      });
    });
    router.push({
      pathname: '/select-items',
      params: {
        type: 'exercise',
        mode: 'multi',
        title: i18n.t("ui.add_session_exercises"),
        selected: JSON.stringify([]),
        excluded: JSON.stringify(exerciseLogs.map(exerciseLog => exerciseLog.exercise_id))
      }
    });
  };
  const removeExercise = async exerciseLog => {
    Alert.alert(i18n.t("ui.remove_exercise"), `Remove ${exerciseLog.exercise_name} and its sets from this session?`, [{
      text: i18n.t("ui.keep"),
      style: 'cancel'
    }, {
      text: i18n.t("ui.remove"),
      style: 'destructive',
      onPress: () => {
        setExerciseLogs(prev => prev.filter(item => item.localId !== exerciseLog.localId));
        setSetDrafts(prev => {
          const updated = {
            ...prev
          };
          for (const set of exerciseLog.sets || []) {
            delete updated[set.localId];
          }
          return updated;
        });
      }
    }]);
  };
  const getCompletionExercisesPayload = () => exerciseLogs.map((exerciseLog, exerciseIndex) => ({
    exerciseId: exerciseLog.exercise_id,
    notes: exerciseLog.notes ?? null,
    orderIndex: exerciseIndex,
    sets: (exerciseLog.sets || []).map((setLog, setIndex) => {
      const draft = setDrafts[setLog.localId] || {};
      return {
        setNumber: setIndex + 1,
        reps: draft.reps ?? setLog.reps,
        weight: draft.weight ?? setLog.weight,
        restDuration: setLog.rest_duration ?? null
      };
    })
  }));
  const completeWorkout = async () => {
    if (!session) return;
    Alert.alert(i18n.t("ui.finish_workout"), i18n.t("ui.complete_this_active_workout_session"), [{
      text: i18n.t("ui.keep_training"),
      style: 'cancel'
    }, {
      text: i18n.t("ui.finish"),
      onPress: async () => {
        try {
          const {
            data
          } = await authFetch(`/api/workouts/session/${session.id}/complete`, {
            method: 'POST',
            body: JSON.stringify({
              exercises: getCompletionExercisesPayload()
            })
          });
          if (data.success) {
            await clearLocalDraft(session.id);
            Alert.alert(i18n.t("ui.workout_complete"), i18n.t("ui.nice_work_your_session_has_been_saved"), [{
              text: i18n.t("ui.ok"),
              onPress: () => minimizeSession({
                persistDraft: false
              })
            }]);
          } else {
            Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_complete_workout"));
          }
        } catch (error) {
          console.error('Error completing workout:', error);
          Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_complete_workout"));
        }
      }
    }]);
  };
  const cancelWorkout = async () => {
    if (!session) return;
    Alert.alert(i18n.t("ui.cancel_workout"), i18n.t("ui.this_will_discard_the_active_workout_session"), [{
      text: i18n.t("ui.keep_training"),
      style: 'cancel'
    }, {
      text: i18n.t("ui.cancel_workout_2"),
      style: 'destructive',
      onPress: async () => {
        try {
          const {
            data
          } = await authFetch(`/api/workouts/session/${session.id}`, {
            method: 'DELETE'
          });
          if (data.success) {
            await clearLocalDraft(session.id);
            minimizeSession({
              persistDraft: false
            });
          } else {
            Alert.alert(i18n.t("ui.error"), data.message || i18n.t("ui.failed_to_cancel_workout"));
          }
        } catch (error) {
          console.error('Error cancelling workout:', error);
          Alert.alert(i18n.t("ui.error"), error.message || i18n.t("ui.failed_to_cancel_workout"));
        }
      }
    }]);
  };
  const renderSet = (exerciseLog, setLog, index) => {
    const draft = setDrafts[setLog.localId] || {
      reps: '',
      weight: ''
    };
    const totalSets = exerciseLog.sets?.length || 0;
    return <View key={setLog.localId} style={styles.setRow}>
        <View style={styles.setNumber}>
          <Text style={styles.setNumberText}>{index + 1}</Text>
        </View>

        <TextInput style={styles.setInput} keyboardType="number-pad" value={draft.reps} onChangeText={value => updateDraft(setLog.localId, 'reps', value)} placeholder="0" placeholderTextColor="rgba(255,255,255,0.3)" />

        <TextInput style={styles.setInput} keyboardType="decimal-pad" value={draft.weight} onChangeText={value => updateDraft(setLog.localId, 'weight', value)} placeholder="-" placeholderTextColor="rgba(255,255,255,0.3)" />

        <TouchableOpacity onPress={() => removeSet(setLog, totalSets)} style={[styles.setRemoveButton, totalSets <= 1 && styles.disabledButton]} disabled={totalSets <= 1 || isMutating}>
          <Ionicons name="close" size={18} color={totalSets <= 1 ? "rgba(255,255,255,0.24)" : "#FF6B6B"} />
        </TouchableOpacity>
      </View>;
  };
  const renderExerciseLog = (exerciseLog, index) => <View key={exerciseLog.localId} style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseNumber}>
          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseInfo}>
          <Text selectable style={styles.exerciseName}>{exerciseLog.exercise_name}</Text>
          <Text style={styles.exerciseMeta}>{exerciseLog.sets?.length || 0}{i18n.t("ui.sets")}</Text>
        </View>
        <TouchableOpacity onPress={() => removeExercise(exerciseLog)} style={styles.exerciseActionButton} disabled={isMutating}>
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <View style={styles.setsHeader}>
        <View style={styles.setHeaderNumber} />
        <Text style={styles.setHeaderText}>{i18n.t("ui.reps")}</Text>
        <Text style={styles.setHeaderText}>{i18n.t("ui.weight")}</Text>
        <View style={styles.setHeaderAction} />
      </View>

      <View style={styles.setsList}>
        {(exerciseLog.sets || []).map((setLog, setIndex) => renderSet(exerciseLog, setLog, setIndex))}
      </View>

      <TouchableOpacity style={styles.addSetButton} onPress={() => addSet(exerciseLog)} disabled={isMutating}>
        <Ionicons name="add" size={18} color="#F5C842" />
        <Text style={styles.addSetButtonText}>{i18n.t("ui.add_set")}</Text>
      </TouchableOpacity>
    </View>;
  if (isLoading) {
    return <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={['#324640', '#263934']} style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#F5C842" />
            <Text style={styles.loadingText}>{i18n.t("ui.loading_active_workout")}</Text>
          </View>
        </LinearGradient>
      </View>;
  }
  if (!workout) {
    return <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={['#324640', '#263934']} style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{i18n.t("ui.no_active_workout_found")}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={minimizeSession}>
              <Text style={styles.primaryButtonText}>{i18n.t("ui.back_to_workouts")}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>;
  }
  return <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#334A43', '#253A34']} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={minimizeSession} style={styles.headerButton}>
            <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.t("ui.active_workout_2")}</Text>
          <TouchableOpacity onPress={cancelWorkout} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <MaterialCommunityIcons name="dumbbell" size={34} color="#2C3E50" />
              </View>
              <Text selectable style={styles.workoutName}>{workout.name}</Text>
              {workout.description ? <Text selectable style={styles.workoutDescription} numberOfLines={2}>{workout.description}</Text> : null}
            </View>

            <View style={styles.timerPanel}>
              <Text style={styles.timerLabel}>{i18n.t("ui.elapsed_time")}</Text>
              <Text style={styles.timerText}>{elapsedTime}</Text>
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{sessionTotals.exerciseCount}</Text>
                  <Text style={styles.metricLabel}>{i18n.t("ui.exercises")}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{sessionTotals.setCount}</Text>
                  <Text style={styles.metricLabel}>{i18n.t("ui.sets_2")}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{i18n.t("ui.session_log")}</Text>
                <Text style={styles.sectionMeta}>{i18n.t("ui.changes_here_only_affect_this_workout_session")}</Text>
              </View>
              <TouchableOpacity style={styles.addExerciseButton} onPress={openExerciseSelection} disabled={isMutating}>
                <Ionicons name="add" size={18} color="#2C3E50" />
                <Text style={styles.addExerciseButtonText}>{i18n.t("ui.add")}</Text>
              </TouchableOpacity>
            </View>

            {exerciseLogs.length ? <View style={styles.exerciseList}>
                {exerciseLogs.map(renderExerciseLog)}
              </View> : <View style={styles.emptyPlan}>
                <MaterialCommunityIcons name="dumbbell" size={32} color="rgba(255,255,255,0.34)" />
                <Text style={styles.emptyText}>{i18n.t("ui.no_exercises_logged_yet")}</Text>
                <TouchableOpacity style={styles.emptyAddButton} onPress={openExerciseSelection}>
                  <Text style={styles.emptyAddButtonText}>{i18n.t("ui.add_exercise")}</Text>
                </TouchableOpacity>
              </View>}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.completeButton} onPress={completeWorkout} disabled={isMutating}>
                <Ionicons name="checkmark-circle" size={24} color="#2C3E50" />
                <Text style={styles.completeButtonText}>{i18n.t("ui.finish_workout_2")}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>;
};
export default WorkoutSessionScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#253A34'
  },
  overlay: {
    flex: 1
  },
  keyboardView: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 15,
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)'
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800'
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 22
  },
  hero: {
    alignItems: 'center',
    gap: 10
  },
  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F5C842',
    alignItems: 'center',
    justifyContent: 'center'
  },
  workoutName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center'
  },
  workoutDescription: {
    color: 'rgba(255, 255, 255, 0.68)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  timerPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.2)'
  },
  timerLabel: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  timerText: {
    color: '#F5C842',
    fontSize: 50,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginTop: 4
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14
  },
  metric: {
    minWidth: 104,
    alignItems: 'center'
  },
  metricDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.14)'
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums']
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  sectionMeta: {
    color: 'rgba(255, 255, 255, 0.52)',
    fontSize: 12,
    marginTop: 3
  },
  addExerciseButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F5C842',
    borderRadius: 8,
    paddingHorizontal: 12
  },
  addExerciseButtonText: {
    color: '#2C3E50',
    fontSize: 13,
    fontWeight: '900'
  },
  exerciseList: {
    gap: 12
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 200, 66, 0.16)'
  },
  exerciseNumberText: {
    color: '#F5C842',
    fontSize: 13,
    fontWeight: '900'
  },
  exerciseInfo: {
    flex: 1
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  exerciseMeta: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 13,
    marginTop: 2
  },
  exerciseActionButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  setHeaderNumber: {
    width: 28
  },
  setHeaderText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.42)',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase'
  },
  setHeaderAction: {
    width: 28
  },
  setsList: {
    gap: 8
  },
  setRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)'
  },
  setNumberText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
    fontWeight: '800'
  },
  setInput: {
    flex: 1,
    minHeight: 44,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  setRemoveButton: {
    width: 28,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  disabledButton: {
    opacity: 0.55
  },
  addSetButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.35)',
    borderStyle: 'dashed'
  },
  addSetButtonText: {
    color: '#F5C842',
    fontSize: 14,
    fontWeight: '800'
  },
  emptyPlan: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 14
  },
  emptyAddButton: {
    backgroundColor: '#F5C842',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  emptyAddButtonText: {
    color: '#2C3E50',
    fontSize: 13,
    fontWeight: '900'
  },
  actions: {
    gap: 12
  },
  completeButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5C842',
    borderRadius: 8
  },
  completeButtonText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '900'
  },
  primaryButton: {
    backgroundColor: '#F5C842',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  primaryButtonText: {
    color: '#2C3E50',
    fontSize: 15,
    fontWeight: '800'
  }
});
