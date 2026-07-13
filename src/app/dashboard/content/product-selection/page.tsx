'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Upload,
    FileSpreadsheet,
    Check,
    Loader2,
    Package,
    ChevronRight,
    X,
    Filter,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001';

// --- TYPES ---
interface Product {
    id: number;
    name: string;
    category: string;
    price: number | null;
    description: string;
    highlights: string;
    sku: string;
}

interface ProductList {
    id: number;
    name: string;
    file_name: string;
    total_products: number;
}

interface GroupedProducts {
    [category: string]: Product[];
}

// --- ISOLATED COMPONENTS FOR PERFORMANCE (DARK MODE) ---

/**
 * IsolatedUpload: Dark mode styled
 */
const IsolatedUpload = React.memo(({
    onUploadSuccess,
    onUploadStart
}: {
    onUploadSuccess: (catalog: ProductList) => void;
    onUploadStart: () => void;
}) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        event.target.value = '';

        const validExtensions = ['.xlsx', '.xls'];
        if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
            toast.error('Vui lòng upload file Excel (.xlsx hoặc .xls)');
            return;
        }

        setUploading(true);
        onUploadStart();

        const loadingId = toast.loading('Đang gửi file lên server...');

        setTimeout(async () => {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('name', file.name.replace(/\.(xlsx|xls)$/, ''));

                const response = await fetch(`${AI_SERVICE_URL}/api/products/upload/`, {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();

                if (data.success) {
                    toast.success(`Upload xong! Đã thêm ${data.product_list.total_products} sản phẩm`, { id: loadingId });
                    onUploadSuccess(data.product_list);
                } else {
                    toast.error(data.error || 'Upload thất bại', { id: loadingId });
                }
            } catch (error) {
                console.error('Upload error:', error);
                toast.error('Lỗi kết nối server', { id: loadingId });
            } finally {
                setUploading(false);
            }
        }, 50);
    };

    return (
        <div className="bg-[#141414] rounded-2xl p-6 shadow-xl border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">Upload Nhanh</h2>

            <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`
                    group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl
                    cursor-pointer transition-all duration-200
                    ${uploading
                        ? 'border-gray-700 bg-gray-900 cursor-wait'
                        : 'border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/5 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    }
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                />

                {uploading ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-3" />
                        <span className="text-sm font-medium text-purple-400">Đang xử lý...</span>
                    </div>
                ) : (
                    <>
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-full mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/20">
                            <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-base font-semibold text-white">Chọn file Excel</p>
                        <p className="text-xs text-gray-500 mt-1">.xlsx, .xls</p>
                    </>
                )}
            </div>

            <p className="text-xs text-center text-gray-500 mt-4">
                Mẹo: Hệ thống tự động lọc và chuẩn hóa dữ liệu
            </p>
        </div>
    );
});
IsolatedUpload.displayName = 'IsolatedUpload';

/**
 * ProductCard: Dark mode styled
 */
const ProductCard = React.memo(({
    product,
    isSelected,
    onSelect
}: {
    product: Product;
    isSelected: boolean;
    onSelect: (p: Product) => void;
}) => (
    <div
        onClick={() => onSelect(product)}
        className={`
            relative cursor-pointer text-left p-4 rounded-xl border transition-all duration-200
            ${isSelected
                ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.1)] ring-1 ring-purple-500/50'
                : 'border-gray-800 bg-[#1a1a1a] hover:border-gray-600 hover:bg-[#202020]'
            }
        `}
    >
        <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`font-semibold truncate pr-2 ${isSelected ? 'text-purple-300' : 'text-gray-200'}`}>
                        {product.name}
                    </h4>
                    {product.sku && (
                        <span className="text-[10px] font-mono font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                            {product.sku}
                        </span>
                    )}
                </div>

                <div className="flex items-baseline gap-2 mt-2">
                    {product.price ? (
                        <span className="text-sm font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20">
                            {product.price.toLocaleString('vi-VN')} đ
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-gray-500 bg-gray-800 px-2 py-0.5 rounded-md border border-gray-700">
                            Liên hệ
                        </span>
                    )}
                </div>

                {product.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                        {product.description}
                    </p>
                )}
            </div>

            {isSelected && (
                <div className="absolute top-4 right-4 animate-in zoom-in duration-200">
                    <div className="bg-purple-600 text-white p-1 rounded-full shadow-lg shadow-purple-900/50">
                        <Check className="w-3 h-3" />
                    </div>
                </div>
            )}
        </div>
    </div>
));
ProductCard.displayName = 'ProductCard';

/**
 * CategoryGroup: Dark mode styled
 */
const CategoryGroup = React.memo(({
    category,
    products,
    selectedProductId,
    onSelect
}: {
    category: string;
    products: Product[];
    selectedProductId: number | undefined;
    onSelect: (p: Product) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [limit, setLimit] = useState(10);

    const visibleProducts = products.slice(0, limit);
    const remaining = products.length - limit;

    return (
        <div className="border border-gray-800 rounded-2xl overflow-hidden bg-[#141414] shadow-lg">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-[#1a1a1a] hover:bg-[#202020] transition-colors text-left border-b border-gray-800"
            >
                <div className="flex items-center gap-3">
                    <div className={`
                        p-1.5 rounded-lg transition-colors
                        ${isExpanded ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'}
                    `}>
                        <Filter className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-200">{category || 'Chưa phân loại'}</h3>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{products.length} sản phẩm</p>
                    </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {/* List */}
            {isExpanded && (
                <div className="p-4 bg-[#141414]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                        {visibleProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                isSelected={selectedProductId === product.id}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>

                    {remaining > 0 && (
                        <button
                            onClick={() => setLimit(prev => prev + 20)}
                            className="w-full py-3 mt-3 text-sm font-semibold text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors border border-gray-800 border-dashed hover:border-gray-600"
                        >
                            Hiển thị thêm {Math.min(remaining, 20)} sản phẩm (Còn {remaining})
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});
CategoryGroup.displayName = 'CategoryGroup';


// ----------------------------------------------------------------------
// MAIN PAGE (DARK MODE)
// ----------------------------------------------------------------------

export default function ProductSelectionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [videoInfo, setVideoInfo] = useState({ id: '', title: '', description: '', url: '' });
    const [catalogs, setCatalogs] = useState<ProductList[]>([]);
    const [selectedCatalog, setSelectedCatalog] = useState<ProductList | null>(null);
    const [groupedProducts, setGroupedProducts] = useState<GroupedProducts>({});
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    useEffect(() => {
        const id = searchParams.get('videoId') || '';
        const title = decodeURIComponent(searchParams.get('videoTitle') || '');
        const description = decodeURIComponent(searchParams.get('videoDescription') || '');
        const url = decodeURIComponent(searchParams.get('videoUrl') || '');
        setVideoInfo({ id, title, description, url });

        fetch(`${AI_SERVICE_URL}/api/products/catalogs/`)
            .then(res => res.json())
            .then(data => {
                if (data.success) setCatalogs(data.catalogs);
            })
            .catch(console.error);
    }, [searchParams]);

    const handleUploadSuccess = useCallback(async (newCatalog: ProductList) => {
        setCatalogs(prev => [newCatalog, ...prev]);
        setSelectedCatalog(newCatalog);

        setIsLoadingProducts(true);
        toast.loading('Đang tải dữ liệu sản phẩm...', { id: 'loading-products' });

        try {
            const res = await fetch(`${AI_SERVICE_URL}/api/products/catalogs/${newCatalog.id}/by-category/`);
            const data = await res.json();
            if (data.success) {
                setGroupedProducts(data.categories);
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi tải sản phẩm');
        } finally {
            setIsLoadingProducts(false);
            toast.dismiss('loading-products');
        }
    }, []);

    const handleCatalogSelect = useCallback(async (catalog: ProductList) => {
        if (selectedCatalog?.id === catalog.id) return;

        setSelectedCatalog(catalog);
        setSelectedProduct(null);
        setIsLoadingProducts(true);
        setGroupedProducts({});

        try {
            const res = await fetch(`${AI_SERVICE_URL}/api/products/catalogs/${catalog.id}/by-category/`);
            const data = await res.json();
            if (data.success) {
                setGroupedProducts(data.categories);
            }
        } catch (error) {
            toast.error('Không thể tải danh sách sản phẩm');
        } finally {
            setIsLoadingProducts(false);
        }
    }, [selectedCatalog]);

    const handleProductSelect = useCallback((product: Product) => {
        setSelectedProduct(prev => prev?.id === product.id ? null : product);
    }, []);

    const handleContinue = () => {
        if (!selectedProduct) return;

        // Debug: log mã sản phẩm khi ấn Tiếp tục
        console.log('🛒 [Product Selection] Đã chọn sản phẩm → Tiếp tục:', {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            productSku: selectedProduct.sku,
            productCategory: selectedProduct.category,
        });

        // Lưu sản phẩm đã chọn vào localStorage để các bước sau (Generate / Mix Video) luôn biết đúng category
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('selectedProduct', JSON.stringify(selectedProduct));
            } catch (e) {
                console.error('Failed to persist selectedProduct to localStorage', e);
            }
        }

        const params = new URLSearchParams({
            videoId: videoInfo.id,
            videoTitle: encodeURIComponent(videoInfo.title),
            videoDescription: encodeURIComponent(videoInfo.description || ''),
            productId: selectedProduct.id.toString(),
            productName: encodeURIComponent(selectedProduct.name),
            productCategory: encodeURIComponent(selectedProduct.category || ''),
            productDescription: encodeURIComponent(selectedProduct.description || ''),
            productPrice: selectedProduct.price?.toString() || '',
            productSku: selectedProduct.sku || '',
        });
        if (videoInfo.url) params.set('videoUrl', encodeURIComponent(videoInfo.url));
        router.push(`/dashboard/content/generate?${params.toString()}`);
    };

    const handleSkip = () => {
        const params = new URLSearchParams({
            videoId: videoInfo.id,
            videoTitle: encodeURIComponent(videoInfo.title),
            videoDescription: encodeURIComponent(videoInfo.description || ''),
        });
        if (videoInfo.url) params.set('videoUrl', encodeURIComponent(videoInfo.url));
        router.push(`/dashboard/content/generate?${params.toString()}`);
    };

    const deferredGroupedProducts = useDeferredValue(groupedProducts);
    const isStale = deferredGroupedProducts !== groupedProducts;

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[#0a0a0a] text-gray-200 p-6 md:p-10 font-sans -m-6">
            <div className="max-w-7xl mx-auto py-4">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Quay lại
                        </button>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-white bg-clip-text text-transparent">
                            Chọn Sản Phẩm
                        </h1>
                        <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm truncate max-w-xl">
                            Video: <span className="font-semibold text-gray-300">{videoInfo.title}</span>
                        </p>
                    </div>

                    <button
                        onClick={handleSkip}
                        className="px-5 py-2.5 bg-[#141414] border border-gray-800 text-gray-300 font-medium rounded-xl hover:bg-[#1a1a1a] hover:text-white hover:border-gray-600 transition-all shadow-lg flex items-center gap-2 group"
                    >
                        Bỏ qua bước này
                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN: Upload & Catalog List */}
                    <div className="lg:col-span-4 space-y-6">
                        <IsolatedUpload
                            onUploadSuccess={handleUploadSuccess}
                            onUploadStart={() => { }}
                        />

                        {/* Catalog List */}
                        <div className="bg-[#141414] rounded-2xl p-6 shadow-xl border border-gray-800">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">
                                Danh mục có sẵn
                            </h3>

                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar-dark">
                                {catalogs.map(catalog => (
                                    <button
                                        key={catalog.id}
                                        onClick={() => handleCatalogSelect(catalog)}
                                        className={`
                                            w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                                            ${selectedCatalog?.id === catalog.id
                                                ? 'bg-purple-900/20 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.1)]'
                                                : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-600 hover:bg-[#202020]'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            p-2 rounded-lg 
                                            ${selectedCatalog?.id === catalog.id ? 'bg-purple-500 text-white shadow-lg shadow-purple-900/50' : 'bg-gray-800 text-gray-400'}
                                        `}>
                                            <FileSpreadsheet className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold truncate ${selectedCatalog?.id === catalog.id ? 'text-purple-300' : 'text-gray-300'}`}>
                                                {catalog.name}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {catalog.total_products} sản phẩm
                                            </p>
                                        </div>
                                    </button>
                                ))}

                                {catalogs.length === 0 && (
                                    <div className="text-center py-8 text-gray-600 bg-[#1a1a1a] rounded-xl border border-gray-800 border-dashed">
                                        Chưa có danh mục nào
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Product List */}
                    <div className="lg:col-span-8">
                        {isLoadingProducts ? (
                            <div className="bg-[#141414] rounded-2xl p-12 text-center border border-gray-800 shadow-xl animate-in fade-in h-96 flex flex-col items-center justify-center">
                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-6" />
                                <h3 className="text-lg font-semibold text-white">Đang tải sản phẩm...</h3>
                                <p className="text-gray-500 mt-2">Đang đồng bộ dữ liệu từ server</p>
                            </div>
                        ) : selectedCatalog ? (
                            <div className={`space-y-6 transition-opacity duration-200 ${isStale ? 'opacity-50' : 'opacity-100'}`}>
                                {Object.entries(deferredGroupedProducts).map(([category, products]) => (
                                    <CategoryGroup
                                        key={category}
                                        category={category}
                                        products={products}
                                        selectedProductId={selectedProduct?.id}
                                        onSelect={handleProductSelect}
                                    />
                                ))}

                                {Object.keys(deferredGroupedProducts).length === 0 && !isLoadingProducts && (
                                    <div className="bg-[#141414] rounded-2xl p-12 text-center border border-gray-800 border-dashed">
                                        <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-500">Danh mục này chưa có sản phẩm nào khả dụng.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-[#141414] to-[#1a1a1a] rounded-2xl p-12 text-center border-2 border-dashed border-gray-800 h-full flex flex-col items-center justify-center min-h-[400px]">
                                <div className="bg-[#202020] p-6 rounded-full shadow-2xl shadow-black mb-8 animate-in zoom-in duration-300 border border-gray-800">
                                    <Sparkles className="w-12 h-12 text-purple-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Sẵn sàng chọn sản phẩm</h3>
                                <p className="text-gray-500 max-w-sm mx-auto leading-relaxed text-base">
                                    Chọn danh mục từ bên trái hoặc <br />
                                    <span className="font-semibold text-purple-400">upload file Excel mới</span> để bắt đầu ngay.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Action Bar */}
                <AnimatePresence>
                    {selectedProduct && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 items-center w-full max-w-lg px-4"
                        >
                            <div className="bg-[#1e1e1e] text-white p-2 pl-6 pr-2 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-between w-full border border-gray-700/50">
                                <div className="flex-1 min-w-0 mr-4">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Đã chọn</p>
                                    <p className="font-bold text-white truncate text-sm">{selectedProduct.name}</p>
                                    {selectedProduct.sku && (
                                        <p className="text-xs text-amber-400/90 font-mono mt-0.5">Mã: {selectedProduct.sku}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedProduct(null)}
                                        className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleContinue}
                                        className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/50 flex items-center gap-2 whitespace-nowrap"
                                    >
                                        Tiếp tục <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
