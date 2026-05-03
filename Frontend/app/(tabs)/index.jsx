import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from '../_context/AuthContext'

const COLORS = {
  background: '#3A4E48',
  card: 'rgba(255, 255, 255, 0.13)',
  muted: 'rgba(255, 255, 255, 0.62)',
  faint: 'rgba(255, 255, 255, 0.18)',
  text: '#F4F7F2',
  yellow: '#F1E985',
  yellowStrong: '#F5D85A',
  mint: '#C6E7DD',
  sage: '#A9CFC3',
  grid: 'rgba(255, 255, 255, 0.05)',
  danger: '#FF6B6B',
}

const DEFAULT_DASHBOARD = {
  goals: {
    calories: 1600,
    protein: 30,
    fat: 40,
    carbs: 30,
    weight: null,
    steps: 10000,
  },
  nutrition: {
    meals: [],
    caloriesFromMeals: 0,
    caloriesFromWorkouts: 0,
    caloriesRemaining: 1600,
    macros: {
      protein: { grams: 0, percent: 0 },
      fat: { grams: 0, percent: 0 },
      carbs: { grams: 0, percent: 0 },
    },
  },
  workouts: {
    total: 0,
    completedThisMonth: 0,
    caloriesBurned: 0,
    durationMinutes: 0,
  },
  steps: {
    today: 0,
    goal: 10000,
  },
  weight: {
    entries: [],
    latest: null,
    comparison: null,
    comparisonLabel: 'Weight month ago',
    change: null,
    goal: null,
    period: 'month',
    periodLabel: 'Month',
    unit: 'kg',
    rangeLabel: '',
  },
}

const calorieItems = [
  { label: 'Meals', key: 'caloriesFromMeals', icon: 'restaurant-outline', iconSet: 'ion' },
  { label: 'Workouts', key: 'caloriesFromWorkouts', icon: 'dumbbell', iconSet: 'material' },
  { label: 'Steps', key: 'steps', icon: 'shoe-print', iconSet: 'material' },
]

const macroDefinitions = [
  { key: 'protein', name: 'Protein', color: COLORS.mint },
  { key: 'fat', name: 'Fat', color: COLORS.yellowStrong },
  { key: 'carbs', name: 'Carbs', color: COLORS.sage },
]

const weightPeriods = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
]

const asNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const formatNumber = (value, digits = 0) => {
  const number = asNumber(value)
  return number.toFixed(digits).replace('.', ',')
}

const formatMinutes = (minutes) => {
  const totalMinutes = Math.max(0, Math.round(asNumber(minutes)))
  const hours = Math.floor(totalMinutes / 60)
  const remainder = totalMinutes % 60
  return `${hours}:${remainder.toString().padStart(2, '0')}h`
}

