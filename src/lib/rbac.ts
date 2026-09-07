import type { UserProfile } from "@/lib/auth";

export const ROLES = {
  ADMIN: "ADMIN",
  COLABORADOR: "COLABORADOR",
  COORDENADOR: "COORDENADOR",
  SUPERVISOR: "SUPERVISOR",
  RECEPCAO: "RECEPCAO",
  AT1: "AT1",
  AT2: "AT2",
  FAMILIA: "FAMILIA",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  AGENDA_VIEW: "agenda:view",
  AGENDA_MANAGE: "agenda:manage",
  AGENDA_SEARCH: "agenda:search",
  AGENDA_FORCE: "agenda:force",
  PATIENTS_VIEW: "patients:view",
  PATIENTS_MANAGE: "patients:manage",
  PROGRAMS_MANAGE: "programs:manage",
  PROFESSIONALS_VIEW: "professionals:view",
  ASSESSMENTS_VIEW: "assessments:view",
  CLINICAL_EVOLUTION_VIEW: "clinical_evolution:view",
  CLINICAL_EVOLUTION_MANAGE: "clinical_evolution:manage",
  CONVENTIONAL_EVOLUTION_VIEW: "conventional_evolution:view",
  CONVENTIONAL_EVOLUTION_MANAGE: "conventional_evolution:manage",
  DOCUMENT_TEMPLATES_VIEW: "document_templates:view",
  DOCUMENT_TEMPLATES_MANAGE: "document_templates:manage",
  REPORTS_VIEW: "reports:view",
  AUDIT_LOGS_VIEW: "audit_logs:view",
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",
  INTERNAL_MESSAGING: "internal_messaging:use",
  FINANCE_MANAGE: "finance:manage",
  TEAM_MANAGE: "team:manage",
  FAMILY_PORTAL_VIEW: "family_portal:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const LEGACY_ROLE_MAP: Record<string, Role> = {
  administracao: ROLES.ADMIN,
  administrador: ROLES.ADMIN,
  colaborador: ROLES.COLABORADOR,
  coordenador: ROLES.COORDENADOR,
  supervisor: ROLES.SUPERVISOR,
  recepcao: ROLES.RECEPCAO,
  at: ROLES.AT1,
};

const BASE_THERAPIST_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.AGENDA_VIEW,
  PERMISSIONS.PATIENTS_VIEW,
  PERMISSIONS.ASSESSMENTS_VIEW,
  PERMISSIONS.CLINICAL_EVOLUTION_VIEW,
  PERMISSIONS.DOCUMENT_TEMPLATES_VIEW,
  PERMISSIONS.DOCUMENT_TEMPLATES_MANAGE,
  PERMISSIONS.INTERNAL_MESSAGING,
] as const satisfies readonly Permission[];

const CLINICAL_EVOLUTION_EDITOR_PERMISSIONS = [
  PERMISSIONS.CLINICAL_EVOLUTION_MANAGE,
  PERMISSIONS.DOCUMENT_TEMPLATES_MANAGE,
  PERMISSIONS.FINANCE_MANAGE,
] as const satisfies readonly Permission[];

/** Colaborador: amplo acesso clínico, sem auditoria nem configurações administrativas. */
const COLABORADOR_PERMISSIONS = Object.values(PERMISSIONS).filter(
  (permission) =>
    permission !== PERMISSIONS.SETTINGS_VIEW &&
    permission !== PERMISSIONS.SETTINGS_MANAGE &&
    permission !== PERMISSIONS.AUDIT_LOGS_VIEW
);

