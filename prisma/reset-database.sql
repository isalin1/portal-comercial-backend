-- =====================================================
-- Script para limpiar la base de datos
-- Mantiene solo el usuario SUPERADMIN: Ignacio Salinas
-- =====================================================

-- 1. Eliminar pagos
DELETE FROM payments;

-- 2. Eliminar órdenes de venta
DELETE FROM salesorders;

-- 3. Eliminar items de órdenes de servicio
DELETE FROM itemserviceorders;

-- 4. Eliminar órdenes de servicio
DELETE FROM serviceorders;

-- 5. Eliminar servicios por punto de venta
DELETE FROM pointsaleservices;

-- 6. Eliminar lista de servicios
DELETE FROM listservices;

-- 7. Eliminar categorías de servicio
DELETE FROM servicecategories;

-- 8. Eliminar puntos de venta
DELETE FROM pointsales;

-- 9. Eliminar negocios
DELETE FROM business;

-- 10. Eliminar ubicaciones de clientes
DELETE FROM client_locations;

-- 11. Eliminar todos los usuarios EXCEPTO el SUPERADMIN
DELETE FROM users 
WHERE role != 'SUPERADMIN';

-- 12. Actualizar/Verificar el usuario SUPERADMIN
-- Si necesitas actualizar los datos del SUPERADMIN, descomenta y modifica:
/*
UPDATE users 
SET 
  firstname = 'Ignacio',
  lastname = 'Salinas',
  email = 'ignacio@example.com',
  phone = '999999999',
  "isActive" = true,
  "isEmailVerified" = true,
  role = 'SUPERADMIN'
WHERE role = 'SUPERADMIN';
*/

-- 13. Resetear secuencias (IDs) - OPCIONAL
-- Si quieres que los IDs empiecen desde 1 nuevamente:
/*
ALTER SEQUENCE users_id_seq RESTART WITH 2;
ALTER SEQUENCE business_id_seq RESTART WITH 1;
ALTER SEQUENCE pointsales_id_seq RESTART WITH 1;
ALTER SEQUENCE servicecategories_id_seq RESTART WITH 1;
ALTER SEQUENCE listservices_id_seq RESTART WITH 1;
ALTER SEQUENCE pointsaleservices_id_seq RESTART WITH 1;
ALTER SEQUENCE serviceorders_id_seq RESTART WITH 1;
ALTER SEQUENCE itemserviceorders_id_seq RESTART WITH 1;
ALTER SEQUENCE salesorders_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE client_locations_id_seq RESTART WITH 1;
*/

-- Verificar que solo quede el SUPERADMIN
SELECT 
  id,
  firstname,
  lastname,
  email,
  role,
  "isActive"
FROM users;

-- Mensaje de confirmación
SELECT 'Base de datos limpiada exitosamente. Solo queda el usuario SUPERADMIN.' as mensaje;














