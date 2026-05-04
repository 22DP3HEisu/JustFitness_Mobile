import i18n from "../lib/i18n";
import CatalogListScreen from './_components/CatalogListScreen';
const FoodsScreen = () => <CatalogListScreen title={i18n.t("ui.foods")} endpoint="/api/foods" detailRoute="/food-details" searchPlaceholder={i18n.t("ui.search_foods")} emptyText={i18n.t("ui.no_foods_available")} iconName="food-apple" renderSubtext={item => {
  if (item.calories_per_100g !== undefined) {
    return `${item.calories_per_100g} kcal / 100g`;
  }
  return null;
}} />;
export default FoodsScreen;