const AT_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.AGENDA_VIEW,
  PERMISSIONS.PATIENTS_VIEW,
  PERMISSIONS.ASSESSMENTS_VIEW,
  PERMISSIONS.CLINICAL_EVOLUTION_VIEW,
  PERMISSIONS.CLINICAL_EVOLUTION_MANAGE,
  PERMISSIONS.DOCUMENT_TEMPLATES_VIEW,
  PERMISSIONS.DOCUMENT_TEMPLATES_MANAGE,
  PERMISSIONS.INTERNAL_MESSAGING,
] as const satisfies readonly Permission[];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // Recepção: cadastrar aprendizes + agendar na agenda dos profissionais
  [ROLES.RECEPCAO]: [
    PERMISSIONS.AGENDA_VIEW,
    PERMISSIONS.AGENDA_MANAGE,
    PERMISSIONS.PATIENTS_VIEW,
    PERMISSIONS.PATIENTS_MANAGE,
    PERMISSIONS.INTERNAL_MESSAGING,
  ],
  [ROLES.FAMILIA]: [PERMISSIONS.FAMILY_PORTAL_VIEW],
  // AT: coletas clínicas (evolução, sessões, checklists, relatórios)
  [ROLES.AT2]: [...AT_PERMISSIONS],
  [ROLES.AT1]: [...AT_PERMISSIONS],
  // Supervisor: quase tudo + programas; sem cadastro de aprendizes nem liberação de acesso
  [ROLES.SUPERVISOR]: [
    ...BASE_THERAPIST_PERMISSIONS,
    ...CLINICAL_EVOLUTION_EDITOR_PERMISSIONS,
    PERMISSIONS.PROGRAMS_MANAGE,
    PERMISSIONS.AGENDA_MANAGE,
    PERMISSIONS.AGENDA_SEARCH,
    PERMISSIONS.PROFESSIONALS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.CONVENTIONAL_EVOLUTION_VIEW,
    PERMISSIONS.CONVENTIONAL_EVOLUTION_MANAGE,
  ],
  // Coordenador: cadastra profissionais/aprendizes e agenda; restrito à própria área
  [ROLES.COORDENADOR]: [
    ...BASE_THERAPIST_PERMISSIONS,
    ...CLINICAL_EVOLUTION_EDITOR_PERMISSIONS,
    PERMISSIONS.PATIENTS_MANAGE,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.AGENDA_MANAGE,
    PERMISSIONS.AGENDA_SEARCH,
    PERMISSIONS.PROFESSIONALS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.CONVENTIONAL_EVOLUTION_VIEW,
    PERMISSIONS.CONVENTIONAL_EVOLUTION_MANAGE,
  ],
  // Colaborador: acesso clínico amplo (inclui agenda convencional), sem logs/configurações
  [ROLES.COLABORADOR]: COLABORADOR_PERMISSIONS,
  // Administrador: acesso geral
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
};

export const CLINICAL_ROLES = [
  ROLES.AT1,
  ROLES.AT2,
  ROLES.SUPERVISOR,
  ROLES.COORDENADOR,
] as const;

export const PROFESSIONAL_ROLES = [
  ROLES.AT1,
  ROLES.AT2,
  ROLES.SUPERVISOR,
  ROLES.COORDENADOR,
  ROLES.COLABORADOR,
  ROLES.ADMIN,
] as const;

export const RECEPCAO_HOME_PATH = "/agenda";

export const FAMILIA_HOME_PATH = "/portal-familia";

/** Prefixos liberados para o perfil Recepção (cadastro de aprendizes + agenda). */
export const RECEPCAO_ALLOWED_PATH_PREFIXES = [
  "/agenda",
  "/chat",
  "/dashboard/pacientes",
  "/paciente",
  "/painel-chamada",
] as const;

