/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  User as UserIcon, 
  LogOut, 
  ChevronRight, 
  Plus, 
  Minus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChefHat,
  UtensilsCrossed,
  LayoutDashboard,
  Menu as MenuIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
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
  customerAddress: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'delivered' | 'cancelled';
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'customer';
}

// --- Initial Data ---

const INITIAL_MENU: Omit<MenuItem, 'id'>[] = [
  { name: 'Taro Special Sushi Set', description: 'Chef\'s selection of 12 premium nigiri and maki rolls.', price: 24.50, category: 'Sushi', subCategory: 'Set', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop' },
  { name: 'Chicken Katsu Curry', description: 'Crispy breaded chicken breast served with rich Japanese curry sauce and steamed rice.', price: 14.95, category: 'Main', subCategory: 'Curry', image: 'https://images.unsplash.com/photo-1591814448473-7027b5156522?w=800&auto=format&fit=crop' },
  { name: 'Tonkotsu Ramen', description: 'Creamy pork bone broth with chashu pork, soft-boiled egg, and bamboo shoots.', price: 15.50, category: 'Ramen', subCategory: 'Pork', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop' },
  { name: 'Vegetable Tempura', description: 'Assorted seasonal vegetables lightly battered and fried until crispy.', price: 8.50, category: 'Starters', subCategory: 'Tempura', image: 'https://images.unsplash.com/photo-1581184953963-d15972933db1?w=800&auto=format&fit=crop' },
  { name: 'Salmon Teriyaki', description: 'Grilled salmon fillet glazed with sweet teriyaki sauce, served with vegetables.', price: 16.50, category: 'Main', subCategory: 'Grilled', image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop' },
  { name: 'Matcha Green Tea Cheesecake', description: 'Creamy cheesecake infused with premium Japanese matcha powder.', price: 7.50, category: 'Dessert', subCategory: 'Cake', image: 'https://images.unsplash.com/photo-1621841957884-1210fe19d66d?w=800&auto=format&fit=crop' },
];

// --- Components ---

const Button = ({ children, onClick, className, variant = 'primary', disabled = false, type = 'button' }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'secondary' | 'outline' | 'danger', disabled?: boolean, key?: React.Key, type?: 'button' | 'submit' | 'reset' }) => {
  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800',
    outline: 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      type={type}
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
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
    warning: 'bg-orange-100 text-orange-700',
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
  const [view, setView] = useState<'home' | 'menu' | 'cart' | 'orders' | 'admin'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // New Menu Item State
  const [newItem, setNewItem] = useState<Omit<MenuItem, 'id'>>({
    name: '',
    description: '',
    price: 0,
    category: 'Main',
    subCategory: '',
    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&auto=format&fit=crop'
  });

  // --- Auth & Profile ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Guest',
              email: currentUser.email || '',
              role: currentUser.email === 'rijanmhj2075@gmail.com' ? 'admin' : 'customer',
            };
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            setProfile(newProfile);
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
  }, []);

  // --- Menu Loading ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      if (menuData.length === 0 && profile?.role === 'admin') {
        // Seed initial data if empty and user is admin
        INITIAL_MENU.forEach(async (item) => {
          await addDoc(collection(db, 'menu'), item);
        });
      }
      setMenu(menuData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'menu'));
    return unsubscribe;
  }, [profile]);

  // --- Orders Loading ---
  useEffect(() => {
    if (!user || !profile) return;

    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
    return unsubscribe;
  }, [user, profile]);

  // --- Cart Logic ---
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

  // --- Actions ---
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Logged in successfully');
    } catch (error) {
      toast.error('Login failed');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('home');
    toast.success('Logged out');
  };

  const placeOrder = async () => {
    if (!user || !profile) {
      toast.error('Please login to place an order');
      return;
    }

    if (cart.length === 0) return;

    try {
      const orderData: Omit<Order, 'id'> = {
        userId: user.uid,
        customerName: profile.displayName,
        customerEmail: profile.email,
        customerAddress: '123 Taro Street, London, UK', // Mock address for now
        items: cart,
        totalAmount: cartTotal,
        status: 'pending',
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'orders'), orderData);
      setCart([]);
      setView('orders');
      toast.success('Order placed successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await setDoc(doc(db, 'orders', orderId), { status }, { merge: true });
      toast.success(`Order marked as ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) {
      toast.error('Please wait for the image to finish uploading');
      return;
    }
    if (!newItem.name || newItem.price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await addDoc(collection(db, 'menu'), newItem);
      setNewItem({
        name: '',
        description: '',
        price: 0,
        category: 'Main',
        subCategory: '',
        image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&auto=format&fit=crop'
      });
      toast.success('Menu item added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'menu');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (e.g., 2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    const storageRef = ref(storage, `menu/${Date.now()}_${file.name}`);
    
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setNewItem(prev => ({ ...prev, image: downloadURL }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="text-orange-600"
        >
          <ChefHat size={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <Toaster position="top-center" />
      
      {/* --- Navigation --- */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setView('home')}
          >
            <div className="bg-orange-600 p-2 rounded-lg text-white">
              <UtensilsCrossed size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">TARO</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => setView('home')} className={cn('text-sm font-medium hover:text-orange-600 transition-colors', view === 'home' && 'text-orange-600')}>Home</button>
            <button onClick={() => setView('menu')} className={cn('text-sm font-medium hover:text-orange-600 transition-colors', view === 'menu' && 'text-orange-600')}>Menu</button>
            {user && <button onClick={() => setView('orders')} className={cn('text-sm font-medium hover:text-orange-600 transition-colors', view === 'orders' && 'text-orange-600')}>My Orders</button>}
            {profile?.role === 'admin' && <button onClick={() => setView('admin')} className={cn('text-sm font-medium hover:text-orange-600 transition-colors', view === 'admin' && 'text-orange-600')}>Admin</button>}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('cart')}
              className="relative p-2 text-zinc-600 hover:text-orange-600 transition-colors"
            >
              <ShoppingBag size={24} />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-bold">{profile?.displayName}</p>
                  <p className="text-[10px] text-zinc-500 capitalize">{profile?.role}</p>
                </div>
                <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-600 transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Button onClick={handleLogin} className="hidden md:block">Login / Sign Up</Button>
            )}

            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </nav>

      {/* --- Mobile Menu --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-40 bg-white pt-24 px-8"
          >
            <div className="flex flex-col gap-6 text-2xl font-bold">
              <button onClick={() => { setView('home'); setIsMenuOpen(false); }}>Home</button>
              <button onClick={() => { setView('menu'); setIsMenuOpen(false); }}>Menu</button>
              {user && <button onClick={() => { setView('orders'); setIsMenuOpen(false); }}>My Orders</button>}
              {profile?.role === 'admin' && <button onClick={() => { setView('admin'); setIsMenuOpen(false); }}>Admin Dashboard</button>}
              {!user && <button onClick={handleLogin} className="text-orange-600">Login</button>}
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
                <Badge variant="warning">Authentic Japanese Cuisine</Badge>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
                  FRESH.<br />TRADITIONAL.<br /><span className="text-orange-600">TARO.</span>
                </h1>
                <p className="text-zinc-500 text-lg max-w-md">
                  Experience the finest Japanese dining in the heart of London. From hand-rolled sushi to steaming bowls of ramen.
                </p>
                <div className="flex gap-4">
                  <Button onClick={() => setView('menu')} className="px-8 py-4 text-lg">Order Now</Button>
                  <Button variant="outline" className="px-8 py-4 text-lg">View Menu</Button>
                </div>
              </div>
              <div className="flex-1 relative">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-3xl overflow-hidden shadow-2xl rotate-3"
                >
                  <img src="https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&auto=format&fit=crop" alt="Sushi" className="w-full h-[500px] object-cover" referrerPolicy="no-referrer" />
                </motion.div>
                <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-zinc-100 -rotate-6">
                  <p className="text-3xl font-black text-orange-600">4.9/5</p>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Customer Rating</p>
                </div>
              </div>
            </section>

            <section className="space-y-12">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">Popular Choices</p>
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
                        <p className="font-black text-orange-600">£{item.price.toFixed(2)}</p>
                      </div>
                      <p className="text-sm text-zinc-500 line-clamp-2">{item.description}</p>
                      <div className="pt-4">
                        <Button variant="secondary" className="w-full">Add to Cart</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Menu View */}
        {view === 'menu' && (
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black tracking-tight">OUR MENU</h2>
              <p className="text-zinc-500 max-w-xl mx-auto">Browse our selection of authentic Japanese dishes, prepared fresh daily by our master chefs.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {['All', 'Sushi', 'Ramen', 'Main', 'Starters', 'Dessert'].map(cat => (
                <Button key={cat} variant="outline" className="rounded-full px-6">
                  {cat}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {menu.map((item) => (
                <Card key={item.id} className="group">
                  <div className="h-48 overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>{item.category}</Badge>
                      {item.subCategory && <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.subCategory}</span>}
                    </div>
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 h-8">{item.description}</p>
                    <div className="flex items-center justify-between pt-4">
                      <p className="font-black text-orange-600">£{item.price.toFixed(2)}</p>
                      <button 
                        onClick={() => addToCart(item)}
                        className="bg-zinc-900 text-white p-2 rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Cart View */}
        {view === 'cart' && (
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
                        <p className="text-sm text-orange-600 font-bold">£{item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-zinc-100 rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-orange-600"><Minus size={16} /></button>
                        <span className="font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-orange-600"><Plus size={16} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-zinc-400 hover:text-red-600 p-2">
                        <Trash2 size={20} />
                      </button>
                    </Card>
                  ))}
                </div>
                
                <div className="space-y-6">
                  <Card className="p-6 space-y-6">
                    <h3 className="font-bold text-xl">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Subtotal</span>
                        <span className="font-bold">£{cartTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Delivery</span>
                        <span className="text-green-600 font-bold">FREE</span>
                      </div>
                      <div className="border-t border-zinc-100 pt-4 mt-4 flex justify-between text-lg font-black">
                        <span>Total</span>
                        <span className="text-orange-600">£{cartTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full py-4 text-lg" 
                      onClick={placeOrder}
                      disabled={!user}
                    >
                      {user ? 'Checkout' : 'Login to Checkout'}
                    </Button>
                    {!user && (
                      <p className="text-[10px] text-center text-zinc-400 uppercase font-bold tracking-widest">
                        Please login to complete your order
                      </p>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders View */}
        {view === 'orders' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl font-black tracking-tight">MY ORDERS</h2>
            
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
                        <p className="text-sm font-bold flex items-center gap-2">
                          <Clock size={14} /> {order.createdAt?.toDate().toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={
                        order.status === 'delivered' ? 'success' : 
                        order.status === 'cancelled' ? 'danger' : 
                        order.status === 'preparing' ? 'info' : 'warning'
                      }>
                        {order.status}
                      </Badge>
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
                      <p className="text-sm font-bold">Total Amount</p>
                      <p className="text-xl font-black text-orange-600">£{order.totalAmount.toFixed(2)}</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Admin View */}
        {view === 'admin' && profile?.role === 'admin' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-black tracking-tight flex items-center gap-3">
                <LayoutDashboard className="text-orange-600" /> ADMIN DASHBOARD
              </h2>
              <div className="flex gap-4">
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <p className="text-xs font-bold text-zinc-400 uppercase">Total Orders</p>
                  <p className="text-2xl font-black">{orders.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <p className="text-xs font-bold text-zinc-400 uppercase">Revenue</p>
                  <p className="text-2xl font-black text-orange-600">£{orders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Add Menu Item Form */}
            <Card className="p-8 space-y-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Plus className="text-orange-600" /> Add New Menu Item
              </h3>
              <form onSubmit={handleAddMenuItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Item Name</label>
                  <input 
                    type="text" 
                    required
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-orange-600 outline-none"
                    placeholder="e.g. Spicy Tuna Roll"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Price (£)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newItem.price}
                    onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})}
                    className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-orange-600 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Category</label>
                  <select 
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                    className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-orange-600 outline-none"
                  >
                    {['Sushi', 'Ramen', 'Main', 'Starters', 'Dessert'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Sub-Category (Optional)</label>
                  <input 
                    type="text" 
                    value={newItem.subCategory}
                    onChange={e => setNewItem({...newItem, subCategory: e.target.value})}
                    className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-orange-600 outline-none"
                    placeholder="e.g. Nigiri, Maki, Spicy"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-400">Image</label>
                  <div className="flex gap-4 items-center">
                    <div className="relative flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={isUploading}
                      />
                      <label 
                        htmlFor="image-upload"
                        className={cn(
                          "flex items-center justify-center gap-2 w-full p-3 rounded-lg border-2 border-dashed border-zinc-200 cursor-pointer hover:border-orange-600 hover:bg-orange-50 transition-all",
                          isUploading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isUploading ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                            <Clock size={18} />
                          </motion.div>
                        ) : (
                          <Plus size={18} />
                        )}
                        <span className="text-sm font-bold">{isUploading ? 'Uploading...' : 'Choose Image File'}</span>
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
                  <textarea 
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                    className="w-full p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-orange-600 outline-none h-24"
                    placeholder="Describe the dish..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full py-4">Add to Menu</Button>
                </div>
              </form>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-bold">Recent Orders</h3>
              <div className="grid grid-cols-1 gap-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          order.status === 'delivered' ? 'success' : 
                          order.status === 'cancelled' ? 'danger' : 
                          order.status === 'preparing' ? 'info' : 'warning'
                        }>
                          {order.status}
                        </Badge>
                        <span className="text-xs font-bold text-zinc-400">#{order.id.slice(-6)}</span>
                      </div>
                      <p className="font-bold">{order.customerName}</p>
                      <p className="text-xs text-zinc-500">{order.customerEmail}</p>
                      <div className="text-xs text-zinc-400 flex items-center gap-1">
                        <Clock size={12} /> {order.createdAt?.toDate().toLocaleString()}
                      </div>
                    </div>

                    <div className="flex-1 border-l border-zinc-100 pl-6">
                      <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Items</p>
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-xs">{item.quantity}x {item.name}</p>
                      ))}
                    </div>

                    <div className="text-right space-y-4">
                      <p className="text-xl font-black">£{order.totalAmount.toFixed(2)}</p>
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <Button onClick={() => updateOrderStatus(order.id, 'preparing')}>Start Preparing</Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button variant="outline" onClick={() => updateOrderStatus(order.id, 'delivered')}>Mark Delivered</Button>
                        )}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="p-2 text-zinc-300 hover:text-red-600">
                            <XCircle size={20} />
                          </button>
                        )}
                        {order.status === 'delivered' && <CheckCircle className="text-green-500" />}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- Footer --- */}
      <footer className="bg-zinc-900 text-zinc-400 py-16 mt-24 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white">
              <UtensilsCrossed size={24} />
              <span className="text-xl font-bold tracking-tight">TARO</span>
            </div>
            <p className="text-sm leading-relaxed">
              Bringing the authentic taste of Japan to your doorstep. Quality ingredients, traditional methods, and modern convenience.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setView('home')}>Home</button></li>
              <li><button onClick={() => setView('menu')}>Menu</button></li>
              <li><button onClick={() => setView('orders')}>My Orders</button></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>123 Taro Street, London</li>
              <li>+44 20 1234 5678</li>
              <li>hello@tarorestaurants.uk</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Hours</h4>
            <ul className="space-y-2 text-sm">
              <li>Mon - Fri: 11am - 10pm</li>
              <li>Sat - Sun: 12pm - 11pm</li>
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