const formatDateLabel = (dateValue) => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`
}

const formatShortDateLabel = (date) => (
  date.toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
  })
)

const getWeightPeriodRangeLabel = (period) => {
  const endDate = new Date()
  const startDate = new Date(endDate)

  if (period === 'week') {
    startDate.setDate(startDate.getDate() - 7)
  } else if (period === 'year') {
    startDate.setFullYear(startDate.getFullYear() - 1)
  } else {
    startDate.setMonth(startDate.getMonth() - 1)
  }

  return `${formatShortDateLabel(startDate)} - ${formatShortDateLabel(endDate)}`
}

const getChartDateLabels = (entries) => {
  if (entries.length <= 3) {
    return entries.map((entry, index) => ({
      index,
      label: formatDateLabel(entry.date || entry.created_at),
    })).filter((entry) => entry.label)
  }

  const labelIndexes = new Set([0, Math.floor((entries.length - 1) / 2), entries.length - 1])
  return [...labelIndexes].sort((a, b) => a - b).map((index) => ({
    index,
    label: formatDateLabel(entries[index]?.date || entries[index]?.created_at),
  })).filter((entry) => entry.label)
}

const normalizeDashboard = (payload) => {
  const nextDashboard = {
    ...DEFAULT_DASHBOARD,
    ...payload,
    goals: {
      ...DEFAULT_DASHBOARD.goals,
      ...(payload?.goals || {}),
    },
    nutrition: {
      ...DEFAULT_DASHBOARD.nutrition,
      ...(payload?.nutrition || {}),
      macros: {
        ...DEFAULT_DASHBOARD.nutrition.macros,
        ...(payload?.nutrition?.macros || {}),
      },
    },
    workouts: {
      ...DEFAULT_DASHBOARD.workouts,
      ...(payload?.workouts || {}),
    },
    steps: {
      ...DEFAULT_DASHBOARD.steps,
      ...(payload?.steps || {}),
    },
    weight: {
      ...DEFAULT_DASHBOARD.weight,
      ...(payload?.weight || {}),
    },
  }

  const entries = (nextDashboard.weight.entries || [])
    .map((entry) => ({
      ...entry,
      date: entry?.date || entry?.created_at,
      weight: Number(entry?.weight),
    }))
    .filter((entry) => Number.isFinite(entry.weight))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const oldestEntry = entries[0]
  const latestEntry = entries[entries.length - 1]
  const latest = latestEntry?.weight ?? nextDashboard.weight.latest ?? null
  const comparison = oldestEntry?.weight ?? nextDashboard.weight.comparison ?? null

  return {
    ...nextDashboard,
    weight: {
      ...nextDashboard.weight,
      entries,
      latest,
      comparison,
      change: latest != null && comparison != null
        ? Number((latest - comparison).toFixed(1))
        : nextDashboard.weight.change ?? null,
      rangeLabel: nextDashboard.weight.rangeLabel || '',
    },
  }
}

const MetricIcon = ({ item, size = 18, color = COLORS.text }) => {
  if (item.iconSet === 'material') {
    return <MaterialCommunityIcons name={item.icon} size={size} color={color} />
  }

  return <Ionicons name={item.icon} size={size} color={color} />
}

const SegmentedRing = ({ progress, size, thickness, children }) => {
  const segmentCount = 70
  const radius = size / 2 - thickness / 2
  const activeSegments = Math.round(segmentCount * Math.max(0, Math.min(progress, 1)))

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: segmentCount }).map((_, index) => {
        const angle = (index / segmentCount) * Math.PI * 2 - Math.PI / 2
        const active = index < activeSegments
        const segmentLength = Math.max(3, (2 * Math.PI * radius) / segmentCount - 1)

        return (
          <View
            key={index}
            style={[
              styles.ringSegment,
              {
                width: segmentLength,
                height: thickness,
                borderRadius: thickness / 2,
                backgroundColor: active ? COLORS.yellow : COLORS.faint,
                left: size / 2 + Math.cos(angle) * radius - segmentLength / 2,
                top: size / 2 + Math.sin(angle) * radius - thickness / 2,
                transform: [{ rotate: `${(angle * 180) / Math.PI + 90}deg` }],
              },
            ]}
          />
        )
      })}
      <View style={styles.ringCenter}>{children}</View>
    </View>
  )
}

const MacroPie = ({ macros }) => (
  <View style={styles.pie}>
    <View style={[styles.pieHalf, styles.pieBottom]} />
    <View style={[styles.pieQuadrant, styles.pieTopLeft]} />
    <View style={[styles.pieQuadrant, styles.pieTopRight]} />
    <View style={styles.pieSeparatorVertical} />
    <View style={styles.pieHub} />
    <Text selectable style={[styles.pieText, styles.pieTextLeft]}>{macros.protein.percent}%</Text>
    <Text selectable style={[styles.pieText, styles.pieTextRight]}>{macros.carbs.percent}%</Text>
    <Text selectable style={[styles.pieText, styles.pieTextBottom]}>{macros.fat.percent}%</Text>
  </View>
)

const WeightChart = ({ width, entries }) => {
  const chartEntries = (entries || [])
    .map((entry) => ({
      ...entry,
      weight: Number(entry?.weight),
    }))
    .filter((entry) => Number.isFinite(entry.weight))
  const chartWidth = Math.max(260, Math.min(width - 56, 330))
  const chartHeight = 130
  const plotLeft = 30
  const plotWidth = chartWidth - plotLeft - 6

  if (!chartEntries.length) {
    return (
      <View style={[styles.chart, styles.emptyChart, { width: chartWidth, height: chartHeight + 42 }]}>
        <Text style={styles.emptyChartText}>No weight logs</Text>
      </View>
    )
  }

  const weights = chartEntries.map((entry) => asNumber(entry.weight))
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)
  const padding = Math.max(1, (maxWeight - minWeight) * 0.35)
  const minValue = Math.floor(minWeight - padding)
  const maxValue = Math.ceil(maxWeight + padding)
  const range = Math.max(1, maxValue - minValue)
  const points = chartEntries.map((entry, index) => {
    const x = chartEntries.length === 1 ? plotLeft + plotWidth / 2 : plotLeft + (index / (chartEntries.length - 1)) * plotWidth
    const y = ((maxValue - entry.weight) / range) * chartHeight
    return { x, y }
  })
  const axisLabels = [maxValue, Math.round((maxValue + minValue) / 2), minValue]
  const dateLabels = getChartDateLabels(chartEntries)

  return (
    <View style={[styles.chart, { width: chartWidth, height: chartHeight + 42 }]}>
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

      {[0.18, 0.39, 0.59, 0.79].map((position) => (
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

      {points.map((point, index) => (
        <View key={`point-${index}`} style={[styles.chartPoint, { left: point.x - 5, top: point.y - 5 }]} />
      ))}

      <View style={[styles.dotsRow, { left: plotLeft, top: chartHeight + 12, width: plotWidth }]}>
        {Array.from({ length: 28 }).map((_, index) => (
          <View key={index} style={[styles.dot, index % 7 === 0 && styles.bigDot]} />
        ))}
      </View>

      <View style={[styles.dateRow, { left: plotLeft, top: chartHeight + 24, width: plotWidth }]}>
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

const DashboardScreen = () => {
  const { width } = useWindowDimensions()
  const { authFetch, isAuthenticated } = useAuth()
  const [dashboard, setDashboard] = useState(DEFAULT_DASHBOARD)
  const [weightPeriod, setWeightPeriod] = useState('month')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const { data } = await authFetch(`/api/dashboard?weightPeriod=${encodeURIComponent(weightPeriod)}`)

      if (!data.success) {
        setError(data.message || 'Failed to fetch dashboard data')
        return
      }

      setDashboard(normalizeDashboard(data.data))
      
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [authFetch, isAuthenticated, weightPeriod])

  useFocusEffect(
    useCallback(() => {
      fetchDashboard()
    }, [fetchDashboard])
  )

  const calorieGoal = asNumber(dashboard.goals.calories, 1600)
  const caloriesRemaining = asNumber(dashboard.nutrition.caloriesRemaining)
  const ringProgress = calorieGoal ? caloriesRemaining / calorieGoal : 0
  const stepsToday = asNumber(dashboard.steps.today)
  const stepGoal = asNumber(dashboard.steps.goal, 10000)
  const stepProgress = stepGoal ? Math.min((stepsToday / stepGoal) * 100, 100) : 0
  const macros = dashboard.nutrition.macros
  const macroRows = macroDefinitions.map((item) => ({
    ...item,
    total: asNumber(macros[item.key]?.percent),
    goal: asNumber(dashboard.goals[item.key]),
  }))

  const latestWeight = dashboard.weight.latest
  const comparisonWeight = dashboard.weight.comparison
  const weightUnit = dashboard.weight.unit || 'kg'
  const weightRangeLabel = getWeightPeriodRangeLabel(dashboard.weight.period || weightPeriod)

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['rgba(58, 78, 72, 0.55)', 'rgba(58, 78, 72, 0.88)', 'rgba(58, 78, 72, 1)']}
        style={styles.overlay}
      >
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.yellow} />
            <Text style={styles.stateText}>Loading dashboard...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
            <Text selectable style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchDashboard} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.caloriesCard}>
              <View style={styles.calorieRingWrap}>
                <SegmentedRing progress={ringProgress} size={132} thickness={8}>
                  <Text selectable style={styles.ringValue}>{Math.round(caloriesRemaining)}</Text>
                  <Text style={styles.ringLabel}>Remaining</Text>
                </SegmentedRing>
              </View>

              <View style={styles.goalPanel}>
                <View style={styles.goalHeader}>
                  <Text style={styles.cardTitle}>Calories goal</Text>
                  <Text selectable style={styles.goalValue}>{Math.round(calorieGoal)}</Text>
                </View>
                <Text style={styles.goalFormula}>Remaining = Goal - Meals + Exercise</Text>

                <View style={styles.goalRows}>
                  {calorieItems.map((item) => {
                    const value = item.key === 'steps'
                      ? Math.round(stepsToday)
                      : Math.round(asNumber(dashboard.nutrition[item.key]))

                    return (
                      <View style={styles.goalRow} key={item.label}>
                        <View style={styles.goalLabelRow}>
                          <MetricIcon item={item} size={18} color={COLORS.text} />
                          <Text style={styles.goalLabel}>{item.label}</Text>
                        </View>
                        <Text selectable style={styles.goalNumber}>{value}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.statCard}>
                <View style={styles.statTitleRow}>
                  <MaterialCommunityIcons name="dumbbell" size={18} color={COLORS.text} />
                  <Text selectable style={styles.statBig}>{dashboard.workouts.completedThisMonth}</Text>
                  <Text style={styles.statName}>Workouts</Text>
                </View>
                <View style={styles.statLine}>
                  <MaterialCommunityIcons name="fire" size={17} color={COLORS.text} />
                  <Text selectable style={styles.statMuted}>{dashboard.workouts.caloriesBurned}</Text>
                </View>
                <View style={styles.statLine}>
                  <Ionicons name="time-outline" size={17} color={COLORS.text} />
                  <Text selectable style={styles.statMuted}>{formatMinutes(dashboard.workouts.durationMinutes)}</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statTitleRow}>
                  <MaterialCommunityIcons name="shoe-print" size={18} color={COLORS.text} />
                  <Text selectable style={styles.statBig}>{Math.round(stepsToday)}</Text>
                </View>
                <Text style={styles.statName}>Steps</Text>
                <Text style={styles.todayText}>Today</Text>
                <View style={styles.stepGoalRow}>
                  <Text style={styles.stepGoal}>Goal: {Math.round(stepGoal).toLocaleString('en-US').replace(',', ' ')} steps</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${stepProgress}%` }]} />
                </View>
              </View>
            </View>

            <View style={styles.macrosCard}>
              <View style={styles.macroVisual}>
                <MacroPie macros={macros} />
              </View>
              <View style={styles.macroPanel}>
                <View style={styles.macroHeader}>
                  <Text style={styles.cardTitle}>Macros</Text>
                  <Text style={styles.todayText}>Today</Text>
                </View>
                <View style={styles.macroTotals}>
                  <Text style={styles.macroSmallHeader}>Total</Text>
                  <Text style={[styles.macroSmallHeader, { color: COLORS.yellow }]}>Goal</Text>
                </View>
                {macroRows.map((item) => (
                  <View style={styles.macroRow} key={item.name}>
                    <View style={[styles.macroSwatch, { backgroundColor: item.color }]} />
                    <Text style={styles.macroName}>{item.name}</Text>
                    <Text selectable style={styles.macroTotal}>{item.total}%</Text>
                    <Text selectable style={styles.macroGoal}>{item.goal}%</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.weightCard}>
              <View style={styles.periodTabs}>
                {weightPeriods.map((period) => (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.periodTab,
                      weightPeriod === period.key && styles.periodTabActive,
                    ]}
                    onPress={() => setWeightPeriod(period.key)}
                  >
                    <Text style={[styles.periodText, weightPeriod === period.key && styles.periodActive]}>
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.weightHeader}>
                <View style={styles.weightTitleRow}>
                  <Ionicons name="scale-outline" size={16} color={COLORS.text} />
                  <Text style={styles.cardTitle}>Weight</Text>
                </View>
                <Text style={styles.weightRange}>{weightRangeLabel}</Text>
              </View>

              <WeightChart width={width} entries={dashboard.weight.entries || []} />

              <View style={styles.weightStats}>
                <View style={styles.weightStat}>
                  <Text selectable style={styles.weightValue}>
                    {latestWeight == null ? '--' : `${formatNumber(latestWeight, 1)} ${weightUnit}`}
                  </Text>
                  <Text style={styles.weightLabel}>Weight</Text>
                </View>
                <View style={styles.weightStat}>
                  <Text selectable style={styles.weightValue}>
                    {comparisonWeight == null ? '--' : `${formatNumber(comparisonWeight, 1)} ${weightUnit}`}
                  </Text>
                  <Text style={styles.weightLabel}>{`Weight ${weightPeriod} ago`}</Text>
                </View>
                <View style={styles.weightStat}>
                  <Text selectable style={styles.weightValue}>
                    {dashboard.weight.change == null ? '--' : `${formatNumber(dashboard.weight.change, 1)} ${weightUnit}`}
                  </Text>
                  <Text style={styles.weightLabel}>Weight changes</Text>
                </View>
                <View style={styles.weightStat}>
                  <Text selectable style={styles.weightValue}>
                    {dashboard.weight.goal == null ? '--' : `${formatNumber(dashboard.weight.goal, 0)} ${weightUnit}`}
                  </Text>
                  <Text style={styles.weightLabel}>Goal</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </LinearGradient>
    </View>
  )
}