export const FAMILIA_ALLOWED_PATHS = [FAMILIA_HOME_PATH] as const;

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/agenda": PERMISSIONS.AGENDA_VIEW,
  "/agenda/configuracoes": PERMISSIONS.AGENDA_MANAGE,
  "/painel-chamada": PERMISSIONS.AGENDA_MANAGE,
  "/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/dashboard/busca-agenda": PERMISSIONS.AGENDA_SEARCH,
  "/prontuario": PERMISSIONS.PATIENTS_VIEW,
  "/paciente": PERMISSIONS.PATIENTS_VIEW,
  "/dashboard/pacientes": PERMISSIONS.PATIENTS_VIEW,
  "/dashboard/pacientes/novo": PERMISSIONS.PATIENTS_MANAGE,
  "/dashboard/prontuario-master": PERMISSIONS.PATIENTS_VIEW,
  "/dashboard/profissionais": PERMISSIONS.PROFESSIONALS_VIEW,
  "/dashboard/equipe-terapeutica": PERMISSIONS.PROFESSIONALS_VIEW,
  "/dashboard/avaliacoes": PERMISSIONS.ASSESSMENTS_VIEW,
  "/dashboard/programas": PERMISSIONS.PROGRAMS_MANAGE,
  "/dashboard/programas/novo": PERMISSIONS.PROGRAMS_MANAGE,
  "/dashboard/programacoes": PERMISSIONS.ASSESSMENTS_VIEW,
  "/dashboard/avaliacoes/aplicar": PERMISSIONS.ASSESSMENTS_VIEW,
  "/evolucao": PERMISSIONS.CLINICAL_EVOLUTION_VIEW,
  "/dashboard/evolucao": PERMISSIONS.CLINICAL_EVOLUTION_VIEW,
  "/dashboard/orientacoes-familia": PERMISSIONS.CLINICAL_EVOLUTION_VIEW,
  "/agenda-convencional": PERMISSIONS.CONVENTIONAL_EVOLUTION_VIEW,
  "/dashboard/evolucao-convencional": PERMISSIONS.CONVENTIONAL_EVOLUTION_VIEW,
  "/dashboard/nutricao": PERMISSIONS.PATIENTS_VIEW,
  "/dashboard/modelos": PERMISSIONS.DOCUMENT_TEMPLATES_VIEW,
  "/dashboard/relatorios": PERMISSIONS.REPORTS_VIEW,
  "/dashboard/auditoria": PERMISSIONS.AUDIT_LOGS_VIEW,
  "/chat": PERMISSIONS.INTERNAL_MESSAGING,
  "/dashboard/empresa": PERMISSIONS.SETTINGS_MANAGE,
  "/configuracoes": PERMISSIONS.SETTINGS_MANAGE,
  "/dashboard/configuracoes": PERMISSIONS.SETTINGS_MANAGE,
  "/em-desenvolvimento": PERMISSIONS.DASHBOARD_VIEW,
  "/portal-familia": PERMISSIONS.FAMILY_PORTAL_VIEW,
};

export const CLINICAL_EVOLUTION_EDITOR_ROLES = [
  ROLES.ADMIN,
  ROLES.COLABORADOR,
  ROLES.COORDENADOR,
  ROLES.SUPERVISOR,
  ROLES.AT1,
  ROLES.AT2,
] as const satisfies readonly Role[];

export const REPORTS_SUPERVISOR_ROLES = [
  ROLES.ADMIN,
  ROLES.COLABORADOR,
  ROLES.COORDENADOR,
  ROLES.SUPERVISOR,
] as const satisfies readonly Role[];

/** Admin, Colaborador e Supervisor veem todas as áreas; Coordenador fica restrito à sua. */
export function canSeeAllClinicalAreas(
  profile: UserProfile | string,
  isMaster = false
) {
  if (isMaster) {
    return true;
  }

  const role = normalizeRole(profile);
  return (
    role === ROLES.ADMIN ||
    role === ROLES.COLABORADOR ||
    role === ROLES.SUPERVISOR
  );
}

export function canAccessClinicalReports(
  profile: UserProfile | string,
  isMaster = false
) {
  if (isMaster) {
    return true;
  }

  const role = normalizeRole(profile);
  return (REPORTS_SUPERVISOR_ROLES as readonly Role[]).includes(role);
}

