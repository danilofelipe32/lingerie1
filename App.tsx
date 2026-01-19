import React, { useState, useEffect, useMemo } from 'react';
import { 
  Product, 
  Category, 
  CartItem, 
  Coupon, 
  SiteSettings, 
  INITIAL_PRODUCTS, 
  INITIAL_CATEGORIES, 
  INITIAL_COUPONS, 
  ALL_COLORS,
  CheckoutData
} from './types';
import { ShoppingBag, X, Check, Lock, Grid, Tag, Settings, Plus, Trash2, Edit2, Search, Loader } from 'lucide-react';
import { supabase } from './supabase';

// --- Helper Functions for DB Mapping ---
// DB uses snake_case, App uses camelCase

const mapProductFromDB = (p: any): Product => ({
  id: p.id,
  name: p.name,
  price: Number(p.price),
  promoPrice: Number(p.promo_price || 0),
  category: p.category,
  colors: Array.isArray(p.colors) ? p.colors : [],
  sizes: Array.isArray(p.sizes) ? p.sizes : [],
  icon: p.icon || '✨',
  image: p.image,
  description: p.description || '',
  visible: p.visible ?? true,
  isPromotion: p.is_promotion ?? false
});

const mapProductToDB = (p: Partial<Product>) => ({
  name: p.name,
  price: p.price,
  promo_price: p.promoPrice,
  category: p.category,
  colors: p.colors,
  sizes: p.sizes,
  icon: p.icon,
  image: p.image,
  description: p.description,
  visible: p.visible,
  is_promotion: p.isPromotion
});

// --- Helper Components ---

