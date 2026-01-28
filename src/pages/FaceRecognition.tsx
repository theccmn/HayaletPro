import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Slider } from '../components/ui/slider';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
    Loader2,
    FolderSearch,
    Brain,
    Search,
    ChevronRight,
    UploadCloud,
    Trash2,
    Download,
    Upload,
    Settings,
    Save,
    FolderOpen,
    MoreVertical
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog";
import * as faceapi from 'face-api.js';

// Local Server URL
const LOCAL_SERVER_URL = 'http://localhost:3002';

export default function FaceRecognition() {
    // const { settings } = useAppSettings(); // Unused
    const [scanPath, setScanPath] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');

    // Search State
    const [searchImage, setSearchImage] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Settings
    const [threshold, setThreshold] = useState(0.45); // 0.0 - 1.0 (Lower is stricter)

    // Management
    const [totalIndexed, setTotalIndexed] = useState(0);
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
    const [isShutdownDialogOpen, setIsShutdownDialogOpen] = useState(false);

    // Models
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [serverStatus, setServerStatus] = useState<'online' | 'offline'>('offline');

    useEffect(() => {
        loadModels();
        checkServer();
        fetchStats();

        const interval = setInterval(checkServer, 10000);
        return () => clearInterval(interval);
    }, []);

    const checkServer = async () => {
        try {
            const res = await fetch(`${LOCAL_SERVER_URL}/status`);
            if (res.ok) setServerStatus('online');
            else setServerStatus('offline');
        } catch (e) {
            setServerStatus('offline');
        }
    };

    const loadModels = async () => {
        try {
            setStatusMessage('Yapay zeka modelleri yükleniyor...');
            await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
            setIsModelsLoaded(true);
            setStatusMessage('Modeller hazır.');
        } catch (error) {
            console.error('Model loading error:', error);
            toast.error('AI Modelleri yüklenemedi. (public/models klasörünü kontrol edin)');
        }
    };

    const fetchStats = async () => {
        const { count } = await supabase.from('indexed_faces').select('*', { count: 'exact', head: true });
        setTotalIndexed(count || 0);
    };

    const handleScan = async () => {
        if (!scanPath) return toast.error('Klasör yolu giriniz.');

        setIsScanning(true);
        setScanProgress(0);
        setStatusMessage('Dosya listesi alınıyor...');

        try {
            const response = await fetch(`${LOCAL_SERVER_URL}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderPath: scanPath })
            });

            if (!response.ok) throw new Error('Yerel sunucu hatası');
            const data = await response.json();
            const files = data.files || [];

            if (files.length === 0) {
                toast.warning('Görüntü bulunamadı.');
                setIsScanning(false);
                return;
            }

            setStatusMessage(`${files.length} fotoğraf analiz ediliyor...`);

            let processed = 0;
            for (const filePath of files) {
                try {
                    // Skip existing
                    const { data: existing } = await supabase.from('indexed_faces').select('id').eq('file_path', filePath).single();
                    if (existing) {
                        processed++;
                        setScanProgress((processed / files.length) * 100);
                        continue;
                    }

                    const imgUrl = `${LOCAL_SERVER_URL}/image?path=${encodeURIComponent(filePath)}`;
                    const img = await faceapi.fetchImage(imgUrl);
                    const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();

                    if (detections.length > 0) {
                        // Insert all faces
                        const inserts = detections.map(d => ({
                            file_path: filePath,
                            descriptor: Array.from(d.descriptor),
                            metadata: { width: img.width, height: img.height, date: new Date().toISOString() }
                        }));
                        await supabase.from('indexed_faces').insert(inserts);
                    }

                    processed++;
                    setScanProgress((processed / files.length) * 100);
                } catch (e) {
                    console.error('Processing error:', e);
                }
            }
            toast.success('Tarama tamamlandı.');
            fetchStats();
        } catch (e) {
            toast.error('Tarama hatası. Sunucu açık mı?');
        } finally {
            setIsScanning(false);
            setStatusMessage('');
        }
    };

    const handleSearch = async () => {
        if (!searchImage) return;
        setIsSearching(true);
        setSearchResults([]);

        try {
            const img = await faceapi.fetchImage(searchImage);
            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

            if (!detection) {
                toast.error('Yüklenen fotoğrafta yüz bulunamadı.');
                setIsSearching(false);
                return;
            }

            const queryDescriptor = detection.descriptor;

            // Fetch all descriptors (optimize with pgvector later)
            const { data: allFaces } = await supabase.from('indexed_faces').select('id, file_path, descriptor');

            if (!allFaces?.length) {
                toast.warning('Arşiv boş.');
                setIsSearching(false);
                return;
            }

            const matches = allFaces.map(face => {
                const dist = faceapi.euclideanDistance(queryDescriptor, new Float32Array(face.descriptor));
                return { ...face, distance: dist };
            })
                .filter(m => m.distance < (1 - threshold)) // Threshold inversion (0.6 dist is ok, so threshold .4)
                // Wait, Euclidean distance: 0 is same. 0.6 is typical threshold.
                // If user sets "Similarity" slider to 0.8 (high similarity), distance should be low (< 0.4??).
                // Let's simplify: distance < 0.6 is standard.
                // Slider 0.0 (Loose) -> distance 0.6
                // Slider 1.0 (Strict) -> distance 0.3
                // Formula: max_dist = 0.65 - (slider * 0.35)
                // Slider 0 -> 0.65
                // Slider 1 -> 0.3
                .filter(m => m.distance < (0.65 - (threshold * 0.35)))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 50);

            setSearchResults(matches);
            if (matches.length > 0) toast.success(`${matches.length} eşleşme bulundu.`);
            else toast.info('Eşleşme bulunamadı.');

        } catch (e) {
            toast.error('Arama hatası.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleReveal = async (filePath: string) => {
        try {
            await fetch(`${LOCAL_SERVER_URL}/reveal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath })
            });
            toast.success('Klasör açıldı');
        } catch {
            toast.error('Klasör açılamadı');
        }
    };

    const handleDownloadImage = async (filePath: string) => {
        try {
            const imgUrl = `${LOCAL_SERVER_URL}/image?path=${encodeURIComponent(filePath)}`;
            const response = await fetch(imgUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            // Get filename from path
            const filename = filePath.split(/[/\\]/).pop() || 'image.jpg';
            link.download = filename;

            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download error:', e);
            toast.error('İndirme başarısız.');
        }
    };

    const handleBackup = async () => {
        const { data } = await supabase.from('indexed_faces').select('*');
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hayalet_yuz_arsiv_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!Array.isArray(json)) throw new Error('Geçersiz dosya formatı');

                // Batch insert (chunking might be needed for large files)
                const { error } = await supabase.from('indexed_faces').insert(json);
                if (error) throw error;

                toast.success('Yedek başarıyla yüklendi.');
                fetchStats();
            } catch (err) {
                toast.error('Yükleme hatası.');
            }
        };
        reader.readAsText(file);
    };

    const handleSelectFolder = async () => {
        try {
            const res = await fetch(`${LOCAL_SERVER_URL}/select-folder`);
            const data = await res.json();
            if (data.path) {
                setScanPath(data.path);
            }
        } catch (e) {
            toast.error('Klasör seçimi başarısız.');
        }
    };

    const confirmShutdown = async () => {
        try {
            await fetch(`${LOCAL_SERVER_URL}/shutdown`, { method: 'POST' });
            setServerStatus('offline');
            toast.info('Sunucu kapatıldı.');
        } catch {
            setServerStatus('offline');
        }
        setIsShutdownDialogOpen(false);
    };

    const handleClearArchive = () => {
        setIsClearDialogOpen(true);
    };

    const confirmClearArchive = async () => {
        await supabase.from('indexed_faces').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        fetchStats();
        toast.success('Arşiv temizlendi.');
        setIsClearDialogOpen(false);
    };

    return (
        <div className="container mx-auto py-8 space-y-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Yüz Tanıma & Arşiv</h1>
                    <p className="text-slate-500 mt-1">
                        Yerel fotoğraf arşivinizi yapay zeka ile yönetin.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                </div>
                <div className="flex items-center gap-4">
                    {/* Server Controls */}
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-2 h-8 ${serverStatus === 'online' ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-red-500 hover:text-red-600 hover:bg-red-50'}`}
                            onClick={() => {
                                if (serverStatus === 'online') setIsShutdownDialogOpen(true);
                                else {
                                    checkServer();
                                    toast.info('Sunucu şu an kapalı.');
                                }
                            }}
                        >
                            <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            {serverStatus === 'online' ? 'Sunucu Aktif' : 'Sunucu Kapalı'}
                        </Button>
                    </div>

                    <div className="bg-slate-100 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hidden sm:block border border-slate-200">
                        {totalIndexed} Yüz
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleClearArchive} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4" /> Arşivi Temizle
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <input type="file" id="restore-input" className="hidden" accept=".json" onChange={handleRestore} />
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Controls */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Indexing Card */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <FolderSearch className="h-5 w-5 text-indigo-600" />
                                İndeksleme
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Klasör Yolu</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Arşiv klasörü seçin..."
                                        value={scanPath}
                                        onChange={(e) => setScanPath(e.target.value)}
                                        className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                    />
                                    <Button variant="secondary" onClick={handleSelectFolder} title="Klasör Seç">
                                        <FolderOpen className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" onClick={handleScan} disabled={isScanning || !isModelsLoaded}>
                                        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            {isScanning && (
                                <div className="space-y-2 pt-2">
                                    <Progress value={scanProgress} className="h-1.5" />
                                    <p className="text-xs text-center text-slate-500 animate-pulse">{statusMessage}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Search Settings Card */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Settings className="h-5 w-5 text-indigo-600" />
                                Arama Ayarları
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Benzerlik Hassasiyeti</label>
                                    <span className="text-xs font-bold text-slate-700">{Math.round(threshold * 100)}%</span>
                                </div>
                                <Slider
                                    min={0} max={1} step={0.05}
                                    value={threshold}
                                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                />
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>Esnek</span>
                                    <span>Katı</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Backup Actions - Separated from Card */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="w-full bg-white hover:bg-slate-50 border-slate-200 shadow-sm h-10" onClick={handleBackup}>
                            <Download className="mr-2 h-4 w-4 text-slate-500" /> Yedeği İndir
                        </Button>
                        <Button variant="outline" className="w-full bg-white hover:bg-slate-50 border-slate-200 shadow-sm h-10" onClick={() => document.getElementById('restore-input')?.click()}>
                            <Upload className="mr-2 h-4 w-4 text-slate-500" /> Yedeği Yükle
                        </Button>
                    </div>
                </div>

                {/* Right Column: Search Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-8 bg-slate-50/50 flex flex-col items-center justify-center border-b border-dashed border-slate-200">
                            <div className="relative group cursor-pointer" onClick={() => document.getElementById('search-upload')?.click()}>
                                {searchImage ? (
                                    <img
                                        src={searchImage}
                                        className="h-48 w-48 object-cover rounded-full shadow-lg border-4 border-white ring-2 ring-indigo-50 transition-transform group-hover:scale-105"
                                        alt="Referans"
                                    />
                                ) : (
                                    <div className="h-48 w-48 rounded-full bg-white shadow-sm border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-500 transition-colors">
                                        <UploadCloud className="h-10 w-10 mb-2" />
                                        <span className="text-sm font-medium">Fotoğraf Seç</span>
                                    </div>
                                )}
                                <input id="search-upload" type="file" className="hidden" accept="image/*" onChange={(e) => {
                                    if (e.target.files?.[0]) setSearchImage(URL.createObjectURL(e.target.files[0]));
                                }} />
                            </div>

                            <Button
                                className="mt-6 w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                                size="lg"
                                onClick={handleSearch}
                                disabled={!searchImage || isSearching}
                            >
                                {isSearching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                                Arşivde Ara
                            </Button>
                        </div>

                        {/* Results Grid */}
                        <div className="p-6 bg-white min-h-[300px]">
                            {searchResults.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-700">Sonuçlar ({searchResults.length})</h3>
                                        <Button variant="ghost" size="sm" onClick={() => setSearchResults([])} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                            TEMİZLE
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {searchResults.map((result) => (
                                            <div key={result.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
                                                <img
                                                    src={`${LOCAL_SERVER_URL}/image?path=${encodeURIComponent(result.file_path)}`}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                                {/* Overlay Actions */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                                                    <div className="flex gap-2">
                                                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-indigo-600" title="Klasörde Göster" onClick={() => handleReveal(result.file_path)}>
                                                            <FolderOpen className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-green-600" title="Kaydet" onClick={() => handleDownloadImage(result.file_path)}>
                                                            <Save className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <span className="text-[10px] text-white/90 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                        %{(1 - result.distance).toFixed(2).substring(2)} Benzerlik
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flexflex-col items-center justify-center text-center py-12 text-slate-400">
                                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>Arama yapmak için bir fotoğraf yükleyin.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Clear Archive Logic */}
            <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Arşivi Temizle</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tüm yüz verileri silinecek. Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmClearArchive} className="bg-red-600 hover:bg-red-700">
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Shutdown Server Logic */}
            <AlertDialog open={isShutdownDialogOpen} onOpenChange={setIsShutdownDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sunucuyu Kapat</AlertDialogTitle>
                        <AlertDialogDescription>
                            Arka planda çalışan yüz tanıma sunucusu kapatılacak.
                            <br /><br />
                            <strong>Not:</strong> Tekrar başlatmak için masaüstündeki "HayaletLocalServer" kısayolunu kullanmanız gerekecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmShutdown} className="bg-red-600 hover:bg-red-700">
                            Kapat
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
