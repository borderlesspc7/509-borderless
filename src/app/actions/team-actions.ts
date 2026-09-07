"use server";

import { normalizeCareModalities, type CareModality } from "@/lib/care-modality";
import { requirePermission } from "@/lib/auth-guard";
import type { UserProfile } from "@/lib/auth";
import { isRole, normalizeRole, PERMISSIONS } from "@/lib/rbac";
import type { ProfessionalRole } from "@/lib/professionals-data";
import { PROFESSIONAL_ROLES } from "@/lib/professionals-data";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isMissingCareModalitiesColumn,
  omitCareModalities,
} from "@/lib/supabase/schema-compat";
import type { UserProfileRow } from "@/lib/supabase/database.types";
import { getProfileLabel } from "@/lib/user-profile";

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type TeamMember = {
  id: string;
  fullName: string;
  email: string | null;
  profile: UserProfile;
  profileLabel: string;
  professionalRole: string | null;
  professionalCouncil: string | null;
  careModalities: CareModality[];
  birthDate: string | null;
  cpf: string | null;
  status: "active" | "inactive";
  isMaster: boolean;
  avatarUrl: string | null;
  createdAt: string;
};

export type CreateTeamMemberInput = {
  fullName: string;
  email: string;
  password: string;
  profile: UserProfile;
  professionalRole?: ProfessionalRole | "";
  professionalCouncil?: string;
  cpf?: string;
  birthDate?: string;
  careModalities?: string[];
};

function isClinicalProfile(profile: UserProfile) {
  const role = normalizeRole(profile);
  return role === "AT1" || role === "AT2" || role === "SUPERVISOR" || role === "COORDENADOR";
}

function mapTeamMember(
  row: UserProfileRow,
  email: string | null = null
): TeamMember {
  const profile = normalizeRole(row.profile);

  return {
    id: row.id,
    fullName: row.full_name,
    email,
    profile,
    profileLabel: getProfileLabel(profile),
    professionalRole: row.professional_role,
    professionalCouncil: row.professional_council,
    careModalities: normalizeCareModalities(row.care_modalities),
    birthDate: row.birth_date ?? null,
    cpf: row.cpf ?? null,
    status: row.status ?? "active",
    isMaster: row.is_master,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
  };
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

async function loadUserEmailsByIds(userIds: string[]) {
  const emailByUserId = new Map<string, string>();

  if (userIds.length === 0) {
    return emailByUserId;
  }

  const adminClient = createAdminSupabaseClient();

  if (!adminClient) {
    return emailByUserId;
  }

  const remainingIds = new Set(userIds);
  let page = 1;

  while (remainingIds.size > 0) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error || !data.users.length) {
      break;
    }

    for (const user of data.users) {
      if (remainingIds.has(user.id) && user.email) {
        emailByUserId.set(user.id, user.email);
        remainingIds.delete(user.id);
      }
    }

    if (data.users.length < 1000) {
      break;
    }

    page += 1;
  }

  return emailByUserId;
}

async function mapTeamMembersWithEmails(rows: UserProfileRow[]) {
  const emailByUserId = await loadUserEmailsByIds(rows.map((row) => row.id));

  return rows.map((row) =>
    mapTeamMember(row, emailByUserId.get(row.id) ?? null)
  );
}

async function loadUserEmail(userId: string) {
  const adminClient = createAdminSupabaseClient();

  if (!adminClient) {
    return null;
  }

  const { data, error } = await adminClient.auth.admin.getUserById(userId);

  if (error || !data.user.email) {
    return null;
  }

  return data.user.email;
}

export async function listTeamMembersAction(): Promise<
  ActionResult<{ members: TeamMember[] }>
> {
  await requirePermission(PERMISSIONS.PROFESSIONALS_VIEW);

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { success: false, error: "Supabase não configurado." };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("full_name");

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: { members: await mapTeamMembersWithEmails(data ?? []) },
  };
}

export async function listProfessionalsAction(): Promise<
  ActionResult<{ professionals: TeamMember[] }>
> {
  const result = await listTeamMembersAction();

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const professionals = (result.data?.members ?? []).filter(
    (member) => member.profile !== "RECEPCAO"
  );

  return { success: true, data: { professionals } };
}

export async function getProfessionalAction(
  professionalId: string
): Promise<ActionResult<{ professional: TeamMember }>> {
  await requirePermission(PERMISSIONS.PROFESSIONALS_VIEW);

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { success: false, error: "Supabase não configurado." };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", professionalId)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "Profissional não encontrado." };
  }

  const email = await loadUserEmail(data.id);

  return { success: true, data: { professional: mapTeamMember(data, email) } };
}

export type UpdateProfessionalInput = {
  professionalId: string;
  fullName: string;
  cpf?: string;
  birthDate?: string;
  professionalRole?: string;
  professionalCouncil?: string;
  profile: UserProfile;
  careModalities?: string[];
};

