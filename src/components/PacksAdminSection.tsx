import React, { useState, useRef } from 'react';
import { Pack, PackCategory, Product, formatPrice } from '../types';
import { packService } from '../services/packService';
import { useLanguage } from '../context/LanguageContext';
import { uploadProductImageWithFallback } from '../services/firebase';
import { CloseButton } from './CloseButton';

interface PacksAdminSectionProps {
  packs: Pack[];
  products: Product[];
  onRefreshPacks?: () => void;
}

export const PacksAdminSection: React.FC<PacksAdminSectionProps> = ({
  packs
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<PackCategory>('women');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete candidate
  const [deleteCandidate, setDeleteCandidate] = useState<Pack | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success alert
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Simplified Form Fields (Requirement 6): Title, Description, Price, Image, and Show/Hide switch
  const [category, setCategory] = useState<PackCategory>('women');
  const [nameAr, setNameAr] = useState('');
  const [nameFr, setNameFr] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descFr, setDescFr] = useState('');
  const [price, setPrice] = useState<number>(650);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Image handling
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPacks = packs.filter((p) => p.category === activeTab);
  const womenCount = packs.filter((p) => p.category === 'women').length;
  const menCount = packs.filter((p) => p.category === 'men').length;

  const openCreateModal = (defaultCat?: PackCategory) => {
    setEditingPack(null);
    setCategory(defaultCat || activeTab);
    setNameAr('');
    setNameFr('');
    setDescAr('');
    setDescFr('');
    setPrice(650);
    setIsActive(true);
    setImageUrl('');
    setImageFile(null);
    setImagePreview('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (pack: Pack) => {
    setEditingPack(pack);
    setCategory(pack.category);
    setNameAr(pack.name.ar || '');
    setNameFr(pack.name.fr || '');
    setDescAr(pack.description?.ar || '');
    setDescFr(pack.description?.fr || '');
    setPrice(pack.price || 0);
    setIsActive(pack.isActive ?? true);
    setImageUrl(pack.image || '');
    setImageFile(null);
    setImagePreview(pack.image || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalError(language === 'ar' ? 'يرجى اختيار ملف صورة صالح' : 'Veuillez sélectionner un fichier image valide');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleActive = async (pack: Pack) => {
    try {
      await packService.savePack({
        ...pack,
        isActive: !pack.isActive
      });
      setSuccessMsg(
        language === 'ar'
          ? `تم تحديث حالة الباك: ${!pack.isActive ? 'ظاهر' : 'مخفي'}`
          : `Statut du pack mis à jour : ${!pack.isActive ? 'Visible' : 'Masqué'}`
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      await packService.deletePack(deleteCandidate.id);
      setDeleteCandidate(null);
      setSuccessMsg(
        language === 'ar' ? 'تم حذف الباك بنجاح' : 'Pack supprimé avec succès'
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !nameFr.trim()) {
      setModalError(
        language === 'ar' ? 'يرجى إدخال اسم الباك بالعربية والفرنسية' : 'Veuillez saisir le nom en français et en arabe'
      );
      return;
    }

    if (price <= 0) {
      setModalError(
        language === 'ar' ? 'يرجى إدخال سعر صحيح بالدرهم' : 'Veuillez saisir un prix valide en DH'
      );
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const packId = editingPack ? editingPack.id : `pack-${category}-${Date.now()}`;
      let finalImage = imagePreview || imageUrl || editingPack?.image;

      // If user uploaded a new local file, upload it
      if (imageFile) {
        setIsUploadingImage(true);
        try {
          const uploadRes = await uploadProductImageWithFallback(imageFile, packId);
          if (uploadRes.imageUrl) {
            finalImage = uploadRes.imageUrl;
          } else if (uploadRes.imageData) {
            finalImage = uploadRes.imageData;
          }
        } catch (uploadErr) {
          console.warn('Image upload fallback to preview:', uploadErr);
        } finally {
          setIsUploadingImage(false);
        }
      }

      if (!finalImage) {
        finalImage = category === 'women'
          ? 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80';
      }

      // Simplified pack data payload (Requirement 6: no badges, no contents list)
      const packPayload: Pack = {
        id: packId,
        category,
        name: {
          ar: nameAr.trim(),
          fr: nameFr.trim()
        },
        description: {
          ar: descAr.trim(),
          fr: descFr.trim()
        },
        price: Number(price),
        image: finalImage,
        isActive,
        createdAt: editingPack?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await packService.savePack(packPayload);

      setIsModalOpen(false);
      setSuccessMsg(
        language === 'ar'
          ? `تم حفظ الباك "${nameAr}" بنجاح في قاعدة البيانات.`
          : `Le pack "${nameFr}" a été enregistré avec succès.`
      );
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setModalError(err?.message || 'Erreur lors de l’enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9D1C5]">
        <div>
          <span className="text-[10px] tracking-wider uppercase text-[#5A1A24] font-medium block mb-1">
            {language === 'ar' ? 'إدارة باكات وتخفيضات العطور' : 'Gestion des Packs'}
          </span>
          <h2 className="font-display text-2xl text-[#14110F]">
            {language === 'ar' ? 'باكات العطور الرجالية والنسائية' : 'Packs Parfums Homme & Femme'}
          </h2>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="btn-primary-wipe h-[46px] px-6 text-xs uppercase tracking-wider font-medium flex items-center gap-2 cursor-pointer"
        >
          <span>+</span>
          <span>{language === 'ar' ? 'إضافة باك جديد' : 'Nouveau Pack'}</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-[#25D366]/15 border border-[#128C7E] text-[#128C7E] px-4 py-3 text-xs tracking-wider flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-sm font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Two Tabs: Women's Packs & Men's Packs */}
      <div className="flex items-center border-b border-[#D9D1C5] gap-2">
        <button
          onClick={() => setActiveTab('women')}
          className={`py-3 px-6 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'women'
              ? 'border-[#5A1A24] text-[#5A1A24] bg-[#EAE4DC]/50'
              : 'border-transparent text-[#8C857B] hover:text-[#14110F]'
          }`}
        >
          <span>🌸</span>
          <span>{language === 'ar' ? 'باكات النساء' : 'Packs Femme'}</span>
          <span className="text-[10px] bg-[#D9D1C5] px-1.5 py-0.5 rounded-full text-[#14110F]">
            {womenCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('men')}
          className={`py-3 px-6 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'men'
              ? 'border-[#5A1A24] text-[#5A1A24] bg-[#EAE4DC]/50'
              : 'border-transparent text-[#8C857B] hover:text-[#14110F]'
          }`}
        >
          <span>👑</span>
          <span>{language === 'ar' ? 'باكات الرجال' : 'Packs Homme'}</span>
          <span className="text-[10px] bg-[#D9D1C5] px-1.5 py-0.5 rounded-full text-[#14110F]">
            {menCount}
          </span>
        </button>
      </div>

      {/* Packs Grid */}
      {filteredPacks.length === 0 ? (
        <div className="py-16 text-center border border-[#D9D1C5] bg-[#EAE4DC]/40 p-8 space-y-3">
          <p className="text-sm text-[#8C857B] font-light">
            {language === 'ar'
              ? `لا توجد باكات مضافة في قسم ${activeTab === 'women' ? 'النساء' : 'الرجال'}.`
              : `Aucun pack dans la section ${activeTab === 'women' ? 'Femme' : 'Homme'}.`}
          </p>
          <button
            onClick={() => openCreateModal(activeTab)}
            className="btn-secondary-invert px-5 py-2.5 text-xs uppercase tracking-wider cursor-pointer"
          >
            + {language === 'ar' ? 'إضافة أول باك' : 'Créer un premier pack'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPacks.map((pack) => (
            <div
              key={pack.id}
              className={`border transition-all flex flex-col justify-between bg-[#F4EFE7] ${
                pack.isActive ? 'border-[#D9D1C5]' : 'border-red-300 opacity-70 bg-red-50/20'
              }`}
            >
              <div>
                {/* Pack Image with Active Badge */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#EAE4DC]">
                  <img
                    src={pack.image}
                    alt={pack.name.fr}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 flex items-center gap-1.5">
                    <span
                      className={`text-[9px] tracking-wider uppercase px-2 py-0.5 font-bold ${
                        pack.isActive ? 'bg-[#25D366] text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {pack.isActive
                        ? (language === 'ar' ? 'ظاهر بالمتجر' : 'Visible')
                        : (language === 'ar' ? 'مخفي' : 'Masqué')}
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 rtl:left-auto rtl:right-2">
                    <span className="bg-[#14110F]/90 text-[#F4EFE7] text-xs px-2.5 py-1 font-semibold">
                      {formatPrice(pack.price, language)}
                    </span>
                  </div>
                </div>

                {/* Pack Info */}
                <div className="p-4 space-y-2">
                  <h3 className="font-display text-lg text-[#14110F] font-medium">
                    {pack.name.ar}
                  </h3>
                  <p className="text-xs text-[#8C857B] font-light">
                    {pack.name.fr}
                  </p>

                  {pack.description?.ar && (
                    <p className="text-xs text-[#8C857B] line-clamp-2 pt-1 font-light">
                      {pack.description.ar}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-[#EAE4DC]/50 border-t border-[#D9D1C5] flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleActive(pack)}
                  className={`text-[10px] tracking-wider uppercase px-2.5 py-1.5 border font-medium cursor-pointer transition-colors ${
                    pack.isActive
                      ? 'border-[#D9D1C5] text-[#8C857B] hover:text-[#14110F] bg-white'
                      : 'border-[#25D366] text-[#25D366] bg-[#25D366]/10'
                  }`}
                  title={pack.isActive ? 'إخفاء الباك من المتجر' : 'إظهار الباك في المتجر'}
                >
                  {pack.isActive
                    ? (language === 'ar' ? 'إخفاء' : 'Masquer')
                    : (language === 'ar' ? 'إظهار' : 'Publier')}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(pack)}
                    className="text-[10px] tracking-wider uppercase px-3 py-1.5 bg-[#14110F] text-[#F4EFE7] hover:bg-[#5A1A24] cursor-pointer transition-colors font-medium"
                  >
                    {language === 'ar' ? 'تعديل' : 'Modifier'}
                  </button>

                  <button
                    onClick={() => setDeleteCandidate(pack)}
                    className="text-[10px] tracking-wider uppercase px-2.5 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    {language === 'ar' ? 'حذف' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simplified Add / Edit Pack Modal (Requirement 6) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-[#F4EFE7] border border-[#D9D1C5] w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            {/* Modal Header with X Close Icon (Requirement 1) */}
            <div className="flex items-center justify-between pb-4 border-b border-[#D9D1C5]">
              <h3 className="font-display text-2xl text-[#14110F] font-medium">
                {editingPack
                  ? (language === 'ar' ? 'تعديل الباك' : 'Modifier le Pack')
                  : (language === 'ar' ? 'إضافة باك جديد' : 'Nouveau Pack')}
              </h3>
              <CloseButton onClick={() => setIsModalOpen(false)} ariaLabel="Close" />
            </div>

            {modalError && (
              <div className="bg-[#5A1A24]/10 border border-[#5A1A24] p-3 text-xs text-[#5A1A24]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="text-[10px] tracking-wider uppercase text-[#14110F] block mb-1.5 font-medium">
                  {language === 'ar' ? 'نوع الباك' : 'Catégorie'} *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategory('women')}
                    className={`py-2 text-xs uppercase tracking-wider font-medium border cursor-pointer ${
                      category === 'women'
                        ? 'border-[#5A1A24] bg-[#5A1A24] text-[#F4EFE7]'
                        : 'border-[#D9D1C5] bg-[#EAE4DC] text-[#14110F]'
                    }`}
                  >
                    🌸 {language === 'ar' ? 'باكات النساء' : 'Packs Femme'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('men')}
                    className={`py-2 text-xs uppercase tracking-wider font-medium border cursor-pointer ${
                      category === 'men'
                        ? 'border-[#5A1A24] bg-[#5A1A24] text-[#F4EFE7]'
                        : 'border-[#D9D1C5] bg-[#EAE4DC] text-[#14110F]'
                    }`}
                  >
                    👑 {language === 'ar' ? 'باكات الرجال' : 'Packs Homme'}
                  </button>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] tracking-wider uppercase text-[#14110F] block mb-1 font-medium">
                    {language === 'ar' ? 'اسم الباك بالعربية' : 'Nom en Arabe'} *
                  </label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: باقة الأنوثة الملكية"
                    className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-3 py-2 text-xs text-[#14110F] focus:outline-none focus:border-[#14110F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-wider uppercase text-[#14110F] block mb-1 font-medium">
                    {language === 'ar' ? 'اسم الباك بالفرنسية' : 'Nom en Français'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    placeholder="Ex: Pack Féminité Royale"
                    className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-3 py-2 text-xs text-[#14110F] focus:outline-none focus:border-[#14110F]"
                  />
                </div>
              </div>

              {/* Price in MAD */}
              <div>
                <label className="text-[10px] tracking-wider uppercase text-[#14110F] block mb-1 font-medium">
                  {language === 'ar' ? 'السعر بالدرهم (MAD)' : 'Prix en DH'} *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  placeholder="650"
                  className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-3 py-2 text-xs text-[#14110F] focus:outline-none focus:border-[#14110F]"
                />
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] tracking-wider uppercase text-[#14110F] block mb-1 font-medium">
                    {language === 'ar' ? 'الوصف بالعربية' : 'Description en Arabe'}
                  </label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    placeholder="وصف مختصر لمميزات الباك..."
                    className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-3 py-2 text-xs text-[#14110F] focus:outline-none focus:border-[#14110F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-wider uppercase text-[#14110F] block mb-1 font-medium">
                    {language === 'ar' ? 'الوصف بالفرنسية' : 'Description en Français'}
                  </label>
                  <textarea
                    rows={2}
                    value={descFr}
                    onChange={(e) => setDescFr(e.target.value)}
                    placeholder="Description du pack..."
                    className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-3 py-2 text-xs text-[#14110F] focus:outline-none focus:border-[#14110F]"
                  />
                </div>
              </div>

              {/* Image Upload / URL */}
              <div className="space-y-2">
                <label className="text-[10px] tracking-wider uppercase text-[#14110F] block font-medium">
                  {language === 'ar' ? 'صورة الباك' : 'Photo du Pack'}
                </label>
                <div className="flex gap-3 items-center">
                  {imagePreview && (
                    <div className="w-16 h-16 bg-[#EAE4DC] border border-[#D9D1C5] overflow-hidden flex-shrink-0">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-grow space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="text-xs text-[#14110F] file:mr-2 file:py-1 file:px-2.5 file:border-0 file:text-xs file:bg-[#14110F] file:text-[#F4EFE7] file:cursor-pointer"
                    />
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        if (e.target.value) setImagePreview(e.target.value);
                      }}
                      placeholder="https://..."
                      className="w-full bg-[#EAE4DC] border border-[#D9D1C5] px-2.5 py-1.5 text-xs text-[#14110F] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Show / Hide Switch (isActive) */}
              <div className="pt-2 flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#D9D1C5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                  <span className="ml-3 rtl:mr-3 text-xs font-medium text-[#14110F]">
                    {language === 'ar'
                      ? 'عرض الباك في المتجر للزوار (نشط)'
                      : 'Afficher le pack sur la boutique'}
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[#D9D1C5] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary-invert px-5 py-2 text-xs uppercase tracking-wider cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="btn-primary-wipe px-7 py-2 text-xs uppercase tracking-wider font-medium cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Enregistrement...')
                    : (language === 'ar' ? 'حفظ الباك' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#F4EFE7] border border-[#5A1A24] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-display text-xl text-[#5A1A24] font-medium">
              {language === 'ar' ? 'تأكيد حذف الباك' : 'Confirmer la suppression'}
            </h3>
            <p className="text-xs text-[#14110F] leading-relaxed">
              {language === 'ar'
                ? `هل أنت متأكد من رغبتك في حذف الباك "${deleteCandidate.name.ar}" نهائياً من قاعدة البيانات؟`
                : `Êtes-vous sûr de vouloir supprimer définitivement le pack "${deleteCandidate.name.fr}" ?`}
            </p>
            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="btn-secondary-invert px-4 py-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-[#5A1A24] text-white hover:bg-black px-5 py-2 text-xs uppercase tracking-wider font-medium cursor-pointer transition-colors disabled:opacity-50"
              >
                {isDeleting
                  ? (language === 'ar' ? 'جارٍ الحذف...' : 'Suppression...')
                  : (language === 'ar' ? 'نعم، حذف' : 'Supprimer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
