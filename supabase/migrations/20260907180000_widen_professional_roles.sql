-- Alinha user_profiles.professional_role com src/lib/professionals-data.ts
-- Corrige: new row violates check constraint "user_profiles_professional_role_check"

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_professional_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_professional_role_check
  CHECK (
    professional_role IS NULL OR professional_role IN (
      'Psicólogo',
      'Psicólogo(a)',
      'Assistente Terapêutico (AT)',
      'Coordenador',
      'Fonoaudiólogo',
      'Fonoaudióloga',
      'Terapeuta Ocupacional',
      'Supervisor Administrativo',
      'Musicoterapeuta',
      'Neuropsicólogo',
      'Psicopedagoga',
      'Psicopedagogo',
      'Fisioterapeuta',
      'Nutricionista'
    )
  );
