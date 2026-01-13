-- Migration: Contract Settings Table
-- Run this in Supabase SQL Editor

-- Create contract_settings table
CREATE TABLE IF NOT EXISTS contract_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_content TEXT NOT NULL,
    logo_url TEXT,
    font_family VARCHAR(100) DEFAULT 'Times New Roman',
    font_size_body INTEGER DEFAULT 12,
    font_size_title INTEGER DEFAULT 16,
    font_size_heading INTEGER DEFAULT 14,
    company_name VARCHAR(255) DEFAULT 'HAYALET FOTOĞRAF VE FİLM',
    company_address TEXT DEFAULT 'Sakarya Mh. 1113. Sk. 3-A Şehzadeler/Manisa',
    company_owner VARCHAR(255) DEFAULT 'Cengiz Çimen',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contract_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON contract_settings
    FOR ALL USING (true);

-- Insert default template
INSERT INTO contract_settings (template_content) VALUES (
'FOTOĞRAF VE VİDEO HİZMET SÖZLEŞMESİ

Madde 1- TARAFLAR
{{FIRMA_ADRES}} adresinde mukim {{FIRMA_ADI}} ({{FIRMA_SAHIBI}}) ile diğer taraftan {{MUSTERI_ADI}} (Bundan böyle MÜŞTERİ olarak anılacaktır) arasında aşağıda belirtilen şekil ve şartlarda tam bir anlaşmaya varılmıştır.

Madde 2- KONU
İşbu sözleşme, MÜŞTERİ''nin ihtiyaç duyduğu fotoğraf ve/veya video çekimi, kurgusu ve sunumu hizmetlerinin {{FIRMA_ADI}} tarafından hazırlanması ve teslim edilmesini kapsamaktadır.

Madde 3- HÜKÜMLER
3.1. {{FIRMA_ADI}}, MÜŞTERİ''ye teslim ettiği bütün fotoğraf ve videoları, kendi portfolyosunda, web sitesinde ve sosyal medya hesaplarında tanıtım amaçlı (editorial veya ticari) kullanma hakkına sahiptir.
3.2. Eserlerin mülkiyeti ve telif hakları {{FIRMA_ADI}}''e aittir. {{FIRMA_ADI}}, sözleşme süresince MÜŞTERİ''nin fotoğraflardan sözleşme amacına uygun yararlanmasını engelleyici fiil ve tasarruflarda bulunmayacağını taahhüt eder. Bu sözleşme ile MÜŞTERİ''ye; eserleri ad belirterek veya adsız olarak yayımlama, çoğaltma, dijital ortamda, TV ve benzeri mecralarda kullanma konusunda süresiz kullanım hakkı (lisans) verilmektedir.
3.3. MÜŞTERİ, eserlerin kullanım haklarını, {{FIRMA_ADI}}''in yazılı onayı olmaksızın üçüncü şahıslara devredemez.
3.4. Çekim için yapılacak ekstra prodüksiyon masrafları (plato/mekan ücreti, şehir dışı ulaşım, gerekirse yemek ve konaklama vb.) MÜŞTERİ''ye aittir.
3.5. Fotoğraflar ve içerdikleri görüntüler üzerinde hak sahipliği iddiasında bulunan üçüncü kişi ya da kuruluşların telif, tazminat taleplerinden ve bu nedenlerle {{FIRMA_ADI}}''in uğrayacağı her türlü zarardan MÜŞTERİ sorumlu olacağını; söz konusu miktarları nakden ve defaten ödeyeceğini kabul ve taahhüt eder.
3.6. Eserlerin olağanüstü bir nedenle (deprem, yangın, sel, doğal afetler, teknik ekipman hırsızlığı vb.) zayi olması durumunda, {{FIRMA_ADI}} sorumlu tutulamaz.
3.7. Çekim için gerekli materyallerin, ortamın ve kişilerin hazırlanmasından MÜŞTERİ sorumludur. Bu koşulların sağlanmamasından kaynaklı gecikmelerden veya çekimin yapılamamasından {{FIRMA_ADI}} sorumlu değildir.
3.8. Teslimat İçeriği:
{{TESLIMAT_ICERIGI}}
3.9. Revizyon Hakkı: Teslim edilen işler üzerinde MÜŞTERİ''nin ücretsiz revizyon (düzenleme) talep hakkı yoktur. Ekstra revizyon talepleri ve en baştan belirtilmeyen kurgu değişiklikleri ek ücrete tabidir.

Madde 4 – HİZMET BEDELİ VE ÖDEME
MÜŞTERİ, aşağıda belirtilen hizmet bedelini ve ödeme planını kabul ve taahhüt eder.

Hizmet Bedeli Toplam: {{HIZMET_BEDELI}}

Ödeme Planı:
{{ODEME_PLANI}}

4.1. MÜŞTERİ''nin herhangi bir sebeple işten vazgeçmesi durumunda, alınan kapora "cayma bedeli" sayılır ve iade edilmez. Bakiye ödeme, iş tesliminde veya çekim günü tamamlanmalıdır.

Madde 5- CEZAİ ŞART
Taraflarca sözleşmede yazılı beyan ve taahhütlerden herhangi birinin ihlal edilmesi veya sözleşmenin haksız feshi durumunda, haksız taraf diğer tarafın bu nedenle uğrayacağı tüm maddi ve manevi zararları tazmin etmeyi kabul eder.

Madde 6- DİĞER HUSUSLAR
6.1. Teslim süresi; çekimin tamamlanması ve (varsa) MÜŞTERİ''nin fotoğraf seçimini yapıp stüdyoya bildirmesinin ardından 30-45 iş günüdür. (Ekstra bir tarih belirtilmemişse).
6.2. Hazır olan işler, bildirimden itibaren en geç 1 (bir) ay içinde teslim alınmalıdır.
6.3. Veri Saklama: İş teslim tarihinden itibaren 3 (üç) ay sonra, {{FIRMA_ADI}}''in dijital verileri saklama ve arşivleme yükümlülüğü sona erer. Bu süreden sonra talep edilecek veri kayıplarından stüdyo sorumlu değildir.
6.4. İşbu sözleşmeden doğabilecek ihtilaflarda Manisa (Merkez) Mahkemeleri ve İcra Daireleri yetkilidir.
6.5. Taraflar, yukarıda yazılı adreslerinin kanuni tebligat adresleri olduğunu kabul eder.
6.6. İşbu sözleşme {{TARIH}} tarihinde 6 (altı) ana madde ve 1 (bir) sayfa olarak iki nüsha düzenlenmiş, taraflarca okunup imzalanarak yürürlüğe girmiştir.

{{FIRMA_ADI}} ({{FIRMA_SAHIBI}})						MÜŞTERİ
'
) ON CONFLICT DO NOTHING;

-- Create storage bucket for contract logos (run in Supabase Dashboard > Storage)
-- Or use this if you have storage admin access:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('contract-logos', 'contract-logos', true);