export async function updateProfessionalAction(
  input: UpdateProfessionalInput
): Promise<ActionResult<{ professional: TeamMember }>> {
  await requirePermission(PERMISSIONS.TEAM_MANAGE);

  const fullName = input.fullName.trim();

  if (!fullName) {
    return { success: false, error: "Informe o nome do profissional." };
  }

  if (!isRole(input.profile)) {
    return { success: false, error: "Selecione um perfil válido." };
  }

  const profile = normalizeRole(input.profile);
  const professionalRole = normalizeOptionalText(input.professionalRole);

  if (
    professionalRole &&
    !PROFESSIONAL_ROLES.includes(professionalRole as ProfessionalRole)
  ) {
    return { success: false, error: "Selecione um cargo válido." };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { success: false, error: "Supabase não configurado." };
  }

  const professionalUpdate = {
    full_name: fullName,
    cpf: normalizeOptionalText(input.cpf),
    birth_date: normalizeOptionalText(input.birthDate),
    professional_role: professionalRole,
    professional_council: normalizeOptionalText(input.professionalCouncil),
    care_modalities: normalizeCareModalities(input.careModalities),
    profile,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from("user_profiles")
    .update(professionalUpdate)
    .eq("id", input.professionalId)
    .select("*")
    .single();

  if (error && isMissingCareModalitiesColumn(error.message)) {
    ({ data, error } = await supabase
      .from("user_profiles")
      .update(omitCareModalities(professionalUpdate))
      .eq("id", input.professionalId)
      .select("*")
      .single());
  }

  if (error || !data) {
    const message = error?.message ?? "";
    return {
      success: false,
      error:
        error?.code === "42501"
          ? "Sem permissão para editar profissionais."
          : message.includes("user_profiles_professional_role_check")
            ? "Cargo não aceito pelo banco. Execute supabase/apply-professional-roles.sql no SQL Editor do Supabase."
            : message || "Não foi possível atualizar o profissional.",
    };
  }

  const email = await loadUserEmail(data.id);

  return { success: true, data: { professional: mapTeamMember(data, email) } };
}

export async function toggleProfessionalStatusAction(
  professionalId: string
): Promise<ActionResult<{ professional: TeamMember }>> {
  await requirePermission(PERMISSIONS.TEAM_MANAGE);

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { success: false, error: "Supabase não configurado." };
  }

  const { data: currentProfessional, error: fetchError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", professionalId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!currentProfessional) {
    return { success: false, error: "Profissional não encontrado." };
  }

  if (currentProfessional.is_master) {
    return {
      success: false,
      error: "Não é possível alterar o status do usuário master.",
    };
  }

  const nextStatus =
    currentProfessional.status === "active" ? "inactive" : "active";

  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", professionalId)
    .select("*")
    .single();

  if (error) {
    return {
      success: false,
      error:
        error.code === "42501"
          ? "Sem permissão para alterar o status do profissional."
          : error.message,
    };
  }

  const email = await loadUserEmail(data.id);

  return { success: true, data: { professional: mapTeamMember(data, email) } };
}

export async function createTeamMemberAction(
  input: CreateTeamMemberInput
): Promise<ActionResult<{ member: TeamMember }>> {
  await requirePermission(PERMISSIONS.TEAM_MANAGE);

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const profile = normalizeRole(input.profile);

  if (!fullName || !email || !password) {
    return {
      success: false,
      error: "Preencha nome, e-mail e senha provisória.",
    };
  }

  if (!isRole(profile)) {
    return { success: false, error: "Selecione um perfil válido." };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: "A senha provisória deve ter pelo menos 8 caracteres.",
    };
  }

  if (
    isClinicalProfile(profile) &&
    input.professionalRole &&
    !PROFESSIONAL_ROLES.includes(input.professionalRole)
  ) {
    return { success: false, error: "Selecione um cargo clínico válido." };
  }

  const adminClient = createAdminSupabaseClient();

  if (!adminClient) {
    return {
      success: false,
      error:
        "Cadastro de equipe indisponível. Configure SUPABASE_SERVICE_ROLE_KEY no ambiente.",
    };
  }

  const { data: createdUser, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        profile,
        professional_council: input.professionalCouncil?.trim() || null,
      },
    });

  if (createError || !createdUser.user) {
    return {
      success: false,
      error: createError?.message ?? "Não foi possível criar o usuário.",
    };
  }

  const professionalRole =
    isClinicalProfile(profile) && input.professionalRole
      ? input.professionalRole
      : null;

  const professionalUpdate = {
    full_name: fullName,
    profile,
    professional_role: professionalRole,
    professional_council: input.professionalCouncil?.trim() || null,
    care_modalities: normalizeCareModalities(input.careModalities),
    cpf: normalizeOptionalText(input.cpf),
    birth_date: normalizeOptionalText(input.birthDate),
    updated_at: new Date().toISOString(),
  };

  let { data: profileRow, error: profileError } = await adminClient
    .from("user_profiles")
    .update(professionalUpdate)
    .eq("id", createdUser.user.id)
    .select("*")
    .single();

  if (profileError && isMissingCareModalitiesColumn(profileError.message)) {
    ({ data: profileRow, error: profileError } = await adminClient
      .from("user_profiles")
      .update(omitCareModalities(professionalUpdate))
      .eq("id", createdUser.user.id)
      .select("*")
      .single());
  }

  if (profileError || !profileRow) {
    const message = profileError?.message ?? "";
    return {
      success: false,
      error: message.includes("user_profiles_professional_role_check")
        ? "Cargo não aceito pelo banco. Execute supabase/apply-professional-roles.sql no SQL Editor do Supabase."
        : message ||
          "Usuário criado, mas o perfil não pôde ser atualizado.",
    };
  }

  return {
    success: true,
    data: { member: mapTeamMember(profileRow, email) },
  };
}
