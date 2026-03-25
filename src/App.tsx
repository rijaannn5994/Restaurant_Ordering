/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, 
  LogOut, 
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Search,
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  LayoutDashboard,
  Menu as MenuIcon,
  X,
  Bell,
  Phone,
  Eye,
  EyeOff,
  Edit,
  ImageIcon,
  Tags,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  User,
  handleFirestoreError,
  OperationType,
  storage,
  ref,
  uploadBytes,
  getDownloadURL
} from './firebase';
import { Toaster, toast } from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subCategory?: string;
  image: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: CartItem[];
  totalAmount: number;
  discountApplied?: number;
  status: 'pending' | 'preparing' | 'ready' | 'collected' | 'cancelled';
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'customer';
}

interface Category {
  id: string;
  name: string;
}

// --- Initial Static Menu Data ---

const INITIAL_MENU: Omit<MenuItem, 'id'>[] = [
  { name: 'Mixed Seaweed Salad', description: 'Seaweed with Japanese dressing', price: 6.90, category: 'Starters', subCategory: 'Salad', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop' },
  { name: 'Edamame', description: 'Served hot or chilled, green soya beans with salt', price: 4.00, category: 'Starters', subCategory: 'Edamame', image: 'https://images.unsplash.com/photo-1581184953963-d15972933db1?w=800&auto=format&fit=crop' },
  { name: 'Chicken Gyoza', description: 'Japanese style grilled chicken dumplings filled with vegetables', price: 6.90, category: 'Starters', subCategory: 'Gyoza', image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=800&auto=format&fit=crop' },
  { name: 'Takoyaki', description: 'Deepfried octopus balls with tonkatsu sauce, mayonnaise', price: 8.90, category: 'Starters', subCategory: 'Takoyaki', image: 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=800&auto=format&fit=crop' },
  { name: 'Chicken Teriyaki Bento', description: 'Teriyaki chicken and vegetables on rice with teriyaki sauce', price: 20.90, category: 'Bento', subCategory: 'Chicken', image: 'https://images.unsplash.com/photo-1580828369062-81781f8f7c9e?w=800&auto=format&fit=crop' },
  { name: 'Salmon Teriyaki Bento', description: 'Teriyaki salmon and vegetables on rice with teriyaki sauce', price: 21.90, category: 'Bento', subCategory: 'Salmon', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop' },
  { name: 'Chicken Teri Don', description: 'Grilled, deep-fried chicken with mix veg, and homemade teriyaki sauce on rice', price: 12.90, category: 'Donburi', subCategory: 'Chicken', image: 'https://images.unsplash.com/photo-1627914800362-e6e7d6cf6a09?w=800&auto=format&fit=crop' },
  { name: 'Chicken Katsu Curry', description: 'Udon noodles or rice with deep fried breaded chicken breast in curry sauce', price: 14.90, category: 'Curry', subCategory: 'Chicken', image: 'https://images.unsplash.com/photo-1591814448473-7027b5156522?w=800&auto=format&fit=crop' },
  { name: 'Tonkotsu Ramen', description: 'Noodles in pork bone soup with pork charsiu, beansprouts, seaweed', price: 14.90, category: 'Ramen', subCategory: 'Pork', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop' },
  { name: 'Tan Tan Ramen', description: 'Creamy tantamen ramen, sesame broth and spicy ground minced pork', price: 14.90, category: 'Ramen', subCategory: 'Spicy', image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800&auto=format&fit=crop' },
  { name: 'Prawn Tempura Udon', description: 'Hot udon noodle soup made of dashi-based broth with 2 prawn tempura', price: 12.90, category: 'Udon', subCategory: 'Tempura', image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&auto=format&fit=crop' },
  { name: 'Chicken Yakisoba', description: 'Japanese style stir fried noodles with chicken and vegetables', price: 13.90, category: 'Yakisoba', subCategory: 'Chicken', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&auto=format&fit=crop' },
  { name: 'Tuna (Bluefin) Nigiri', description: 'Raw fish, seafood, vegetable on vinegared rice', price: 3.50, category: 'Sushi', subCategory: 'Nigiri', image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&auto=format&fit=crop' },
  { name: 'Salmon Avocado Roll', description: 'Inside out roll with sesame seeds on top', price: 9.90, category: 'Sushi', subCategory: 'Ura Maki', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop' },
  { name: 'Crunchy Catford Roll', description: 'Snowcrab, avocado, kanpyo, tobiko, soya-mayo, tempura flakes', price: 18.90, category: 'Sushi', subCategory: 'Special Roll', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&auto=format&fit=crop' },
  { name: 'Lychee Martini', description: 'Doghouse Distillery vodka, lychee juice, lychee liqueur, coconut syrup', price: 8.90, category: 'Drinks', subCategory: 'Cocktail', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&auto=format&fit=crop' },
  { name: 'Asahi Draught Beer', description: '1 pint', price: 6.90, category: 'Drinks', subCategory: 'Beer', image: 'https://images.unsplash.com/photo-1614614214537-567f6a00a12e?w=800&auto=format&fit=crop' },
  { name: 'Matcha Green Tea Cheesecake', description: 'Creamy cheesecake infused with premium Japanese matcha powder.', price: 7.50, category: 'Dessert', subCategory: 'Cake', image: 'https://images.unsplash.com/photo-1621841957884-1210fe19d66d?w=800&auto=format&fit=crop' }
];

// --- Components ---

const Button = ({ children, onClick, className, variant = 'primary', disabled = false, type = 'button' }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success', disabled?: boolean, key?: React.Key, type?: 'button' | 'submit' | 'reset' }) => {
  const variants = {
    primary: 'bg-yellow-500 text-zinc-900 hover:bg-yellow-600',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800',
    outline: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 flex items-center justify-center gap-2',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      type={type}
      className={cn(
        'px-4 py-2 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void, key?: React.Key }) => (
  <div 
    onClick={onClick}
    className={cn('bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden', className)}
  >
    {children}
  </div>
);

const Badge = ({ children, variant = 'neutral' }: { children: React.ReactNode, variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    neutral: 'bg-zinc-100 text-zinc-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', variants[variant])}>
      {children}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  
  const [view, setView] = useState<'home' | 'menu' | 'cart' | 'orders' | 'admin' | 'notifications'>('home');
  const [adminView, setAdminView] = useState<'dashboard' | 'orders' | 'menu' | 'categories'>('dashboard'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Search & Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Auth Modal State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signUpName, setSignUpName] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');

  // Profile Edit State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  
  // Menu Item Management
  const [newItem, setNewItem] = useState<Omit<MenuItem, 'id'>>({
    name: '', description: '', price: 0, category: 'Sushi', subCategory: '', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&auto=format&fit=crop'
  });
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);

  // Category Management
  const [catName, setCatName] = useState('');
  const [editCatId, setEditCatId] = useState<string | null>(null);

  // Discount Management
  const [discountInput, setDiscountInput] = useState<string>('0');

  // --- Initial Data Loaders ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            setProfile(data);
            setEditName(data.displayName || '');
            setEditPhone(data.phoneNumber || '');
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || email.split('@')[0] || 'User',
              email: currentUser.email || email,
              phoneNumber: '', 
              role: currentUser.email === 'rijanmhj2075@gmail.com' ? 'admin' : 'customer',
            };
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            setProfile(newProfile);
            setEditName(newProfile.displayName);
            setEditPhone('');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [email]);

  useEffect(() => {
    const unsubMenu = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      if (menuData.length === 0 && profile?.role === 'admin') {
        INITIAL_MENU.forEach(async (item) => { await addDoc(collection(db, 'menu'), item); });
      }
      setMenu(menuData);
    });

    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Category));
      if (cats.length === 0 && profile?.role === 'admin') {
        const defaultCats = ['Starters', 'Sides', 'Sushi', 'Sashimi', 'Bento', 'Donburi', 'Curry', 'Ramen', 'Udon', 'Yakisoba', 'Drinks', 'Dessert'];
        defaultCats.forEach(async (c) => { await addDoc(collection(db, 'categories'), { name: c }); });
      } else {
        setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'store'), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDiscount(data.globalDiscount || 0);
          setDiscountInput((data.globalDiscount || 0).toString());
        }
      }, 
      (error) => {
        console.log("Settings access controlled by rules.");
      }
    );

    return () => { unsubMenu(); unsubCats(); unsubSettings(); };
  }, [profile]);

  // Derived Filtered & Grouped Menu
  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [menu, selectedCategory, searchQuery]);

  const groupedMenu = useMemo(() => {
    return filteredMenu.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [filteredMenu]);

  const scrollCategories = (dir: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      categoryScrollRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const toggleSection = (cat: string) => {
    setCollapsedSections(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // --- Orders Loading & Live Notifications ---
  const prevOrdersRef = useRef<Order[]>([]);
  useEffect(() => {
    if (!user || !profile) return;
    let q = profile.role === 'admin' 
      ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      if (prevOrdersRef.current.length > 0 && fetchedOrders.length > 0) {
        if (profile.role === 'admin') {
          const newOrders = fetchedOrders.filter(o => !prevOrdersRef.current.find(po => po.id === o.id));
          newOrders.forEach(o => toast.success(`New order #${o.id.slice(-6)} received from ${o.customerName}!`));
        } else if (profile.role === 'customer') {
          fetchedOrders.forEach(o => {
            const prev = prevOrdersRef.current.find(po => po.id === o.id);
            if (prev && prev.status !== o.status) {
              if (o.status === 'ready') toast.success(`Good news! Your order #${o.id.slice(-6)} is ready for collection! 🍱`, { duration: 6000 });
              else if (o.status === 'collected') toast.success(`Order #${o.id.slice(-6)} has been collected. Enjoy your meal! 😋`, { duration: 6000 });
              else toast.success(`Your order #${o.id.slice(-6)} is now ${o.status}!`);
            }
          });
        }
      }
      prevOrdersRef.current = fetchedOrders;
      setOrders(fetchedOrders);
    });
    return unsubscribe;
  }, [user, profile]);

  const userNotifications = useMemo(() => {
    if (!profile) return [];
    if (profile.role === 'admin') {
      return orders.filter(o => o.status === 'pending').map(o => ({
        id: o.id, title: 'New Collection Order', message: `Order #${o.id.slice(-6)} from ${o.customerName} is waiting.`, time: o.createdAt?.toDate()
      }));
    } else {
      return orders.filter(o => o.status === 'preparing' || o.status === 'ready').map(o => ({
        id: o.id, 
        title: o.status === 'ready' ? 'Order Ready for Collection!' : 'Order Status Updated',
        message: o.status === 'ready' ? `Your collection order #${o.id.slice(-6)} is ready to be picked up.` : `Your order #${o.id.slice(-6)} is now ${o.status}.`,
        time: o.createdAt?.toDate()
      }));
    }
  }, [orders, profile]);

  // --- Cart Calculations ---
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const discountAmount = useMemo(() => cartSubtotal * (discount / 100), [cartSubtotal, discount]);
  const cartTotal = cartSubtotal - discountAmount;

  // --- Auth Actions ---
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please enter email and password");
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Logged in successfully');
      } else {
        if (!signUpName || !signUpPhone) return toast.error("Please provide your name and phone number");
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const newProfile: UserProfile = {
          uid: userCred.user.uid, displayName: signUpName, email: email, phoneNumber: signUpPhone, role: email === 'rijanmhj2075@gmail.com' ? 'admin' : 'customer',
        };
        await setDoc(doc(db, 'users', userCred.user.uid), newProfile);
        setProfile(newProfile);
        toast.success('Account created successfully');
      }
      setIsAuthOpen(false); setEmail(''); setPassword(''); setSignUpName(''); setSignUpPhone('');
    } catch (error: any) { toast.error(`Authentication failed: ${error.message}`); }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Logged in successfully');
      setIsAuthOpen(false);
    } catch (error: any) { toast.error(`Login failed: ${error.message}`); }
  };

  const handleLogout = async () => { await signOut(auth); setView('home'); toast.success('Logged out'); };

  // --- Customer Actions ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { displayName: editName, phoneNumber: editPhone }, { merge: true });
      setProfile(prev => prev ? { ...prev, displayName: editName, phoneNumber: editPhone } : null);
      toast.success('Personal details updated successfully!');
    } catch (error) { toast.error('Failed to update details.'); }
  };

  const placeOrder = async () => {
    if (!user || !profile) return setIsAuthOpen(true);
    if (cart.length === 0) return;
    if (!profile.displayName || !profile.phoneNumber) {
      toast.error('Please update your Name and Phone Number in "My Orders" before placing an order.', { duration: 5000 });
      return setView('orders');
    }
    try {
      const orderData: Omit<Order, 'id'> = {
        userId: user.uid, customerName: profile.displayName, customerEmail: profile.email, customerPhone: profile.phoneNumber,
        items: cart, totalAmount: cartTotal, discountApplied: discount, status: 'pending', createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'orders'), orderData);
      setCart([]); setView('orders'); toast.success('Collection Order placed successfully!');
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'orders'); }
  };

  // --- Admin Actions ---
  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try { 
      const orderRef = doc(db, 'orders', orderId);
      await setDoc(orderRef, { status: status }, { merge: true }); 
      toast.success(`Order successfully marked as ${status}`);
    } catch (error: any) { 
      console.error("Order update error:", error);
      toast.error(`Failed to update status: Insufficient Permissions.`); 
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this order?")) {
      try { await deleteDoc(doc(db, 'orders', orderId)); toast.success("Order deleted successfully");
      } catch (error) { toast.error("Failed to delete order"); }
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return toast.error('Please wait for the image to finish uploading');
    if (!newItem.name || newItem.price <= 0 || !newItem.category) return toast.error('Please fill in all required fields');
    
    try {
      if (editingMenuItemId) { 
        await setDoc(doc(db, 'menu', editingMenuItemId), newItem); 
        toast.success('Menu item updated successfully');
      } else { 
        await addDoc(collection(db, 'menu'), newItem); 
        toast.success('Menu item added successfully'); 
      }
      resetMenuForm();
    } catch (error) { handleFirestoreError(error, editingMenuItemId ? OperationType.UPDATE : OperationType.CREATE, 'menu'); }
  };
  
  const handleDeleteMenuItem = async (id: string) => {
    if (window.confirm("Delete this menu item?")) {
      try { await deleteDoc(doc(db, 'menu', id)); toast.success('Menu item deleted');
      } catch (error) { toast.error('Failed to delete item'); }
    }
  };
  
  const handleEditMenuClick = (item: MenuItem) => {
    setEditingMenuItemId(item.id);
    setNewItem({ name: item.name, description: item.description, price: item.price, category: item.category, subCategory: item.subCategory || '', image: item.image });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const resetMenuForm = () => {
    setEditingMenuItemId(null);
    setNewItem({ name: '', description: '', price: 0, category: categories.length > 0 ? categories[0].name : 'Starters', subCategory: '', image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&auto=format&fit=crop' });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      if (editCatId) { await setDoc(doc(db, 'categories', editCatId), { name: catName }, { merge: true }); toast.success('Category updated');
      } else { await addDoc(collection(db, 'categories'), { name: catName }); toast.success('Category added'); }
      setCatName(''); setEditCatId(null);
    } catch (error) { toast.error('Error saving category'); }
  };

  const handleDeleteCategory = async (id: string) => {
    if(window.confirm("Delete category?")) {
      try { await deleteDoc(doc(db, 'categories', id)); toast.success('Category deleted');
      } catch (error) { toast.error('Error deleting category'); }
    }
  }

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(discountInput);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      try {
        await setDoc(doc(db, 'settings', 'store'), { globalDiscount: val }, { merge: true });
        toast.success(`${val}% Store-wide Discount applied!`, { duration: 5000 });
      } catch (error: any) {
        toast.error(`Permissions error: Could not update discount.`);
      }
    } else { toast.error('Enter 0-100'); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Max 2MB');
    setIsUploading(true);
    const storageRef = ref(storage, `menu/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setNewItem(prev => ({ ...prev, image: downloadURL }));
      toast.success('Image uploaded successfully');
    } catch (error) { toast.error('Failed to upload image'); } 
    finally { setIsUploading(false); }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
          <img src="/tarologo.png" alt="Loading..." className="h-24 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <Toaster position="top-center" />
      
      {/* --- Yellow Navigation --- */}
      <nav className="sticky top-0 z-50 bg-yellow-400 border-b border-yellow-500 px-4 md:px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <img src="/logo.png" alt="Brand Logo" className="h-13 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => setView('home')} className={cn('text-sm font-bold transition-colors hover:text-white', view === 'home' ? 'text-zinc-900' : 'text-zinc-700')}>Home</button>
            <button onClick={() => setView('menu')} className={cn('text-sm font-bold transition-colors hover:text-white', view === 'menu' ? 'text-zinc-900' : 'text-zinc-700')}>Menu</button>
            {/* Hide My Orders from Admin Nav */}
            {user && profile?.role !== 'admin' && <button onClick={() => setView('orders')} className={cn('text-sm font-bold transition-colors hover:text-white', view === 'orders' ? 'text-zinc-900' : 'text-zinc-700')}>My Orders</button>}
            {profile?.role === 'admin' && <button onClick={() => {setView('admin'); setAdminView('dashboard');}} className={cn('text-sm font-bold transition-colors hover:text-white', view === 'admin' ? 'text-zinc-900' : 'text-zinc-700')}>Admin Dashboard</button>}
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            {user && (
              <button 
                onClick={() => setView('notifications')}
                className="relative p-2 text-zinc-800 hover:text-white transition-colors"
              >
                <Bell size={24} />
                {userNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
                    {userNotifications.length}
                  </span>
                )}
              </button>
            )}

            {/* Shopping Cart - Hidden for Admins */}
            {profile?.role !== 'admin' && (
              <button 
                onClick={() => setView('cart')}
                className="relative p-2 text-zinc-800 hover:text-white transition-colors"
              >
                <ShoppingBag size={24} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-zinc-900 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-yellow-500/30">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-bold text-zinc-900">{profile?.displayName}</p>
                  <p className="text-[10px] text-zinc-700 capitalize">{profile?.role}</p>
                </div>
                <button onClick={handleLogout} className="p-2 text-zinc-800 hover:text-red-600 transition-colors"><LogOut size={20} /></button>
              </div>
            ) : (
              <Button onClick={() => setIsAuthOpen(true)} className="hidden md:block bg-zinc-900 text-white hover:bg-zinc-800">Login / Sign Up</Button>
            )}

            <button className="md:hidden p-2 text-zinc-900 hover:text-white transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </nav>

      {/* --- Authentication Modal --- */}
      <AnimatePresence>
        {isAuthOpen && (
          <div className="fixed inset-0 z-[60] bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
              <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 z-10"><X size={20} /></button>
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black tracking-tight">{authMode === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}</h2>
                  <p className="text-zinc-500 text-sm">{authMode === 'login' ? 'Enter your details to access your account' : 'Join us for delicious Japanese cuisine'}</p>
                </div>
                <div className="flex p-1 bg-zinc-100 rounded-lg">
                  <button onClick={() => setAuthMode('login')} className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all", authMode === 'login' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900")}>Login</button>
                  <button onClick={() => setAuthMode('signup')} className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all", authMode === 'signup' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900")}>Sign Up</button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Full Name</label>
                        <input type="text" required value={signUpName} onChange={(e) => setSignUpName(e.target.value)} className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-zinc-400">Phone Number</label>
                        <input type="tel" required value={signUpPhone} onChange={(e) => setSignUpPhone(e.target.value)} className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" placeholder="07123456789" />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Email Address</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" placeholder="you@example.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-400">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 pr-10 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none transition-all" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full py-3">{authMode === 'login' ? 'Sign In' : 'Create Account'}</Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-zinc-400 uppercase font-bold tracking-widest">Or continue with</span></div>
                </div>

                <Button variant="outline" onClick={handleGoogleLogin} className="w-full py-3">
                   <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                   Google
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Mobile Menu --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="md:hidden fixed inset-0 z-40 bg-white pt-24 px-8">
            <div className="flex flex-col gap-6 text-2xl font-bold">
              <button onClick={() => { setView('home'); setIsMenuOpen(false); }}>Home</button>
              <button onClick={() => { setView('menu'); setIsMenuOpen(false); }}>Menu</button>
              {user && profile?.role !== 'admin' && <button onClick={() => { setView('orders'); setIsMenuOpen(false); }}>My Orders & Profile</button>}
              {user && <button onClick={() => { setView('notifications'); setIsMenuOpen(false); }}>Notifications</button>}
              {profile?.role === 'admin' && <button onClick={() => { setView('admin'); setIsMenuOpen(false); }}>Admin Dashboard</button>}
              {!user && <button onClick={() => { setIsAuthOpen(true); setIsMenuOpen(false); }} className="text-yellow-500">Login / Sign Up</button>}
              {user && <button onClick={handleLogout} className="text-red-600">Logout</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Views --- */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* Home View */}
        {view === 'home' && (
          <div className="space-y-24">
            <section className="flex flex-col md:flex-row items-center gap-12 pt-12">
              <div className="flex-1 space-y-6">
                <Badge variant="warning">Taro Japanese Restaurant</Badge>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
                  <span className="text-yellow-300">TARO.</span><br />FRESH.<br />TRADITIONAL.<br /><span className="text-yellow-500">FLAVOR.</span>
                </h1>
                <p className="text-zinc-500 text-lg max-w-md">
                  Experience the finest Japanese dining. Order online for quick and easy collection.
                </p>
                <div className="flex gap-4">
                  <Button onClick={() => setView('menu')} className="px-8 py-4 text-lg">Order Now</Button>
                  <Button variant="outline" className="px-8 py-4 text-lg">
                    <a href="/Taro-catford-menu-24Oct2025.pdf" target="_blank" rel="noopener noreferrer">View Menu</a>
                  </Button>
                </div>  
              </div>
              <div className="flex-1 relative">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl overflow-hidden shadow-2xl rotate-3">
                  <img src="https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&auto=format&fit=crop" alt="Sushi" className="w-full h-[500px] object-cover" referrerPolicy="no-referrer" />
                </motion.div>
                <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-zinc-100 -rotate-6">
                  <p className="text-3xl font-black text-yellow-500">4.9/5</p>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Customer Rating</p>
                </div>
              </div>
            </section>

            <section className="space-y-12">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2">Popular Choices</p>
                  <h2 className="text-4xl font-black tracking-tight">CHEF'S SPECIALS</h2>
                </div>
                <Button variant="outline" onClick={() => setView('menu')}>View Full Menu <ChevronRight size={16} className="inline ml-1" /></Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {menu.slice(0, 3).map((item) => (
                  <Card key={item.id} className="group cursor-pointer" onClick={() => addToCart(item)}>
                    <div className="h-64 overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                    </div>
                    <div className="p-6 space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <p className="font-black text-yellow-500">£{item.price.toFixed(2)}</p>
                      </div>
                      <p className="text-sm text-zinc-500 line-clamp-2">{item.description}</p>
                      <div className="pt-4">
                        <Button variant="secondary" className="w-full bg-zinc-900 text-white">Add to Cart</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Menu View with Search, Scrolling Categories, and Collapsible Sections */}
        {view === 'menu' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            
            {/* Category & Search Toolbar */}
            <div className="flex items-center gap-4 border-b border-zinc-200 pb-4 sticky top-[72px] bg-zinc-50 z-40 pt-4">
              
              {/* overflow-x-auto added, flex-wrap removed, and scrollbars hidden */}
              <div className="flex-1 flex gap-3 overflow-x-auto scroll-smooth snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {['All', ...categories.map(c => c.name)].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "snap-start whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all border",
                      selectedCategory === cat 
                        ? "bg-[#FFDE59] text-black border-[#FFDE59] shadow-sm" // Active Yellow State
                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-yellow-50 hover:border-[#FFDE59] hover:text-black" // Hover State
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 text-zinc-600 hover:text-black shrink-0">
                <Search size={24} />
              </button>
            </div>

            {/* Search Input Dropdown */}
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-shown">
                  <input 
                    type="text" 
                    placeholder="Search menu items..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-4 text-lg border border-zinc-300 rounded-xl focus:ring-2 focus:ring-black outline-none mb-4"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Menu Sections */}
            {Object.keys(groupedMenu).length === 0 ? (
              <div className="text-center py-20 text-zinc-500">No items found.</div>
            ) : (
              Object.entries(groupedMenu).map(([categoryName, items]) => (
                <div key={categoryName} className="space-y-4 pt-4">
                  {/* Section Header */}
                  <div 
                    className="flex justify-between items-center cursor-pointer group border-b border-zinc-100 pb-2"
                    onClick={() => toggleSection(categoryName)}
                  >
                    <div>
                      <h2 className="text-2xl font-normal tracking-wide text-zinc-900">{categoryName.toUpperCase()}</h2>
                    </div>
                    <button className="text-zinc-500 group-hover:text-black transition-colors p-2 bg-zinc-100 rounded-full">
                      {collapsedSections[categoryName] ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                    </button>
                  </div>

                  {/* Section Items Grid */}
                  {!collapsedSections[categoryName] && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map(m => (
                        <Card key={m.id} className="flex flex-col border border-zinc-200 rounded-lg shadow-none hover:shadow-md transition-shadow h-full bg-white relative">
                          {m.image && <img src={m.image} className="w-full h-48 object-cover rounded-t-lg" referrerPolicy="no-referrer" />}
                          <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-medium text-lg text-zinc-900 leading-tight">{m.name}</h3>
                            <p className="text-sm text-zinc-500 mt-2 line-clamp-3 flex-1">{m.description}</p>
                            <div className="flex justify-between items-end mt-6">
                              <span className="font-medium text-lg">£{m.price.toFixed(2)}</span>
                              {profile?.role !== 'admin' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); addToCart(m); }} 
                                  className="bg-black text-white p-2 rounded-full hover:bg-zinc-800 transition-transform active:scale-95"
                                >
                                  <Plus size={20}/>
                                </button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Cart View */}
        {view === 'cart' && profile?.role !== 'admin' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl font-black tracking-tight">YOUR CART</h2>
            
            {cart.length === 0 ? (
              <div className="text-center py-24 space-y-6 bg-white rounded-3xl border border-dashed border-zinc-300">
                <div className="bg-zinc-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                  <ShoppingBag size={40} />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold">Your cart is empty</p>
                  <p className="text-zinc-500">Looks like you haven't added anything yet.</p>
                </div>
                <Button onClick={() => setView('menu')}>Browse Menu</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {cart.map((item) => (
                    <Card key={item.id} className="flex items-center p-4 gap-4">
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <h3 className="font-bold">{item.name}</h3>
                        <p className="text-sm text-yellow-500 font-bold">£{item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-zinc-100 rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-yellow-500"><Minus size={16} /></button>
                        <span className="font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-yellow-500"><Plus size={16} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-zinc-400 hover:text-red-600 p-2"><Trash2 size={20} /></button>
                    </Card>
                  ))}
                </div>
                
                <div className="space-y-6">
                  <Card className="p-6 space-y-6">
                    <h3 className="font-bold text-xl">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Subtotal</span>
                        <span className="font-bold">£{cartSubtotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span className="font-bold">Store Discount ({discount}%)</span>
                          <span className="font-bold">-£{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Collection</span>
                        <span className="text-green-600 font-bold">FREE</span>
                      </div>
                      <div className="border-t border-zinc-100 pt-4 mt-4 flex justify-between text-lg font-black">
                        <span>Total</span>
                        <span className="text-yellow-500">£{cartTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Warning if profile is incomplete */}
                    {user && profile && (!profile.displayName || !profile.phoneNumber) && (
                      <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs font-bold border border-yellow-200">
                        Please update your name and phone number in the Profile section to complete checkout.
                      </div>
                    )}

                    <Button 
                      className="w-full py-4 text-lg" 
                      onClick={placeOrder}
                    >
                      {user ? 'Checkout (Collection)' : 'Login to Checkout'}
                    </Button>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications View */}
        {view === 'notifications' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl font-black tracking-tight">NOTIFICATIONS</h2>
            <div className="space-y-4">
              {userNotifications.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-zinc-200">
                  <div className="bg-zinc-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-zinc-400 mb-4">
                    <Bell size={32} />
                  </div>
                  <p className="text-zinc-500">No new notifications.</p>
                </div>
              ) : (
                userNotifications.map((note, idx) => (
                  <Card key={idx} className="p-6 flex items-start gap-4">
                    <div className="bg-yellow-100 p-3 rounded-full text-yellow-600"><Bell size={24} /></div>
                    <div>
                      <h3 className="font-bold">{note.title}</h3>
                      <p className="text-zinc-600">{note.message}</p>
                      <p className="text-xs text-zinc-400 mt-2">{note.time?.toLocaleString()}</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Orders / Profile View */}
        {view === 'orders' && profile?.role !== 'admin' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl font-black tracking-tight">MY ACCOUNT</h2>

            {/* Profile Edit Form */}
            <Card className="p-6 space-y-4 border-l-4 border-l-yellow-500">
              <h3 className="font-bold text-xl flex items-center gap-2">Personal Details</h3>
              <p className="text-sm text-zinc-500">Update your details. Your phone number is required so we can contact you regarding your collection order.</p>
              
              <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Full Name</label>
                  <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 rounded-lg border border-zinc-200 outline-none" placeholder="Your Name" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Phone Number</label>
                  <input type="tel" required value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full p-3 rounded-lg border border-zinc-200 outline-none" placeholder="07123456789" />
                </div>
                <div className="md:col-span-2 pt-2">
                  <Button type="submit" variant="secondary">Save Details</Button>
                </div>
              </form>
            </Card>

            <h2 className="text-2xl font-black tracking-tight pt-4">ORDER HISTORY</h2>
            
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-zinc-200">
                  <p className="text-zinc-500">No orders found.</p>
                </div>
              ) : (
                orders.map((order) => (
                  <Card key={order.id} className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Order #{order.id.slice(-6)}</p>
                        <p className="text-sm font-bold flex items-center gap-2"><Clock size={14} /> {order.createdAt?.toDate().toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant={order.status === 'collected' ? 'success' : order.status === 'cancelled' ? 'danger' : order.status === 'ready' ? 'success' : order.status === 'preparing' ? 'info' : 'warning'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="border-t border-zinc-100 pt-4 space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="text-zinc-500">£{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-zinc-100 pt-4 flex justify-between items-center">
                      <div className="space-y-1">
                         <p className="text-sm font-bold">Total Amount</p>
                         {order.discountApplied && order.discountApplied > 0 && <p className="text-xs text-green-600 font-bold">{order.discountApplied}% Discount Applied</p>}
                      </div>
                      <p className="text-xl font-black text-yellow-500">£{order.totalAmount.toFixed(2)}</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Admin Dashboard View (4 TABS) */}
        {view === 'admin' && profile?.role === 'admin' && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <h2 className="text-4xl font-black tracking-tight flex items-center gap-3">
                <LayoutDashboard className="text-yellow-500" /> ADMIN PANEL
              </h2>
              <div className="flex gap-4">
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <p className="text-xs font-bold text-zinc-400 uppercase">Total Orders</p>
                  <p className="text-2xl font-black">{orders.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <p className="text-xs font-bold text-zinc-400 uppercase">Revenue</p>
                  <p className="text-2xl font-black text-yellow-500">£{orders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Admin Sub-Navigation */}
            <div className="flex p-1 bg-zinc-200/50 rounded-lg w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-1 min-w-max w-full">
                <button onClick={() => setAdminView('dashboard')} className={cn("flex-1 min-w-[120px] py-3 px-4 text-sm font-bold rounded-md transition-all", adminView === 'dashboard' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900")}>Dashboard</button>
                <button onClick={() => setAdminView('orders')} className={cn("flex-1 min-w-[120px] py-3 px-4 text-sm font-bold rounded-md transition-all", adminView === 'orders' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900")}>Orders</button>
                <button onClick={() => setAdminView('categories')} className={cn("flex-1 min-w-[120px] py-3 px-4 text-sm font-bold rounded-md transition-all", adminView === 'categories' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900")}>Categories</button>
                <button onClick={() => setAdminView('menu')} className={cn("flex-1 min-w-[120px] py-3 px-4 text-sm font-bold rounded-md transition-all", adminView === 'menu' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900")}>Menu Items</button>
              </div>
            </div>

            {/* 1. Sub-View: DASHBOARD (Stats & Discounts) */}
            {adminView === 'dashboard' && (
              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Orders</p>
                    <p className="text-4xl font-black">{orders.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Revenue</p>
                    <p className="text-4xl font-black text-yellow-500">£{orders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2)}</p>
                  </div>
                </div>

                <Card className="p-8 border-l-4 border-l-green-500">
                   <h3 className="text-xl font-bold flex items-center gap-2 mb-4"><Percent className="text-green-500"/> Global Store Discount</h3>
                   <p className="text-sm text-zinc-500 mb-6">Apply a percentage discount to all customers' carts at checkout. Set to 0 to remove.</p>
                   <form onSubmit={handleSaveDiscount} className="flex gap-4 items-end">
                      <div className="space-y-2 flex-1 max-w-xs">
                        <label className="text-xs font-bold uppercase text-zinc-400">Discount %</label>
                        <input 
                          type="number" min="0" max="100" required
                          value={discountInput} onChange={(e) => setDiscountInput(e.target.value)}
                          className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <Button variant="success" type="submit" className="mb-[1px]">Apply Discount</Button>
                   </form>
                </Card>
              </div>
            )}

            {/* 2. Sub-View: CATEGORIES */}
            {adminView === 'categories' && (
              <div className="space-y-8">
                 <Card className={cn("p-8 space-y-6 border-l-4", editCatId ? "border-l-blue-500" : "border-l-yellow-500")}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-bold flex items-center gap-2">
                        {editCatId ? <><Edit className="text-blue-500" /> Edit Category</> : <><Tags className="text-yellow-500" /> Add New Category</>}
                      </h3>
                      {editCatId && <Button variant="outline" onClick={() => {setEditCatId(null); setCatName('');}}>Cancel Edit</Button>}
                    </div>
                    <form onSubmit={handleSaveCategory} className="flex gap-4 items-end">
                      <div className="flex-1 space-y-2 max-w-sm">
                        <label className="text-xs font-bold uppercase text-zinc-400">Category Name</label>
                        <input type="text" required value={catName} onChange={e => setCatName(e.target.value)} className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="e.g. Starters" />
                      </div>
                      <Button type="submit" className={cn("mb-[1px]", editCatId && "bg-blue-500 text-white hover:bg-blue-600")}>
                        {editCatId ? 'Save Changes' : 'Add Category'}
                      </Button>
                    </form>
                 </Card>

                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categories.map(cat => (
                      <Card key={cat.id} className="p-4 flex justify-between items-center">
                        <span className="font-bold text-sm">{cat.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => {setEditCatId(cat.id); setCatName(cat.name);}} className="p-2 text-zinc-400 hover:text-blue-500 rounded-md"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-zinc-400 hover:text-red-500 rounded-md"><Trash2 size={16}/></button>
                        </div>
                      </Card>
                    ))}
                 </div>
              </div>
            )}

            {/* 3. Sub-View: MANAGE MENU ITEMS */}
            {adminView === 'menu' && (
              <div className="space-y-8">
                <Card className={cn("p-8 space-y-6 border-l-4", editingMenuItemId ? "border-l-blue-500" : "border-l-yellow-500")}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      {editingMenuItemId ? <><Edit className="text-blue-500" /> Edit Menu Item</> : <><Plus className="text-yellow-500" /> Add New Menu Item</>}
                    </h3>
                    {editingMenuItemId && <Button variant="outline" onClick={resetMenuForm}>Cancel Edit</Button>}
                  </div>
                  
                  <form onSubmit={handleSaveMenuItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Item Name</label>
                      <input type="text" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="e.g. Spicy Tuna Roll" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Price (£)</label>
                      <input type="number" step="0.01" required value={newItem.price} onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})} className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="0.00" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Category</label>
                      <input 
                        type="text" 
                        list="category-options"
                        required 
                        value={newItem.category} 
                        onChange={e => setNewItem({...newItem, category: e.target.value})} 
                        className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none" 
                        placeholder="Type or select a category" 
                      />
                      <datalist id="category-options">
                        {categories.map(cat => <option key={cat.id} value={cat.name} />)}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Sub-Category (Optional)</label>
                      <input type="text" value={newItem.subCategory} onChange={e => setNewItem({...newItem, subCategory: e.target.value})} className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="e.g. Nigiri, Maki, Spicy" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Image</label>
                      <div className="flex gap-4 items-center">
                        <div className="relative flex-1">
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" disabled={isUploading} />
                          <label htmlFor="image-upload" className={cn("flex items-center justify-center gap-2 w-full p-3 rounded-lg border-2 border-dashed border-zinc-200 cursor-pointer hover:border-yellow-500 hover:bg-yellow-50 transition-all", isUploading && "opacity-50 cursor-not-allowed")}>
                            {isUploading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Clock size={18} /></motion.div> : <ImageIcon size={18} />}
                            <span className="text-sm font-bold">{isUploading ? 'Uploading...' : 'Upload New Image'}</span>
                          </label>
                        </div>
                        {newItem.image && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 shrink-0">
                            <img src={newItem.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-400">Description</label>
                      <textarea value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-yellow-500 outline-none h-24" placeholder="Describe the dish..." />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" className={cn("w-full py-4", editingMenuItemId && "bg-blue-500 text-white hover:bg-blue-600")}>
                        {editingMenuItemId ? 'Save Changes' : 'Add to Menu'}
                      </Button>
                    </div>
                  </form>
                </Card>

                <h3 className="text-xl font-bold pt-4">Current Menu Catalog</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menu.map(item => (
                    <Card key={item.id} className="p-4 flex gap-4 items-center">
                       <img src={item.image} alt={item.name} className="w-16 h-16 rounded-md object-cover" referrerPolicy="no-referrer" />
                       <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-sm truncate">{item.name}</h4>
                         <p className="text-yellow-600 font-bold text-sm">£{item.price.toFixed(2)}</p>
                         <p className="text-[10px] text-zinc-400">{item.category} {item.subCategory && `> ${item.subCategory}`}</p>
                       </div>
                       <div className="flex flex-col gap-2">
                         <button onClick={() => handleEditMenuClick(item)} className="p-2 text-zinc-400 hover:text-blue-500 bg-zinc-50 rounded-md"><Edit size={16} /></button>
                         <button onClick={() => handleDeleteMenuItem(item.id)} className="p-2 text-zinc-400 hover:text-red-500 bg-zinc-50 rounded-md"><Trash2 size={16} /></button>
                       </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Sub-View: MANAGE ORDERS */}
            {adminView === 'orders' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {orders.map((order) => {
                    const pastOrdersCount = orders.filter(o => o.userId === order.userId).length;
                    return (
                    <Card key={order.id} className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={order.status === 'collected' ? 'success' : order.status === 'cancelled' ? 'danger' : order.status === 'ready' ? 'success' : order.status === 'preparing' ? 'info' : 'warning'}>
                            {order.status}
                          </Badge>
                          <span className="text-xs font-bold text-zinc-400">#{order.id.slice(-6)}</span>
                        </div>
                        
                        <p className="font-bold text-lg">{order.customerName}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1"><Phone size={12}/> {order.customerPhone || 'No Phone Provided'}</p>
                        <p className="text-xs text-zinc-500">{order.customerEmail}</p>
                        
                        <div className="bg-yellow-50 text-yellow-800 text-xs font-bold px-2 py-1 rounded-md inline-block mt-2">
                          Total Orders by this Customer: {pastOrdersCount}
                        </div>

                        <div className="text-xs text-zinc-400 flex items-center gap-1 mt-2">
                          <Clock size={12} /> {order.createdAt?.toDate().toLocaleString()}
                        </div>
                      </div>

                      <div className="flex-1 border-l border-zinc-100 pl-6">
                        <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Items</p>
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-sm">{item.quantity}x {item.name}</p>
                        ))}
                      </div>

                      <div className="text-right space-y-4">
                        <div className="space-y-1">
                          {order.discountApplied && order.discountApplied > 0 && <p className="text-xs text-green-600 font-bold">{order.discountApplied}% Discount Applied</p>}
                          <p className="text-xl font-black text-yellow-500">£{order.totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2 justify-end flex-wrap">
                          {order.status === 'pending' && <Button onClick={() => updateOrderStatus(order.id, 'preparing')}>Start Preparing</Button>}
                          {order.status === 'preparing' && <Button variant="success" onClick={() => updateOrderStatus(order.id, 'ready')}>Mark Ready</Button>}
                          {order.status === 'ready' && <Button variant="outline" onClick={() => updateOrderStatus(order.id, 'collected')}>Mark Collected</Button>}
                          {order.status !== 'collected' && order.status !== 'cancelled' && (
                            <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="p-2 text-zinc-300 hover:text-red-600" title="Cancel Order"><XCircle size={20} /></button>
                          )}
                          {order.status === 'collected' && <CheckCircle className="text-green-500" />}
                          
                          {/* TRASH CAN TO DELETE ORDER */}
                          <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-zinc-300 hover:text-red-600" title="Delete Order Completely"><Trash2 size={20} /></button>
                        </div>
                      </div>
                    </Card>
                  )})}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* --- Footer --- */}
      <footer className="bg-zinc-900 text-zinc-400 py-16 mt-24 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white">
              <img src="/logo.png" alt="Brand Logo" className="h-10 w-auto object-contain grayscale invert" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <p className="text-sm leading-relaxed">
              Bringing the authentic taste of Japan to your doorstep. Quality ingredients, traditional methods, and modern convenience.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setView('home')} className="hover:text-yellow-500">Home</button></li>
              <li><button onClick={() => setView('menu')} className="hover:text-yellow-500">Menu</button></li>
              <li><button onClick={() => setView('orders')} className="hover:text-yellow-500">My Orders</button></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>2 Catford Broadway, London</li>
              <li>+44 020 3336 7752</li>
              <li>hello@tarorestaurants.uk</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Hours</h4>
            <ul className="space-y-2 text-sm">
              <li>Mon - Sat: 12:00pm - 10:00pm</li>
              <li>Sun: 12:00pm - 9:30pm</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 pt-12 mt-12 border-t border-zinc-800 text-center text-[10px] uppercase font-bold tracking-[0.2em]">
          © 2026 Taro Restaurants UK. All rights reserved.
        </div>
      </footer>
    </div>
  );
}