/**
 * Single icon surface for app code. Every icon import goes through here
 * (enforced by eslint no-restricted-imports), so the icon library is swappable
 * at runtime: each export is a thin wrapper that renders the active library's
 * version (Lucide default, Tabler/Phosphor lazy-loaded) and falls back to Lucide
 * until the chosen set's chunk arrives. Vendored shadcn primitives
 * (components/ui) import lucide directly and always stay Lucide.
 */
import {
  AlertCircle as LuAlertCircle,
  AlertTriangle as LuAlertTriangle,
  ArrowDown as LuArrowDown,
  ArrowUp as LuArrowUp,
  Bell as LuBell,
  BellOff as LuBellOff,
  Boxes as LuBoxes,
  Building2 as LuBuilding2,
  Check as LuCheck,
  CheckCircle2 as LuCheckCircle2,
  ChevronLeft as LuChevronLeft,
  ChevronRight as LuChevronRight,
  ChevronsLeft as LuChevronsLeft,
  ChevronsRight as LuChevronsRight,
  ChevronsUpDown as LuChevronsUpDown,
  Copy as LuCopy,
  Download as LuDownload,
  Eye as LuEye,
  EyeOff as LuEyeOff,
  Fingerprint as LuFingerprint,
  Github as LuGithub,
  Laptop as LuLaptop,
  LayoutDashboard as LuLayoutDashboard,
  Loader2 as LuLoader2,
  LogOut as LuLogOut,
  Mail as LuMail,
  Menu as LuMenu,
  Monitor as LuMonitor,
  Moon as LuMoon,
  MoreHorizontal as LuMoreHorizontal,
  Palette as LuPalette,
  Plus as LuPlus,
  Rocket as LuRocket,
  RotateCw as LuRotateCw,
  Search as LuSearch,
  Settings as LuSettings,
  ShieldAlert as LuShieldAlert,
  ShieldCheck as LuShieldCheck,
  SlidersHorizontal as LuSlidersHorizontal,
  Smartphone as LuSmartphone,
  Sparkles as LuSparkles,
  Sun as LuSun,
  Trash2 as LuTrash2,
  TriangleAlert as LuTriangleAlert,
  UserPlus as LuUserPlus,
  Users as LuUsers,
  X as LuX,
  XCircle as LuXCircle,
  Zap as LuZap,
} from 'lucide-react';
import { createElement } from 'react';

import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

import type { IconName } from './icon-names.ts';
import { useIconSet } from './icon-registry.ts';
import type { AppIcon, IconProps } from './icon-types.ts';

/** Default set — Lucide, in the main bundle (tree-shaken to these icons). */
const lucideIcons = {
  AlertCircle: LuAlertCircle,
  AlertTriangle: LuAlertTriangle,
  ArrowDown: LuArrowDown,
  ArrowUp: LuArrowUp,
  Bell: LuBell,
  BellOff: LuBellOff,
  Boxes: LuBoxes,
  Building2: LuBuilding2,
  Check: LuCheck,
  CheckCircle2: LuCheckCircle2,
  ChevronLeft: LuChevronLeft,
  ChevronRight: LuChevronRight,
  ChevronsLeft: LuChevronsLeft,
  ChevronsRight: LuChevronsRight,
  ChevronsUpDown: LuChevronsUpDown,
  Copy: LuCopy,
  Download: LuDownload,
  Eye: LuEye,
  EyeOff: LuEyeOff,
  Fingerprint: LuFingerprint,
  Github: LuGithub,
  Laptop: LuLaptop,
  LayoutDashboard: LuLayoutDashboard,
  Loader2: LuLoader2,
  LogOut: LuLogOut,
  Mail: LuMail,
  Menu: LuMenu,
  Monitor: LuMonitor,
  Moon: LuMoon,
  MoreHorizontal: LuMoreHorizontal,
  Palette: LuPalette,
  Plus: LuPlus,
  Rocket: LuRocket,
  RotateCw: LuRotateCw,
  Search: LuSearch,
  Settings: LuSettings,
  ShieldAlert: LuShieldAlert,
  ShieldCheck: LuShieldCheck,
  SlidersHorizontal: LuSlidersHorizontal,
  Smartphone: LuSmartphone,
  Sparkles: LuSparkles,
  Sun: LuSun,
  Trash2: LuTrash2,
  TriangleAlert: LuTriangleAlert,
  UserPlus: LuUserPlus,
  Users: LuUsers,
  X: LuX,
  XCircle: LuXCircle,
  Zap: LuZap,
} satisfies Record<IconName, AppIcon>;

