import i18n from "../lib/i18n";
import CatalogListScreen from './_components/CatalogListScreen';
const ExercisesScreen = () => <CatalogListScreen title={i18n.t("ui.exercises")} endpoint="/api/exercises" detailRoute="/exercise-details" searchPlaceholder={i18n.t("ui.search_exercises")} emptyText={i18n.t("ui.no_exercises_available")} iconName="dumbbell" enableMuscleGroupFilter renderSubtext={item => {
  if (item.muscleGroups?.length) {
    return item.muscleGroups.map(group => group.name).join(', ');
  }
  return null;
}} />;
export default ExercisesScreen;
