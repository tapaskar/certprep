import {
  Server,
  Zap,
  Container,
  Boxes,
  Hexagon,
  Database,
  HardDrive,
  FolderOpen,
  FolderTree,
  Archive,
  Layers,
  BarChart3,
  Network,
  Cable,
  Globe,
  Building2,
  DoorOpen,
  MessageSquare,
  Megaphone,
  Workflow,
  Waves,
  Shield,
  ShieldAlert,
  KeyRound,
  Lock,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "./aws-services-data";

// Map IconKey → Lucide component
const iconMap: Record<IconKey, LucideIcon> = {
  Server,
  Zap,
  Container,
  Boxes,
  Hexagon,
  Database,
  HardDrive,
  FolderOpen,
  FolderTree,
  Archive,
  Layers,
  BarChart3,
  Network,
  Cable,
  Globe,
  Building2,
  DoorOpen,
  MessageSquare,
  Megaphone,
  Workflow,
  Waves,
  Shield,
  ShieldAlert,
  KeyRound,
  Lock,
};

export function getServiceIcon(key: IconKey): LucideIcon {
  return iconMap[key] ?? Server;
}

interface ServiceIconProps {
  iconKey: IconKey;
  className?: string;
  strokeWidth?: number;
}

export function ServiceIcon({
  iconKey,
  className = "h-5 w-5",
  strokeWidth = 2,
}: ServiceIconProps) {
  const Icon = getServiceIcon(iconKey);
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
