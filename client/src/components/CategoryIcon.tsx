import {
  Briefcase,
  Car,
  Circle,
  Coffee,
  Dumbbell,
  Film,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  PiggyBank,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryIcon as IconName } from '@ledgerline/shared';

export const ICONS: Record<IconName, LucideIcon> = {
  home: Home,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  zap: Zap,
  'heart-pulse': HeartPulse,
  'shopping-bag': ShoppingBag,
  film: Film,
  plane: Plane,
  briefcase: Briefcase,
  laptop: Laptop,
  gift: Gift,
  'piggy-bank': PiggyBank,
  'graduation-cap': GraduationCap,
  dumbbell: Dumbbell,
  smartphone: Smartphone,
  coffee: Coffee,
  circle: Circle,
};

/** A category's icon on a tint of its own colour. */
export function CategoryIcon({ icon, color, size = 36 }: { icon: IconName; color: string; size?: number }) {
  const Icon = ICONS[icon] ?? Circle;
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, backgroundColor: `${color}1F`, color }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={2.2} />
    </span>
  );
}
