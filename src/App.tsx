import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { Product, ActiveView, Pack } from './types';
import { catalogService } from './services/catalogService';
import { packService } from './services/packService';

// Core Homepage Components
import { Header } from './components/Header';
import { NavigationOverlay } from './components/NavigationOverlay';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { ProductGridSection } from './components/ProductGridSection';
import { Testimonials } from './components/Testimonials';
import { StoreLocation } from './components/StoreLocation';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';

// Dynamically loaded secondary views and modals
const ShopView = React.lazy(() => import('./components/ShopView').then((m) => ({ default: m.ShopView })));
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel })));
const PacksPage = React.lazy(() => import('./components/PacksPage').then((m) => ({ default: m.PacksPage })));
const ProductDetailModal = React.lazy(() => import('./components/ProductDetailModal').then((m) => ({ default: m.ProductDetailModal })));

function MainAppContent() {
  const { language } = useLanguage();
  const [currentView, setCurrentView] = useState<ActiveView>('home');
  // Single source of truth: starts empty and populates exclusively via live Firestore onSnapshot
  const [products, setProducts] = useState<Product[]>([]);
  // Packs state with live Firestore subscription + seed cache
  const [packs, setPacks] = useState<Pack[]>(() => packService.getInitialPacks());
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Check URL hash for direct routing (#admin, #shop, #packs-women, #packs-men)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash === '#admin' || path === '/admin') {
        setCurrentView('admin');
      } else if (hash === '#shop' || path === '/shop') {
        setCurrentView('shop');
      } else if (hash === '#packs-women' || path === '/packs-women') {
        setCurrentView('packs-women');
      } else if (hash === '#packs-men' || path === '/packs-men') {
        setCurrentView('packs-men');
      } else if (hash === '' || hash === '#home') {
        setCurrentView('home');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Sync hash with current view
  useEffect(() => {
    if (currentView === 'admin') {
      window.location.hash = '#admin';
    } else if (currentView === 'shop') {
      window.location.hash = '#shop';
    } else if (currentView === 'packs-women') {
      window.location.hash = '#packs-women';
    } else if (currentView === 'packs-men') {
      window.location.hash = '#packs-men';
    } else {
      if (window.location.hash.startsWith('#packs-') || window.location.hash === '#admin' || window.location.hash === '#shop') {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [currentView]);

  // Network and Firestore real-time onSnapshot sync across devices
  useEffect(() => {
    let unsubscribeProducts: (() => void) | null = null;
    let unsubscribePacks: (() => void) | null = null;

    const connectSubscription = () => {
      if (unsubscribeProducts) {
        try { unsubscribeProducts(); } catch (_) {}
      }
      if (unsubscribePacks) {
        try { unsubscribePacks(); } catch (_) {}
      }

      unsubscribeProducts = catalogService.subscribeToProducts(
        (updated) => {
          setProducts(updated);
        },
        (isOnline, error) => {
          if (!isOnline && typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOffline(true);
          } else if (isOnline) {
            setIsOffline(false);
          }
          if (error) {
            console.warn('Real-time connection status:', error);
          }
        }
      );

      unsubscribePacks = packService.subscribeToPacks(
        (updatedPacks) => {
          setPacks(updatedPacks);
        }
      );
    };

    const handleOnline = () => {
      setIsOffline(false);
      // Auto-resync when connection is restored
      connectSubscription();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial subscription to live Firestore collections
    connectSubscription();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribeProducts) {
        try { unsubscribeProducts(); } catch (_) {}
      }
      if (unsubscribePacks) {
        try { unsubscribePacks(); } catch (_) {}
      }
    };
  }, []);

  // Smooth scroll to sections with header offset
  const handleNavigateToSection = (sectionId: string) => {
    if (currentView !== 'home') {
      setCurrentView('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EFE7] text-[#14110F] relative selection:bg-[#5A1A24] selection:text-[#F4EFE7]">
      {/* Offline Notice when network connection is lost: "Connexion perdue" */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#5A1A24] text-[#F4EFE7] text-[10px] sm:text-[11px] py-1.5 px-4 text-center font-medium tracking-editorial flex items-center justify-center gap-2 shadow-md animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>
            Connexion perdue — Reconnexion automatique...
          </span>
        </div>
      )}

      {/* Redesigned Responsive Header */}
      <Header
        onOpenMenu={() => setIsMenuOpen(true)}
        onToggleMenu={() => setIsMenuOpen((prev) => !prev)}
        isMenuOpen={isMenuOpen}
        onOpenProduct={(p) => setSelectedProduct(p)}
        products={products}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onNavigateToSection={handleNavigateToSection}
      />

      {/* Main View Router */}
      {currentView === 'home' && (
        <main>
          {/* Hero with responsive height and luxury perfume bottle photo */}
          <Hero
            onDiscover={() => {
              handleNavigateToSection('collection');
            }}
          />

          {/* Slow-scrolling notes marquee */}
          <Marquee />

          {/* Direct "Our Collection" Product Grid with Category Bar and Fixed Packs Boxes */}
          <ProductGridSection
            products={products}
            packs={packs}
            onOpenDetails={(p) => setSelectedProduct(p)}
            onOpenPacksPage={(cat) => setCurrentView(cat === 'women' ? 'packs-women' : 'packs-men')}
          />

          {/* Connoisseur Testimonials: 6 authentic reviews signed from Moroccan cities */}
          <Testimonials />

          {/* Physical Store Location & Interactive Google Map */}
          <StoreLocation />

          {/* Footer */}
          <Footer
            setCurrentView={setCurrentView}
            onNavigateToSection={handleNavigateToSection}
          />
        </main>
      )}

      {/* Dynamic Views & Modals (Code-Split) */}
      <React.Suspense fallback={null}>
        {currentView === 'packs-women' && (
          <main>
            <PacksPage
              category="women"
              packs={packs}
              onClose={() => {
                setCurrentView('home');
                window.location.hash = '';
              }}
            />
            <StoreLocation />
            <Footer
              setCurrentView={setCurrentView}
              onNavigateToSection={handleNavigateToSection}
            />
          </main>
        )}

        {currentView === 'packs-men' && (
          <main>
            <PacksPage
              category="men"
              packs={packs}
              onClose={() => {
                setCurrentView('home');
                window.location.hash = '';
              }}
            />
            <StoreLocation />
            <Footer
              setCurrentView={setCurrentView}
              onNavigateToSection={handleNavigateToSection}
            />
          </main>
        )}

        {currentView === 'shop' && (
          <main>
            <ShopView
              products={products}
              onOpenDetails={(p) => setSelectedProduct(p)}
            />
            {/* Physical Store Location & Interactive Google Map */}
            <StoreLocation />
            <Footer
              setCurrentView={setCurrentView}
              onNavigateToSection={handleNavigateToSection}
            />
          </main>
        )}

        {currentView === 'admin' && (
          <main>
            <AdminPanel
              products={products}
              packs={packs}
              onRefreshProducts={() => {}}
              onExit={() => {
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </main>
        )}

        {/* Product Detail Modal */}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </React.Suspense>

      {/* Full-Screen Mobile Menu Overlay */}
      <NavigationOverlay
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onNavigateToSection={handleNavigateToSection}
        products={products}
        onOpenProduct={(p) => setSelectedProduct(p)}
      />

      {/* Slide-In Cart Drawer */}
      <CartDrawer />

      {/* Floating Glowing WhatsApp Button (58px circle with solid 30px WhatsApp glyph) */}
      <FloatingWhatsApp isProductModalOpen={!!selectedProduct} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <MainAppContent />
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
