-- ============================================
-- MIGRATION 034: SEED DINÁMICO DE MOVIMIENTOS
-- ============================================
-- Estrategia: "Ingeniería Inversa" del inventario actual.
-- 1. Calculamos una cantidad "vendida" simulada (delta).
-- 2. Insertamos una COMPRA histórica = (Stock Actual + Delta).
-- 3. Insertamos una VENTA/MERMA reciente = (Delta).
-- Resultado: Stock Actual intacto, pero con historial de respaldo.

INSERT INTO inventory_movements (
  id, 
  product_id, 
  store_id, 
  user_id, 
  type, 
  reason, 
  quantity, 
  previous_stock, 
  new_stock, 
  cost, 
  reference, 
  created_at
)
WITH RECURSIVE
  -- 1. Simulación de Historia por Producto
  simulation AS (
    SELECT 
      p.id AS prod_id,
      p.retail_price AS price,
      si.stock AS current_final_stock,
      si.store_id,
      -- Generamos un "delta" (cantidad que salió) aleatorio entre 1 y 10
      -- Si el stock es 0, forzamos que hubo movimiento (delta 5) para que no quede vacío el historial
      CASE 
        WHEN si.stock = 0 THEN 5 
        ELSE ABS(RANDOM() % 10) + 1 
      END AS quantity_out,
      -- ID del Admin Fijo para los movimientos iniciales
      '450e8400-e29b-41d4-a716-446655440001' AS admin_id
    FROM products p
    JOIN store_inventory si ON p.id = si.product_id
  ),
  
  -- 2. Unión de Movimientos (Entradas y Salidas)
  movements_data AS (
    -- A) EL PASADO: La Compra Inicial (Stock Actual + Lo que salió)
    SELECT 
      'mov-in-' || prod_id AS mov_id,
      prod_id,
      store_id,
      admin_id,
      'IN' AS type,
      'PURCHASE' AS reason,
      (current_final_stock + quantity_out) AS qty,
      0 AS prev_stock,
      (current_final_stock + quantity_out) AS new_stock,
      (price * 0.7) AS cost_calc, -- Costo aprox 70% del precio
      'FAC-2023-001' AS ref,
      datetime('now', '-60 days') AS date_event
    FROM simulation

    UNION ALL

    -- B) EL PRESENTE: La Salida (Venta o Merma)
    SELECT 
      'mov-out-' || prod_id AS mov_id,
      prod_id,
      store_id,
      admin_id,
      'OUT' AS type,
      -- Variedad: 10% de probabilidad de ser MERMA, resto VENTA
      CASE 
        WHEN ABS(RANDOM() % 10) > 8 THEN 'DAMAGED' 
        ELSE 'SALE' 
      END AS reason,
      quantity_out AS qty,
      (current_final_stock + quantity_out) AS prev_stock,
      current_final_stock AS new_stock,
      NULL AS cost_calc,
      CASE 
        WHEN ABS(RANDOM() % 10) > 8 THEN 'Reporte #99'
        ELSE 'TICKET-' || ABS(RANDOM() % 1000)
      END AS ref,
      datetime('now', '-' || (ABS(RANDOM() % 30)) || ' days') AS date_event
    FROM simulation
    WHERE quantity_out > 0 -- Solo generar salida si hubo movimiento simulado
  )

-- Ejecución Final del Insert
SELECT 
  mov_id, 
  prod_id, 
  store_id, 
  admin_id, 
  type, 
  reason, 
  qty, 
  prev_stock, 
  new_stock, 
  cost_calc, 
  ref, 
  date_event
FROM movements_data
ORDER BY date_event ASC;
