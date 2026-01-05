-- ==================================================================
-- MIGRATION 026: SEED 100 CLIENTES CON SITUACIONES FINANCIERAS
-- ==================================================================

-- Lógica de Colores para pruebas:
-- 🟢 30 Clientes AL CORRIENTE (Saldo $0.00)
-- 🟡 30 Clientes DEUDA LEVE (Saldo > 0 y < 50% del límite)
-- 🔴 30 Clientes DEUDA CRÍTICA (Saldo > 50% del límite o Excedido)
-- 🔵 10 Clientes SALDO A FAVOR (Saldo Negativo)

INSERT OR IGNORE INTO customers (id, code, name, phone, address, credit_limit, current_balance, is_active) VALUES
-- 🟢 GRUPO VERDE (Saldo 0) - 30 Registros
('c_green_01', 'C-001', 'Alejandro Magno', '555-0101', 'Macedonia 123', 1000.00, 0.00, 1),
('c_green_02', 'C-002', 'Benito Juárez', '555-0102', 'Reforma Norte', 500.00, 0.00, 1),
('c_green_03', 'C-003', 'Carlos Santana', '555-0103', 'Guitarra 45', 2000.00, 0.00, 1),
('c_green_04', 'C-004', 'Diana Prince', '555-0104', 'Themyscira Ave', 1500.00, 0.00, 1),
('c_green_05', 'C-005', 'Elon Musk', '555-0105', 'Mars Colony 1', 50000.00, 0.00, 1),
('c_green_06', 'C-006', 'Frida Kahlo', '555-0106', 'Casa Azul 89', 800.00, 0.00, 1),
('c_green_07', 'C-007', 'Gabriela Mistral', '555-0107', 'Poesia 22', 600.00, 0.00, 1),
('c_green_08', 'C-008', 'Hermione Granger', '555-0108', 'Hogwarts', 300.00, 0.00, 1),
('c_green_09', 'C-009', 'Indiana Jones', '555-0109', 'Archaeology Dept', 1200.00, 0.00, 1),
('c_green_10', 'C-010', 'Jack Sparrow', '555-0110', 'Black Pearl', 100.00, 0.00, 1),
('c_green_11', 'C-011', 'Katniss Everdeen', '555-0111', 'District 12', 400.00, 0.00, 1),
('c_green_12', 'C-012', 'Lara Croft', '555-0112', 'Manor 99', 5000.00, 0.00, 1),
('c_green_13', 'C-013', 'Marty McFly', '555-0113', 'Hill Valley', 500.00, 0.00, 1),
('c_green_14', 'C-014', 'Neo Anderson', '555-0114', 'Matrix Code', 1000.00, 0.00, 1),
('c_green_15', 'C-015', 'Obi-Wan Kenobi', '555-0115', 'Tatooine High Ground', 2000.00, 0.00, 1),
('c_green_16', 'C-016', 'Peter Parker', '555-0116', 'Queens NY', 200.00, 0.00, 1),
('c_green_17', 'C-017', 'Quentin Tarantino', '555-0117', 'Cinema St', 1000.00, 0.00, 1),
('c_green_18', 'C-018', 'Rocky Balboa', '555-0118', 'Philadelphia Gym', 600.00, 0.00, 1),
('c_green_19', 'C-019', 'Sherlock Holmes', '555-0119', 'Baker St 221B', 1500.00, 0.00, 1),
('c_green_20', 'C-020', 'Tony Stark', '555-0120', 'Stark Tower', 100000.00, 0.00, 1),
('c_green_21', 'C-021', 'Uma Thurman', '555-0121', 'Kill Bill Vol1', 900.00, 0.00, 1),
('c_green_22', 'C-022', 'Vito Corleone', '555-0122', 'Little Italy', 5000.00, 0.00, 1),
('c_green_23', 'C-023', 'Walter White', '555-0123', 'Albuquerque NM', 20000.00, 0.00, 1),
('c_green_24', 'C-024', 'Xena Warrior', '555-0124', 'Ancient Greece', 700.00, 0.00, 1),
('c_green_25', 'C-025', 'Yoda Master', '555-0125', 'Dagobah System', 300.00, 0.00, 1),
('c_green_26', 'C-026', 'Zorro Legend', '555-0126', 'California', 800.00, 0.00, 1),
('c_green_27', 'C-027', 'Adele Singer', '555-0127', 'London UK', 5000.00, 0.00, 1),
('c_green_28', 'C-028', 'Bruno Mars', '555-0128', 'Uptown Funk', 3000.00, 0.00, 1),
('c_green_29', 'C-029', 'Celia Cruz', '555-0129', 'Azucar Ave', 1000.00, 0.00, 1),
('c_green_30', 'C-030', 'Dua Lipa', '555-0130', 'New Rules St', 2000.00, 0.00, 1),

