-- =========================================================
-- MIGRATION 012: SEED DATA INVENTARIO (REAL 100 PRODUCTOS)
-- =========================================================

-- Insertar Categorías 
INSERT INTO categories (id, name, color) VALUES 
('cat-tintes', 'Tintes y Colorimetría', '#E91E63'),
('cat-capilar', 'Cuidado Capilar', '#9C27B0'),
('cat-maquillaje', 'Maquillaje', '#F44336'),
('cat-unas', 'Uñas y Acrílicos', '#E040FB'),
('cat-elec', 'Eléctricos y Herramientas', '#2196F3'),
('cat-barber', 'Barbería', '#607D8B'),
('cat-acc', 'Accesorios y Desechables', '#FF9800');

-- Insertar 100 Productos
INSERT INTO products (id, code, name, category_id, retail_price, wholesale_price, is_active) VALUES
-- TINTES (KUUL, HIDRA)
('p001', 'KUL-902', 'Tinte Kuul Rubio Ultra Claro Nacarado 90ml', 'cat-tintes', 55.00, 42.00, 1),
('p002', 'KUL-744', 'Tinte Kuul Rubio Medio Cobrizo Intenso', 'cat-tintes', 55.00, 42.00, 1),
('p003', 'KUL-BLK', 'Tinte Kuul Negro 1.1', 'cat-tintes', 55.00, 42.00, 1),
('p004', 'KUL-MAT', 'Shampoo Matizador Kuul Color Me 300ml', 'cat-capilar', 120.00, 95.00, 1),
('p005', 'HID-PER', 'Peróxido Hidra 20 Volúmenes 1 Litro', 'cat-tintes', 85.00, 65.00, 1),
('p006', 'HID-DEC', 'Polvo Decolorante Hidra Bleach 350g', 'cat-tintes', 180.00, 150.00, 1),
('p007', 'ALF-OIL', 'Ampolleta Alfaparf Semi Di Lino Azul (Brillo)', 'cat-capilar', 45.00, 35.00, 1),
('p008', 'ALF-MASK', 'Mascarilla Capilar Alfaparf Reparación 500g', 'cat-capilar', 350.00, 290.00, 1),
('p009', 'KUL-RECON', 'Tratamiento Reconstructor Kuul 1kg (Aguacate)', 'cat-capilar', 220.00, 180.00, 1),
('p010', 'LO-UV', 'Tinte Loqual Uva 90g', 'cat-tintes', 40.00, 30.00, 1),

-- MAQUILLAJE (BISSÚ, PROSA)
('p011', 'BIS-RIM', 'Rimel Bissú Explosive Look A prueba de agua', 'cat-maquillaje', 65.00, 45.00, 1),
('p012', 'BIS-COR', 'Corrector Bissú Barra Tono 03 Beige', 'cat-maquillaje', 35.00, 22.00, 1),
('p013', 'BIS-TIN', 'Maquillaje Líquido Bissú Tono 10 Rompope', 'cat-maquillaje', 95.00, 75.00, 1),
('p014', 'BIS-POL', 'Polvo Compacto Bissú Tono 06 Natural Beige', 'cat-maquillaje', 85.00, 65.00, 1),
('p015', 'PRO-RIM', 'Rimel Prosa 4 en 1 Tapa Gris (Profesional)', 'cat-maquillaje', 45.00, 32.00, 1),
('p016', 'PRO-ACE', 'Aceite para Pestañas Prosa 4 Aceites', 'cat-maquillaje', 35.00, 25.00, 1),
('p017', 'PIN-CEJ', 'Pinza para Ceja Indio Alemana Punta Dorada', 'cat-acc', 25.00, 15.00, 1),
('p018', 'ESP-QUE', 'Esponja Tipo Quesito (Paquete 10 pzas)', 'cat-acc', 20.00, 12.00, 1),
('p019', 'PEST-1', 'Pestaña Mink 3D Modelo #045 Dramático', 'cat-maquillaje', 55.00, 35.00, 1),
('p020', 'PEG-DUO', 'Pegamento de Pestañas DUO Rayo Azul (Original)', 'cat-maquillaje', 120.00, 90.00, 1),

