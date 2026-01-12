-- Create finance_settings table
CREATE TABLE IF NOT EXISTS finance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('income_category', 'expense_category', 'payment_method')),
    label TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert Income Categories
INSERT INTO finance_settings (type, label, order_index) VALUES
('income_category', 'Vesikalık', 1),
('income_category', 'Biyometrik', 2),
('income_category', 'Fotoğraf Çoğaltma', 3),
('income_category', 'Fotoğraf Çıktısı', 4),
('income_category', 'Büyük Fotoğraf Baskısı', 5),
('income_category', 'Çıktı', 6),
('income_category', 'Çerçeve', 7),
('income_category', 'Fotoğraf Tamiri', 8),
('income_category', 'Tasarım', 9),
('income_category', 'Dış Çekim - Düğün', 10),
('income_category', 'Dış Çekim - Nişan', 11),
('income_category', 'Dış Çekim - Sünnet', 12),
('income_category', 'Dış Çekim - Aile', 13),
('income_category', 'Dış Çekim - Mezuniyet', 14),
('income_category', 'Dış Çekim - Hamilelik', 15),
('income_category', 'Stüdyo Çekimi - Düğün', 16),
('income_category', 'Stüdyo Çekimi - Nişan', 17),
('income_category', 'Stüdyo Çekimi - Sünnet', 18),
('income_category', 'Stüdyo Çekimi - Aile', 19),
('income_category', 'Stüdyo Çekimi - Mezuniyet', 20),
('income_category', 'Stüdyo Çekimi - Hamilelik', 21),
('income_category', 'Stüdyo Çekimi - Çocuk', 22),
('income_category', 'Stüdyo Çekimi - Ürün', 23),
('income_category', 'Çocuk Stüdyosu Çekimi', 24),
('income_category', 'Organizasyon Çekimi', 25),
('income_category', 'Tanıtım Filmi', 26),
('income_category', 'Düğün Filmi', 27),
('income_category', 'Diğer', 99);

-- Insert Expense Categories
INSERT INTO finance_settings (type, label, order_index) VALUES
('expense_category', 'Baskı', 1),
('expense_category', 'Yemek', 2),
('expense_category', 'Maaş', 3),
('expense_category', 'Ulaşım', 4),
('expense_category', 'Fatura - Elektrik', 5),
('expense_category', 'Fatura - Su', 6),
('expense_category', 'Fatura - İnternet', 7),
('expense_category', 'Fatura - Gaz', 8),
('expense_category', 'Muhasebe', 9),
('expense_category', 'Fotoğraf Kağıdı', 10),
('expense_category', 'Mürekkep', 11),
('expense_category', 'Çerçeve', 12),
('expense_category', 'Zarf', 13),
('expense_category', 'Poşet', 14),
('expense_category', 'Albüm', 15),
('expense_category', 'Kırtasiye', 16),
('expense_category', 'Diğer', 99);

-- Insert Payment Methods
INSERT INTO finance_settings (type, label, order_index) VALUES
('payment_method', 'Nakit', 1),
('payment_method', 'Kredi Kartı', 2),
('payment_method', 'Iban', 3),
('payment_method', 'Çek', 4),
('payment_method', 'Senet', 5);