-- 🟡 GRUPO AMARILLO (Deuda Leve < 50%) - 30 Registros
('c_yellow_01', 'C-031', 'Elvis Presley', '555-0201', 'Memphis TN', 1000.00, 100.00, 1),
('c_yellow_02', 'C-032', 'Freddie Mercury', '555-0202', 'London Queen', 2000.00, 500.00, 1),
('c_yellow_03', 'C-033', 'Gloria Estefan', '555-0203', 'Miami Beach', 1000.00, 300.00, 1),
('c_yellow_04', 'C-034', 'Harry Styles', '555-0204', 'Watermelon St', 500.00, 200.00, 1),
('c_yellow_05', 'C-035', 'Iggy Pop', '555-0205', 'Lust for Life', 800.00, 300.00, 1),
('c_yellow_06', 'C-036', 'John Lennon', '555-0206', 'Imagine Blvd', 1500.00, 700.00, 1),
('c_yellow_07', 'C-037', 'Kurt Cobain', '555-0207', 'Seattle Grunge', 600.00, 250.00, 1),
('c_yellow_08', 'C-038', 'Lady Gaga', '555-0208', 'Chromatica', 3000.00, 1000.00, 1),
('c_yellow_09', 'C-039', 'Madonna Louise', '555-0209', 'Material Girl', 5000.00, 1500.00, 1),
('c_yellow_10', 'C-040', 'Nina Simone', '555-0210', 'Feeling Good', 900.00, 400.00, 1),
('c_yellow_11', 'C-041', 'Ozzy Osbourne', '555-0211', 'Crazy Train', 1000.00, 490.00, 1), -- Casi 50%
('c_yellow_12', 'C-042', 'Prince Rogers', '555-0212', 'Purple Rain', 2000.00, 999.00, 1), -- Casi 50%
('c_yellow_13', 'C-043', 'Queen Latifah', '555-0213', 'New Jersey', 1500.00, 500.00, 1),
('c_yellow_14', 'C-044', 'Rihanna Fenty', '555-0214', 'Barbados', 10000.00, 2000.00, 1),
('c_yellow_15', 'C-045', 'Shakira Mebarak', '555-0215', 'Barranquilla', 5000.00, 1000.00, 1),
('c_yellow_16', 'C-046', 'Tina Turner', '555-0216', 'Simply Best', 1200.00, 500.00, 1),
('c_yellow_17', 'C-047', 'Usher Raymond', '555-0217', 'Yeah St', 800.00, 100.00, 1),
('c_yellow_18', 'C-048', 'Van Halen', '555-0218', 'Jump Ave', 1000.00, 200.00, 1),
('c_yellow_19', 'C-049', 'Whitney Houston', '555-0219', 'Bodyguard', 2000.00, 800.00, 1),
('c_yellow_20', 'C-050', 'Ximena Sariñana', '555-0220', 'Mediocre', 500.00, 50.00, 1),
('c_yellow_21', 'C-051', 'Yandel Veguilla', '555-0221', 'Reggaeton 1', 1000.00, 100.00, 1),
('c_yellow_22', 'C-052', 'Zayn Malik', '555-0222', 'Direction 1', 600.00, 100.00, 1),
('c_yellow_23', 'C-053', 'Adam Levine', '555-0223', 'Maroon 5', 1500.00, 700.00, 1),
('c_yellow_24', 'C-054', 'Billie Eilish', '555-0224', 'Bad Guy', 1000.00, 400.00, 1),
('c_yellow_25', 'C-055', 'Cardi B', '555-0225', 'Bronx', 2000.00, 900.00, 1),
('c_yellow_26', 'C-056', 'Drake Graham', '555-0226', 'Toronto', 3000.00, 1400.00, 1),
('c_yellow_27', 'C-057', 'Eminem Mathers', '555-0227', 'Detroit 8 Mile', 1000.00, 450.00, 1),
('c_yellow_28', 'C-058', 'Frank Sinatra', '555-0228', 'New York NY', 1000.00, 1.00, 1), -- Mínima deuda
('c_yellow_29', 'C-059', 'George Michael', '555-0229', 'Faith St', 800.00, 399.00, 1),
('c_yellow_30', 'C-060', 'Halsey Frangipane', '555-0230', 'Manic', 500.00, 240.00, 1),