-- UÑAS (GELISH, MC)
('p021', 'MC-MON', 'Monómero MC Nails 8oz Aroma Bajo', 'cat-unas', 180.00, 140.00, 1),
('p022', 'MC-ACR-C', 'Acrílico MC Nails Cristal 2oz', 'cat-unas', 65.00, 45.00, 1),
('p023', 'MC-ACR-R', 'Acrílico MC Nails Rosa Transparente 2oz', 'cat-unas', 65.00, 45.00, 1),
('p024', 'GEL-BASE', 'Base Coat Gel Semipermanente GC 15ml', 'cat-unas', 85.00, 60.00, 1),
('p025', 'GEL-TOP', 'Top Coat Gel Semipermanente GC 15ml (No Wipe)', 'cat-unas', 85.00, 60.00, 1),
('p026', 'ACE-PUR', 'Acetona Pura 1 Litro (Removedor)', 'cat-unas', 75.00, 50.00, 1),
('p027', 'LIMA-100', 'Lima Zebra 100/100 Professional', 'cat-unas', 15.00, 8.00, 1),
('p028', 'LIMA-180', 'Lima Sponge 180/220 Buffer', 'cat-unas', 20.00, 12.00, 1),
('p029', 'LAMP-UV', 'Lámpara UV/LED Sun5 48W Secado Rápido', 'cat-elec', 350.00, 250.00, 1),
('p030', 'OIL-CUT', 'Aceite de Cutícula Aroma Almendras 15ml', 'cat-unas', 25.00, 15.00, 1),

-- BARBERÍA Y CABALLERO
('p031', 'WAHL-SUP', 'Máquina Wahl Super Taper Clásica (Alámbrica)', 'cat-barber', 1200.00, 950.00, 1),
('p032', 'ANDIS-SH', 'Rasuradora Andis Shaver Lithium Titanium Foil', 'cat-barber', 1450.00, 1200.00, 1),
('p033', 'NAV-LIB', 'Navaja Libre Tipo Barbero Acero Inoxidable', 'cat-barber', 85.00, 50.00, 1),
('p034', 'COOL-CAR', 'Cool Care 5 en 1 Spray Desinfectante 400ml', 'cat-barber', 180.00, 140.00, 1),
('p035', 'GEL-ELEG', 'Gel Elegance Extra Fuerte Transparente 500ml', 'cat-barber', 65.00, 45.00, 1),
('p036', 'CERA-SPI', 'Cera Spider Web Efecto Telaraña 150g', 'cat-barber', 85.00, 60.00, 1),
('p037', 'PAP-CUE', 'Papel Cuello Talquera (Rollo 100 pzas)', 'cat-barber', 45.00, 30.00, 1),
('p038', 'CAPA-BAR', 'Capa de Corte Diseño Calaveras Barber Pole', 'cat-barber', 150.00, 100.00, 1),
('p039', 'AFTER-SH', 'Loción After Shave Clubman Pinaud 177ml', 'cat-barber', 220.00, 180.00, 1),
('p040', 'TALCO-B', 'Talco Barbero Clubman Ultrafino 255g', 'cat-barber', 160.00, 120.00, 1),

-- ELÉCTRICOS (NOMBRES LARGOS - CASO DE BORDE)
('p041', 'SEC-BAB', 'Secadora Babyliss Pro Portofino 6600 Nano Titanium 2000 Watts Azul', 'cat-elec', 2400.00, 1900.00, 1),
('p042', 'PLA-BAB', 'Plancha Alaciadora Babyliss Optima 3000 Acero Inoxidable Doble Función', 'cat-elec', 2800.00, 2300.00, 1),
('p043', 'RIZ-CON', 'Rizador Conair Instant Heat 1 pulgada Barril Cerámica Turmalina', 'cat-elec', 450.00, 350.00, 1),
('p044', 'SEC-GEN', 'Secadora de Viaje Plegable 1200W Generica Color Rosa', 'cat-elec', 180.00, 120.00, 1),
('p045', 'K-ALISADO', 'Kit Alisado Brasileño Kativa Keratina y Argán Sin Formol (Hogar)', 'cat-capilar', 320.00, 250.00, 1),

-- PRODUCTOS DESCONTINUADOS / INACTIVOS (CASO DE BORDE)
('p046', 'DESC-01', 'Gel Glitter Corporal 90s (Descontinuado)', 'cat-maquillaje', 10.00, 5.00, 0),
('p047', 'DESC-02', 'Tinte Fantasía Verde Neón (Lote Vencido)', 'cat-tintes', 20.00, 10.00, 0),
('p048', 'DESC-03', 'Esmalte Bissú Tono "Navidad 2020"', 'cat-unas', 15.00, 10.00, 0),

