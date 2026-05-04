import i18n from "../lib/i18n";
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from './_context/AuthContext';
const MuscleGroupsScreen = () => {
  const router = useRouter();
  const {
    API_URL
  } = useAuth();
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchMuscleGroups = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/api/muscle-groups`, {
        headers: {
          Accept: 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || i18n.t("ui.failed_to_fetch_muscle_groups"));
        return;
      }
      setMuscleGroups(data.data || []);
    } catch (fetchError) {
      console.error('Error fetching muscle groups:', fetchError);
      setError(i18n.t("ui.could_not_connect_to_the_server"));
    } finally {
      setIsLoading(false);
    }
  };
  useFocusEffect(useCallback(() => {
    fetchMuscleGroups();
  }, []));
  const groupedMuscles = useMemo(() => [...muscleGroups].sort((first, second) => first.name.localeCompare(second.name)), [muscleGroups]);
  const renderItem = ({
    item
  }) => <View style={styles.itemRow}>
      <View style={styles.itemIcon}>
        <MaterialCommunityIcons name="arm-flex" size={22} color="#F5C842" />
      </View>
      <View style={styles.itemInfo}>
        <Text selectable style={styles.itemName}>{item.name}</Text>
        {item.description ? <Text selectable style={styles.itemDescription}>{item.description}</Text> : null}
      </View>
    </View>;
  return <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['rgba(58, 78, 72, 0.95)', 'rgba(58, 78, 72, 1)']} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{i18n.t("ui.muscle_groups")}</Text>
          <View style={styles.headerButton} />
        </View>

        {isLoading ? <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F5C842" />
            <Text style={styles.loadingText}>{i18n.t("ui.loading")}</Text>
          </View> : <FlatList data={groupedMuscles} keyExtractor={item => item.id.toString()} renderItem={renderItem} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic" ListHeaderComponent={<View style={styles.summary}>
                <Text selectable style={styles.summaryCount}>{groupedMuscles.length}</Text>
                <Text selectable style={styles.summaryLabel}>{i18n.t("ui.available_muscle_groups")}</Text>
              </View>} ListEmptyComponent={<View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="arm-flex" size={34} color="#F5C842" />
                <Text selectable style={styles.emptyText}>{error || i18n.t("ui.no_muscle_groups_available")}</Text>
                {error ? <TouchableOpacity style={styles.retryButton} onPress={fetchMuscleGroups} activeOpacity={0.72}>
                    <Text style={styles.retryButtonText}>{i18n.t("ui.retry")}</Text>
                  </TouchableOpacity> : null}
              </View>} />}
      </LinearGradient>
    </View>;
};
export default MuscleGroupsScreen;
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
    fontWeight: '700',
    textAlign: 'center'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 8
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 8
  },
  summaryCount: {
    color: '#F5C842',
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums']
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.66)',
    fontSize: 14,
    fontWeight: '600'
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 200, 66, 0.12)'
  },
  itemInfo: {
    flex: 1,
    gap: 3
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  itemDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.58)',
    lineHeight: 18
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 70,
    gap: 14
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#F5C842',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  retryButtonText: {
    color: '#2C3E50',
    fontSize: 14,
    fontWeight: '800'
  }
});
