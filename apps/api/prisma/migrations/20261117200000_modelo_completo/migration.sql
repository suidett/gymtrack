-- ─────────────────────────────────────────────────────────────────────────────
-- Modelo de datos completo del PRD (§Datos) · Zona: Datos (API)
-- Generada con `prisma migrate diff` desde el esquema de cuentas hasta prisma/schema.prisma.
-- No toca users, refresh_tokens, password_resets ni push_tokens (solo les cuelga claves foráneas).
-- Al final van las reglas que Prisma no sabe escribir en el esquema (CHECK). Prisma no las
-- compara, así que no aparecen como diferencia en `migrate diff`.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "estado_vinculo" AS ENUM ('invitado', 'activo', 'terminado');

-- CreateEnum
CREATE TYPE "patron" AS ENUM ('empuje', 'tiron', 'rodilla', 'cadera', 'core', 'aislamiento');

-- CreateEnum
CREATE TYPE "tipo_carga" AS ENUM ('kg', 'peso_corporal', 'tiempo');

-- CreateEnum
CREATE TYPE "tipo_media" AS ENUM ('video', 'foto');

-- CreateEnum
CREATE TYPE "metodo_progresion" AS ENUM ('doble_progresion', 'lineal', 'porcentual', 'por_rm', 'descendentes', 'cluster');

-- CreateEnum
CREATE TYPE "estado_rutina" AS ENUM ('borrador', 'activa', 'archivada');

-- CreateEnum
CREATE TYPE "esquema_serie" AS ENUM ('normal', 'descendente', 'cluster');

-- CreateEnum
CREATE TYPE "estado_sesion" AS ENUM ('en_curso', 'cerrada', 'descartada');

-- CreateEnum
CREATE TYPE "tipo_observacion" AS ENUM ('observacion', 'dolor', 'consejo');

-- CreateEnum
CREATE TYPE "tipo_foto" AS ENUM ('frente', 'lado', 'espalda');

-- CreateEnum
CREATE TYPE "tipo_record" AS ENUM ('peso_max', 'e1rm', 'reps_con_peso', 'volumen_sesion', 'reps', 'tiempo');

-- CreateEnum
CREATE TYPE "estado_sugerencia" AS ENUM ('pendiente', 'aplicada', 'sobrescrita');

-- CreateEnum
CREATE TYPE "tipo_alerta" AS ENUM ('estancamiento', 'baja_rendimiento', 'sin_sesiones', 'dolor');

-- CreateEnum
CREATE TYPE "estado_alerta" AS ENUM ('nueva', 'vista', 'resuelta');

-- CreateEnum
CREATE TYPE "motivo_baja" AS ENUM ('sueno', 'estres', 'alimentacion', 'lesion', 'tiempo', 'otro');

