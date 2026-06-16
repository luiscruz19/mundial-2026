-- Base de datos del Mundial 2026 en el MySQL COMPARTIDO (/opt/shared, contenedor mysql_db).
-- Convención del core: nombres en MAYÚSCULAS. Idempotente.
-- Aplicar una vez contra el mysql_db compartido:  make db
CREATE DATABASE IF NOT EXISTS `MUNDIAL` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
