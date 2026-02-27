export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  analysis: string; // 'cheap', 'fair', 'expensive'
  timestamp: number;
}

export interface ShoppingSession {
  id: string;
  name: string;
  items: Product[];
  total: number;
  timestamp: number;
}

export interface AIResponse {
  productName: string;
  price: number;
  category: string;
  analysis: 'barato' | 'justo' | 'caro';
  suggestion: string;
}

export interface Tip {
  title: string;
  content: string;
  type: 'recipe' | 'finance' | 'household';
}