export default DashboardScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  overlay: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  stateText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
  },
  caloriesCard: {
    minHeight: 172,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 15,
  },
  calorieRingWrap: {
    width: 132,
    alignItems: 'center',
  },
  ringSegment: {
    position: 'absolute',
  },
  ringCenter: {
    position: 'absolute',
    top: 18,
    right: 18,
    bottom: 18,
    left: 18,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 78, 72, 0.98)',
  },
  ringValue: {
    color: COLORS.text,
    fontFamily: 'RussoOne_400Regular',
    fontSize: 34,
    lineHeight: 38,
  },
  ringLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  goalPanel: {
    flex: 1,
    gap: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  goalValue: {
    color: COLORS.text,
    fontFamily: 'RussoOne_400Regular',
    fontSize: 17,
  },
  goalFormula: {
    color: 'rgba(255, 255, 255, 0.48)',
    fontSize: 9,
    fontWeight: '600',
  },
  goalRows: {
    gap: 9,
    paddingTop: 4,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  goalNumber: {
    color: COLORS.yellow,
    fontSize: 16,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 14,
  },
  statCard: {
    flex: 1,
    minHeight: 136,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 14,
  },
  statTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 27,
  },
  statBig: {
    color: COLORS.yellow,
    fontFamily: 'RussoOne_400Regular',
    fontSize: 28,
    lineHeight: 32,
  },
  statName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 11,
  },
  statMuted: {
    color: COLORS.text,
    fontSize: 15,
  },
  todayText: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 10,
    fontWeight: '600',
  },
  stepGoalRow: {
    paddingTop: 17,
  },
  stepGoal: {
    color: COLORS.text,
    fontSize: 13,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.yellow,
  },
  macrosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 150,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
    gap: 18,
  },
  macroVisual: {
    width: 122,
    alignItems: 'center',
  },
  pie: {
    width: 118,
    height: 118,
    borderRadius: 59,
    overflow: 'hidden',
    backgroundColor: COLORS.yellowStrong,
  },
  pieHalf: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    backgroundColor: COLORS.yellowStrong,
  },
  pieBottom: {
    transform: [{ skewY: '-8deg' }],
  },
  pieQuadrant: {
    position: 'absolute',
    top: 0,
    width: 59,
    height: 59,
  },
  pieTopLeft: {
    left: 0,
    backgroundColor: COLORS.mint,
  },
  pieTopRight: {
    right: 0,
    backgroundColor: COLORS.sage,
  },
  pieSeparatorVertical: {
    position: 'absolute',
    left: 58,
    top: 0,
    width: 2,
    height: 62,
    backgroundColor: 'rgba(58, 78, 72, 0.12)',
  },
  pieHub: {
    position: 'absolute',
    left: 53,
    top: 53,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#657B72',
  },
  pieText: {
    position: 'absolute',
    color: '#426058',
    fontSize: 12,
  },
  pieTextLeft: {
    left: 23,
    top: 31,
  },
  pieTextRight: {
    right: 22,
    top: 34,
  },
  pieTextBottom: {
    bottom: 24,
    alignSelf: 'center',
    color: '#627052',
  },
  macroPanel: {
    flex: 1,
  },
  macroHeader: {
    gap: 2,
  },
  macroTotals: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginBottom: 8,
  },
  macroSmallHeader: {
    color: COLORS.text,
    fontSize: 13,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 30,
  },
  macroSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  macroName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  macroTotal: {
    color: COLORS.muted,
    fontSize: 15,
    width: 40,
    textAlign: 'right',
  },
  macroGoal: {
    color: COLORS.yellow,
    fontSize: 15,
    width: 40,
    textAlign: 'right',
  },
  weightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  periodTabs: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  periodTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  periodText: {
    color: COLORS.muted,
    fontSize: 15,
  },
  periodActive: {
    color: COLORS.text,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 8,
  },
  weightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weightRange: {
    color: COLORS.muted,
    fontSize: 13,
  },
  chart: {
    alignSelf: 'center',
    marginTop: 6,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  chartGridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: COLORS.grid,
  },
  axisLabel: {
    position: 'absolute',
    left: -30,
    top: -8,
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9,
  },
  verticalGridLine: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: COLORS.grid,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.yellow,
  },
  chartPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.yellow,
    borderWidth: 2,
    borderColor: '#3A4E48',
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  bigDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateRow: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    color: 'rgba(255, 255, 255, 0.56)',
    fontSize: 9,
    minWidth: 42,
    textAlign: 'center',
  },
  dateLabelStart: {
    textAlign: 'left',
  },
  dateLabelEnd: {
    textAlign: 'right',
  },
  weightStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 26,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 26,
  },
  weightStat: {
    width: '50%',
    gap: 7,
  },
  weightValue: {
    color: COLORS.text,
    fontFamily: 'RussoOne_400Regular',
    fontSize: 22,
  },
  weightLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
})