-- CreateTable
CREATE TABLE "client_profiles" (
    "user_id" UUID NOT NULL,
    "trainer_id" UUID,
    "fecha_nacimiento" DATE,
    "altura_cm" DOUBLE PRECISION,
    "objetivo" TEXT,
    "experiencia" TEXT,
    "dias_semana" INTEGER,
    "lugar" TEXT,
    "minutos_sesion" INTEGER,
    "lesiones" JSONB,
    "rutina_activa_id" UUID,
    "consentimiento_salud_at" TIMESTAMPTZ(3),
    "consentimiento_fotos_at" TIMESTAMPTZ(3),
    "politica_version" TEXT,
    "recordatorio_activo" BOOLEAN NOT NULL DEFAULT true,
    "recordatorio_hora" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "trainer_clients" (
    "id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "client_id" UUID,
    "estado" "estado_vinculo" NOT NULL DEFAULT 'invitado',
    "codigo" TEXT NOT NULL,
    "codigo_vence_at" TIMESTAMPTZ(3) NOT NULL,
    "aceptado_at" TIMESTAMPTZ(3),
    "terminado_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trainer_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "respuestas" JSONB NOT NULL,
    "completada_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL,
    "owner_id" UUID,
    "slug" TEXT,
    "nombre" TEXT NOT NULL,
    "grupo_muscular" TEXT NOT NULL,
    "equipo" TEXT NOT NULL,
    "patron" "patron" NOT NULL,
    "tipo_carga" "tipo_carga" NOT NULL,
    "incremento_default_kg" DOUBLE PRECISION NOT NULL,
    "instrucciones" TEXT,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_media" (
    "id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "tipo" "tipo_media" NOT NULL,
    "url" TEXT,
    "storage_key" TEXT,
    "bytes" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "subida_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "client_id" UUID,
    "origen_id" UUID,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "semanas" INTEGER NOT NULL,
    "metodo_progresion" "metodo_progresion" NOT NULL DEFAULT 'doble_progresion',
    "estado" "estado_rutina" NOT NULL DEFAULT 'borrador',
    "version" INTEGER NOT NULL DEFAULT 1,
    "activada_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_days" (
    "id" UUID NOT NULL,
    "routine_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "dia_semana" INTEGER,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_exercises" (
    "id" UUID NOT NULL,
    "routine_day_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL,
    "series" INTEGER NOT NULL,
    "reps_min" INTEGER NOT NULL,
    "reps_max" INTEGER NOT NULL,
    "rir_objetivo" INTEGER NOT NULL DEFAULT 2,
    "descanso_s" INTEGER NOT NULL DEFAULT 90,
    "incremento_kg" DOUBLE PRECISION NOT NULL,
    "peso_inicial_kg" DOUBLE PRECISION,
    "esquema" "esquema_serie" NOT NULL DEFAULT 'normal',
    "grupo_superserie" TEXT,
    "nota_entrenador" TEXT,
    "porcentajes_semana" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "objetivo_rm" INTEGER,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "routine_id" UUID,
    "routine_day_id" UUID,
    "routine_version" INTEGER,
    "iniciada_at" TIMESTAMPTZ(3) NOT NULL,
    "cerrada_at" TIMESTAMPTZ(3),
    "estado" "estado_sesion" NOT NULL DEFAULT 'en_curso',
    "duracion_s" INTEGER,
    "volumen_kg" DOUBLE PRECISION,
    "kcal_estimadas" DOUBLE PRECISION,
    "observacion" TEXT,
    "dolor_general" JSONB,
    "device_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sets" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "routine_exercise_id" UUID,
    "exercise_id" UUID NOT NULL,
    "serie_n" INTEGER NOT NULL,
    "peso_kg" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "rir" INTEGER,
    "rpe" DOUBLE PRECISION,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "fallo" BOOLEAN NOT NULL DEFAULT false,
    "tiempo_s" INTEGER,
    "descanso_real_s" INTEGER,
    "e1rm" DOUBLE PRECISION,
    "nota" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "tipo" "tipo_observacion" NOT NULL,
    "exercise_id" UUID,
    "session_id" UUID,
    "set_id" UUID,
    "routine_id" UUID,
    "texto" TEXT NOT NULL,
    "dolor_zona" TEXT,
    "dolor_intensidad" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_metrics" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "peso_kg" DOUBLE PRECISION,
    "cintura_cm" DOUBLE PRECISION,
    "cadera_cm" DOUBLE PRECISION,
    "pecho_cm" DOUBLE PRECISION,
    "brazo_cm" DOUBLE PRECISION,
    "muslo_cm" DOUBLE PRECISION,
    "grasa_pct" DOUBLE PRECISION,
    "nota" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "body_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_photos" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "tipo_foto" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "bytes" INTEGER,
    "subida_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "tipo" "tipo_record" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "set_id" UUID,
    "session_id" UUID,
    "fecha" TIMESTAMPTZ(3) NOT NULL,
    "superado_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progression_suggestions" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "routine_exercise_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "metodo" "metodo_progresion" NOT NULL,
    "sugerencia" JSONB NOT NULL,
    "texto" TEXT NOT NULL,
    "motivo" TEXT,
    "estado" "estado_sugerencia" NOT NULL DEFAULT 'pendiente',
    "sobrescrita_por" UUID,
    "sobrescrita_at" TIMESTAMPTZ(3),
    "valor_final" JSONB,
    "aplicada_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "progression_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "trainer_id" UUID,
    "tipo" "tipo_alerta" NOT NULL,
    "exercise_id" UUID,
    "detalle" JSONB NOT NULL DEFAULT '{}',
    "estado" "estado_alerta" NOT NULL DEFAULT 'nueva',
    "vista_at" TIMESTAMPTZ(3),
    "resuelta_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_reports" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "alert_id" UUID NOT NULL,
    "motivos" "motivo_baja"[],
    "comentario" TEXT,
    "consejos_mostrados" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drop_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tips" (
    "id" UUID NOT NULL,
    "motivo" "motivo_baja" NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "tips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_rutina_activa_id_key" ON "client_profiles"("rutina_activa_id");

-- CreateIndex
CREATE INDEX "client_profiles_trainer_id_idx" ON "client_profiles"("trainer_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_clients_codigo_key" ON "trainer_clients"("codigo");

-- CreateIndex
CREATE INDEX "trainer_clients_trainer_id_estado_idx" ON "trainer_clients"("trainer_id", "estado");

-- CreateIndex
CREATE INDEX "trainer_clients_client_id_estado_idx" ON "trainer_clients"("client_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_clients_un_activo_por_alumno" ON "trainer_clients"("client_id") WHERE (estado = 'activo');

-- CreateIndex
CREATE INDEX "survey_responses_client_id_completada_at_idx" ON "survey_responses"("client_id", "completada_at");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_slug_key" ON "exercises"("slug");

-- CreateIndex
CREATE INDEX "exercises_owner_id_idx" ON "exercises"("owner_id");

-- CreateIndex
CREATE INDEX "exercises_grupo_muscular_idx" ON "exercises"("grupo_muscular");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_media_storage_key_key" ON "exercise_media"("storage_key");

-- CreateIndex
CREATE INDEX "exercise_media_exercise_id_orden_idx" ON "exercise_media"("exercise_id", "orden");

-- CreateIndex
CREATE INDEX "routines_owner_id_idx" ON "routines"("owner_id");

-- CreateIndex
CREATE INDEX "routines_client_id_estado_idx" ON "routines"("client_id", "estado");

-- CreateIndex
CREATE INDEX "routine_days_routine_id_orden_idx" ON "routine_days"("routine_id", "orden");

-- CreateIndex
CREATE INDEX "routine_exercises_routine_day_id_orden_idx" ON "routine_exercises"("routine_day_id", "orden");

-- CreateIndex
CREATE INDEX "routine_exercises_exercise_id_idx" ON "routine_exercises"("exercise_id");

-- CreateIndex
CREATE INDEX "workout_sessions_client_id_cerrada_at_idx" ON "workout_sessions"("client_id", "cerrada_at");

-- CreateIndex
CREATE INDEX "workout_sessions_routine_day_id_idx" ON "workout_sessions"("routine_day_id");

-- CreateIndex
CREATE UNIQUE INDEX "workout_sessions_un_en_curso_por_alumno" ON "workout_sessions"("client_id") WHERE (estado = 'en_curso');

-- CreateIndex
CREATE INDEX "workout_sets_session_id_idx" ON "workout_sets"("session_id");

-- CreateIndex
CREATE INDEX "workout_sets_client_id_exercise_id_created_at_idx" ON "workout_sets"("client_id", "exercise_id", "created_at");

-- CreateIndex
CREATE INDEX "observations_client_id_created_at_idx" ON "observations"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "observations_session_id_idx" ON "observations"("session_id");

-- CreateIndex
CREATE INDEX "observations_exercise_id_idx" ON "observations"("exercise_id");

-- CreateIndex
CREATE INDEX "observations_routine_id_idx" ON "observations"("routine_id");

-- CreateIndex
CREATE UNIQUE INDEX "body_metrics_client_id_fecha_key" ON "body_metrics"("client_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "progress_photos_storage_key_key" ON "progress_photos"("storage_key");

-- CreateIndex
CREATE INDEX "progress_photos_client_id_fecha_idx" ON "progress_photos"("client_id", "fecha");

-- CreateIndex
CREATE INDEX "personal_records_client_id_exercise_id_idx" ON "personal_records"("client_id", "exercise_id");

-- CreateIndex
CREATE INDEX "personal_records_client_id_exercise_id_tipo_superado_at_idx" ON "personal_records"("client_id", "exercise_id", "tipo", "superado_at");

-- CreateIndex
CREATE INDEX "progression_suggestions_client_id_estado_idx" ON "progression_suggestions"("client_id", "estado");

-- CreateIndex
CREATE INDEX "progression_suggestions_routine_exercise_id_created_at_idx" ON "progression_suggestions"("routine_exercise_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "progression_suggestions_session_id_routine_exercise_id_key" ON "progression_suggestions"("session_id", "routine_exercise_id");

-- CreateIndex
CREATE INDEX "alerts_trainer_id_estado_idx" ON "alerts"("trainer_id", "estado");

-- CreateIndex
CREATE INDEX "alerts_client_id_estado_idx" ON "alerts"("client_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_un_abierta" ON "alerts"("client_id", "tipo", "exercise_id") WHERE (estado <> 'resuelta');

-- CreateIndex
CREATE UNIQUE INDEX "drop_reports_alert_id_key" ON "drop_reports"("alert_id");

-- CreateIndex
CREATE INDEX "drop_reports_client_id_idx" ON "drop_reports"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "tips_motivo_orden_key" ON "tips"("motivo", "orden");

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_rutina_activa_id_fkey" FOREIGN KEY ("rutina_activa_id") REFERENCES "routines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_clients" ADD CONSTRAINT "trainer_clients_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_clients" ADD CONSTRAINT "trainer_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_media" ADD CONSTRAINT "exercise_media_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_days" ADD CONSTRAINT "routine_days_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_routine_day_id_fkey" FOREIGN KEY ("routine_day_id") REFERENCES "routine_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_routine_day_id_fkey" FOREIGN KEY ("routine_day_id") REFERENCES "routine_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_routine_exercise_id_fkey" FOREIGN KEY ("routine_exercise_id") REFERENCES "routine_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "workout_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "workout_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_suggestions" ADD CONSTRAINT "progression_suggestions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_suggestions" ADD CONSTRAINT "progression_suggestions_routine_exercise_id_fkey" FOREIGN KEY ("routine_exercise_id") REFERENCES "routine_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_suggestions" ADD CONSTRAINT "progression_suggestions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_suggestions" ADD CONSTRAINT "progression_suggestions_sobrescrita_por_fkey" FOREIGN KEY ("sobrescrita_por") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_reports" ADD CONSTRAINT "drop_reports_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_reports" ADD CONSTRAINT "drop_reports_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Reglas que Prisma no escribe ─────────────────────────────────────────────
-- observations: al menos un destino (ejercicio, sesión, serie o rutina) e intensidad de 1 a 10.
ALTER TABLE "observations" ADD CONSTRAINT "observations_al_menos_un_destino"
  CHECK (num_nonnulls("exercise_id", "session_id", "set_id", "routine_id") >= 1);
ALTER TABLE "observations" ADD CONSTRAINT "observations_dolor_intensidad_rango"
  CHECK ("dolor_intensidad" IS NULL OR "dolor_intensidad" BETWEEN 1 AND 10);

-- routine_days: dia_semana ISO (1 lunes a 7 domingo) o nulo.
ALTER TABLE "routine_days" ADD CONSTRAINT "routine_days_dia_semana_rango"
  CHECK ("dia_semana" IS NULL OR "dia_semana" BETWEEN 1 AND 7);

-- trainer_clients: un vínculo activo siempre tiene alumno.
ALTER TABLE "trainer_clients" ADD CONSTRAINT "trainer_clients_activo_con_alumno"
  CHECK ("estado" <> 'activo' OR "client_id" IS NOT NULL);