('p050', 'TINT-700', 'Tinte Hidracolor 7.0 Rubio Medio', 'cat-tintes', 52.00, 40.00, 1),
('p051', 'TINT-711', 'Tinte Hidracolor 7.11 Rubio Medio Cenizo Intenso', 'cat-tintes', 52.00, 40.00, 1),
('p052', 'TINT-800', 'Tinte Hidracolor 8.0 Rubio Claro', 'cat-tintes', 52.00, 40.00, 1),
('p053', 'TINT-900', 'Tinte Hidracolor 9.0 Rubio Clarísimo', 'cat-tintes', 52.00, 40.00, 1),
('p054', 'TINT-RR', 'Tinte Hidracolor Chromatic Rojo Fuego', 'cat-tintes', 58.00, 45.00, 1),
('p055', 'TINT-VV', 'Tinte Hidracolor Chromatic Violeta', 'cat-tintes', 58.00, 45.00, 1),
('p056', 'ESM-01', 'Esmalte Bissú Tono 01 Blanco Francés', 'cat-unas', 22.00, 14.00, 1),
('p057', 'ESM-05', 'Esmalte Bissú Tono 05 Negro', 'cat-unas', 22.00, 14.00, 1),
('p058', 'ESM-18', 'Esmalte Bissú Tono 18 Rosa Pastel', 'cat-unas', 22.00, 14.00, 1),
('p059', 'ESM-20', 'Esmalte Bissú Tono 20 Rojo Quemado', 'cat-unas', 22.00, 14.00, 1),
('p060', 'LAB-MAT-1', 'Labial Mate Bissú Tono 01 Suspiro', 'cat-maquillaje', 35.00, 24.00, 1),
('p061', 'LAB-MAT-5', 'Labial Mate Bissú Tono 05 Pasión', 'cat-maquillaje', 35.00, 24.00, 1),
('p062', 'BRO-DIF', 'Brocha para Difuminar Sombras Pelo Natural', 'cat-acc', 45.00, 25.00, 1),
('p063', 'BRO-BAS', 'Brocha Plana para Base Líquida (Lengua de Gato)', 'cat-acc', 55.00, 30.00, 1),
('p064', 'BRO-POL', 'Brocha Grande para Polvo (Kabuki)', 'cat-acc', 85.00, 50.00, 1),
('p065', 'PER-10', 'Peróxido Kuul 10 Volúmenes 135ml', 'cat-tintes', 15.00, 10.00, 1),
('p066', 'PER-20', 'Peróxido Kuul 20 Volúmenes 135ml', 'cat-tintes', 15.00, 10.00, 1),
('p067', 'PER-30', 'Peróxido Kuul 30 Volúmenes 135ml', 'cat-tintes', 15.00, 10.00, 1),
('p068', 'PER-40', 'Peróxido Kuul 40 Volúmenes 135ml', 'cat-tintes', 15.00, 10.00, 1),
('p069', 'SILICA-U', 'Silica en Gotas Uva 120ml Kerashine', 'cat-capilar', 65.00, 45.00, 1),
('p070', 'SILICA-A', 'Silica en Gotas Argan 120ml Kerashine', 'cat-capilar', 65.00, 45.00, 1),
('p071', 'ALGODON', 'Algodón Plisado Paquete 300g Protec', 'cat-acc', 45.00, 32.00, 1),
('p072', 'TOALLA-F', 'Toallitas Faciales Desmaquillantes (Paq 25)', 'cat-maquillaje', 30.00, 20.00, 1),
('p073', 'CUBRE-B', 'Cubrebocas Negro Plisado Caja 50pz', 'cat-acc', 60.00, 35.00, 1),
('p074', 'GUANTE-L', 'Guantes de Látex Talla M Caja 100pz', 'cat-acc', 140.00, 95.00, 1),
('p075', 'GUANTE-N', 'Guantes de Nitrilo Negro Talla M Caja 100pz', 'cat-acc', 180.00, 130.00, 1),
('p076', 'GEL-AFEIT', 'Gel de Afeitar Transparente 4x4 1kg', 'cat-barber', 120.00, 90.00, 1),
('p077', 'POMADA-B', 'Pomada para Cabello Fijación Media 4x4', 'cat-barber', 80.00, 55.00, 1),
('p078', 'TINT-BARB', 'Tinte para Barba y Bigote Just For Men Negro', 'cat-barber', 210.00, 180.00, 1),
('p079', 'CIERA-DEP', 'Cera Española para Depilar Chocolate 1kg', 'cat-acc', 250.00, 180.00, 1),
('p080', 'OLL-CERA', 'Olla Calentadora de Cera Pro-Wax 100', 'cat-elec', 180.00, 130.00, 1),
('p081', 'EXT-CAB', 'Extensiones de Cabello Natural 18" Negro 1B', 'cat-capilar', 1200.00, 900.00, 1),
('p082', 'GLIT-PLATA', 'Glitter Decoración Uñas Plata Hológrama', 'cat-unas', 10.00, 5.00, 1),
('p083', 'GLIT-ORO', 'Glitter Decoración Uñas Oro 24k', 'cat-unas', 10.00, 5.00, 1),
('p084', 'EFEC-ESP', 'Efecto Espejo Polvo Chrome Uñas', 'cat-unas', 45.00, 25.00, 1),
('p085', 'PIEDRAS', 'Cartera de Cristales Swarovski Clon Talla 10', 'cat-unas', 60.00, 35.00, 1),
('p086', 'TIPS-NAT', 'Caja de Tips Natural 500pz Curva C', 'cat-unas', 90.00, 60.00, 1),
('p087', 'TIPS-CRIS', 'Caja de Tips Cristal 500pz Curva C', 'cat-unas', 90.00, 60.00, 1),
('p088', 'CORTA-TIP', 'Corta Tips Metálico Rosa', 'cat-acc', 45.00, 25.00, 1),
('p089', 'EMPU-CUT', 'Empujador de Cutícula Acero Inox', 'cat-acc', 35.00, 20.00, 1),
('p090', 'ALICATA', 'Alicata para Cutícula Mundial Classic', 'cat-acc', 120.00, 90.00, 1),
('p091', 'SHAMP-SUL', 'Shampoo Sin Sulfatos Cabello Teñido 1L', 'cat-capilar', 180.00, 130.00, 1),
('p092', 'ACOND-SUL', 'Acondicionador Sin Sulfatos Cabello Teñido 1L', 'cat-capilar', 180.00, 130.00, 1),
('p093', 'TERM-PROT', 'Termoprotector Capilar Spray 250ml', 'cat-capilar', 95.00, 65.00, 1),
('p094', 'GOTA-SEDA', 'Gotas de Seda Bio Elixir 60ml', 'cat-capilar', 55.00, 35.00, 1),
('p095', 'KERATINA', 'Keratina Brasileña Alaciado Permanente Kit', 'cat-capilar', 450.00, 350.00, 1),
('p096', 'BOTOX-C', 'Botox Capilar Reparación Profunda 1kg', 'cat-capilar', 380.00, 280.00, 1),
('p097', 'TINT-NEON', 'Tinte Fantasía Rosa Neón 90g', 'cat-tintes', 65.00, 45.00, 1),
('p098', 'TINT-AZUL', 'Tinte Fantasía Azul Eléctrico 90g', 'cat-tintes', 65.00, 45.00, 1),
('p099', 'PINTA-LAB', 'Pintalabios Mágico Marroquí (Verde a Rosa)', 'cat-maquillaje', 15.00, 8.00, 1),
('p100', 'ESPEJO', 'Espejo de Mano Aumento 2x Plástico', 'cat-acc', 45.00, 25.00, 1);


-- Insertar Inventario Inicial para Tienda 'store-main'
INSERT INTO store_inventory (id, store_id, product_id, stock, minimum_stock)
SELECT 
  'inv-' || id, 
  'store-main', 
  id, 
  ABS(RANDOM() % 25), -- Stock entre 0 y 24
  5 -- Mínimo stock fijo en 5
FROM products;

-- Forzar casos específicos de inventario para pruebas de UI
-- Caso 1: Stock CERO (Agotado)
UPDATE store_inventory SET stock = 0 WHERE product_id = 'p001'; -- Tinte Kuul Rubio

-- Caso 2: Stock Crítico (1 unidad)
UPDATE store_inventory SET stock = 1 WHERE product_id = 'p041'; -- Secadora Babyliss (Cara)

-- Caso 3: Stock Abundante
UPDATE store_inventory SET stock = 100 WHERE product_id = 'p017'; -- Pinzas Ceja