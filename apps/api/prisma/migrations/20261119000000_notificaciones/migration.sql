-- ─────────────────────────────────────────────────────────────────────────────
-- Notificaciones dentro de la app · Zona: Datos (API)
--
-- notificaciones: lo que muestra la campana de Hoy (alumno) y de Clientes (entrenador). Cada
-- aviso de src/modulos/notificaciones deja una fila para quien lo recibe, con el mismo título y
-- texto del push y la ruta de la app que abre, aunque no tenga dispositivos, haya llegado al tope
-- de 2 push al día o el push falle. La clave es la del aviso (la misma de avisos_enviados): el
-- mismo aviso dos veces no deja dos filas. leida_at queda nulo hasta que la persona la toca o
-- marca todas. Se borra con la cuenta (ON DELETE CASCADE).
-- El índice (user_id, created_at DESC) sirve para la lista (lo último primero) y el contador.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "leida_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notificaciones_clave_key" ON "notificaciones"("clave");

-- CreateIndex
CREATE INDEX "notificaciones_user_id_created_at_idx" ON "notificaciones"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
