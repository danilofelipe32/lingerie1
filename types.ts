export interface Product {
  id: number;
  name: string;
  price: number;
  promoPrice: number;
  category: string;
  colors: string[];
  sizes: string[];
  stock: StockVariant[]; // Novo campo de estoque
  icon: string;
  image?: string;
  description: string;
  visible: boolean;
  isPromotion: boolean;
  isMulticolor?: boolean; // Novo campo Multicolor
}

export interface StockVariant {
  color: string;
  size: string;
  quantity: number;
}

export interface Category {
  id: string;
  label: string;
}

export interface Coupon {
  code: string;
  discount: number;
}

export interface Color {
  name: string;
  hex: string;
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

// Interface para o histórico de vendas
export interface Sale {
  id: number;
  created_at: string;
  customer_name: string;
  customer_address: string;
  payment_method: string;
  total: number;
  items: CartItem[]; // Itens salvos como JSON
}

export const ALL_COLORS: Color[] = [
  { name: "Preto", hex: "#000000" },
  { name: "Branco", hex: "#FFFFFF" },
  { name: "Vermelho", hex: "#C21807" },   // Vermelho Sangue
  { name: "Vinho", hex: "#560319" },      // Vinho Escuro
  { name: "Azul", hex: "#0F172A" },       // Azul Meia Noite
  { name: "Nude", hex: "#EBC8B2" },       // Nude Clássico
  { name: "Bordeaux", hex: "#4C0519" },   // Bordeaux Intenso
  { name: "Cacau", hex: "#3F2318" },      // Marrom Café
  { name: "Pérola", hex: "#F4E9D7" },     // Off-white Creme
  { name: "Rubi", hex: "#900603" },       // Vermelho Rubi
  { name: "Violeta", hex: "#4C1D95" },    // Violeta Profundo
  { name: "Rosa", hex: "#F472B6" },       // Rosa Romântico
  { name: "Rosa Chá", hex: "#d18e97" },
  { name: "Lavanda", hex: "#A78BFA" },
  { name: "Verde Esmeralda", hex: "#065f46" },
  { name: "Coral", hex: "#fb7185" },
  { name: "Marsala", hex: "#702F3B" }
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
    stock: [
        { color: "Preto", size: "P", quantity: 5 },
        { color: "Preto", size: "M", quantity: 5 },
        { color: "Preto", size: "G", quantity: 5 },
        { color: "Preto", size: "GG", quantity: 5 },
        { color: "Vinho", size: "P", quantity: 5 },
        { color: "Vinho", size: "M", quantity: 5 },
        { color: "Vinho", size: "G", quantity: 5 },
        { color: "Vinho", size: "GG", quantity: 5 }
    ],
    icon: "🖤", 
    description: "Sofisticação em cada detalhe. Renda francesa premium.", 
    visible: true, 
    isPromotion: false,
    isMulticolor: false
  },
  { 
    id: 2, 
    name: "Sutiã Velvet", 
    price: 99.90, 
    promoPrice: 0, 
    category: "sutias", 
    colors: ["Bordeaux", "Preto"], 
    sizes: ["P", "M", "G", "GG"], 
    stock: [
        { color: "Bordeaux", size: "P", quantity: 3 },
        { color: "Bordeaux", size: "M", quantity: 0 }, // Exemplo sem estoque
        { color: "Bordeaux", size: "G", quantity: 3 },
        { color: "Bordeaux", size: "GG", quantity: 3 },
        { color: "Preto", size: "P", quantity: 3 },
        { color: "Preto", size: "M", quantity: 3 },
        { color: "Preto", size: "G", quantity: 3 },
        { color: "Preto", size: "GG", quantity: 3 }
    ],
    icon: "✨", 
    description: "Acabamento em veludo. Modelagem perfeita.", 
    visible: true, 
    isPromotion: false,
    isMulticolor: false 
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