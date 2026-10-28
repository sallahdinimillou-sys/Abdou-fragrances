import { Product } from '../types';

/**
 * Authentic baseline catalog for Abdou Fragrances Guelmim.
 * Ensures the website immediately displays products on any device, network, or browser (including Safari),
 * even if Firestore connection is establishing, offline, or daily quota is exceeded.
 */
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-ysl-libre-intense',
    name: {
      fr: 'Yves Saint Laurent — Libre Eau de Parfum Intense',
      ar: 'إيف سان لوران — ليبر إنتنس'
    },
    brand: 'Yves Saint Laurent',
    category: 'french',
    collection: 'french-haute-parfumerie',
    family: 'Floral',
    gender: 'Pour Femme',
    description: {
      fr: 'Une signature florale incandescente mêlant la lavande de France et la fleur d’oranger du Maroc sublimées par un accord orchidée fauve et une vanille bourbon liquoreuse.',
      ar: 'توليفة زهرية ساحرة تجمع بين لافندر فرنسا وزهر البرتقال المغربي، مع لمسات الفانيليا والأوركيد الفاخر.'
    },
    inStock: true,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80'
    ],
    sizes: [
      { id: 'size-libre-5ml', label: 'Décant 5 ml', price: 95, inStock: true },
      { id: 'size-libre-10ml', label: 'Décant 10 ml', price: 175, inStock: true },
      { id: 'size-libre-50ml', label: 'Flacon 50 ml', price: 790, inStock: true },
      { id: 'size-libre-90ml', label: 'Flacon 90 ml', price: 1190, inStock: true }
    ],
    pyramid: {
      top: ['Mandarine', 'Bergamote', 'Lavande'],
      heart: ['Fleur d’oranger du Maroc', 'Jasmin Sambac', 'Orchidée'],
      base: ['Vanille de Madagascar', 'Fève Tonka', 'Ambre Gris']
    }
  },
  {
    id: 'prod-ysl-y-edp',
    name: {
      fr: 'Yves Saint Laurent — Y Eau de Parfum',
      ar: 'إيف سان لوران — واي أو دو بارفان'
    },
    brand: 'Yves Saint Laurent',
    category: 'french',
    collection: 'french-haute-parfumerie',
    family: 'Woody',
    gender: 'Pour Homme',
    description: {
      fr: 'Un parfum boisé aromatique d’une puissance remarquable. Un départ vif de gingembre et pomme croquante contrasté par la sauge sclarée et un fond intense de bois de cèdre.',
      ar: 'عطر خشبي أروماتك قوي وأنيق. يفتتح بالزنجبيل والتفاح المنعش، مع قلب من المريمية وقاعدة غنية بخشب الأرز.'
    },
    inStock: true,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80'
    ],
    sizes: [
      { id: 'size-y-5ml', label: 'Décant 5 ml', price: 90, inStock: true },
      { id: 'size-y-10ml', label: 'Décant 10 ml', price: 165, inStock: true },
      { id: 'size-y-60ml', label: 'Flacon 60 ml', price: 750, inStock: true },
      { id: 'size-y-100ml', label: 'Flacon 100 ml', price: 1150, inStock: true }
    ],
    pyramid: {
      top: ['Pomme', 'Gingembre', 'Bergamote'],
      heart: ['Sauge sclarée', 'Géranium', 'Baies de genièvre'],
      base: ['Bois de cèdre', 'Fève Tonka', 'Oliban']
    }
  },
  {
    id: 'prod-oud-royal-imperial',
    name: {
      fr: 'Oud Royal Impérial — Dehn Al Oud Pur',
      ar: 'دهن العود الملكي الصافي'
    },
    brand: 'Maison Abdou Fragrances',
    category: 'arabic',
    collection: 'arabian-oud-attars',
    family: 'Oud',
    gender: 'Unisex',
    description: {
      fr: 'Un trésor oriental millénaire distillé selon la pure tradition. Notes de bois d’agar précieux d’Assam, cuir souple, ambre impérial et touches balsamiques envoûtantes.',
      ar: 'خلاصة خشب العود المعتق من أسام، مع لمسات عنبرية وبخورية تمنح حضوراً ملكياً ثابتاً يدوم طويلاً.'
    },
    inStock: true,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80'
    ],
    sizes: [
      { id: 'size-oud-3ml', label: 'Tola 1/4 (3 ml)', price: 180, inStock: true },
      { id: 'size-oud-6ml', label: 'Tola 1/2 (6 ml)', price: 320, inStock: true },
      { id: 'size-oud-12ml', label: 'Tola Complète (12 ml)', price: 580, inStock: true },
      { id: 'size-oud-flacon', label: 'Flacon Cristal 50 ml', price: 890, inStock: true }
    ],
    pyramid: {
      top: ['Safran d’Ispahan', 'Rose de Taïf'],
      heart: ['Bois d’Agar d’Assam', 'Cuir Royal'],
      base: ['Ambre Gris', 'Musc Noir', 'Bois de Santal']
    }
  },
  {
    id: 'prod-baccarat-rouge-540',
    name: {
      fr: 'Maison Francis Kurkdjian — Baccarat Rouge 540 Extrait',
      ar: 'ميسون فرانسيس كوركدجيان — باكارا روج 540 إكستري'
    },
    brand: 'Maison Francis Kurkdjian',
    category: 'niche',
    collection: 'niche-creations',
    family: 'Oriental',
    gender: 'Unisex',
    description: {
      fr: 'L’alchimie des sens par excellence. Une signature olfactive aérienne et dense où le jasmin grandiflorum d’Égypte côtoie l’amande amère du Maroc et un accord ambre gris boisé.',
      ar: 'تحفة عطرية استثنائية من الزعفران والياسمين المصري، مع عبير اللوز المر والعنبر الخشبي الآسر.'
    },
    inStock: true,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=800&q=80'
    ],
    sizes: [
      { id: 'size-br-5ml', label: 'Décant 5 ml', price: 140, inStock: true },
      { id: 'size-br-10ml', label: 'Décant 10 ml', price: 260, inStock: true },
      { id: 'size-br-70ml', label: 'Flacon 70 ml', price: 1650, inStock: true }
    ],
    pyramid: {
      top: ['Amande amère', 'Safran de Perse'],
      heart: ['Jasmin Grandiflorum', 'Cèdre de l’Atlas'],
      base: ['Ambre gris minéral', 'Musc boisé']
    }
  },
  {
    id: 'prod-bleu-de-chanel-parfum',
    name: {
      fr: 'Chanel — Bleu de Chanel Parfum',
      ar: 'شانيل — بلو دو شانيل عطر مركز'
    },
    brand: 'Chanel',
    category: 'french',
    collection: 'french-haute-parfumerie',
    family: 'Woody',
    gender: 'Pour Homme',
    description: {
      fr: 'La dimension la plus intense et noble de Bleu de Chanel. S’ouvre sur une fraîcheur aromatique avant de déployer un sillage majestueux de bois de santal de Nouvelle-Calédonie.',
      ar: 'الإصدار الأعمق والأرقى، يفيض بنفحات خشب الصندل النيوزيلندي الفاخر مع روائح حمضية وأروماتك.'
    },
    inStock: true,
    featured: false,
    images: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80'
    ],
    sizes: [
      { id: 'size-bleu-5ml', label: 'Décant 5 ml', price: 95, inStock: true },
      { id: 'size-bleu-10ml', label: 'Décant 10 ml', price: 175, inStock: true },
      { id: 'size-bleu-50ml', label: 'Flacon 50 ml', price: 790, inStock: true },
      { id: 'size-bleu-100ml', label: 'Flacon 100 ml', price: 1250, inStock: true }
    ],
    pyramid: {
      top: ['Zeste de citron', 'Bergamote', 'Menthe'],
      heart: ['Géranium', 'Lavande', 'Ananas'],
      base: ['Santal de Nouvelle-Calédonie', 'Cèdre', 'Ambre boisé']
    }
  },
  {
    id: 'prod-sauvage-elixir',
    name: {
      fr: 'Dior — Sauvage Elixir',
      ar: 'ديور — سواج إكسير'
    },
    brand: 'Dior',
    category: 'french',
    collection: 'french-haute-parfumerie',
    family: 'Woody',
    gender: 'Pour Homme',
    description: {
      fr: 'Un élixir prodigieusement concentré où la fraîcheur emblématique de Sauvage s’enivre d’un cœur d’épices ardentes et d’une essence de lavande noble sur mesure.',
      ar: 'عطر فائق التركيز والجاذبية، يمتزج فيه سحر الهيل والقرفة مع لافندر نقي وقاعدة خشبية آسرة.'
    },
    inStock: true,
    featured: false,
    images: [
      'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=800&q=80'
    ],
    sizes: [
      { id: 'size-sauvage-5ml', label: 'Décant 5 ml', price: 110, inStock: true },
      { id: 'size-sauvage-10ml', label: 'Décant 10 ml', price: 210, inStock: true },
      { id: 'size-sauvage-60ml', label: 'Flacon 60 ml', price: 1190, inStock: true }
    ],
    pyramid: {
      top: ['Cannelle', 'Noix de muscade', 'Cardamome'],
      heart: ['Lavande de Nyons'],
      base: ['Réglisse', 'Santal', 'Ambre', 'Patchouli']
    }
  },
  {
    id: 'prod-musc-blanc-taif',
    name: {
      fr: 'Musc Blanc & Rose de Taïf — Attar Pur',
      ar: 'مسك الطهارة الأبيض ودهن ورد الطائف'
    },
    brand: 'Maison Abdou Fragrances',
    category: 'arabic',
    collection: 'arabian-oud-attars',
    family: 'Floral',
    gender: 'Unisex',
    description: {
      fr: 'Une caresse de pureté infinie. La douceur soyeuse du musc blanc d’Orient fusionnée à la noble rose de Taïf et aux fleurs de coton.',
      ar: 'عبير النقاء الفاخر يجمع بين مسك الطهارة الصافي وبتلات الورد الطائفي النادر لنعومة فائقة تدوم.'
    },
    inStock: true,
    featured: false,
    images: [
      'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80'
    ],
    sizes: [
      { id: 'size-musc-3ml', label: 'Flacon Tola 1/4 (3 ml)', price: 70, inStock: true },
      { id: 'size-musc-6ml', label: 'Flacon Tola 1/2 (6 ml)', price: 120, inStock: true },
      { id: 'size-musc-12ml', label: 'Flacon Tola (12 ml)', price: 210, inStock: true }
    ],
    pyramid: {
      top: ['Fleur de coton', 'Lilas blanc'],
      heart: ['Rose de Taïf', 'Jasmin étoilé'],
      base: ['Musc blanc soyeux', 'Bois blond']
    }
  },
  {
    id: 'prod-black-phantom',
    name: {
      fr: 'Kilian — Black Phantom "Memento Mori"',
      ar: 'كيليان — بلاك فانتوم'
    },
    brand: 'Kilian Paris',
    category: 'niche',
    collection: 'niche-creations',
    family: 'Gourmand',
    gender: 'Unisex',
    description: {
      fr: 'Un accord gourmand ténébreux et addictif de café noir d’Éthiopie, rhum des Caraïbes, canne à sucre et chocolat noir fondant sur un lit de vétiver.',
      ar: 'عطر غورماند جريء يمزج قهوة إثيوبيا السوداء ورائحة السكر البني مع الشوكولاتة الداكنة وخشب الصندل.'
    },
    inStock: true,
    featured: false,
    images: [
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80'
    ],
    sizes: [
      { id: 'size-phantom-5ml', label: 'Décant 5 ml', price: 130, inStock: true },
      { id: 'size-phantom-10ml', label: 'Décant 10 ml', price: 240, inStock: true },
      { id: 'size-phantom-50ml', label: 'Flacon 50 ml', price: 1450, inStock: true }
    ],
    pyramid: {
      top: ['Rhum des Caraïbes', 'Amande amère'],
      heart: ['Café d’Éthiopie', 'Caramel chaud'],
      base: ['Chocolat noir', 'Canne à sucre', 'Bois de santal']
    }
  }
];
