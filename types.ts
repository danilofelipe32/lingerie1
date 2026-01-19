export interface Product {
  id: number;
  name: string;
  price: number;
  promoPrice: number;
  category: string;
  colors: string[];
  sizes: string[];
  icon: string;
  image?: string;
  description: string;
  visible: boolean;
  isPromotion: boolean;
}

export interface Category {
  id: string;
  label: string;
}

export interface Coupon {
  code: string;
  discount: number;
}

export interface CartItem extends Product {
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

export interface SiteSettings {
  collectionTitle: string;
}

export interface CheckoutData {
  name: string;
  address: string;
  payment: string;
}

export const ALL_COLORS = [
  { name: "Preto", hex: "#111111" },
  { name: "Branco", hex: "#FFFFFF" },
  { name: "Vermelho", hex: "#DC2626" },
  { name: "Vinho", hex: "#4a0404" },
  { name: "Azul", hex: "#191970" },
  { name: "Nude", hex: "#d4a574" },
  { name: "Bordeaux", hex: "#800020" },
  { name: "Cacau", hex: "#3e2723" },
  { name: "Pérola", hex: "#eae0c8" },
  { name: "Rubi", hex: "#9b111e" },
  { name: "Violeta", hex: "#2e003e" },
  { name: "Rosa", hex: "#ffc0cb" }
];

export const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 1, 
    name: "Conjunto Renda Noir", 
    price: 189.90, 
    promoPrice: 0, 
    category: "conjuntos", 
    colors: ["Preto", "Vinho"], 
    sizes: ["P", "M", "G", "GG"], 
    icon: "🖤", 
    description: "Sofisticação em cada detalhe. Renda francesa premium.", 
    visible: true, 
    isPromotion: false 
  },
  { 
    id: 2, 
    name: "Sutiã Velvet", 
    price: 99.90, 
    promoPrice: 0, 
    category: "sutias", 
    colors: ["Bordeaux", "Preto"], 
    sizes: ["P", "M", "G", "GG"], 
    icon: "✨", 
    description: "Acabamento em veludo. Modelagem perfeita.", 
    visible: true, 
    isPromotion: false 
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'all', label: 'Todos' },
  { id: 'conjuntos', label: 'Conjuntos' },
  { id: 'sutias', label: 'Sutiãs' },
  { id: 'calcinhas', label: 'Calcinhas' },
  { id: 'bodies', label: 'Bodies' },
  { id: 'camisolas', label: 'Camisolas' }
];

export const INITIAL_COUPONS: Coupon[] = [
  { code: "BELLE10", discount: 10 }
];