-- 🔴 GRUPO ROJO (Deuda Crítica > 50% o Excedido) - 30 Registros
('c_red_01', 'C-061', 'Pedro Infante', '555-0301', 'Cine de Oro', 1000.00, 600.00, 1), -- 60%
('c_red_02', 'C-062', 'Jorge Negrete', '555-0302', 'Charro Cantor', 1000.00, 900.00, 1), -- 90%
('c_red_03', 'C-063', 'Luis Miguel', '555-0303', 'El Sol', 5000.00, 4900.00, 1), -- Casi lleno
('c_red_04', 'C-064', 'Juan Gabriel', '555-0304', 'Noa Noa', 2000.00, 2500.00, 1), -- Excedido
('c_red_05', 'C-065', 'Vicente Fernandez', '555-0305', 'Rancho 3P', 3000.00, 1600.00, 1), -- 53%
('c_red_06', 'C-066', 'Jose Jose', '555-0306', 'El Triste', 500.00, 600.00, 1), -- Excedido
('c_red_07', 'C-067', 'Rocio Durcal', '555-0307', 'Gata Lluvia', 1000.00, 501.00, 1), -- Apenas rojo
('c_red_08', 'C-068', 'Chavela Vargas', '555-0308', 'Llorona', 800.00, 800.00, 1), -- 100%
('c_red_09', 'C-069', 'Lola Beltran', '555-0309', 'Paloma Negra', 600.00, 500.00, 1),
('c_red_10', 'C-070', 'Antonio Aguilar', '555-0310', 'Zacatecas', 1200.00, 1200.00, 1),
('c_red_11', 'C-071', 'Cantinflas Moreno', '555-0311', 'Detalle', 400.00, 800.00, 1), -- Doble del límite
('c_red_12', 'C-072', 'Tin Tan Valdes', '555-0312', 'Pachuco', 500.00, 300.00, 1), -- 60%
('c_red_13', 'C-073', 'Chespirito Gomez', '555-0313', 'Vecindad 8', 200.00, 150.00, 1),
('c_red_14', 'C-074', 'Chabelo Xavier', '555-0314', 'Catafixia', 10000.00, 5001.00, 1),
('c_red_15', 'C-075', 'Maria Felix', '555-0315', 'La Doña', 5000.00, 6000.00, 1), -- Excedido
('c_red_16', 'C-076', 'Dolores del Rio', '555-0316', 'Hollywood', 2000.00, 1100.00, 1),
('c_red_17', 'C-077', 'Katy Jurado', '555-0317', 'High Noon', 1000.00, 800.00, 1),
('c_red_18', 'C-078', 'Salma Hayek', '555-0318', 'Veracruz', 5000.00, 3000.00, 1),
('c_red_19', 'C-079', 'Guillermo del Toro', '555-0319', 'Laberinto', 1500.00, 800.00, 1),
('c_red_20', 'C-080', 'Alfonso Cuaron', '555-0320', 'Roma', 1500.00, 1400.00, 1),
('c_red_21', 'C-081', 'Alejandro G. Iñarritu', '555-0321', 'Birdman', 1500.00, 1600.00, 1),
('c_red_22', 'C-082', 'Gael Garcia', '555-0322', 'Amores Perros', 800.00, 500.00, 1),
('c_red_23', 'C-083', 'Diego Luna', '555-0323', 'Star Wars', 800.00, 700.00, 1),
('c_red_24', 'C-084', 'Thalia Sodi', '555-0324', 'Marimar', 2000.00, 1001.00, 1),
('c_red_25', 'C-085', 'Paulina Rubio', '555-0325', 'Chica Dorada', 2000.00, 1900.00, 1),
('c_red_26', 'C-086', 'Gloria Trevi', '555-0326', 'Pelo Suelto', 1000.00, 600.00, 1),
('c_red_27', 'C-087', 'Alejandra Guzman', '555-0327', 'Eternamente', 1000.00, 550.00, 1),
('c_red_28', 'C-088', 'Yuri Gaxiola', '555-0328', 'Maldita P', 1000.00, 950.00, 1),
('c_red_29', 'C-089', 'Lucero Hogaza', '555-0329', 'Novia America', 3000.00, 2000.00, 1),
('c_red_30', 'C-090', 'Mijares Manuel', '555-0330', 'Soldado', 3000.00, 2900.00, 1),

-- 🔵 GRUPO AZUL (Saldo a Favor) - 10 Registros
('c_blue_01', 'C-091', 'Bill Gates', '555-0401', 'Microsoft Way', 500.00, -100.00, 1),
('c_blue_02', 'C-092', 'Jeff Bezos', '555-0402', 'Amazon Jungle', 1000.00, -500.00, 1),
('c_blue_03', 'C-093', 'Warren Buffett', '555-0403', 'Omaha', 2000.00, -50.00, 1),
('c_blue_04', 'C-094', 'Mark Zuckerberg', '555-0404', 'Metaverse', 1000.00, -20.00, 1),
('c_blue_05', 'C-095', 'Larry Page', '555-0405', 'Googleplex', 500.00, -5.00, 1),
('c_blue_06', 'C-096', 'Sergey Brin', '555-0406', 'Alphabet', 500.00, -1000.00, 1), -- Mucho saldo a favor
('c_blue_07', 'C-097', 'Tim Cook', '555-0407', 'Apple Park', 3000.00, -300.00, 1),
('c_blue_08', 'C-098', 'Satya Nadella', '555-0408', 'Redmond', 2000.00, -200.00, 1),
('c_blue_09', 'C-099', 'Sundar Pichai', '555-0409', 'Mountain View', 2000.00, -150.00, 1),
('c_blue_10', 'C-100', 'Jensen Huang', '555-0410', 'Nvidia AI', 5000.00, -0.01, 1); -- Apenas a favor