/** A swappable icon: renders the active library's version, Lucide as fallback. */
function makeIcon(name: IconName): AppIcon {
  function Icon(props: IconProps) {
    const lib = useThemeStore((s) => s.iconLibrary);
    const set = useIconSet(lib);
    // eslint-disable-next-line security/detect-object-injection -- name is a fixed IconName key
    const Component = set?.[name] ?? lucideIcons[name];
    return createElement(Component, props);
  }
  Icon.displayName = name;
  return Icon;
}

export type { AppIcon, IconProps } from './icon-types.ts';
/** Back-compat alias — existing `icon: LucideIcon` props keep working. */
export type LucideIcon = AppIcon;

export const AlertCircle = makeIcon('AlertCircle');
export const AlertTriangle = makeIcon('AlertTriangle');
export const ArrowDown = makeIcon('ArrowDown');
export const ArrowUp = makeIcon('ArrowUp');
export const Bell = makeIcon('Bell');
export const BellOff = makeIcon('BellOff');
export const Boxes = makeIcon('Boxes');
export const Building2 = makeIcon('Building2');
export const Check = makeIcon('Check');
export const CheckCircle2 = makeIcon('CheckCircle2');
export const ChevronLeft = makeIcon('ChevronLeft');
export const ChevronRight = makeIcon('ChevronRight');
export const ChevronsLeft = makeIcon('ChevronsLeft');
export const ChevronsRight = makeIcon('ChevronsRight');
export const ChevronsUpDown = makeIcon('ChevronsUpDown');
export const Copy = makeIcon('Copy');
export const Download = makeIcon('Download');
export const Eye = makeIcon('Eye');
export const EyeOff = makeIcon('EyeOff');
export const Fingerprint = makeIcon('Fingerprint');
export const Github = makeIcon('Github');
export const Laptop = makeIcon('Laptop');
export const LayoutDashboard = makeIcon('LayoutDashboard');
export const Loader2 = makeIcon('Loader2');
export const LogOut = makeIcon('LogOut');
export const Mail = makeIcon('Mail');
export const Menu = makeIcon('Menu');
export const Monitor = makeIcon('Monitor');
export const Moon = makeIcon('Moon');
export const MoreHorizontal = makeIcon('MoreHorizontal');
export const Palette = makeIcon('Palette');
export const Plus = makeIcon('Plus');
export const Rocket = makeIcon('Rocket');
export const RotateCw = makeIcon('RotateCw');
export const Search = makeIcon('Search');
export const Settings = makeIcon('Settings');
export const ShieldAlert = makeIcon('ShieldAlert');
export const ShieldCheck = makeIcon('ShieldCheck');
export const SlidersHorizontal = makeIcon('SlidersHorizontal');
export const Smartphone = makeIcon('Smartphone');
export const Sparkles = makeIcon('Sparkles');
export const Sun = makeIcon('Sun');
export const Trash2 = makeIcon('Trash2');
export const TriangleAlert = makeIcon('TriangleAlert');
export const UserPlus = makeIcon('UserPlus');
export const Users = makeIcon('Users');
export const X = makeIcon('X');
export const XCircle = makeIcon('XCircle');
export const Zap = makeIcon('Zap');
