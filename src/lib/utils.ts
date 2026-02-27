import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combine des classes Tailwind sans conflit (style shadcn). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Libellés des rôles en français (affichage partout). */
const ROLE_LABELS_FR: Record<string, string> = {
  ADMIN: 'Administrateur',
  PRESIDENT: 'Président',
  SECRETARY_GENERAL: 'Secrétaire général',
  TREASURER: 'Trésorier',
  COMMISSIONER: 'Commissaire aux comptes',
  GENERAL_MEANS_MANAGER: 'Responsable moyens généraux',
  PLAYER: 'Membre',
  FORMER_PLAYER: 'Ancien membre',
  SUPPORTER: 'Supporter',
};

/** Retourne le libellé français du rôle (ou le rôle formaté si inconnu). */
export function roleLabelFr(role: string): string {
  return ROLE_LABELS_FR[role] ?? role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Libellé rôle + « Inactif (ancien membre) » si le membre ne paie pas sa cotisation. */
export function memberRoleLabel(role: string, isSuspended: boolean): string {
  const base = roleLabelFr(role);
  if (isSuspended) return `${base} — Inactif (ancien membre)`;
  return base;
}
