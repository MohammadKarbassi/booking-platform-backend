import {
  AirVent,
  Coffee,
  CookingPot,
  Flame,
  Heater,
  ParkingSquare,
  Sparkles,
  Sprout,
  Waves,
  Wifi,
  Beef,
} from "lucide-react";

const AMENITY_ICONS: Record<string, React.ElementType> = {
  pool: Waves,
  wifi: Wifi,
  parking: ParkingSquare,
  bbq: Beef,
  ac: AirVent,
  kitchen: CookingPot,
  fireplace: Flame,
  breakfast: Coffee,
  heating: Heater,
  yard: Sprout,
};

export const amenityIcon = (icon: string | null) => (icon && AMENITY_ICONS[icon]) || Sparkles;
