import { addIcons } from 'ionicons';
import {
  bicycleOutline,
  briefcaseOutline,
  cubeOutline,
  ellipsisHorizontalOutline,
  laptopOutline,
  megaphoneOutline,
  restaurantOutline,
  schoolOutline,
  sparklesOutline,
  storefrontOutline,
} from 'ionicons/icons';

/** Icons named in categories.icon (seed data). Standalone Ionic only renders registered icons. */
export function registerCategoryIcons(): void {
  addIcons({
    bicycleOutline,
    briefcaseOutline,
    cubeOutline,
    ellipsisHorizontalOutline,
    laptopOutline,
    megaphoneOutline,
    restaurantOutline,
    schoolOutline,
    sparklesOutline,
    storefrontOutline,
  });
}
