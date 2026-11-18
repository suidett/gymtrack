-- ─────────────────────────────────────────────────────────────────────────────
-- Ingreso con Google y avisos al celular · Zona: Datos (API)
--
-- 1. users.google_sub: el id estable de la cuenta de Google vinculada (POST /v1/auth/google).
--    Único: una cuenta de Google entra a una sola cuenta de GymTrack.
-- 2. push_tokens.tipo y push_tokens.destino_cifrado: el tipo de dispositivo (expo o web) y el
--    destino cifrado con AES-256-GCM. Las filas que el módulo notificaciones guardó antes con todo
--    en «plataforma» («<tipo>:<plataforma>:<destino cifrado>») pasan a sus columnas.
-- 3. avisos_enviados: el registro de cada aviso (tope de 2 push al día y «no repetir»), que la API
--    y el worker comparten.
-- ─────────────────────────────────────────────────────────────────────────────

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "google_sub" TEXT;

-- AlterTable
ALTER TABLE "push_tokens" ADD COLUMN     "destino_cifrado" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'expo';

-- Filas del formato provisorio «<tipo>:<plataforma>:<destino cifrado>».
UPDATE "push_tokens"
   SET "tipo" = split_part("plataforma", ':', 1),
       "destino_cifrado" = regexp_replace("plataforma", '^[^:]+:[^:]+:', ''),
       "plataforma" = split_part("plataforma", ':', 2)
 WHERE "plataforma" ~ '^(expo|web):(android|ios|web):.+';

-- CreateTable
CREATE TABLE "avisos_enviados" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "dia" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "cuenta_tope" BOOLEAN NOT NULL,
    "push_enviados" INTEGER NOT NULL DEFAULT 0,
    "push_fallidos" INTEGER NOT NULL DEFAULT 0,
    "correo" BOOLEAN NOT NULL DEFAULT false,
    "omitido" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_enviados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "avisos_enviados_clave_key" ON "avisos_enviados"("clave");

-- CreateIndex
CREATE INDEX "avisos_enviados_user_id_dia_idx" ON "avisos_enviados"("user_id", "dia");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- AddForeignKey
ALTER TABLE "avisos_enviados" ADD CONSTRAINT "avisos_enviados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
