import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  CheckoutData,
  StockVariant,
  Sale,
  Color
} from './types';
import { ShoppingBag, X, Check, Lock, Grid, Tag, Settings, Plus, Trash2, Edit2, Search, Loader, Upload, Palette, Save, TrendingUp, AlertTriangle, Package, DollarSign, BarChart3, Eye, EyeOff, Calendar, User, CreditCard, Filter, RefreshCw, Sparkles } from 'lucide-react';
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
  stock: Array.isArray(p.stock) ? p.stock : [], // Map stock
  icon: p.icon || '✨',
  image: p.image,
  description: p.description || '',
  visible: p.visible ?? true,
  isPromotion: p.is_promotion ?? false,
  isMulticolor: p.is_multicolor ?? false
});

const mapProductToDB = (p: Partial<Product>) => ({
  name: p.name,
  price: p.price,
  promo_price: p.promoPrice,
  category: p.category,
  colors: p.colors,
  sizes: p.sizes,
  stock: p.stock, // Save stock
  icon: p.icon,
  image: p.image,
  description: p.description,
  visible: p.visible,
  is_promotion: p.isPromotion,
  is_multicolor: p.isMulticolor
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
  
  // Color Management State
  const [availableColors, setAvailableColors] = useState<Color[]>(ALL_COLORS);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [newColorData, setNewColorData] = useState({ name: '', hex: '#FF0000' });

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
  const [adminTab, setAdminTab] = useState<'dashboard' | 'sales' | 'products' | 'categories' | 'coupons' | 'settings'>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Sales State & Filters
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesFilterStart, setSalesFilterStart] = useState('');
  const [salesFilterEnd, setSalesFilterEnd] = useState('');
  const [salesFilterSearch, setSalesFilterSearch] = useState('');

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
        // Ensure no duplicates for 'Todos'
        const customCategories = catData.filter((c: any) => c.id !== 'all' && c.label !== 'Todos');
        setCategories([{ id: 'all', label: 'Todos' }, ...customCategories]);
      } else {
        setCategories(INITIAL_CATEGORIES);
      }

      // Fetch Colors (New: Get from DB)
      const { data: customColors } = await supabase.from('colors').select('*');
      if (customColors) {
          setAvailableColors(prev => {
              const currentNames = new Set(prev.map(c => c.name.toLowerCase()));
              const toAdd = customColors.filter((c: any) => !currentNames.has(c.name.toLowerCase()));
              return [...prev, ...toAdd];
          });
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

      // Fetch Sales (if admin is logged in, or purely on background)
      const { data: salesData } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
      if (salesData) {
        setSales(salesData);
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

  // Dashboard Metrics (Global)
  const dashboardMetrics = useMemo(() => {
      const totalProducts = products.length;
      const totalStock = products.reduce((acc, p) => acc + (p.stock?.reduce((sAcc, s) => sAcc + s.quantity, 0) || 0), 0);
      const totalValue = products.reduce((acc, p) => {
          const productStock = p.stock?.reduce((sAcc, s) => sAcc + s.quantity, 0) || 0;
          return acc + (productStock * (p.isPromotion && p.promoPrice > 0 ? p.promoPrice : p.price));
      }, 0);
      const lowStockProducts = products.filter(p => (p.stock?.reduce((sAcc, s) => sAcc + s.quantity, 0) || 0) < 5).length;
      return { totalProducts, totalStock, totalValue, lowStockProducts };
  }, [products]);

  // -- Sales Logic with Filters --
  
  const filteredSales = useMemo(() => {
      return sales.filter(sale => {
          // 1. Date Filter
          const saleDate = new Date(sale.created_at);
          // Zero out time for accurate day comparison
          saleDate.setHours(0,0,0,0);

          let dateMatch = true;
          if (salesFilterStart) {
              const startDate = new Date(salesFilterStart);
              startDate.setHours(0,0,0,0);
              // Adding timezone offset handling if necessary, but simple comparison usually works for YYYY-MM-DD
              // Ideally explicitly handle UTC vs Local, but standard Date works for same browser session
              const startDateValue = new Date(startDate.valueOf() + startDate.getTimezoneOffset() * 60000); 
              if (saleDate < startDateValue) dateMatch = false;
          }
          if (salesFilterEnd && dateMatch) {
               const endDate = new Date(salesFilterEnd);
               endDate.setHours(0,0,0,0);
               const endDateValue = new Date(endDate.valueOf() + endDate.getTimezoneOffset() * 60000);
               if (saleDate > endDateValue) dateMatch = false;
          }

          // 2. Search Filter (Product Name or Customer Name)
          let searchMatch = true;
          if (salesFilterSearch) {
              const term = salesFilterSearch.toLowerCase();
              const customerMatch = sale.customer_name.toLowerCase().includes(term);
              const itemsMatch = sale.items.some(i => i.name.toLowerCase().includes(term));
              searchMatch = customerMatch || itemsMatch;
          }

          return dateMatch && searchMatch;
      });
  }, [sales, salesFilterStart, salesFilterEnd, salesFilterSearch]);

  // Sales Insights (Dynamic based on filteredSales)
  const salesInsights = useMemo(() => {
      const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
      const totalOrders = filteredSales.length;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Calculate best selling product within the filtered range
      const productSales: {[key: string]: number} = {};
      filteredSales.forEach(sale => {
          if (Array.isArray(sale.items)) {
              sale.items.forEach(item => {
                  productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
              });
          }
      });
      
      const bestSelling = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
      
      return {
          totalRevenue,
          totalOrders,
          averageTicket,
          bestSellingProduct: bestSelling ? bestSelling[0] : 'N/A',
          bestSellingCount: bestSelling ? bestSelling[1] : 0
      };
  }, [filteredSales]);

  // -- Handlers --

  const addToCart = (product: Product, color: string, size: string) => {
    // Check Stock
    const variantStock = product.stock?.find(s => s.color === color && s.size === size)?.quantity || 0;
    const currentInCart = cart.find(i => i.id === product.id && i.selectedColor === color && i.selectedSize === size)?.quantity || 0;

    if (currentInCart + 1 > variantStock) {
        alert("Desculpe, estoque insuficiente para esta combinação.");
        return;
    }

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

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutStep < 2) {
      setCheckoutStep(prev => prev + 1);
    } else {
      // 0. Prepare Sale Data
      const saleData = {
          customer_name: checkoutData.name,
          customer_address: checkoutData.address,
          payment_method: checkoutData.payment,
          total: cartTotal,
          items: cart, // Supabase handles JSONB automatically
          created_at: new Date().toISOString()
      };

      // 1. Record Sale in Supabase
      try {
          const { error } = await supabase.from('sales').insert(saleData);
          if (error) {
              console.error("Error saving sale:", error);
              // We proceed anyway to ensure the user can buy on WhatsApp, but admin data might miss this
          } else {
              // Refresh sales list locally if success
              const { data: latestSales } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
              if (latestSales) setSales(latestSales);
          }
      } catch (err) {
          console.error("Unexpected error saving sale:", err);
      }

      // 2. Send to WhatsApp
      const whatsappNumber = "5584933004076";
      let msg = `*Pedido NQ Secrets*\n\n👤 *Cliente:* ${checkoutData.name}\n📍 *Endereço:* ${checkoutData.address}\n💳 *Pagamento:* ${checkoutData.payment}\n\n🛒 *ITENS:*`;
      cart.forEach(i => msg += `\n- ${i.quantity}x ${i.name} (${i.selectedSize}, ${i.selectedColor})`);
      
      if (appliedCoupon) {
        msg += `\n\n🏷️ *Cupom:* ${appliedCoupon.code} (-${appliedCoupon.discount}%)`;
      }
      msg += `\n\n💰 *Total:* R$ ${cartTotal.toFixed(2).replace('.', ',')}`;
      
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');

      // 3. Update Stock in Supabase
      try {
          for (const item of cart) {
              const product = products.find(p => p.id === item.id);
              if (product && product.stock) {
                  const newStock = product.stock.map(s => {
                      if (s.color === item.selectedColor && s.size === item.selectedSize) {
                          return { ...s, quantity: Math.max(0, s.quantity - item.quantity) };
                      }
                      return s;
                  });
                  
                  // Update local state first for UX
                  setProducts(prev => prev.map(p => p.id === item.id ? { ...p, stock: newStock } : p));
                  
                  // Update DB
                  await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
              }
          }
      } catch (err) {
          console.error("Error updating stock", err);
      }

      setCart([]);
      setAppliedCoupon(null);
      setIsCheckoutOpen(false);
      setCheckoutStep(0);
      setCheckoutData({ name: '', address: '', payment: '' });
      setIsCartOpen(false);
    }
  };

  const handleSaveNewColor = async () => {
    if (!newColorData.name) {
        alert("Digite o nome da cor");
        return;
    }
    
    // Check for duplicates
    if (availableColors.some(c => c.name.toLowerCase() === newColorData.name.toLowerCase())) {
        alert("Essa cor já existe!");
        return;
    }

    const newColor = { ...newColorData };
    
    // Save to Supabase
    const { error } = await supabase.from('colors').insert(newColor);

    if (error) {
        console.error('Error saving color:', error);
        alert('Erro ao salvar cor no banco de dados. Verifique se a tabela "colors" existe no Supabase.');
        return;
    }

    // Update Local State
    setAvailableColors(prev => [...prev, newColor]);
    
    setIsColorPickerOpen(false);
    setNewColorData({ name: '', hex: '#FF0000' });
    
    // Auto-select the new color if editing
    if (editingProduct) {
        setEditingProduct({
            ...editingProduct,
            colors: [...(editingProduct.colors || []), newColor.name]
        });
    }
  };
  
  // -- Helper for Dates --
  const setFilterToday = () => {
      const today = new Date().toISOString().split('T')[0];
      setSalesFilterStart(today);
      setSalesFilterEnd(today);
  }

  const setFilterMonth = () => {
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      setSalesFilterStart(firstDay);
      setSalesFilterEnd(lastDay);
  }

  const clearFilters = () => {
      setSalesFilterStart('');
      setSalesFilterEnd('');
      setSalesFilterSearch('');
  }

  // -- Admin Handlers --

  const handleAdminLogin = () => {
    if (adminPassword === "NEILAQUEIROZ") {
      setIsAdminLoggedIn(true);
      // Fetch fresh sales data on login
      supabase.from('sales').select('*').order('created_at', { ascending: false }).then(({data}) => {
          if (data) setSales(data);
      });
    } else {
      alert("Senha incorreta");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    
    setIsUploading(true);
    try {
      // Upload file to Supabase Storage bucket named 'images'
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file);
        
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
        
      if (editingProduct) {
          setEditingProduct({ ...editingProduct, image: urlData.publicUrl });
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert('Erro no upload. Verifique se o bucket "images" existe e é público no Supabase.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !editingProduct.name) return;

    // Fix: Ensure a category is selected. Fallback to the first available category if the user didn't touch the dropdown.
    const defaultCategory = categories.find(c => c.id !== 'all')?.id;
    const finalCategory = editingProduct.category || defaultCategory || 'geral';

    // Ensure Stock Structure matches selected Colors/Sizes
    let finalStock = editingProduct.stock || [];
    const colors = editingProduct.colors || [];
    const sizes = editingProduct.sizes || ['P', 'M', 'G']; // Default sizes if empty

    // 1. Remove invalid entries (colors/sizes deselected)
    finalStock = finalStock.filter(s => colors.includes(s.color) && sizes.includes(s.size));

    // 2. Add missing entries
    for (const c of colors) {
        for (const s of sizes) {
            if (!finalStock.find(item => item.color === c && item.size === s)) {
                finalStock.push({ color: c, size: s, quantity: 0 });
            }
        }
    }

    // Optimistic Update
    const tempId = editingProduct.id || Date.now();
    const newProductState = {
        ...editingProduct,
        id: tempId,
        price: Number(editingProduct.price) || 0,
        promoPrice: Number(editingProduct.promoPrice) || 0,
        category: finalCategory,
        colors: colors,
        sizes: sizes,
        stock: finalStock,
        visible: editingProduct.visible !== undefined ? editingProduct.visible : true,
        isPromotion: editingProduct.isPromotion || false,
        isMulticolor: editingProduct.isMulticolor || false
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

  const toggleProductVisibility = async (product: Product) => {
      const newStatus = !product.visible;
      // Optimistic
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, visible: newStatus } : p));
      // DB
      await supabase.from('products').update({ visible: newStatus }).eq('id', product.id);
  }

  const handleSaveSettings = async () => {
     // Assuming single row with ID 1 or UPSERT strategy
     // First try to update
     const { error } = await supabase.from('site_settings').upsert({ id: 1, collection_title: settings.collectionTitle });
     if (error) console.error(error);
  }
  
  // -- Sub-Components (Inline) --

  const ProductCard: React.FC<{ product: Product; isPromo?: boolean }> = ({ product, isPromo = false }) => {
    // Check if totally out of stock
    const totalStock = product.stock?.reduce((acc, s) => acc + s.quantity, 0) || 0;
    const isOutOfStock = totalStock === 0;

    return (
    <div 
        onClick={() => setSelectedProduct(product)}
        className={`bg-ios-card rounded-[24px] overflow-hidden group cursor-pointer border hover:bg-[#2c2c2e] transition-all relative ${isPromo ? 'border-ios-red/20 hover:border-ios-red/50 snap-center shrink-0 w-[240px]' : 'border-white/5 animate-scale-in'}`}
    >
        {isOutOfStock && (
            <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                <div className="bg-red-500/80 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 transform -rotate-12">Esgotado</div>
            </div>
        )}
        <div className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#2c2c2e] to-[#1c1c1e] ${isPromo ? 'h-[280px]' : 'aspect-[4/5]'}`}>
            {product.image ? (
                 <img src={product.image} alt={product.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
            ) : (
                <span className={`${isPromo ? 'text-5xl' : 'text-6xl'} transition-transform duration-500 group-hover:scale-110`}>{product.icon}</span>
            )}
            
            {isPromo && <div className="absolute top-3 right-3 bg-ios-red text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Promo</div>}
            
            {/* Multicolor Tag */}
            {product.isMulticolor && (
                <div className={`absolute top-3 ${isPromo ? 'left-3' : 'left-3'} bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-lg z-10 animate-fade-in`}>
                    Multicolor
                </div>
            )}
            
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
            <p className="text-gray-500 text-xs line-clamp-2 mb-2">{product.description}</p>
            
            {/* Color Tags on Card */}
            {product.colors && product.colors.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                    {product.colors.map(c => (
                        <div 
                            key={c}
                            className="w-2.5 h-2.5 rounded-full border border-white/10 shadow-[0_0_2px_rgba(0,0,0,0.5)]"
                            style={{ backgroundColor: availableColors.find(ac => ac.name.toLowerCase() === c.toLowerCase())?.hex || '#333' }}
                            title={c}
                        />
                    ))}
                    {product.colors.length > 5 && (
                        <span className="text-[9px] text-gray-500">+{product.colors.length - 5}</span>
                    )}
                </div>
            )}
        </div>
    </div>
  )};

  const ProductDetailModal = () => {
    const [color, setColor] = useState(selectedProduct?.colors[0]);
    const [size, setSize] = useState(selectedProduct?.sizes[0]);
    const modalScrollRef = useRef<HTMLDivElement>(null);
    
    // Update local state when selected product changes
    useEffect(() => {
        if (selectedProduct) {
            setColor(selectedProduct.colors[0]);
            setSize(selectedProduct.sizes[0]);
            // Scroll to top
            if(modalScrollRef.current) {
                modalScrollRef.current.scrollTop = 0;
            }
        }
    }, [selectedProduct]);

    // Related Products Logic
    const relatedProducts = useMemo(() => {
        if (!selectedProduct) return [];
        return products
            .filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id && p.visible)
            .slice(0, 4);
    }, [selectedProduct, products]);

    if (!selectedProduct) return null;

    const currentPrice = (selectedProduct.isPromotion && selectedProduct.promoPrice > 0) ? selectedProduct.promoPrice : selectedProduct.price;
    
    // Check stock for current selection
    const currentStock = selectedProduct.stock?.find(s => s.color === color && s.size === size)?.quantity || 0;
    const isOutOfStock = currentStock === 0;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProduct(null)} />
            <div className="absolute inset-y-0 right-0 max-w-md w-full flex pointer-events-none">
                 <div ref={modalScrollRef} className="pointer-events-auto w-full transform transition ease-in-out duration-500 sm:duration-700 bg-ios-card/95 backdrop-blur-xl shadow-2xl h-full flex flex-col overflow-y-scroll animate-fade-in no-scrollbar">
                    <div className="relative h-[40vh] bg-gradient-to-b from-[#2c2c2e] to-ios-card flex items-center justify-center shrink-0">
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-4 left-4 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40 transition-colors z-10">
                            <X className="w-6 h-6" />
                        </button>
                        {selectedProduct.image ? (
                             <img src={selectedProduct.image} className="w-full h-full object-cover object-top" />
                        ) : (
                            <span className="text-9xl drop-shadow-2xl animate-scale-in">{selectedProduct.icon}</span>
                        )}
                        {selectedProduct.isMulticolor && (
                            <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
                                Multicolor
                            </div>
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
                                            style={{ backgroundColor: availableColors.find(ac => ac.name.toLowerCase() === c.toLowerCase())?.hex || '#333' }}
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
                            
                            {/* Stock Status */}
                            <div className="flex items-center gap-2 text-sm">
                                <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                <span className={isOutOfStock ? 'text-red-400' : 'text-green-400'}>
                                    {isOutOfStock ? 'Esgotado nesta variação' : `${currentStock} unidades disponíveis`}
                                </span>
                            </div>

                            <div className="bg-[#2c2c2e] p-4 rounded-xl">
                                <p className="text-sm text-gray-400 leading-relaxed">{selectedProduct.description}</p>
                            </div>

                            {/* Related Products Section */}
                            {relatedProducts.length > 0 && (
                                <div className="pt-2 border-t border-white/5">
                                    <h4 className="text-white font-bold text-sm mb-4">Você também pode gostar</h4>
                                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                        {relatedProducts.map(rp => (
                                            <div 
                                                key={rp.id}
                                                onClick={() => setSelectedProduct(rp)}
                                                className="min-w-[120px] w-[120px] bg-white/5 rounded-xl p-2 cursor-pointer hover:bg-white/10 transition-colors"
                                            >
                                                <div className="aspect-[4/5] rounded-lg overflow-hidden bg-black/20 mb-2 relative">
                                                    {rp.image ? (
                                                        <img src={rp.image} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-2xl flex items-center justify-center h-full w-full">{rp.icon}</span>
                                                    )}
                                                    {rp.isPromotion && (
                                                        <span className="absolute top-1 right-1 bg-ios-red text-white text-[8px] font-bold px-1.5 py-0.5 rounded">PROMO</span>
                                                    )}
                                                    {rp.isMulticolor && (
                                                        <div className="absolute top-1 left-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Multi</div>
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium text-white line-clamp-1">{rp.name}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    R$ {(rp.isPromotion && rp.promoPrice > 0 ? rp.promoPrice : rp.price).toFixed(2).replace('.', ',')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <button 
                                disabled={isOutOfStock}
                                onClick={() => color && size && addToCart(selectedProduct, color, size)}
                                className="w-full bg-ios-blue text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-600 active:scale-95 transition-all shadow-[0_0_20px_rgba(10,132,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                {isOutOfStock ? 'Sem Estoque' : 'Adicionar à Sacola'}
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
                    <button onClick={handleApplyCoupon} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Aplicar</button>
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
                            {['Débito', 'Crédito', 'Pix'].map(method => (
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
                                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                                { id: 'sales', label: 'Vendas', icon: ShoppingBag },
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
                            {adminTab === 'dashboard' && (
                                <div className="space-y-6 animate-fade-in">
                                    <h3 className="text-2xl font-bold text-white">Visão Geral</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-gradient-to-br from-blue-900/40 to-ios-card p-6 rounded-2xl border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-500/20 rounded-xl">
                                                    <Package className="w-6 h-6 text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Total Produtos</p>
                                                    <p className="text-2xl font-bold text-white">{dashboardMetrics.totalProducts}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-green-900/40 to-ios-card p-6 rounded-2xl border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-green-500/20 rounded-xl">
                                                    <TrendingUp className="w-6 h-6 text-green-400" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Total em Estoque</p>
                                                    <p className="text-2xl font-bold text-white">{dashboardMetrics.totalStock} <span className="text-xs font-normal text-gray-400">unid.</span></p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-purple-900/40 to-ios-card p-6 rounded-2xl border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-purple-500/20 rounded-xl">
                                                    <DollarSign className="w-6 h-6 text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Valor em Estoque</p>
                                                    <p className="text-2xl font-bold text-white">R$ {dashboardMetrics.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-red-900/40 to-ios-card p-6 rounded-2xl border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-red-500/20 rounded-xl">
                                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Estoque Baixo</p>
                                                    <p className="text-2xl font-bold text-white">{dashboardMetrics.lowStockProducts} <span className="text-xs font-normal text-gray-400">prods.</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 bg-ios-card/50 border border-white/5 rounded-2xl p-6">
                                        <h4 className="text-lg font-bold text-white mb-4">Produtos com Estoque Crítico</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-400">
                                                <thead className="bg-white/5 text-gray-200 uppercase text-xs font-bold">
                                                    <tr>
                                                        <th className="p-3 rounded-tl-lg">Produto</th>
                                                        <th className="p-3">Cor</th>
                                                        <th className="p-3">Tamanho</th>
                                                        <th className="p-3 rounded-tr-lg">Quantidade</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {products.flatMap(p => 
                                                        (p.stock || []).filter(s => s.quantity < 5).map((s, idx) => (
                                                            <tr key={`${p.id}-${s.color}-${s.size}`} className="border-b border-white/5 hover:bg-white/5">
                                                                <td className="p-3 font-medium text-white">{p.name}</td>
                                                                <td className="p-3">{s.color}</td>
                                                                <td className="p-3">{s.size}</td>
                                                                <td className="p-3 font-bold text-red-400">{s.quantity}</td>
                                                            </tr>
                                                        ))
                                                    ).slice(0, 10)}
                                                    {dashboardMetrics.lowStockProducts === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-6 text-center text-gray-500">Nenhum produto com estoque crítico.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'sales' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <h3 className="text-2xl font-bold text-white">Vendas & Insights</h3>
                                    </div>
                                    
                                    {/* Filters Bar */}
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col lg:flex-row gap-4">
                                        <div className="flex flex-1 gap-2 items-center">
                                            <div className="relative flex-1 max-w-xs">
                                                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Buscar Cliente ou Produto..." 
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-ios-blue outline-none placeholder-gray-600"
                                                    value={salesFilterSearch}
                                                    onChange={(e) => setSalesFilterSearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="h-6 w-px bg-white/10 mx-2 hidden lg:block"></div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                                            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-2 py-1">
                                                <span className="text-xs text-gray-500 pl-1">De:</span>
                                                <input 
                                                    type="date" 
                                                    className="bg-transparent text-white text-sm p-1 outline-none [&::-webkit-calendar-picker-indicator]:invert"
                                                    value={salesFilterStart}
                                                    onChange={(e) => setSalesFilterStart(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-2 py-1">
                                                <span className="text-xs text-gray-500 pl-1">Até:</span>
                                                <input 
                                                    type="date" 
                                                    className="bg-transparent text-white text-sm p-1 outline-none [&::-webkit-calendar-picker-indicator]:invert"
                                                    value={salesFilterEnd}
                                                    onChange={(e) => setSalesFilterEnd(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={setFilterToday} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-gray-300 transition-colors">Hoje</button>
                                            <button onClick={setFilterMonth} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-gray-300 transition-colors">Este Mês</button>
                                            {(salesFilterStart || salesFilterEnd || salesFilterSearch) && (
                                                <button onClick={clearFilters} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                                                    <X className="w-3 h-3" /> Limpar
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Insights Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col justify-between h-32">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Faturamento (Filtrado)</p>
                                                    <h4 className="text-2xl font-bold text-white mt-1">R$ {salesInsights.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                                                </div>
                                                <div className="bg-ios-green/20 p-2 rounded-lg">
                                                    <DollarSign className="w-5 h-5 text-ios-green" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col justify-between h-32">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Pedidos</p>
                                                    <h4 className="text-2xl font-bold text-white mt-1">{salesInsights.totalOrders}</h4>
                                                </div>
                                                <div className="bg-ios-blue/20 p-2 rounded-lg">
                                                    <ShoppingBag className="w-5 h-5 text-ios-blue" />
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                Ticket Médio: R$ {salesInsights.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>

                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col justify-between h-32">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Mais Vendido</p>
                                                    <h4 className="text-lg font-bold text-white mt-1 line-clamp-1" title={salesInsights.bestSellingProduct}>{salesInsights.bestSellingProduct}</h4>
                                                </div>
                                                <div className="bg-ios-purple/20 p-2 rounded-lg">
                                                    <TrendingUp className="w-5 h-5 text-ios-purple" />
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                {salesInsights.bestSellingCount} unidades neste período
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sales Table */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mt-8">
                                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                            <h4 className="font-bold text-white">
                                                Histórico de Pedidos 
                                                <span className="text-gray-500 font-normal text-sm ml-2">({filteredSales.length} registros)</span>
                                            </h4>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-400">
                                                <thead className="bg-black/20 text-gray-200 uppercase text-xs font-bold">
                                                    <tr>
                                                        <th className="p-4">Data</th>
                                                        <th className="p-4">Cliente</th>
                                                        <th className="p-4">Resumo do Pedido</th>
                                                        <th className="p-4">Pagamento</th>
                                                        <th className="p-4 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredSales.length > 0 ? filteredSales.map((sale) => (
                                                        <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="p-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="w-3 h-3 text-gray-500" />
                                                                    {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                                                    <span className="text-xs text-gray-600">{new Date(sale.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="w-3 h-3 text-gray-500" />
                                                                    <span className="text-white font-medium">{sale.customer_name}</span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{sale.customer_address}</div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="space-y-1">
                                                                    {Array.isArray(sale.items) ? sale.items.map((item, idx) => (
                                                                        <div key={idx} className="flex gap-2 text-xs">
                                                                            <span className="text-white font-medium">{item.quantity}x</span>
                                                                            <span className="text-gray-300">{item.name}</span>
                                                                            <span className="text-gray-500 bg-white/5 px-1.5 rounded text-[10px]">{item.selectedSize}</span>
                                                                            <div className="w-2 h-2 rounded-full mt-0.5 border border-white/10" style={{ backgroundColor: availableColors.find(ac => ac.name.toLowerCase() === item.selectedColor?.toLowerCase())?.hex || '#333' }} title={item.selectedColor}></div>
                                                                        </div>
                                                                    )) : <span className="text-xs text-red-400">Erro ao ler itens</span>}
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-2">
                                                                    <CreditCard className="w-3 h-3 text-gray-500" />
                                                                    {sale.payment_method}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-right font-bold text-white text-base">
                                                                R$ {sale.total.toFixed(2).replace('.', ',')}
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan={5} className="p-8 text-center text-gray-500">
                                                                Nenhuma venda encontrada para os filtros selecionados.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                                        <p className="text-[10px] text-gray-500 mt-1">
                                                            Estoque Total: {p.stock?.reduce((a,b) => a + b.quantity, 0) || 0}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-center mr-4">
                                                        <span className="text-[10px] text-gray-500 mb-1">{p.visible ? 'Visível' : 'Oculto'}</span>
                                                        <button 
                                                            onClick={() => toggleProductVisibility(p)}
                                                            className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 relative ${p.visible ? 'bg-ios-green' : 'bg-white/10'}`}
                                                            title={p.visible ? "Ocultar do catálogo" : "Mostrar no catálogo"}
                                                        >
                                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${p.visible ? 'translate-x-4' : 'translate-x-0'}`} />
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setEditingProduct(p)} className="p-2 text-ios-blue hover:bg-white/5 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteProduct(p.id)} className="p-2 text-ios-red hover:bg-white/5 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
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
                                        {categories.filter(c => c.id !== 'all').map(c => (
                                            <div key={c.id} className="bg-white/5 p-3 rounded-lg text-white flex justify-between">
                                                <span>{c.label}</span>
                                                <button 
                                                    onClick={async () => {
                                                        setCategories(p => p.filter(x => x.id !== c.id));
                                                        await supabase.from('categories').delete().eq('id', c.id);
                                                    }} 
                                                    className="text-red-500 text-xs"
                                                >
                                                    Remover
                                                </button>
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

                            {adminTab === 'coupons' && (
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-white">Cupons de Desconto</h3>
                                    
                                    <div className="space-y-3">
                                        {coupons.map(c => (
                                            <div key={c.code} className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-ios-green/20 p-2 rounded-lg text-ios-green">
                                                        <Tag className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg tracking-wider uppercase">{c.code}</h4>
                                                        <p className="text-xs text-gray-400">{c.discount}% de desconto</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={async () => {
                                                        if(window.confirm(`Excluir o cupom ${c.code}?`)) {
                                                            setCoupons(prev => prev.filter(x => x.code !== c.code));
                                                            await supabase.from('coupons').delete().eq('code', c.code);
                                                        }
                                                    }}
                                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-white/5 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mt-8">
                                        <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide text-gray-500">Criar Novo Cupom</h4>
                                        <div className="flex gap-4 items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 mb-2">Código do Cupom</label>
                                                <input 
                                                    id="new-coupon-code"
                                                    placeholder="EX: PROMO10" 
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-ios-blue outline-none uppercase font-bold tracking-wider placeholder-gray-600" 
                                                />
                                            </div>
                                            <div className="w-32">
                                                <label className="block text-xs text-gray-500 mb-2">Desconto (%)</label>
                                                <input 
                                                    id="new-coupon-disc"
                                                    type="number" 
                                                    placeholder="10" 
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-ios-blue outline-none text-center font-bold" 
                                                />
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    const codeInput = document.getElementById('new-coupon-code') as HTMLInputElement;
                                                    const discInput = document.getElementById('new-coupon-disc') as HTMLInputElement;
                                                    
                                                    const code = codeInput.value.trim().toUpperCase();
                                                    const discount = Number(discInput.value);

                                                    if(!code || !discount) return alert('Preencha o código e o valor do desconto.');
                                                    if(coupons.some(c => c.code === code)) return alert('Este cupom já existe.');

                                                    const newCoupon = { code, discount };
                                                    
                                                    // Optimistic update
                                                    setCoupons(prev => [...prev, newCoupon]);
                                                    
                                                    // DB Insert
                                                    const { error } = await supabase.from('coupons').insert(newCoupon);
                                                    
                                                    if (error) {
                                                        console.error(error);
                                                        alert('Erro ao criar cupom. Tente novamente.');
                                                    } else {
                                                        codeInput.value = '';
                                                        discInput.value = '';
                                                    }
                                                }}
                                                className="bg-ios-blue text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-900/20"
                                            >
                                                Criar
                                            </button>
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
                            <label className="block text-xs text-gray-500 mb-1">Imagem</label>
                            
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4">
                                {editingProduct.image && (
                                    <div className="w-16 h-16 rounded bg-black/50 overflow-hidden shrink-0 border border-white/10">
                                        <img src={editingProduct.image} className="w-full h-full object-cover" alt="Preview" />
                                    </div>
                                )}
                                
                                <div className="flex-1">
                                    {isUploading ? (
                                        <div className="flex items-center gap-2 text-ios-blue animate-pulse">
                                            <Loader className="w-4 h-4 animate-spin" />
                                            <span className="text-sm">Enviando imagem...</span>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors w-fit">
                                            <Upload className="w-4 h-4" />
                                            Escolher Imagem
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handleImageUpload} 
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                            
                            {/* Fallback manual URL input if needed, or remove if strict upload only */}
                            <input 
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-xs mt-2" 
                                value={editingProduct.image || ''} 
                                onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} 
                                placeholder="Ou cole a URL manualmente..." 
                            />
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
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-bold text-white">Cores & Estoque</label>
                                <div className="flex items-center gap-3">
                                    {/* Multicolor Toggle */}
                                    <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={editingProduct.isMulticolor || false}
                                            onChange={e => setEditingProduct({...editingProduct, isMulticolor: e.target.checked})}
                                            className="hidden"
                                        />
                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors relative ${editingProduct.isMulticolor ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500' : 'bg-gray-600'}`}>
                                            <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${editingProduct.isMulticolor ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-300 uppercase">Multicolor</span>
                                    </label>

                                    <button 
                                        onClick={() => setIsColorPickerOpen(!isColorPickerOpen)} 
                                        className="text-xs flex items-center gap-1 text-ios-blue hover:text-white transition-colors font-medium bg-ios-blue/10 px-2 py-1 rounded-full border border-ios-blue/20"
                                    >
                                        {isColorPickerOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                        Nova Cor
                                    </button>
                                </div>
                            </div>
                            
                            {/* Color Picker Logic (Same as before) */}
                            {isColorPickerOpen && (
                                <div className="mb-4 bg-black/30 p-3 rounded-xl border border-white/10 animate-fade-in">
                                    <div className="flex items-end gap-3">
                                        <div>
                                            <label className="block text-[10px] text-gray-400 mb-1">Cor</label>
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white transition-colors">
                                                <input 
                                                    type="color" 
                                                    className="absolute inset-[-50%] w-[200%] h-[200%] p-0 cursor-pointer border-none outline-none" 
                                                    value={newColorData.hex}
                                                    onChange={(e) => setNewColorData({...newColorData, hex: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[10px] text-gray-400 mb-1">Nome da Cor</label>
                                            <input 
                                                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-ios-blue outline-none"
                                                placeholder="Ex: Verde Neon"
                                                value={newColorData.name}
                                                onChange={(e) => setNewColorData({...newColorData, name: e.target.value})}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSaveNewColor}
                                            className="bg-ios-blue hover:bg-blue-600 text-white p-2.5 rounded-lg transition-colors"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Color Selection Buttons */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[150px] overflow-y-auto custom-scrollbar mb-4">
                                {availableColors.map(c => {
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
                                            <div className="w-4 h-4 rounded-full border border-gray-600 shadow-sm" style={{backgroundColor: c.hex}}></div>
                                            <span className="text-xs text-gray-300 truncate w-full text-left">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Stock Quantity Inputs */}
                            {(editingProduct.colors || []).length > 0 && (
                                <div className="mt-4 border-t border-white/10 pt-4">
                                    <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">Quantidades em Estoque</label>
                                    <div className="space-y-4">
                                        {editingProduct.colors?.map(color => (
                                            <div key={color} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: availableColors.find(ac => ac.name.toLowerCase() === color.toLowerCase())?.hex || '#333'}}></div>
                                                    <span className="text-sm font-bold text-white">{color}</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {(editingProduct.sizes || ['P', 'M', 'G']).map(size => {
                                                        const stockItem = editingProduct.stock?.find(s => s.color === color && s.size === size);
                                                        const qty = stockItem ? stockItem.quantity : 0;
                                                        return (
                                                            <div key={size} className="flex flex-col gap-1">
                                                                <span className="text-[10px] text-gray-500 text-center">{size}</span>
                                                                <input 
                                                                    type="number" 
                                                                    min="0"
                                                                    className="bg-white/5 border border-white/10 rounded px-1 py-1 text-center text-white text-sm focus:border-ios-blue outline-none"
                                                                    value={qty}
                                                                    onChange={(e) => {
                                                                        const newQty = parseInt(e.target.value) || 0;
                                                                        const newStock = [...(editingProduct.stock || [])];
                                                                        const existingIdx = newStock.findIndex(s => s.color === color && s.size === size);
                                                                        
                                                                        if (existingIdx >= 0) {
                                                                            newStock[existingIdx] = { ...newStock[existingIdx], quantity: newQty };
                                                                        } else {
                                                                            newStock.push({ color, size, quantity: newQty });
                                                                        }
                                                                        setEditingProduct({ ...editingProduct, stock: newStock });
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                         </div>
                         <button disabled={isUploading} onClick={handleSaveProduct} className="w-full bg-ios-blue text-white font-bold py-4 rounded-xl mt-4 disabled:opacity-50">Salvar Produto</button>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}