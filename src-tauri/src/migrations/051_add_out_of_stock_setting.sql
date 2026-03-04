INSERT INTO system_settings (key, value)
VALUES (
    'allow_out_of_stock_sales', 
    'false'
) ON CONFLICT(key) DO NOTHING;
