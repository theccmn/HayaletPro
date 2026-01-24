
const mockVariables: Record<string, string> = {
    // İşletme
    business_name: 'Hayalet Fotoğrafçılık',
    business_owner: 'Cengiz Çimen',
    business_address: 'Sakarya Mh. 1113. Sk. No:3 Manisa',

    // Kişi
    client_name: 'Ahmet Yılmaz',
    client_email: 'ahmet@ornek.com',
    client_phone: '+90 555 123 45 67',
    client_address: 'Bağdat Caddesi No:123 Kadıköy/İstanbul',
    client_notes: 'Dış çekim tercih ediyor.',

    // Proje
    project_title: 'Düğün Fotoğraf Çekimi',
    project_start_date: '24 Haziran 2026',
    project_delivery_date: '01 Temmuz 2026',
    project_details: 'Tam gün çekim, albüm dahil.',
    project_notes: 'Drone çekimi isteniyor.',
    project_price: '15.000 ₺',

    // Sistem
    current_date: new Date().toLocaleDateString('tr-TR'),
    current_time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
};

const replaceVariables = (text: string) => {
    if (!text) return '';
    return text.replace(/\{\{([\w_]+)\}\}/g, (match, key) => {
        return mockVariables[key] || match;
    });
};

export const RichTextBlock = ({ content }: { content: any }) => {
    return (
        <div
            className="prose max-w-none"
            style={{
                textAlign: content.align,
                color: content.color
            }}
        >
            <p className="whitespace-pre-wrap">{replaceVariables(content.text)}</p>
        </div>
    );
};
