export const SMART_VARIABLES = [
    {
        category: 'İşletme',
        items: [
            { label: 'İşletme Adı', value: '{{business_name}}' },
            { label: 'Yetkili Adı Soyadı', value: '{{business_owner}}' },
            { label: 'Adres', value: '{{business_address}}' },
            // Removed fields not in ContractSettings (email, phone, website)
        ]
    },
    {
        category: 'Kişi',
        items: [
            { label: 'Ad Soyad', value: '{{client_name}}' },
            { label: 'E-posta Adresi', value: '{{client_email}}' },
            { label: 'Telefon Numarası', value: '{{client_phone}}' },
            { label: 'Adres', value: '{{client_address}}' },
            { label: 'Notlar', value: '{{client_notes}}' },
        ]
    },
    {
        category: 'Proje / Seans',
        items: [
            { label: 'Proje/Seans Adı', value: '{{project_title}}' },
            { label: 'Tarih', value: '{{project_start_date}}' },
            { label: 'Teslim Tarihi', value: '{{project_delivery_date}}' },
            { label: 'Detaylar', value: '{{project_details}}' },
            { label: 'Notlar', value: '{{project_notes}}' },
            { label: 'Tutar', value: '{{project_price}}' },
        ]
    },
    {
        category: 'Sistem',
        items: [
            { label: 'Bugünün Tarihi', value: '{{current_date}}' },
            { label: 'Şu Anın Saati', value: '{{current_time}}' },
        ]
    }
];