const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
}> = ({ isOpen, onClose, children, zIndex = 50 }) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 z-[${zIndex}] flex items-center justify-center`} role="dialog">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md p-4 animate-scale-in">
        {children}
      </div>
    </div>
  );
};

// --- Main Application ---

export default function App() {
  // -- State --
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({ collectionTitle: "Nova Coleção" });
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Admin State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTab, setAdminTab] = useState<'products' | 'categories' | 'coupons' | 'settings'>('products');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({ name: '', address: '', payment: '' });

  // -- Initialization --

  useEffect(() => {
    // 1. Load Cart from LocalStorage (Session specific)
    const storedCart = localStorage.getItem('belle_cart');
    if (storedCart) setCart(JSON.parse(storedCart));

    // 2. Fetch Data from Supabase
    fetchSupabaseData();
  }, []);

  const fetchSupabaseData = async () => {
    try {
      setLoading(true);
      
      // Fetch Products
      const { data: prodData } = await supabase.from('products').select('*').order('id');
      if (prodData && prodData.length > 0) {
        setProducts(prodData.map(mapProductFromDB));
      } else {
        setProducts(INITIAL_PRODUCTS); // Fallback if DB empty
      }

      // Fetch Categories
      const { data: catData } = await supabase.from('categories').select('*').order('id');
      if (catData && catData.length > 0) {
        setCategories([{ id: 'all', label: 'Todos' }, ...catData]);
      } else {
        setCategories(INITIAL_CATEGORIES);
      }

      // Fetch Coupons
      const { data: coupData } = await supabase.from('coupons').select('*');
      if (coupData && coupData.length > 0) {
        setCoupons(coupData);
      } else {
        setCoupons(INITIAL_COUPONS);
      }

      // Fetch Settings
      const { data: setData } = await supabase.from('site_settings').select('*').single();
      if (setData) {
        setSettings({ collectionTitle: setData.collection_title || "Nova Coleção" });
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      // Fallback to initial constants if everything fails
      if (products.length === 0) setProducts(INITIAL_PRODUCTS);
      if (categories.length === 0) setCategories(INITIAL_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  // Save Cart Changes Locally
  useEffect(() => localStorage.setItem('belle_cart', JSON.stringify(cart)), [cart]);

  // -- Computed --

  const filteredProducts = useMemo(() => {
    const visible = products.filter(p => p.visible);
    if (activeCategory === 'all') return visible.filter(p => !p.isPromotion);
    return visible.filter(p => p.category === activeCategory && !p.isPromotion);
  }, [products, activeCategory]);

  const promoProducts = useMemo(() => {
    return products.filter(p => p.visible && p.isPromotion);
  }, [products]);

  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => {
      const price = (item.isPromotion && item.promoPrice > 0) ? item.promoPrice : item.price;
      return acc + (price * item.quantity);
    }, 0);
    if (appliedCoupon) {
      return subtotal * (1 - appliedCoupon.discount / 100);
    }
    return subtotal;
  }, [cart, appliedCoupon]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = (item.isPromotion && item.promoPrice > 0) ? item.promoPrice : item.price;
      return acc + (price * item.quantity);
    }, 0);
  }, [cart]);

  // -- Handlers --

  const addToCart = (product: Product, color: string, size: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id && i.selectedColor === color && i.selectedSize === size);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, selectedColor: color, selectedSize: size, quantity: 1 }];
    });
    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleApplyCoupon = () => {
    const found = coupons.find(c => c.code === couponCode.toUpperCase());
    if (found) {
      setAppliedCoupon(found);
    } else {
      setAppliedCoupon(null);
      alert('Cupom inválido');
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutStep < 2) {
      setCheckoutStep(prev => prev + 1);
    } else {
      // Send to WhatsApp
      const whatsappNumber = "5584933004076";
      let msg = `*PEDIDO BELLE LINGERIE*\n\n👤 *Cliente:* ${checkoutData.name}\n📍 *Endereço:* ${checkoutData.address}\n💳 *Pagamento:* ${checkoutData.payment}\n\n🛒 *ITENS:*`;
      cart.forEach(i => msg += `\n- ${i.quantity}x ${i.name} (${i.selectedSize}, ${i.selectedColor})`);
      
      if (appliedCoupon) {
        msg += `\n\n🏷️ *Cupom:* ${appliedCoupon.code} (-${appliedCoupon.discount}%)`;
      }
      msg += `\n\n💰 *Total:* R$ ${cartTotal.toFixed(2).replace('.', ',')}`;
      
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
      setCart([]);
      setAppliedCoupon(null);
      setIsCheckoutOpen(false);
      setCheckoutStep(0);
      setCheckoutData({ name: '', address: '', payment: '' });
      setIsCartOpen(false);
    }
  };

  // -- Admin Handlers --

  const handleAdminLogin = () => {
    if (adminPassword === "NEILAQUEIROZ") {
      setIsAdminLoggedIn(true);
    } else {
      alert("Senha incorreta");
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !editingProduct.name) return;

    // Optimistic Update
    const tempId = editingProduct.id || Date.now();
    const newProductState = {
        ...editingProduct,
        id: tempId,
        price: Number(editingProduct.price) || 0,
        promoPrice: Number(editingProduct.promoPrice) || 0,
        colors: editingProduct.colors || [],
        sizes: editingProduct.sizes || ['P', 'M', 'G'],
        visible: editingProduct.visible !== undefined ? editingProduct.visible : true,
        isPromotion: editingProduct.isPromotion || false
    } as Product;

    if (editingProduct.id) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? newProductState : p));
    } else {
        setProducts(prev => [...prev, newProductState]);
    }

    setEditingProduct(null);

    // DB Sync
    const dbPayload = mapProductToDB(newProductState);
    if (editingProduct.id) {
        await supabase.from('products').update(dbPayload).eq('id', editingProduct.id);
    } else {
        const { data } = await supabase.from('products').insert(dbPayload).select().single();
        if (data) {
             // Replace optimistic ID with real ID
             setProducts(prev => prev.map(p => p.id === tempId ? mapProductFromDB(data) : p));
        }
    }
  };

  const deleteProduct = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir?")) {
        setProducts(prev => prev.filter(p => p.id !== id)); // Optimistic
        await supabase.from('products').delete().eq('id', id);
    }
  }

  const handleSaveSettings = async () => {
     // Assuming single row with ID 1 or UPSERT strategy
     // First try to update
     const { error } = await supabase.from('site_settings').upsert({ id: 1, collection_title: settings.collectionTitle });
     if (error) console.error(error);
  }
  
  // -- Sub-Components (Inline) --

  const ProductCard: React.FC<{ product: Product; isPromo?: boolean }> = ({ product, isPromo = false }) => (
    <div 
        onClick={() => setSelectedProduct(product)}
        className={`bg-ios-card rounded-[24px] overflow-hidden group cursor-pointer border hover:bg-[#2c2c2e] transition-all ${isPromo ? 'border-ios-red/20 hover:border-ios-red/50 snap-center shrink-0 w-[240px]' : 'border-white/5 animate-scale-in'}`}
    >
        <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#2c2c2e] to-[#1c1c1e] ${isPromo ? 'h-[280px]' : 'aspect-[4/5]'}`}>
            {product.image ? (
                 <img src={product.image} alt={product.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
            ) : (
                <span className={`${isPromo ? 'text-5xl' : 'text-6xl'} transition-transform duration-500 group-hover:scale-110`}>{product.icon}</span>
            )}
            
            {isPromo && <div className="absolute top-3 right-3 bg-ios-red text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Promo</div>}
            
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 items-center max-w-[calc(100%-24px)]">
                 <div className="bg-black/80 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full flex items-center shadow-lg transition-transform group-hover:scale-105">
                    <span className="text-white font-bold text-sm tracking-wide">
                        R$ {(isPromo && product.promoPrice > 0 ? product.promoPrice : product.price).toFixed(2).replace('.', ',')}
                    </span>
                 </div>
                 {isPromo && product.promoPrice > 0 && (
                    <div className="bg-black/40 backdrop-blur-sm border border-white/5 px-2 py-1 rounded-lg">
                        <span className="text-[10px] text-gray-300 line-through font-medium">
                            R$ {product.price.toFixed(2).replace('.', ',')}
                        </span>
                    </div>
                 )}
            </div>
        </div>
        <div className="p-4">
            {!isPromo && <p className="text-xs text-ios-blue font-semibold uppercase tracking-wide mb-1">{categories.find(c => c.id === product.category)?.label}</p>}
            <h3 className="text-white font-semibold text-lg leading-tight mb-1 line-clamp-1">{product.name}</h3>
            <p className="text-gray-500 text-xs line-clamp-2">{product.description}</p>
        </div>
    </div>
  );

  const ProductDetailModal = () => {
    const [color, setColor] = useState(selectedProduct?.colors[0]);
    const [size, setSize] = useState(selectedProduct?.sizes[0]);
    
    // Update local state when selected product changes
    useEffect(() => {
        if (selectedProduct) {
            setColor(selectedProduct.colors[0]);
            setSize(selectedProduct.sizes[0]);
        }
    }, [selectedProduct]);

    if (!selectedProduct) return null;

    const currentPrice = (selectedProduct.isPromotion && selectedProduct.promoPrice > 0) ? selectedProduct.promoPrice : selectedProduct.price;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProduct(null)} />
            <div className="absolute inset-y-0 right-0 max-w-md w-full flex pointer-events-none">
                 <div className="pointer-events-auto w-full transform transition ease-in-out duration-500 sm:duration-700 bg-ios-card/95 backdrop-blur-xl shadow-2xl h-full flex flex-col overflow-y-scroll animate-fade-in">
                    <div className="relative h-[40vh] bg-gradient-to-b from-[#2c2c2e] to-ios-card flex items-center justify-center shrink-0">
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-4 left-4 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40 transition-colors z-10">
                            <X className="w-6 h-6" />
                        </button>
                        {selectedProduct.image ? (
                             <img src={selectedProduct.image} className="w-full h-full object-cover object-top" />
                        ) : (
                            <span className="text-9xl drop-shadow-2xl animate-scale-in">{selectedProduct.icon}</span>
                        )}
                    </div>
                    
                    <div className="p-8 flex flex-col flex-1">
                        <div className="mb-6">
                            <div className="flex justify-between items-start">
                                <h2 className="text-3xl font-bold text-white mb-2 max-w-[80%]">{selectedProduct.name}</h2>
                                {selectedProduct.isPromotion && <span className="bg-ios-red text-white text-xs font-bold px-2 py-1 rounded">PROMO</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <p className={`text-xl font-bold ${selectedProduct.isPromotion ? 'text-ios-red' : 'text-ios-gray'}`}>
                                    R$ {currentPrice.toFixed(2).replace('.', ',')}
                                </p>
                                {selectedProduct.isPromotion && <p className="text-base text-gray-500 font-normal line-through">R$ {selectedProduct.price.toFixed(2).replace('.', ',')}</p>}
                            </div>
                        </div>

                        <div className="space-y-8 flex-1">
                            <div>
                                <label className="text-sm font-medium text-gray-400 block mb-3">Cor</label>
                                <div className="flex gap-3 flex-wrap">
                                    {selectedProduct.colors.map((c) => (
                                        <button 
                                            key={c}
                                            onClick={() => setColor(c)}
                                            className={`w-10 h-10 rounded-full border-2 transition-all ${color === c ? 'border-ios-blue scale-110' : 'border-transparent hover:border-gray-600'}`}
                                            style={{ backgroundColor: ALL_COLORS.find(ac => ac.name === c)?.hex || '#333' }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-400 block mb-3">Tamanho</label>
                                <div className="flex gap-3">
                                    {selectedProduct.sizes.map((s) => (
                                        <button 
                                            key={s}
                                            onClick={() => setSize(s)}
                                            className={`w-12 h-12 rounded-full font-medium text-sm transition-all ${size === s ? 'ring-2 ring-ios-blue bg-[#3a3a3c] text-white' : 'bg-[#2c2c2e] text-white hover:bg-[#3a3a3c]'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-[#2c2c2e] p-4 rounded-xl">
                                <p className="text-sm text-gray-400 leading-relaxed">{selectedProduct.description}</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <button 
                                onClick={() => color && size && addToCart(selectedProduct, color, size)}
                                className="w-full bg-ios-blue text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-600 active:scale-95 transition-all shadow-[0_0_20px_rgba(10,132,255,0.3)]"
                            >
                                Adicionar à Sacola
                            </button>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden relative z-10">
      
      {/* Background */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-black"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-purple-900/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-rose-900/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-32 left-[20%] w-[70vw] h-[70vw] bg-yellow-900/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob" style={{ animationDelay: '4s' }}></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz4KPC9zdmc+')] opacity-20"></div>
      </div>

      {/* Navbar */}
      <header className="glass-nav sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-[980px] mx-auto px-5 h-[52px] flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="https://i.imgur.com/4mPLGSA.png" alt="Belle Lingerie" className="h-8 md:h-10 w-auto object-contain" />
          </div>
          <button onClick={() => setIsCartOpen(true)} className="text-gray-400 hover:text-white transition-colors p-2 -mr-2 relative group">
            <ShoppingBag className="w-5 h-5" />
            {cart.length > 0 && (
                <span className="absolute top-1 right-1 bg-ios-blue text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold shadow-sm">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-16 px-6 text-center max-w-[980px] mx-auto relative z-10">
        <div className="animate-fade-in">
          <p key={settings.collectionTitle} className="text-ios-purple font-bold text-xl md:text-2xl mb-4 tracking-widest uppercase animate-explosion">{settings.collectionTitle}</p>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight drop-shadow-2xl">
            Elegância.<br />Redefinida.
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 font-normal max-w-xl mx-auto mb-10 leading-relaxed drop-shadow-md">
            Conforto absoluto e design sofisticado para todos os seus momentos.
          </p>
          <button onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })} className="bg-white text-black px-10 py-4 rounded-full font-bold hover:bg-gray-100 transition-colors active:scale-95 text-2xl shadow-[0_0_20px_rgba(255,255,255,0.4)]">
            Ver Coleção
          </button>
        </div>

        {/* Video Visual */}
        <div className="mt-16 relative h-[400px] md:h-[500px] w-full rounded-3xl overflow-hidden bg-ios-card/50 animate-fade-in shadow-2xl border border-white/10 backdrop-blur-sm" style={{ animationDelay: '0.2s' }}>
             <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-80">
                <source src="https://i.imgur.com/bxSSUjP.mp4" type="video/mp4" />
             </video>
             <div className="absolute inset-0 bg-black/20"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl md:text-9xl opacity-30 font-bold tracking-tighter text-white mix-blend-overlay select-none animate-subtle-zoom">BELLE</span>
             </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div id="products-section" className="sticky top-[52px] z-30 bg-black/60 backdrop-blur-xl border-b border-white/5 py-4">
        <div className="max-w-[980px] mx-auto px-5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar tap-highlight-transparent">
                {categories.map(cat => (
                    <button 
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center flex justify-center items-center">
            <Loader className="w-8 h-8 animate-spin text-ios-blue" />
        </div>
      ) : (
        <>
            {/* Promotions */}
            {promoProducts.length > 0 && (
                <section className="max-w-[980px] mx-auto px-5 pt-10">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 drop-shadow-md">
                        <span className="text-ios-red">🔥</span> Ofertas Especiais
                    </h3>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x">
                        {promoProducts.map(p => <ProductCard key={p.id} product={p} isPromo />)}
                    </div>
                </section>
            )}

            {/* Main Grid */}
            <main className="max-w-[980px] mx-auto px-5 py-12 pb-32">
                {promoProducts.length > 0 && <h3 className="text-xl font-bold text-white mb-6 drop-shadow-md">Catálogo</h3>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => <ProductCard key={p.id} product={p} />)
                    ) : (
                        <div className="col-span-full py-20 text-center text-gray-500">Nenhum produto nesta categoria.</div>
                    )}
                </div>
            </main>
        </>
      )}

      {/* Footer */}
      <footer className="bg-ios-card/80 backdrop-blur-lg py-20 text-center border-t border-white/5 relative z-10">
        <div className="max-w-[980px] mx-auto px-5 flex flex-col items-center">
            <a href="https://instagram.com/nqsecrets" target="_blank" rel="noreferrer" className="group flex flex-col items-center gap-3 text-gray-500 hover:text-white transition-colors duration-300 mb-10">
                <div className="p-4 rounded-3xl bg-white/5 group-hover:bg-white/10 border border-white/5 group-hover:border-white/10 transition-all duration-300 scale-100 group-hover:scale-105 shadow-sm">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                </div>
                <span className="text-xs font-medium tracking-wide uppercase text-gray-600 group-hover:text-gray-400 transition-colors">@nqsecrets</span>
            </a>
            <div className="w-full max-w-sm border-t border-white/5 pt-8 flex justify-between items-center">
                <div className="text-left">
                    <p className="text-[11px] text-gray-600">Copyright © 2026 nq secrets.</p>
                </div>
                <button onClick={() => setIsAdminOpen(true)} className="text-gray-700 hover:text-white transition-colors p-2" title="Área Administrativa">
                    <Lock className="w-4 h-4" />
                </button>
            </div>
        </div>
      </footer>

      {/* --- Modals & Slide-overs --- */}

      {/* Product Details */}
      <ProductDetailModal />

      {/* Cart Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-ios-card/95 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-500 border-l border-white/5 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-md sticky top-0 z-10">
                <h2 className="text-lg font-semibold text-white">Sacola</h2>
                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white bg-white/10 rounded-full p-1.5 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <ShoppingBag className="w-16 h-16 opacity-20 mb-4" />
                        <p>Sua sacola está vazia</p>
                    </div>
                ) : (
                    cart.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="flex gap-4 animate-fade-in">
                            <div className="w-16 h-20 bg-[#2c2c2e] rounded-lg flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                                {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : item.icon}
                            </div>
                            <div className="flex-1 py-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-white font-medium text-sm">{item.name}</h4>
                                    <button onClick={() => removeFromCart(idx)} className="text-gray-500 hover:text-red-500"><X className="w-4 h-4" /></button>
                                </div>
                                <p className="text-gray-500 text-xs mt-1">{item.selectedSize} • {item.selectedColor}</p>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-white text-sm">R$ {((item.isPromotion && item.promoPrice > 0 ? item.promoPrice : item.price)).toFixed(2).replace('.', ',')}</p>
                                    <div className="text-gray-400 text-xs bg-white/5 px-2 py-1 rounded">x{item.quantity}</div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-lg space-y-4">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Cupom de desconto" 
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-ios-blue outline-none uppercase"
                    />
                    <button onClick={handleApplyCoupon} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Applying</button>
                </div>
                
                {appliedCoupon && (
                    <div className="text-xs text-ios-green flex justify-between">
                        <span>Cupom {appliedCoupon.code} aplicado</span>
                        <span>-{appliedCoupon.discount}%</span>
                    </div>
                )}

                <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-400 text-sm">Total Estimado</span>
                    <div className="text-right">
                        {appliedCoupon && <div className="text-xs text-ios-green line-through">R$ {cartSubtotal.toFixed(2).replace('.', ',')}</div>}
                        <span className="text-xl font-bold text-white">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
                
                <button 
                    disabled={cart.length === 0}
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full bg-ios-blue text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Finalizar no WhatsApp
                </button>
            </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} zIndex={60}>
        <div className="bg-ios-card rounded-[2rem] shadow-2xl overflow-hidden text-white">
            <div className="p-6">
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold">
                        {checkoutStep === 0 && "Identificação"}
                        {checkoutStep === 1 && "Entrega"}
                        {checkoutStep === 2 && "Pagamento"}
                    </h3>
                    <div className="flex justify-center gap-2 mt-2">
                        {[0,1,2].map(s => (
                            <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s <= checkoutStep ? 'w-8 bg-ios-blue' : 'w-2 bg-gray-600'}`} />
                        ))}
                    </div>
                </div>

                <form onSubmit={handleCheckoutSubmit}>
                    {checkoutStep === 0 && (
                        <div className="space-y-4 animate-fade-in">
                            <input 
                                required 
                                autoFocus
                                placeholder="Nome Completo"
                                className="w-full bg-[#2c2c2e] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-ios-blue placeholder-gray-500"
                                value={checkoutData.name}
                                onChange={e => setCheckoutData({...checkoutData, name: e.target.value})}
                            />
                        </div>
                    )}
                    {checkoutStep === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <textarea 
                                required 
                                autoFocus
                                rows={3}
                                placeholder="Endereço Completo (Rua, Número, Bairro...)"
                                className="w-full bg-[#2c2c2e] text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-ios-blue placeholder-gray-500 resize-none"
                                value={checkoutData.address}
                                onChange={e => setCheckoutData({...checkoutData, address: e.target.value})}
                            />
                        </div>
                    )}
                    {checkoutStep === 2 && (
                         <div className="space-y-3 animate-fade-in">
                            {['PIX', 'Cartão de Crédito'].map(method => (
                                <label key={method} className="flex items-center p-4 rounded-xl bg-[#2c2c2e] cursor-pointer hover:bg-[#3a3a3c] transition-colors">
                                    <input 
                                        type="radio" 
                                        name="payment" 
                                        value={method} 
                                        checked={checkoutData.payment === method}
                                        onChange={e => setCheckoutData({...checkoutData, payment: e.target.value})}
                                        required 
                                        className="text-ios-blue bg-black focus:ring-ios-blue" 
                                    />
                                    <span className="ml-3 font-medium">{method}</span>
                                </label>
                            ))}
                         </div>
                    )}

                    <div className="flex gap-3 mt-8">
                        {checkoutStep > 0 ? (
                            <button type="button" onClick={() => setCheckoutStep(p => p - 1)} className="flex-1 py-3 text-sm text-gray-400 hover:text-white">Voltar</button>
                        ) : (
                            <button type="button" onClick={() => setIsCheckoutOpen(false)} className="flex-1 py-3 text-sm text-gray-400 hover:text-white">Cancelar</button>
                        )}
                        <button type="submit" className="flex-1 py-3 bg-ios-blue text-white font-bold rounded-xl hover:bg-blue-600 transition-colors">
                            {checkoutStep === 2 ? 'Finalizar Pedido' : 'Continuar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </Modal>

      {/* Admin Modal */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col animate-fade-in">
            {!isAdminLoggedIn ? (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-ios-card w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-white/10">
                        <h3 className="text-xl font-bold text-white mb-2 text-center">Área Administrativa</h3>
                        <p className="text-gray-500 text-sm mb-6 text-center">Senha: NEILAQUEIROZ</p>
                        <input 
                            type="password" 
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:border-ios-blue outline-none text-center tracking-widest"
                            placeholder="Senha"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                        />
                        <button onClick={handleAdminLogin} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Entrar</button>
                        <button onClick={() => setIsAdminOpen(false)} className="w-full mt-4 text-gray-500 text-sm">Cancelar</button>
                    </div>
                </div>
            ) : (
                <>
                    <header className="border-b border-white/10 p-4 flex justify-between items-center bg-ios-card/50">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Lock className="w-5 h-5 text-ios-blue" /> Painel Administrativo</h2>
                        <button onClick={() => setIsAdminOpen(false)} className="text-gray-400 hover:text-white">Sair</button>
                    </header>
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        <aside className="bg-ios-card/50 border-r border-white/5 p-4 flex md:flex-col gap-2 overflow-x-auto">
                            {[
                                { id: 'products', label: 'Produtos', icon: Grid },
                                { id: 'categories', label: 'Categorias', icon: Tag },
                                { id: 'coupons', label: 'Cupons', icon: Tag },
                                { id: 'settings', label: 'Config', icon: Settings }
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setAdminTab(tab.id as any)}
                                    className={`px-4 py-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap ${adminTab === tab.id ? 'bg-ios-blue text-white' : 'text-gray-400 hover:bg-white/5'}`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </aside>
                        
                        <main className="flex-1 overflow-y-auto p-6">
                            {adminTab === 'products' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-2xl font-bold text-white">Produtos</h3>
                                        <button 
                                            onClick={() => setEditingProduct({})} 
                                            className="bg-ios-green text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-600 flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Novo Produto
                                        </button>
                                    </div>
                                    <div className="grid gap-4">
                                        {products.map(p => (
                                            <div key={p.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5">
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-2xl overflow-hidden shrink-0">
                                                        {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : p.icon}
                                                    </div>
                                                    <div>
                                                        <h4 className={`font-bold text-white ${!p.visible ? 'opacity-50' : ''}`}>{p.name}</h4>
                                                        <p className="text-xs text-gray-400">R$ {p.price.toFixed(2)} • {p.category}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingProduct(p)} className="p-2 text-ios-blue hover:bg-white/5 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => deleteProduct(p.id)} className="p-2 text-ios-red hover:bg-white/5 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Minimal Implementation for other tabs */}
                            {adminTab === 'settings' && (
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-white">Configurações</h3>
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                        <label className="block text-sm font-bold text-gray-400 mb-3">Nome da Coleção (Hero)</label>
                                        <input 
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-ios-blue outline-none" 
                                            value={settings.collectionTitle}
                                            onChange={(e) => setSettings({...settings, collectionTitle: e.target.value})}
                                            onBlur={handleSaveSettings}
                                        />
                                        <p className="text-xs text-gray-500 mt-2">Alterações são salvas automaticamente ao sair do campo.</p>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'categories' && (
                                <div className="space-y-6">
                                     <h3 className="text-2xl font-bold text-white">Categorias</h3>
                                     <div className="space-y-2">
                                        {categories.map(c => (
                                            <div key={c.id} className="bg-white/5 p-3 rounded-lg text-white flex justify-between">
                                                <span>{c.label}</span>
                                                {c.id !== 'all' && (
                                                    <button 
                                                        onClick={async () => {
                                                            setCategories(p => p.filter(x => x.id !== c.id));
                                                            await supabase.from('categories').delete().eq('id', c.id);
                                                        }} 
                                                        className="text-red-500 text-xs"
                                                    >
                                                        Remover
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <div className="flex gap-2 pt-4">
                                            <input id="new-cat-label" placeholder="Nova Categoria" className="bg-white/5 border border-white/10 rounded px-3 py-2 text-white flex-1" />
                                            <button 
                                                onClick={async () => {
                                                    const val = (document.getElementById('new-cat-label') as HTMLInputElement).value;
                                                    if(val) {
                                                        const id = val.toLowerCase().replace(/\s/g, '-');
                                                        const newCat = { id, label: val };
                                                        setCategories([...categories, newCat]);
                                                        await supabase.from('categories').insert(newCat);
                                                        (document.getElementById('new-cat-label') as HTMLInputElement).value = '';
                                                    }
                                                }}
                                                className="bg-ios-blue px-4 rounded text-white font-bold"
                                            >Add</button>
                                        </div>
                                     </div>
                                </div>
                            )}
                        </main>
                    </div>
                </>
            )}
            
            {/* Edit Product Modal Overlay */}
            {editingProduct && (
                <div className="absolute inset-0 z-[80] bg-ios-card flex flex-col animate-fade-in">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h3 className="text-lg font-bold text-white">{editingProduct.id ? 'Editar' : 'Novo'} Produto</h3>
                        <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-white">Cancelar</button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-4 max-w-2xl mx-auto w-full pb-20">
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Nome</label>
                            <input 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-ios-blue outline-none" 
                                value={editingProduct.name || ''} 
                                onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                            />
                         </div>
                         <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Preço (R$)</label>
                                <input type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                                <select 
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white"
                                    value={editingProduct.category || categories[1]?.id}
                                    onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                                >
                                    {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id} className="text-black">{c.label}</option>)}
                                </select>
                            </div>
                         </div>
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Imagem URL (Imgur)</label>
                            <input className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" value={editingProduct.image || ''} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} placeholder="https://..." />
                         </div>
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                            <textarea rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white" value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
                         </div>
                         <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                            <label className="flex items-center gap-3">
                                <input type="checkbox" checked={editingProduct.isPromotion || false} onChange={e => setEditingProduct({...editingProduct, isPromotion: e.target.checked})} className="w-5 h-5 rounded bg-black" />
                                <span className="text-sm font-bold text-white">Em Promoção</span>
                            </label>
                            {editingProduct.isPromotion && (
                                <input type="number" step="0.01" placeholder="Preço Promocional" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white" value={editingProduct.promoPrice || ''} onChange={e => setEditingProduct({...editingProduct, promoPrice: parseFloat(e.target.value)})} />
                            )}
                         </div>
                         <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <label className="block text-sm font-bold text-white mb-3">Cores Disponíveis</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {ALL_COLORS.map(c => {
                                    const isSelected = editingProduct.colors?.includes(c.name);
                                    return (
                                        <button 
                                            key={c.name}
                                            onClick={() => {
                                                const newColors = isSelected 
                                                    ? editingProduct.colors?.filter(x => x !== c.name) 
                                                    : [...(editingProduct.colors || []), c.name];
                                                setEditingProduct({...editingProduct, colors: newColors});
                                            }}
                                            className={`border rounded-lg p-2 flex items-center gap-2 transition-colors ${isSelected ? 'border-ios-blue bg-ios-blue/10' : 'border-white/10 hover:bg-white/5'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full border border-gray-600" style={{backgroundColor: c.hex}}></div>
                                            <span className="text-xs text-gray-300">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                         </div>
                         <button onClick={handleSaveProduct} className="w-full bg-ios-blue text-white font-bold py-4 rounded-xl mt-4">Salvar Produto</button>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}