export function canManageClinicSettings(
  profile: UserProfile | string,
  isMaster = false
) {
  if (isMaster) {
    return true;
  }

  const role = normalizeRole(profile);
  return role === ROLES.ADMIN || role === ROLES.COLABORADOR;
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function isRole(value: string): value is Role {
  return Object.values(ROLES).includes(value as Role);
}

export function normalizeRole(profile: UserProfile | string): Role {
  if (isRole(profile)) {
    return profile;
  }

  return LEGACY_ROLE_MAP[profile] ?? ROLES.RECEPCAO;
}

export function hasPermission(
  profile: UserProfile | string,
  permission: Permission,
  isMaster = false
) {
  if (isMaster) {
    return true;
  }

  const role = normalizeRole(profile);
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissionsForRole(
  profile: UserProfile | string,
  isMaster = false
): readonly Permission[] {
  if (isMaster) {
    return Object.values(PERMISSIONS);
  }

  return ROLE_PERMISSIONS[normalizeRole(profile)];
}

export function isReceptionAllowedPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);

  return (RECEPCAO_ALLOWED_PATH_PREFIXES as readonly string[]).some(
    (route) =>
      normalizedPath === route || normalizedPath.startsWith(`${route}/`)
  );
}

export function isFamilyAllowedPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);

  return (FAMILIA_ALLOWED_PATHS as readonly string[]).includes(normalizedPath);
}

export function getHomePathForProfile(profile: UserProfile | string) {
  if (isFamilyOnlyRole(profile)) {
    return FAMILIA_HOME_PATH;
  }

  if (isReceptionOnlyRole(profile)) {
    return RECEPCAO_HOME_PATH;
  }

  return "/dashboard";
}

export function getAccessDeniedRedirectPath(profile: UserProfile | string) {
  return `${getHomePathForProfile(profile)}?acesso=negado`;
}

export function getRoutePermission(pathname: string): Permission | null {
  const normalizedPath = normalizePathname(pathname);

  const matchedRoute = Object.keys(ROUTE_PERMISSIONS)
    .sort((left, right) => right.length - left.length)
    .find(
      (route) =>
        normalizedPath === route || normalizedPath.startsWith(`${route}/`)
    );

  return matchedRoute ? ROUTE_PERMISSIONS[matchedRoute] : null;
}

export function canAccessRoute(
  pathname: string,
  profile: UserProfile | string,
  isMaster = false
) {
  if (isMaster) {
    return true;
  }

  const role = normalizeRole(profile);
  const normalizedPath = normalizePathname(pathname);

  if (role === ROLES.FAMILIA && !isFamilyAllowedPath(pathname)) {
    return false;
  }

  if (role !== ROLES.FAMILIA && isFamilyAllowedPath(pathname)) {
    return false;
  }

  if (role === ROLES.RECEPCAO && !isReceptionAllowedPath(pathname)) {
    return false;
  }

  if (
    normalizedPath === "/dashboard/relatorios" ||
    normalizedPath.startsWith("/dashboard/relatorios/")
  ) {
    return canAccessClinicalReports(profile, isMaster);
  }

  const permission = getRoutePermission(pathname);

  if (!permission) {
    return role !== ROLES.RECEPCAO || isReceptionAllowedPath(pathname);
  }

  return hasPermission(profile, permission, isMaster);
}

export function canEditClinicalEvolutionRecords(
  profile: UserProfile | string,
  isMaster = false
) {
  if (isMaster) {
    return true;
  }

  const role = normalizeRole(profile);
  return (CLINICAL_EVOLUTION_EDITOR_ROLES as readonly Role[]).includes(role);
}

export function isReceptionOnlyRole(profile: UserProfile | string) {
  return normalizeRole(profile) === ROLES.RECEPCAO;
}

export function isFamilyOnlyRole(profile: UserProfile | string) {
  return normalizeRole(profile) === ROLES.FAMILIA;
}

export function isClinicalRole(profile: UserProfile | string) {
  const role = normalizeRole(profile);
  return (CLINICAL_ROLES as readonly Role[]).includes(role);
}

export function canManagePatients(
  profile: UserProfile | string,
  isMaster = false
) {
  return hasPermission(profile, PERMISSIONS.PATIENTS_MANAGE, isMaster);
}

export function canManagePrograms(
  profile: UserProfile | string,
  isMaster = false
) {
  return hasPermission(profile, PERMISSIONS.PROGRAMS_MANAGE, isMaster);
}

export function canManageTeamAccess(
  profile: UserProfile | string,
  isMaster = false
) {
  return hasPermission(profile, PERMISSIONS.TEAM_MANAGE, isMaster);
}
