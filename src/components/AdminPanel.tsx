import React, { useState, useEffect, useRef } from 'react';
import {
  Product,
  SizeOption,
  formatPrice,
  DEFAULT_CATEGORIES,
  getCategoryLabel,
  isProductInStock,
  getProductDisplayImage,
  Pack
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { catalogService, DatabaseTestStepResult, cleanData } from '../services/catalogService';
import {
  db,
  uploadProductImageWithFallback,
  compressImageFile,
  serverTimestamp,
  withTimeout,
  formatFirebaseErrorMessage,
  runStartupHealthCheck,
  HealthCheckResult,
  activeProjectId,
  activeDatabaseId
} from '../services/firebase';
import { PacksAdminSection } from './PacksAdminSection';
import { CloseButton } from './CloseButton';

interface AdminPanelProps {
  products: Product[];
  packs?: Pack[];
  onRefreshProducts: () => void;
  onExit: () => void;
}

// Note: This admin gate is client-side only.
// SHA-256 hash of the administrative access pass (never stored in plain text or in Firestore)
const ADMIN_PASSWORD_HASH = '541c83359639d420222937129d07f5e4b3052410ffc308e50f93f5a00f69c6aa';

const SESSION_STORAGE_KEY = 'abdou_admin_authenticated';
const FAILED_ATTEMPTS_KEY = 'abdou_admin_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'abdou_admin_lockout_until';

async function computeSHA256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  packs = [],
  onRefreshProducts,
  onExit
}) => {
  const { language, t } = useLanguage();
  const { settings, updateSettings } = useCart();

  // Admin main section tab switcher ('products' | 'packs' | 'settings')
  const [adminMainTab, setAdminMainTab] = useState<'products' | 'packs' | 'settings'>('products');

  // Client-side authentication state from sessionStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Login form states (single password field only)
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Check lockout on mount and handle countdown
  useEffect(() => {
    const checkLockout = () => {
      const lockoutTimestamp = Number(sessionStorage.getItem(LOCKOUT_UNTIL_KEY) || '0');
      const now = Date.now();
      if (lockoutTimestamp > now) {
        setLockoutRemaining(Math.ceil((lockoutTimestamp - now) / 1000));
      } else {
        setLockoutRemaining(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const [waNumberInput, setWaNumberInput] = useState(settings.whatsappNumber);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);

  // Startup Health Check state (Requirement 5)
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    setIsCheckingHealth(true);

    runStartupHealthCheck().then((res) => {
      if (isMounted) {
        setHealthStatus(res);
        setIsCheckingHealth(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [globalErrorMsg, setGlobalErrorMsg] = useState<string | null>(null);

  // Search and category filter in admin table
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Edit / Add product modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Product delete confirmation modal
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // TEMPORARY: Database Self-Test Modal state
  const [isSelfTestOpen, setIsSelfTestOpen] = useState(false);
  const [selfTestSteps, setSelfTestSteps] = useState<DatabaseTestStepResult[]>([]);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [selfTestOverallResult, setSelfTestOverallResult] = useState<boolean | null>(null);

  // Optimistic UI saving states for products
  const [savingStates, setSavingStates] = useState<Record<string, {
    status: 'saving' | 'confirmed' | 'failed';
    error?: string;
    errorCode?: string;
    retryProduct?: Product;
    retryFile?: File | null;
  }>>({});
  const [optimisticProducts, setOptimisticProducts] = useState<Product[]>([]);

  // Available categories list
  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...(settings.customCategories || [])
  ];

  // Form fields
  const [nameFr, setNameFr] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descAr, setDescAr] = useState('');
  const [sizesList, setSizesList] = useState<SizeOption[]>([
    { id: 'size-1', label: '', price: 0, inStock: true }
  ]);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

    setIsVerifying(true);
    setLoginError(null);

    try {
      const enteredHash = await computeSHA256(passwordInput.trim());

      if (enteredHash === ADMIN_PASSWORD_HASH) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
        sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
        sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
        setIsAuthenticated(true);
        setPasswordInput('');
        setLoginError(null);
      } else {
        const currentFailed = Number(sessionStorage.getItem(FAILED_ATTEMPTS_KEY) || '0') + 1;
        sessionStorage.setItem(FAILED_ATTEMPTS_KEY, String(currentFailed));

        if (currentFailed >= 5) {
          const lockoutUntil = Date.now() + 60 * 1000;
          sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(lockoutUntil));
          setLockoutRemaining(60);
          setLoginError(
            language === 'ar'
              ? 'تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار ٦٠ ثانية.'
              : 'Nombre maximal de tentatives dépassé. Veuillez patienter 60 secondes.'
          );
        } else {
          setLoginError(
            language === 'ar'
              ? `كلمة المرور غير صحيحة. المحاولة ${currentFailed} من ٥.`
              : `Mot de passe incorrect. Tentative ${currentFailed} sur 5.`
          );
        }
      }
    } catch (err) {
      setLoginError(language === 'ar' ? 'حدث خطأ أثناء التحقق.' : 'Erreur de vérification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  // Open Add Product Modal
  const openCreateModal = () => {
    setEditingProductId(null);
    setNameFr('');
    setNameAr('');
    setCategory('french');
    setDescFr('');
    setDescAr('');
    setSizesList([{ id: `size-${Date.now()}`, label: 'Flacon complet', price: 950, inStock: true }]);
    setPhotoPreview('');
    setPhotoFile(null);
    setFormErrors({});
    setModalError(null);
    setSubmitError(null);
    setUploadProgress(0);
    setIsEditing(true);
  };

  // Open Edit Product Modal
  const openEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setNameFr(product.name?.fr || '');
    setNameAr(product.name?.ar || '');
    const fallbackCat = product.category || (product.collection === 'arabian-oud-attars' ? 'arabic' : product.collection === 'niche-creations' ? 'niche' : 'french');
    setCategory(fallbackCat);
    setDescFr(product.description?.fr || '');
    setDescAr(product.description?.ar || '');
    if (product.sizes && product.sizes.length > 0) {
      setSizesList(product.sizes.map((s) => ({ ...s })));
    } else {
      setSizesList([{ id: `size-${Date.now()}`, label: 'Flacon complet', price: 1000, inStock: true }]);
    }
    const currentImg = getProductDisplayImage(product);
    setPhotoPreview(currentImg);
    setPhotoFile(null);
    setFormErrors({});
    setModalError(null);
    setSubmitError(null);
    setUploadProgress(0);
    setIsEditing(true);
  };

  // Sizes management
  const handleAddSizeRow = () => {
    setSizesList([
      ...sizesList,
      { id: `size-${Date.now()}`, label: '', price: 0, inStock: true }
    ]);
  };

  const handleUpdateSizeRow = (index: number, field: keyof SizeOption, value: any) => {
    const updated = [...sizesList];
    updated[index] = { ...updated[index], [field]: value };
    setSizesList(updated);
  };

  const handleRemoveSizeRow = (index: number) => {
    if (sizesList.length <= 1) {
      alert(
        language === 'ar'
          ? 'يجب تحديد حجم واحد وسعر على الأقل لهذا العطر.'
          : 'Chaque parfum doit comporter au moins une taille avec son prix.'
      );
      return;
    }
    const updated = sizesList.filter((_, i) => i !== index);
    setSizesList(updated);
  };

  // Photo change handler (from gallery / camera)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFormErrors((prev) => ({
          ...prev,
          photo: language === 'ar' ? 'حجم الصورة يتجاوز الحد الأقصى (١٠ ميغابايت).' : 'L’image dépasse la taille maximale de 10 Mo.'
        }));
        return;
      }
      setPhotoFile(file);
      const localPreviewUrl = URL.createObjectURL(file);
      setPhotoPreview(localPreviewUrl);
      if (formErrors.photo) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.photo;
          return next;
        });
      }
    }
  };

  // Form Submission (Add or Edit)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!nameFr.trim()) {
      errors.nameFr = language === 'ar' ? 'اسم العطر بالفرنسية مطلوب.' : 'Nom du parfum (français) requis.';
    }
    if (!nameAr.trim()) {
      errors.nameAr = language === 'ar' ? 'اسم العطر بالعربية مطلوب.' : 'اسم العطر (العربية) requis.';
    }
    if (!category.trim()) {
      errors.category = language === 'ar' ? 'يرجى اختيار فئة العطر.' : 'Veuillez sélectionner une catégorie.';
    }
    if (!descFr.trim()) {
      errors.descFr = language === 'ar' ? 'الوصف بالفرنسية مطلوب.' : 'Description (française) requise.';
    }
    if (!descAr.trim()) {
      errors.descAr = language === 'ar' ? 'الوصف بالعربية مطلوب.' : 'الوصف (بالعربية) مطلوب.';
    }

    // Size & Price Validation: Price must be greater than 0 and size label must not be empty
    if (sizesList.length === 0) {
      errors.sizes = language === 'ar' ? 'يرجى إضافة خيار حجم وسعر واحد على الأقل.' : 'Au moins une taille avec un prix est requise.';
    } else {
      for (let i = 0; i < sizesList.length; i++) {
        const s = sizesList[i];
        if (!s.label || !s.label.trim()) {
          errors.sizes = language === 'ar'
            ? `الخيار رقم ${i + 1}: يرجى تحديد سعة أو حجم العطر (مثال: 5 ml أو Flacon complet).`
            : `Ligne ${i + 1} : le libellé de la taille ne peut pas être vide (ex: 5 ml, Flacon complet).`;
          break;
        }
        const numericPrice = Number(s.price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
          errors.sizes = language === 'ar'
            ? `الخيار رقم ${i + 1} (${s.label.trim()}): يجب أن يكون السعر أكبر من 0 درهم.`
            : `Ligne ${i + 1} (${s.label.trim()}) : le prix doit être strictement supérieur à 0 DH.`;
          break;
        }
      }
    }

    if (!photoPreview && !photoFile) {
      errors.photo = language === 'ar' ? 'يرجى تحميل صورة للعطر.' : 'Une photo du flacon est requise.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitError(errors.sizes || errors.photo || Object.values(errors)[0]);
      return;
    }

    setFormErrors({});
    setModalError(null);
    setSubmitError(null);

    // Build optimistic product object
    const prodId = editingProductId || `parfum-${Date.now()}`;
    const existing = editingProductId ? products.find((p) => p.id === editingProductId) : undefined;
    const capturedFile = photoFile;
    const capturedPreview = photoPreview;
    const anyInStock = sizesList.some((s) => s.inStock);

    const optimisticProd: Product = {
      id: prodId,
      name: {
        fr: nameFr.trim() || '',
        ar: nameAr.trim() || ''
      },
      category: category.trim() || 'french',
      description: {
        fr: descFr.trim() || '',
        ar: descAr.trim() || ''
      },
      sizes: sizesList.map((s, idx) => ({
        id: s.id || `sz-${idx}`,
        label: s.label.trim() || '',
        price: Number(s.price) > 0 ? Number(s.price) : 0,
        inStock: typeof s.inStock === 'boolean' ? s.inStock : false
      })),
      images: [capturedPreview || existing?.images?.[0] || 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80'],
      imageUrl: existing?.imageUrl || '',
      imageData: capturedPreview?.startsWith('data:') ? capturedPreview : (existing?.imageData || ''),
      inStock: typeof anyInStock === 'boolean' ? anyInStock : false,
      brand: existing?.brand || 'ABDOU FRAGRANCES',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      featured: typeof existing?.featured === 'boolean' ? existing.featured : true
    };

    // 1. Close form immediately upon Save (Optimistic UI)
    setIsEditing(false);
    setIsSubmitting(false);

    // 2. Show in admin list immediately with "Saving..." badge
    setOptimisticProducts((prev) => [optimisticProd, ...prev.filter((p) => p.id !== prodId)]);

    // 3. Write to Firestore in background
    executeBackgroundSave(prodId, optimisticProd, capturedFile);
  };

  /**
   * Background Save with browser image compression, parallel execution, and 30s timeout
   */
  const executeBackgroundSave = async (prodId: string, optimisticProd: Product, file?: File | null) => {
    setSavingStates((prev) => ({
      ...prev,
      [prodId]: {
        status: 'saving',
        retryProduct: optimisticProd,
        retryFile: file
      }
    }));

    try {
      let finalImageUrl = optimisticProd.imageUrl || '';
      let finalImageData = optimisticProd.imageData || '';
      let uploadBlob: Blob | null = null;

      if (file) {
        // Fast compression in browser: max 800px longest side, JPEG quality 0.6, under 300 KB
        const compressed = await compressImageFile(file);
        finalImageData = compressed.dataUrl;
        uploadBlob = compressed.blob;
      }

      const anyInStock = optimisticProd.sizes.some((s) => s.inStock);

      const productPayload: Record<string, any> = {
        id: prodId,
        name: {
          fr: optimisticProd.name.fr.trim(),
          ar: optimisticProd.name.ar.trim()
        },
        category: (optimisticProd.category || 'french').trim(),
        description: {
          fr: optimisticProd.description.fr.trim(),
          ar: optimisticProd.description.ar.trim()
        },
        sizes: optimisticProd.sizes.map((s, idx) => ({
          id: s.id || `sz-${idx}`,
          label: s.label.trim(),
          price: Number(s.price) > 0 ? Number(s.price) : 0,
          inStock: typeof s.inStock === 'boolean' ? s.inStock : false
        })),
        images: [finalImageUrl || finalImageData || optimisticProd.images[0] || ''],
        imageUrl: finalImageUrl,
        inStock: typeof anyInStock === 'boolean' ? anyInStock : false,
        brand: 'ABDOU FRAGRANCES',
        createdAt: optimisticProd.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        featured: typeof optimisticProd.featured === 'boolean' ? optimisticProd.featured : true
      };

      if (finalImageData && finalImageData.trim() !== '') {
        productPayload.imageData = finalImageData;
      }

      const cleaned = cleanData(productPayload);

      // Parallel operations:
      // A. Write document to Firestore (keeps 30s timeout and diagnostic message)
      const firestoreWritePromise = catalogService.saveProduct(cleaned);

      // B. In parallel, start Storage upload if file exists
      if (file && uploadBlob) {
        uploadProductImageWithFallback(file, prodId)
          .then((uploadRes) => {
            if (uploadRes.imageUrl) {
              // Update document with hosted storage URL in background
              catalogService.saveProduct({
                id: prodId,
                imageUrl: uploadRes.imageUrl,
                imageData: '',
                images: [uploadRes.imageUrl],
                updatedAt: serverTimestamp()
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }

      // Wait for Firestore document write
      await firestoreWritePromise;

      // Confirmed on server! Show green checkmark
      setSavingStates((prev) => ({
        ...prev,
        [prodId]: {
          status: 'confirmed'
        }
      }));

      // Auto-expire confirmation badge after 6 seconds
      setTimeout(() => {
        setSavingStates((prev) => {
          if (prev[prodId]?.status === 'confirmed') {
            const next = { ...prev };
            delete next[prodId];
            return next;
          }
          return prev;
        });
      }, 6000);
    } catch (err: any) {
      console.warn('Error during background save:', err);
      const errInfo = formatFirebaseErrorMessage(err, language);
      setSavingStates((prev) => ({
        ...prev,
        [prodId]: {
          status: 'failed',
          error: err?.message || String(err),
          errorCode: errInfo.code,
          retryProduct: optimisticProd,
          retryFile: file
        }
      }));
    }
  };

  // Delete product handler: awaits deleteDoc and deleteProductImage, shows clear server confirmation or error
  const handleDeleteProduct = async (product: Product) => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await catalogService.deleteProduct(product.id, product.images?.[0]);
      setDeleteCandidate(null);
      setSaveSuccessMsg(
        language === 'ar'
          ? 'تم حذف العطر نهائياً من قاعدة البيانات.'
          : 'Parfum supprimé définitivement du serveur.'
      );
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      console.warn('Delete failed notice:', err);
      const msg = err?.message || String(err);
      setDeleteError(
        language === 'ar'
          ? `تعذر الحذف من الخادم: ${msg}`
          : `Erreur serveur lors de la suppression : ${msg}`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Run Temporary Database Self-Test
  const handleRunSelfTest = async () => {
    setIsSelfTestOpen(true);
    setIsTestingDb(true);
    setSelfTestOverallResult(null);

    const success = await catalogService.runDatabaseSelfTest((steps) => {
      setSelfTestSteps(steps);
    });

    setSelfTestOverallResult(success);
    setIsTestingDb(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        ...settings,
        whatsappNumber: waNumberInput.trim()
      });
      setSettingsSavedMsg(true);
      setTimeout(() => setSettingsSavedMsg(false), 3000);
    } catch (err: any) {
      setGlobalErrorMsg(err?.message || 'Erreur mise à jour WhatsApp');
      setTimeout(() => setGlobalErrorMsg(null), 4000);
    }
  };

  // Merge Firestore products and optimistic products (with saving badges) without duplicates
  const allCombinedProducts = React.useMemo(() => {
    const list: Product[] = [];
    const seen = new Set<string>();

    // 1. Put optimistic items currently saving or failed at top
    for (const op of optimisticProducts) {
      if (!seen.has(op.id)) {
        list.push(op);
        seen.add(op.id);
      }
    }

    // 2. Real Firestore products
    for (const p of products) {
      if (!seen.has(p.id)) {
        list.push(p);
        seen.add(p.id);
      } else {
        // If real product is confirmed in Firestore, update it in list
        const idx = list.findIndex((item) => item.id === p.id);
        if (idx !== -1 && savingStates[p.id]?.status !== 'saving') {
          list[idx] = p;
        }
      }
    }

    return list;
  }, [products, optimisticProducts, savingStates]);

  // Filtered products list
  const filteredProducts = allCombinedProducts.filter((p) => {
    if (filterCategory !== 'all') {
      const pCat = p.category || (p.collection === 'arabian-oud-attars' ? 'arabic' : p.collection === 'niche-creations' ? 'niche' : 'french');
      if (pCat.toLowerCase() !== filterCategory.toLowerCase()) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nFr = p.name?.fr?.toLowerCase() || '';
      const nAr = p.name?.ar?.toLowerCase() || '';
      return nFr.includes(q) || nAr.includes(q);
    }
    return true;
  });

  // 1. Password-only Login View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-28 pb-20 bg-[#F4EFE7] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#EAE4DC] border border-[#D9D1C5] p-8 sm:p-10 space-y-8 shadow-xl relative">
          {/* Top corner X Close button */}
          <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
            <CloseButton onClick={onExit} ariaLabel="Close" size="md" />
          </div>

          <div className="text-center space-y-2">
            <img
              src="/logo-v2.png"
              alt="ABDOU FRAGRANCES"
              width={72}
              height={72}
              loading="lazy"
              decoding="async"
              className="w-[72px] h-[72px] object-contain mx-auto"
            />
            <h2 className="font-display text-2xl sm:text-3xl text-[#14110F]">
              {t('adminLoginTitle')}
            </h2>
            <p className="text-xs text-[#8C857B] font-light leading-relaxed">
              {t('adminLoginDesc')}
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-6">
            {loginError && (
              <div className="bg-[#5A1A24]/10 border border-[#5A1A24] p-3 text-xs text-[#5A1A24] leading-relaxed">
                {loginError}
              </div>
            )}

            <div>
              <label className="text-[10px] tracking-editorial uppercase text-[#14110F] block mb-2 font-medium">
                {t('passwordLabel')}
              </label>
              <input
                type="password"
                required
                disabled={lockoutRemaining > 0 || isVerifying}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F4EFE7] border border-[#D9D1C5] px-4 py-3 text-base text-[#14110F] focus:outline-none focus:border-[#14110F] disabled:opacity-50"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || lockoutRemaining > 0 || !passwordInput.trim()}
              className="btn-primary-wipe w-full h-[52px] text-xs uppercase tracking-editorial font-medium cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (language === 'ar' ? 'جارٍ التحقق...' : 'Vérification...') : t('signInBtn')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#F4EFE7] px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Bar with actions */}
      <div className="border-b border-[#D9D1C5] pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/logo-v2.png"
            alt="ABDOU FRAGRANCES"
            width={48}
            height={48}
            className="w-[48px] h-[48px] object-contain flex-shrink-0"
          />
          <div>
            <span className="text-[10px] tracking-editorial uppercase text-[#5A1A24] font-medium block mb-1">
              {language === 'ar' ? 'لوحة الإدارة — متزامنة لحظياً مع الخادم' : "Espace d'Administration — Synchronisé en direct"}
            </span>
            <h1 className="font-display italic text-2xl sm:text-3xl text-[#14110F]">
              ABDOU FRAGRANCES — {language === 'ar' ? 'إدارة المنتجات' : 'Gestion du Catalogue'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Temporary Database Self-Test Button */}
          <button
            onClick={handleRunSelfTest}
            disabled={isTestingDb}
            className="h-[46px] px-4 bg-[#A68A5B] hover:bg-[#8C7349] text-white text-xs uppercase tracking-editorial font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            title="Tester create, read, update, delete sur Firestore"
          >
            <span>🛠</span>
            <span>{language === 'ar' ? 'اختبار قاعدة البيانات (مؤقت)' : 'Test base de données (Temporaire)'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="btn-primary-wipe h-[46px] px-6 text-xs uppercase tracking-editorial font-medium flex items-center gap-2 cursor-pointer"
          >
            <span>+</span>
            <span>{t('addProductBtn')}</span>
          </button>

          <button
            onClick={handleLogout}
            className="btn-secondary-invert h-[46px] px-4 text-xs uppercase tracking-editorial cursor-pointer"
          >
            {t('signOutBtn')}
          </button>

          <CloseButton onClick={onExit} ariaLabel="Close" size="md" />
        </div>
      </div>

      {/* Startup Database Health Check Banner (Requirement 5) */}
      {healthStatus && healthStatus.ok && (
        <div className="bg-[#128C7E]/10 border border-[#128C7E]/40 text-[#128C7E] px-4 py-2.5 flex items-center justify-between text-xs tracking-wider animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#128C7E] animate-pulse" />
            <span>
              {language === 'ar' ? 'Base de données connectée — تم الاتصال بقاعدة البيانات بنجاح' : 'Base de données connectée'}
            </span>
          </div>
          <span className="text-[11px] text-[#8C857B] font-mono">
            {activeProjectId} / {activeDatabaseId}
          </span>
        </div>
      )}

      {healthStatus && !healthStatus.ok && (
        <div className="bg-[#5A1A24]/15 border border-[#5A1A24] text-[#5A1A24] px-4 py-3 text-xs tracking-wide flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#5A1A24]" />
            <span>
              {language === 'ar'
                ? `خطأ في الاتصال بقاعدة البيانات (الرمز: ${healthStatus.code || 'unknown'}): ${healthStatus.message}`
                : `Erreur de connexion à la base de données (code: ${healthStatus.code || 'unknown'}) : ${healthStatus.message}`}
            </span>
          </div>
          <button
            onClick={() => {
              setIsCheckingHealth(true);
              runStartupHealthCheck().then((res) => {
                setHealthStatus(res);
                setIsCheckingHealth(false);
              });
            }}
            disabled={isCheckingHealth}
            className="text-[11px] uppercase tracking-editorial underline font-medium hover:text-[#14110F] cursor-pointer ml-4 flex-shrink-0"
          >
            {isCheckingHealth ? (language === 'ar' ? 'جارٍ الفحص...' : 'Vérification...') : (language === 'ar' ? 'إعادة الفحص' : 'Réessayer')}
          </button>
        </div>
      )}

      {/* Global Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="bg-[#25D366]/15 border border-[#128C7E] text-[#128C7E] px-4 py-3 text-xs tracking-wider flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <span>✓</span>
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-sm font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Global Error Alert */}
      {globalErrorMsg && (
        <div className="bg-[#5A1A24]/15 border border-[#5A1A24] text-[#5A1A24] px-4 py-3 text-xs tracking-wider flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <span>⚠</span>
            <span>{globalErrorMsg}</span>
          </div>
          <button onClick={() => setGlobalErrorMsg(null)} className="text-sm font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Admin Primary Section Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D9D1C5] pb-2">
        <button
          type="button"
          onClick={() => setAdminMainTab('products')}
          className={`h-[44px] px-5 text-xs uppercase tracking-editorial font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            adminMainTab === 'products'
              ? 'border-[#14110F] text-[#14110F] bg-[#EAE4DC]'
              : 'border-transparent text-[#8C857B] hover:text-[#14110F]'
          }`}
        >
          <span>✨</span>
          <span>{language === 'ar' ? 'العطور الفردية' : 'Catalogue Parfums'}</span>
          <span className="text-[10px] bg-[#D9D1C5] px-2 py-0.5 rounded-full text-[#14110F]">
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminMainTab('packs')}
          className={`h-[44px] px-5 text-xs uppercase tracking-editorial font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            adminMainTab === 'packs'
              ? 'border-[#5A1A24] text-[#5A1A24] bg-[#EAE4DC]'
              : 'border-transparent text-[#8C857B] hover:text-[#5A1A24]'
          }`}
        >
          <span>🎁</span>
          <span>{language === 'ar' ? 'باكات وتخفيضات العطور' : 'Gestion des Packs'}</span>
          <span className="text-[10px] bg-[#5A1A24] text-white px-2 py-0.5 rounded-full">
            {packs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminMainTab('settings')}
          className={`h-[44px] px-5 text-xs uppercase tracking-editorial font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            adminMainTab === 'settings'
              ? 'border-[#14110F] text-[#14110F] bg-[#EAE4DC]'
              : 'border-transparent text-[#8C857B] hover:text-[#14110F]'
          }`}
        >
          <span>⚙️</span>
          <span>{language === 'ar' ? 'إعدادات واتساب والمتجر' : 'Paramètres WhatsApp'}</span>
        </button>
      </div>

      {/* 1. PACKS MANAGEMENT SECTION */}
      {adminMainTab === 'packs' && (
        <PacksAdminSection packs={packs} products={products} />
      )}

      {/* 2. INDIVIDUAL PRODUCTS CATALOG SECTION */}
      {adminMainTab === 'products' && (
        <div className="space-y-6">
          {/* Product List Header & Search Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#D9D1C5]">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-lg text-[#14110F]">
                {language === 'ar' ? 'قائمة العطور' : 'Catalogue des Parfums'}
              </h2>
              <span className="text-xs tracking-editorial uppercase text-[#8C857B]">
                ({filteredProducts.length} {t('productsCount')})
              </span>
            </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-[42px] bg-[#EAE4DC] border border-[#D9D1C5] px-3 text-xs uppercase tracking-editorial text-[#14110F] focus:outline-none focus:border-[#14110F] cursor-pointer"
          >
            <option value="all">{language === 'ar' ? 'جميع الفئات' : 'Toutes les catégories'}</option>
            {allCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name[language] || cat.name.fr}
              </option>
            ))}
          </select>

          {/* Search by name */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بالاسم...' : 'Rechercher par nom...'}
            className="h-[42px] bg-[#EAE4DC] border border-[#D9D1C5] px-3 text-xs text-[#14110F] focus:outline-none focus:border-[#14110F] w-full sm:w-60"
          />
        </div>
      </div>

      {/* Admin Product List Table */}
      <div className="bg-[#EAE4DC] border border-[#D9D1C5] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-[#14110F] text-[#F4EFE7] text-[10px] uppercase tracking-editorial">
              <tr>
                <th className="p-3.5 w-16 text-center">{language === 'ar' ? 'الصورة' : 'Photo'}</th>
                <th className="p-3.5">{language === 'ar' ? 'اسم العطر' : 'Nom du Parfum'}</th>
                <th className="p-3.5">{language === 'ar' ? 'الفئة' : 'Catégorie'}</th>
                <th className="p-3.5">{language === 'ar' ? 'أقل سعر' : 'Prix de départ'}</th>
                <th className="p-3.5 text-right rtl:text-left">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D1C5]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#8C857B] space-y-2">
                    <p className="font-display italic text-lg text-[#14110F]">
                      {language === 'ar' ? 'قاعدة البيانات فارغة حالياً.' : 'Aucun parfum dans la base de données.'}
                    </p>
                    <p className="text-xs">
                      {language === 'ar'
                        ? 'استخدم زر "إضافة عطر جديد" لإضافة أول منتج إلى المتجر.'
                        : 'Cliquez sur "Ajouter un Parfum" pour enregistrer votre première création.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const lowestP = p.sizes && p.sizes.length > 0 ? Math.min(...p.sizes.map((s) => s.price)) : 0;
                  const catLabel = getCategoryLabel(
                    p.category || (p.collection as any),
                    language,
                    settings.customCategories
                  );
                  const inStock = isProductInStock(p);

                  return (
                    <tr key={p.id} className="hover:bg-[#F4EFE7] transition-colors">
                      {/* 1. Thumbnail */}
                      <td className="p-3 text-center">
                        <img
                          src={getProductDisplayImage(p)}
                          alt={p.name.fr}
                          className="w-12 h-14 object-cover border border-[#D9D1C5] mx-auto bg-[#EAE4DC]"
                        />
                      </td>

                      {/* 2. Name (FR & AR) & Optimistic Status Badge */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-[#14110F]">{p.name.fr}</p>

                            {/* Saving... badge */}
                            {savingStates[p.id]?.status === 'saving' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-medium bg-amber-500/20 text-amber-800 border border-amber-500/40 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                <span>{language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>
                              </span>
                            )}

                            {/* Confirmed green check */}
                            {savingStates[p.id]?.status === 'confirmed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium bg-emerald-500/20 text-emerald-800 border border-emerald-500/40 animate-fadeIn">
                                <span className="text-emerald-600 font-bold">✓</span>
                                <span>{language === 'ar' ? 'تم الحفظ' : 'Confirmé'}</span>
                              </span>
                            )}

                            {/* Red Retry button with exact error code */}
                            {savingStates[p.id]?.status === 'failed' && (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => executeBackgroundSave(p.id, savingStates[p.id]?.retryProduct || p, savingStates[p.id]?.retryFile)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm transition-colors"
                                  title={savingStates[p.id]?.error}
                                >
                                  <span>⟳</span>
                                  <span>{language === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
                                  {savingStates[p.id]?.errorCode && (
                                    <span className="opacity-90 font-mono text-[9px]">[{savingStates[p.id]?.errorCode}]</span>
                                  )}
                                </button>
                                {savingStates[p.id]?.error && (
                                  <span className="text-[9px] text-red-600 max-w-[150px] truncate" title={savingStates[p.id]?.error}>
                                    {savingStates[p.id]?.error}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-[#8C857B] font-display">{p.name.ar}</p>
                        </div>
                      </td>

                      {/* 3. Category */}
                      <td className="p-3.5">
                        <span className="text-[10px] tracking-editorial uppercase px-2 py-1 bg-[#F4EFE7] border border-[#D9D1C5] text-[#14110F] font-medium">
                          {catLabel}
                        </span>
                      </td>

                      {/* 4. Lowest Price & Stock status */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <span className="font-semibold text-xs text-[#14110F] block">
                            {formatPrice(lowestP, language)}
                          </span>
                          {!inStock && (
                            <span className="text-[9px] text-[#5A1A24] font-medium uppercase tracking-wider block">
                              {language === 'ar' ? 'نفدت الكمية' : 'Épuisé'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Edit and Delete (with confirmation) */}
                      <td className="p-3.5 text-right rtl:text-left space-x-3 rtl:space-x-reverse">
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-xs uppercase tracking-editorial font-medium text-[#14110F] hover:text-[#5A1A24] underline cursor-pointer"
                        >
                          {language === 'ar' ? 'تعديل' : 'Modifier'}
                        </button>
                        <button
                          onClick={() => {
                            setDeleteCandidate(p);
                            setDeleteError(null);
                          }}
                          className="text-xs uppercase tracking-editorial font-medium text-[#5A1A24] hover:underline cursor-pointer"
                        >
                          {language === 'ar' ? 'حذف' : 'Supprimer'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* 3. STORE & WHATSAPP SETTINGS SECTION */}
      {adminMainTab === 'settings' && (
        <div className="bg-[#EAE4DC] border border-[#D9D1C5] p-6 sm:p-8 space-y-5 animate-fadeIn">
          <div>
            <span className="text-[10px] tracking-editorial uppercase text-[#5A1A24] font-medium block mb-1">
              {language === 'ar' ? 'إعدادات التواصل والطلبات' : 'Paramètres de Commande'}
            </span>
            <h3 className="font-display italic text-2xl text-[#14110F]">
              {t('whatsappSettingsTitle')}
            </h3>
            <p className="text-xs text-[#8C857B] font-light mt-1 max-w-lg">
              {language === 'ar'
                ? 'رقم الواتساب المستخدم لاستقبال الطلبات الفورية من حقيبة التسوق وزر المحادثة المباشر.'
                : 'Numéro WhatsApp international utilisé pour la réception automatique des commandes et le bouton flottant.'}
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <input
              type="text"
              required
              value={waNumberInput}
              onChange={(e) => setWaNumberInput(e.target.value)}
              placeholder="212612345678"
              className="bg-[#F4EFE7] border border-[#D9D1C5] px-4 py-3 text-sm text-[#14110F] w-full sm:w-80 focus:outline-none focus:border-[#14110F]"
            />
            <button
              type="submit"
              className="btn-primary-wipe h-[46px] px-8 text-xs uppercase tracking-editorial font-medium cursor-pointer"
            >
              {settingsSavedMsg ? (language === 'ar' ? 'تم الحفظ ✓' : 'Enregistré ✓') : t('saveSettings')}
            </button>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-[#14110F]/70 flex items-center justify-center p-4">
          <div className="bg-[#F4EFE7] border border-[#5A1A24] p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h4 className="font-display italic text-lg text-[#5A1A24]">
              {language === 'ar' ? 'تأكيد الحذف النهائي' : 'Confirmation de suppression'}
            </h4>
            <p className="text-xs text-[#14110F] leading-relaxed">
              {language === 'ar'
                ? `هل أنت متأكد من حذف العطر "${deleteCandidate.name.ar || deleteCandidate.name.fr}" نهائياً؟ سيتم حذفه من قاعدة البيانات وسيتلاشى فوراً من جميع الأجهزة.`
                : `Êtes-vous certain de vouloir supprimer définitivement "${deleteCandidate.name.fr}" ? Cette action est irréversible et retirera le produit immédiatement de tous les appareils.`}
            </p>

            {deleteError && (
              <div className="bg-[#5A1A24]/10 border border-[#5A1A24] p-3 text-xs text-[#5A1A24] leading-relaxed">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteCandidate(null)}
                className="btn-secondary-invert px-4 py-2 text-xs uppercase tracking-editorial cursor-pointer disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteProduct(deleteCandidate)}
                className="bg-[#5A1A24] text-white px-5 py-2 text-xs uppercase tracking-editorial hover:bg-[#3E1119] cursor-pointer disabled:opacity-50"
              >
                {isDeleting
                  ? (language === 'ar' ? 'جارٍ الحذف...' : 'Suppression...')
                  : (language === 'ar' ? 'تأكيد الحذف' : 'Confirmer la suppression')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEMPORARY ADMIN SELF-TEST MODAL */}
      {isSelfTestOpen && (
        <div className="fixed inset-0 z-50 bg-[#14110F]/75 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#F4EFE7] border border-[#A68A5B] p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl">
            {/* Header with Temporary Notice */}
            <div className="border-b border-[#D9D1C5] pb-4 flex items-start justify-between">
              <div>
                <span className="inline-block bg-[#A68A5B] text-white text-[9px] uppercase tracking-editorial font-bold px-2 py-0.5 mb-1.5">
                  TEMPORAIRE / مؤقت
                </span>
                <h3 className="font-display italic text-xl text-[#14110F]">
                  {language === 'ar' ? 'اختبار سلامة قاعدة البيانات' : 'Diagnostic Base de Données Firestore'}
                </h3>
                <p className="text-[11px] text-[#8C857B]">
                  {language === 'ar'
                    ? 'فحص شامل لعمليات الإنشاء، القراءة، التعديل، والحذف مع التحقق من الاختفاء النهائي.'
                    : 'Vérifie en direct les 5 opérations : CREATE, READ, UPDATE, DELETE et CONFIRMATION.'}
                </p>
                <div className="text-[10px] text-[#5A1A24] font-mono mt-1">
                  Projet: {activeProjectId} | Base: {activeDatabaseId}
                </div>
              </div>

              {!isTestingDb && (
                <CloseButton
                  onClick={() => setIsSelfTestOpen(false)}
                  ariaLabel="Close"
                  size="md"
                />
              )}
            </div>

            {/* Test Steps Progress List */}
            <div className="space-y-3">
              {selfTestSteps.map((step) => {
                let badgeClass = 'bg-[#EAE4DC] text-[#8C857B] border-[#D9D1C5]';
                let icon = '⏳';
                if (step.status === 'success') {
                  badgeClass = 'bg-[#25D366]/15 text-[#128C7E] border-[#25D366]';
                  icon = '✓';
                } else if (step.status === 'failed') {
                  badgeClass = 'bg-[#5A1A24]/15 text-[#5A1A24] border-[#5A1A24]';
                  icon = '✕';
                }

                return (
                  <div
                    key={step.step}
                    className={`p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${badgeClass}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{icon}</span>
                      <span className="font-medium tracking-wide">
                        Étape {step.step}: {step.name}
                      </span>
                    </div>

                    <div className="text-[11px] text-right rtl:text-left">
                      {step.details && <span className="text-[#128C7E] font-medium">{step.details}</span>}
                      {step.error && <span className="text-[#5A1A24] font-semibold">{step.error}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Final Verdict Banner */}
            {selfTestOverallResult !== null && (
              <div
                className={`p-3 border text-xs text-center font-medium ${
                  selfTestOverallResult
                    ? 'bg-[#25D366]/20 border-[#128C7E] text-[#128C7E]'
                    : 'bg-[#5A1A24]/20 border-[#5A1A24] text-[#5A1A24]'
                }`}
              >
                {selfTestOverallResult
                  ? (language === 'ar'
                      ? '✓ نجحت جميع الاختبارات الخمسة! قاعدة البيانات تعمل بكفاءة وبشكل متزامن عبر الأجهزة.'
                      : '✓ Succès total ! Les 5 opérations Firestore ont été validées avec succès.')
                  : (language === 'ar'
                      ? '✕ فشل أحد اختبارات قاعدة البيانات. يرجى مراجعة رسالة الخطأ المحددة أعلاه.'
                      : '✕ Échec d’une étape. Veuillez consulter le message d’erreur exact ci-dessus.')}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#D9D1C5]">
              <span className="text-[10px] text-[#8C857B] italic">
                Ce bouton de diagnostic est temporaire et pourra être retiré sans impacter l'application.
              </span>
              <button
                type="button"
                disabled={isTestingDb}
                onClick={handleRunSelfTest}
                className="btn-secondary-invert px-4 py-2 text-xs uppercase tracking-editorial font-medium cursor-pointer disabled:opacity-50"
              >
                {isTestingDb ? 'En cours...' : 'Relancer le test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PERFUME MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#14110F]/75 flex justify-center items-start p-2 sm:p-6 md:p-10 animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#F4EFE7] border border-[#D9D1C5] p-5 sm:p-8 my-auto shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D9D1C5] pb-4">
              <div>
                <span className="text-[10px] tracking-editorial uppercase text-[#5A1A24] block mb-1">
                  {editingProductId
                    ? (language === 'ar' ? 'تعديل بيانات العطر' : 'Édition du Parfum')
                    : (language === 'ar' ? 'إضافة عطر جديد' : 'Nouveau Parfum')}
                </span>
                <h3 className="font-display text-2xl text-[#14110F]">
                  {editingProductId
                    ? (language === 'ar' ? 'تعديل العطر' : 'Modifier le Parfum')
                    : (language === 'ar' ? 'إضافة عطر إلى المتجر' : 'Ajouter un Parfum')}
                </h3>
              </div>
              <CloseButton
                onClick={() => setIsEditing(false)}
                ariaLabel="Close"
                size="md"
              />
            </div>

            {/* Error in modal if write fails */}
            {modalError && (
              <div className="bg-[#5A1A24]/10 border border-[#5A1A24] p-3 text-xs text-[#5A1A24] leading-relaxed">
                {modalError}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleProductSubmit} className="space-y-6">
              
              {/* 1. Nom du parfum (français) - Required */}
              <div className="space-y-1.5">
                <label className="text-xs tracking-editorial uppercase text-[#14110F] font-semibold block">
                  Nom du parfum (français) <span className="text-[#5A1A24]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameFr}
                  onChange={(e) => {
                    setNameFr(e.target.value);
                    if (formErrors.nameFr) {
                      setFormErrors((prev) => {
                        const n = { ...prev };
                        delete n.nameFr;
                        return n;
                      });
                    }
                  }}
                  placeholder="Ex: Rose de Mai & Ambre Gris"
                  className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-4 py-3.5 text-base text-[#14110F] focus:outline-none focus:border-[#14110F]"
                />
                {formErrors.nameFr && (
                  <p className="text-[11px] text-[#5A1A24] font-medium">{formErrors.nameFr}</p>
                )}
              </div>

              {/* 2. اسم العطر (العربية) - Required */}
              <div className="space-y-1.5">
                <label className="text-xs tracking-editorial uppercase text-[#14110F] font-semibold block">
                  اسم العطر (العربية) <span className="text-[#5A1A24]">*</span>
                </label>
                <input
                  type="text"
                  dir="rtl"
                  required
                  value={nameAr}
                  onChange={(e) => {
                    setNameAr(e.target.value);
                    if (formErrors.nameAr) {
                      setFormErrors((prev) => {
                        const n = { ...prev };
                        delete n.nameAr;
                        return n;
                      });
                    }
                  }}
                  placeholder="مثال: ورد مايو والعنبر الرمادي"
                  className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-4 py-3.5 text-base text-[#14110F] text-right focus:outline-none focus:border-[#14110F]"
                />
                {formErrors.nameAr && (
                  <p className="text-[11px] text-[#5A1A24] font-medium">{formErrors.nameAr}</p>
                )}
              </div>

              {/* 3. Catégorie - Required */}
              <div className="space-y-1.5">
                <label className="text-xs tracking-editorial uppercase text-[#14110F] font-semibold block">
                  Catégorie <span className="text-[#5A1A24]">*</span>
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (formErrors.category) {
                      setFormErrors((prev) => {
                        const n = { ...prev };
                        delete n.category;
                        return n;
                      });
                    }
                  }}
                  className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-4 py-3.5 text-base text-[#14110F] focus:outline-none focus:border-[#14110F] cursor-pointer"
                >
                  <option value="">
                    {language === 'ar' ? '-- اختر الفئة --' : '-- Sélectionner une catégorie --'}
                  </option>
                  {allCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name[language] || cat.name.fr}
                    </option>
                  ))}
                </select>
                {formErrors.category && (
                  <p className="text-[11px] text-[#5A1A24] font-medium">{formErrors.category}</p>
                )}
              </div>

              {/* 4. Description: One French and One Arabic textarea - Required */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs tracking-editorial uppercase text-[#14110F] font-semibold block">
                    Description (Français) <span className="text-[#5A1A24]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={descFr}
                    onChange={(e) => {
                      setDescFr(e.target.value);
                      if (formErrors.descFr) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.descFr;
                          return n;
                        });
                      }
                    }}
                    placeholder="Brève description olfactive en français..."
                    className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-4 py-3 text-sm text-[#14110F] leading-relaxed focus:outline-none focus:border-[#14110F]"
                  />
                  {formErrors.descFr && (
                    <p className="text-[11px] text-[#5A1A24] font-medium">{formErrors.descFr}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs tracking-editorial uppercase text-[#14110F] font-semibold block">
                    الوصف (العربية) <span className="text-[#5A1A24]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    required
                    value={descAr}
                    onChange={(e) => {
                      setDescAr(e.target.value);
                      if (formErrors.descAr) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.descAr;
                          return n;
                        });
                      }
                    }}
                    placeholder="وصف مختصر للعطر ومكوناته باللغة العربية..."
                    className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-4 py-3 text-sm text-[#14110F] text-right leading-relaxed focus:outline-none focus:border-[#14110F]"
                  />
                  {formErrors.descAr && (
                    <p className="text-[11px] text-[#5A1A24] font-medium">{formErrors.descAr}</p>
                  )}
                </div>
              </div>

              {/* 5. Tailles et prix: repeating list */}
              <div className="bg-[#EAE4DC]/60 p-4 sm:p-5 border border-[#D9D1C5] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9D1C5] pb-3">
                  <div>
                    <h4 className="font-display text-sm text-[#14110F] font-semibold">
                      {language === 'ar' ? 'الأحجام والأسعار (التقسيم والزجاجات)' : 'Tailles et prix'} <span className="text-[#5A1A24]">*</span>
                    </h4>
                    <p className="text-[11px] text-[#8C857B]">
                      {language === 'ar'
                        ? 'حدد الكمية (مثال: 5 ml أو Flacon complet) والسعر بالدرهم وحالة التوفر.'
                        : 'Définissez la quantité (ex: 5 ml, 10 ml, Flacon complet), le prix en DH et le stock.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSizeRow}
                    className="btn-secondary-invert px-3.5 py-2 text-xs uppercase tracking-editorial font-medium cursor-pointer self-start sm:self-auto"
                  >
                    + {language === 'ar' ? 'إضافة حجم' : 'Ajouter une taille'}
                  </button>
                </div>

                {formErrors.sizes && (
                  <p className="text-[11px] text-[#5A1A24] font-medium">{formErrors.sizes}</p>
                )}

                <div className="space-y-3">
                  {sizesList.map((row, idx) => (
                    <div
                      key={row.id || idx}
                      className="bg-[#F4EFE7] p-3 border border-[#D9D1C5] flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                    >
                      {/* Quantité free text */}
                      <div className="flex-1">
                        <label className="text-[9px] uppercase tracking-editorial text-[#8C857B] block mb-1">
                          {language === 'ar' ? 'الكمية / الحجم' : 'Quantité'}
                        </label>
                        <input
                          type="text"
                          required
                          value={row.label}
                          onChange={(e) => handleUpdateSizeRow(idx, 'label', e.target.value)}
                          placeholder="Ex: 5 ml, 10 ml, Flacon complet"
                          className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-3 py-2 text-xs text-[#14110F]"
                        />
                      </div>

                      {/* Prix en DH */}
                      <div className="w-full sm:w-36">
                        <label className="text-[9px] uppercase tracking-editorial text-[#8C857B] block mb-1">
                          {language === 'ar' ? 'السعر (درهم)' : 'Prix en DH'}
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={row.price}
                          onChange={(e) => handleUpdateSizeRow(idx, 'price', Number(e.target.value))}
                          placeholder="150"
                          className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-3 py-2 text-xs text-[#14110F]"
                        />
                      </div>

                      {/* In-stock checkbox */}
                      <div className="flex items-center gap-2 pt-2 sm:pt-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-[#14110F] select-none whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={row.inStock}
                            onChange={(e) => handleUpdateSizeRow(idx, 'inStock', e.target.checked)}
                            className="w-4 h-4 accent-[#5A1A24]"
                          />
                          <span>{language === 'ar' ? 'متوفر' : 'En stock'}</span>
                        </label>
                      </div>

                      {/* Delete (X) button */}
                      <div className="flex items-center justify-end pt-2 sm:pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveSizeRow(idx)}
                          className="w-8 h-8 border border-[#D9D1C5] flex items-center justify-center text-xs text-[#5A1A24] hover:bg-[#5A1A24] hover:text-white transition-colors cursor-pointer"
                          title="Supprimer cette ligne"
                          aria-label="Supprimer la taille"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Photo */}
              <div className="space-y-2">
                <label className="text-xs tracking-editorial uppercase text-[#14110F] font-semibold block">
                  Photo <span className="text-[#5A1A24]">*</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary-invert w-full sm:w-auto h-[48px] px-6 text-xs uppercase tracking-editorial font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 stroke-current fill-none stroke-[1.5]" viewBox="0 0 24 24">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <span>
                      {photoPreview
                        ? (language === 'ar' ? 'تغيير الصورة' : 'Changer la photo')
                        : (language === 'ar' ? 'اختيار صورة (المعرض أو الكاميرا)' : 'Choisir une photo (Galerie / Caméra)')}
                    </span>
                  </button>

                  {photoPreview && (
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-20 bg-[#EAE4DC] border border-[#D9D1C5] overflow-hidden flex-shrink-0">
                        <img
                          src={photoPreview}
                          alt="Aperçu flacon"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-[#128C7E] font-medium">
                        ✓ {language === 'ar' ? 'صورة جاهزة للحفظ' : 'Photo prête'}
                      </span>
                    </div>
                  )}
                </div>

                {formErrors.photo && (
                  <p className="text-[11px] text-[#5A1A24] font-medium">{formErrors.photo}</p>
                )}
              </div>

              {/* Action Buttons: Disabled while saving or uploading */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t border-[#D9D1C5]">
                <button
                  type="button"
                  disabled={isSubmitting || isUploadingPhoto}
                  onClick={() => setIsEditing(false)}
                  className="w-full sm:w-auto order-2 sm:order-1 h-[48px] px-8 border border-[#14110F] text-[#14110F] hover:bg-[#14110F] hover:text-[#F4EFE7] transition-colors text-xs uppercase tracking-editorial font-medium cursor-pointer disabled:opacity-50"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingPhoto}
                  className="w-full sm:w-auto order-1 sm:order-2 h-[48px] px-10 bg-[#14110F] text-[#F4EFE7] hover:bg-[#5A1A24] transition-colors text-xs uppercase tracking-editorial font-medium disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {(isSubmitting || isUploadingPhoto) && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>
                    {isUploadingPhoto
                      ? (uploadProgress > 0
                          ? (language === 'ar' ? `جارٍ رفع الصورة (${uploadProgress}%)...` : `Téléchargement de l’image (${uploadProgress}%)...`)
                          : (language === 'ar' ? 'جارٍ معالجة الصورة...' : 'Traitement de l’image...'))
                      : isSubmitting
                      ? (language === 'ar' ? 'جارٍ الحفظ في الخادم...' : 'Enregistrement sur le serveur...')
                      : (language === 'ar' ? 'حفظ' : 'Enregistrer')}
                  </span>
                </button>
              </div>

              {/* Exact error shown in red under the Save button on failure (never an endless spinner) */}
              {submitError && (
                <div className="bg-[#5A1A24]/10 border border-[#5A1A24] p-3 text-xs text-[#5A1A24] leading-relaxed font-medium animate-fadeIn">
                  <span>⚠ {submitError}</span>
                </div>
              )}

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
