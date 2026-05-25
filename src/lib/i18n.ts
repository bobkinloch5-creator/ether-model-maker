import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Supported languages — keep alphabetized by display name for the picker.
export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

// Translation strings. Keep keys short and scoped.
const resources = {
  en: { translation: {
    nav: { home: "Home", features: "Features", community: "Community", secondLife: "Second Life", integrations: "Integrations", tutorials: "Tutorials", docs: "Docs", roadmap: "Roadmap", whatsNew: "What's New", signIn: "Sign in", launchApp: "Launch app", dashboard: "Dashboard", credits: "Credits", teams: "Teams", profile: "Profile" },
    hero: { badge: "New · Image-to-3D v2 is here", titleA: "The fastest way to", titleB: "3D, from text or image.", subtitle: "Generate game-ready 3D models, PBR textures, and animations in under a minute. Export to Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life — anywhere you build.", text: "Text", image: "Image", generate: "Generate", try: "Try:", placeholder: "An ornate elven longbow with glowing runes…", noCard: "No credit card required · 25 free credits" },
    common: { language: "Language", chooseLanguage: "Choose your language" }
  }},
  es: { translation: {
    nav: { home: "Inicio", features: "Funciones", community: "Comunidad", secondLife: "Second Life", integrations: "Integraciones", tutorials: "Tutoriales", docs: "Docs", roadmap: "Hoja de ruta", whatsNew: "Novedades", signIn: "Iniciar sesión", launchApp: "Abrir app", dashboard: "Panel", credits: "Créditos", teams: "Equipos", profile: "Perfil" },
    hero: { badge: "Nuevo · Imagen a 3D v2 ya está aquí", titleA: "La forma más rápida de hacer", titleB: "3D, desde texto o imagen.", subtitle: "Genera modelos 3D listos para juegos, texturas PBR y animaciones en menos de un minuto. Exporta a Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life.", text: "Texto", image: "Imagen", generate: "Generar", try: "Prueba:", placeholder: "Un arco élfico ornamentado con runas brillantes…", noCard: "Sin tarjeta · 25 créditos gratis" },
    common: { language: "Idioma", chooseLanguage: "Elige tu idioma" }
  }},
  fr: { translation: {
    nav: { home: "Accueil", features: "Fonctions", community: "Communauté", secondLife: "Second Life", integrations: "Intégrations", tutorials: "Tutoriels", docs: "Docs", roadmap: "Feuille de route", whatsNew: "Nouveautés", signIn: "Connexion", launchApp: "Lancer l'app", dashboard: "Tableau", credits: "Crédits", teams: "Équipes", profile: "Profil" },
    hero: { badge: "Nouveau · Image-vers-3D v2 disponible", titleA: "Le moyen le plus rapide de faire", titleB: "de la 3D, depuis texte ou image.", subtitle: "Générez des modèles 3D prêts pour le jeu, des textures PBR et des animations en moins d'une minute. Exportez vers Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life.", text: "Texte", image: "Image", generate: "Générer", try: "Essayez :", placeholder: "Un arc elfique orné avec des runes…", noCard: "Sans carte · 25 crédits gratuits" },
    common: { language: "Langue", chooseLanguage: "Choisissez votre langue" }
  }},
  de: { translation: {
    nav: { home: "Start", features: "Funktionen", community: "Community", secondLife: "Second Life", integrations: "Integrationen", tutorials: "Tutorials", docs: "Docs", roadmap: "Roadmap", whatsNew: "Neuigkeiten", signIn: "Anmelden", launchApp: "App öffnen", dashboard: "Dashboard", credits: "Credits", teams: "Teams", profile: "Profil" },
    hero: { badge: "Neu · Bild-zu-3D v2 ist da", titleA: "Der schnellste Weg zu", titleB: "3D, aus Text oder Bild.", subtitle: "Generiere spielfertige 3D-Modelle, PBR-Texturen und Animationen in unter einer Minute. Exportiere nach Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life.", text: "Text", image: "Bild", generate: "Generieren", try: "Versuche:", placeholder: "Ein verzierter Elfenbogen mit Runen…", noCard: "Keine Karte nötig · 25 Gratis-Credits" },
    common: { language: "Sprache", chooseLanguage: "Sprache wählen" }
  }},
  pt: { translation: {
    nav: { home: "Início", features: "Recursos", community: "Comunidade", secondLife: "Second Life", integrations: "Integrações", tutorials: "Tutoriais", docs: "Docs", roadmap: "Roadmap", whatsNew: "Novidades", signIn: "Entrar", launchApp: "Abrir app", dashboard: "Painel", credits: "Créditos", teams: "Equipes", profile: "Perfil" },
    hero: { badge: "Novo · Imagem-para-3D v2 chegou", titleA: "A forma mais rápida de fazer", titleB: "3D, a partir de texto ou imagem.", subtitle: "Gere modelos 3D prontos para jogos, texturas PBR e animações em menos de um minuto. Exporte para Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life.", text: "Texto", image: "Imagem", generate: "Gerar", try: "Tente:", placeholder: "Um arco élfico ornado com runas…", noCard: "Sem cartão · 25 créditos grátis" },
    common: { language: "Idioma", chooseLanguage: "Escolha o idioma" }
  }},
  it: { translation: {
    nav: { home: "Home", features: "Funzioni", community: "Community", secondLife: "Second Life", integrations: "Integrazioni", tutorials: "Tutorial", docs: "Docs", roadmap: "Roadmap", whatsNew: "Novità", signIn: "Accedi", launchApp: "Apri app", dashboard: "Dashboard", credits: "Crediti", teams: "Team", profile: "Profilo" },
    hero: { badge: "Nuovo · Immagine-a-3D v2 è qui", titleA: "Il modo più veloce per fare", titleB: "3D, da testo o immagine.", subtitle: "Genera modelli 3D pronti per il gioco, texture PBR e animazioni in meno di un minuto. Esporta in Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life.", text: "Testo", image: "Immagine", generate: "Genera", try: "Prova:", placeholder: "Un arco elfico ornato con rune…", noCard: "Senza carta · 25 crediti gratis" },
    common: { language: "Lingua", chooseLanguage: "Scegli la lingua" }
  }},
  ja: { translation: {
    nav: { home: "ホーム", features: "機能", community: "コミュニティ", secondLife: "Second Life", integrations: "連携", tutorials: "チュートリアル", docs: "ドキュメント", roadmap: "ロードマップ", whatsNew: "新着情報", signIn: "ログイン", launchApp: "アプリを開く", dashboard: "ダッシュボード", credits: "クレジット", teams: "チーム", profile: "プロフィール" },
    hero: { badge: "新着 · Image-to-3D v2 公開中", titleA: "最速で作る", titleB: "テキストや画像から3Dを。", subtitle: "ゲーム対応の3Dモデル、PBRテクスチャ、アニメーションを1分以内で生成。Blender、Unity、Unreal、Godot、Roblox、Three.js、Second Lifeに書き出せます。", text: "テキスト", image: "画像", generate: "生成", try: "例:", placeholder: "光るルーンが刻まれたエルフの弓…", noCard: "クレカ不要 · 無料25クレジット" },
    common: { language: "言語", chooseLanguage: "言語を選択" }
  }},
  ko: { translation: {
    nav: { home: "홈", features: "기능", community: "커뮤니티", secondLife: "Second Life", integrations: "통합", tutorials: "튜토리얼", docs: "문서", roadmap: "로드맵", whatsNew: "새 소식", signIn: "로그인", launchApp: "앱 열기", dashboard: "대시보드", credits: "크레딧", teams: "팀", profile: "프로필" },
    hero: { badge: "신규 · Image-to-3D v2 출시", titleA: "가장 빠른 방법", titleB: "텍스트나 이미지에서 3D로.", subtitle: "게임 준비된 3D 모델, PBR 텍스처, 애니메이션을 1분 이내에 생성. Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life로 내보내기.", text: "텍스트", image: "이미지", generate: "생성", try: "예시:", placeholder: "빛나는 룬이 새겨진 엘프 활…", noCard: "카드 불필요 · 무료 25 크레딧" },
    common: { language: "언어", chooseLanguage: "언어 선택" }
  }},
  zh: { translation: {
    nav: { home: "首页", features: "功能", community: "社区", secondLife: "Second Life", integrations: "集成", tutorials: "教程", docs: "文档", roadmap: "路线图", whatsNew: "新动态", signIn: "登录", launchApp: "启动应用", dashboard: "仪表盘", credits: "积分", teams: "团队", profile: "个人资料" },
    hero: { badge: "新功能 · Image-to-3D v2 上线", titleA: "最快的方式生成", titleB: "从文本或图像到3D。", subtitle: "在一分钟内生成游戏就绪的3D模型、PBR纹理和动画。可导出到 Blender、Unity、Unreal、Godot、Roblox、Three.js、Second Life。", text: "文本", image: "图像", generate: "生成", try: "试试:", placeholder: "雕刻有发光符文的精灵长弓…", noCard: "无需信用卡 · 25 个免费积分" },
    common: { language: "语言", chooseLanguage: "选择语言" }
  }},
  ru: { translation: {
    nav: { home: "Главная", features: "Функции", community: "Сообщество", secondLife: "Second Life", integrations: "Интеграции", tutorials: "Уроки", docs: "Документы", roadmap: "План", whatsNew: "Новое", signIn: "Войти", launchApp: "Открыть", dashboard: "Панель", credits: "Кредиты", teams: "Команды", profile: "Профиль" },
    hero: { badge: "Новое · Image-to-3D v2 уже здесь", titleA: "Самый быстрый способ", titleB: "получить 3D из текста или фото.", subtitle: "Генерируйте 3D-модели для игр, PBR-текстуры и анимации меньше чем за минуту. Экспорт в Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life.", text: "Текст", image: "Фото", generate: "Создать", try: "Примеры:", placeholder: "Орнаментный эльфийский лук с рунами…", noCard: "Без карты · 25 бесплатных кредитов" },
    common: { language: "Язык", chooseLanguage: "Выберите язык" }
  }},
  ar: { translation: {
    nav: { home: "الرئيسية", features: "الميزات", community: "المجتمع", secondLife: "Second Life", integrations: "التكاملات", tutorials: "الدروس", docs: "الوثائق", roadmap: "خارطة الطريق", whatsNew: "الجديد", signIn: "دخول", launchApp: "فتح التطبيق", dashboard: "لوحة التحكم", credits: "أرصدة", teams: "فرق", profile: "الملف" },
    hero: { badge: "جديد · Image-to-3D v2 متاح الآن", titleA: "أسرع طريقة لإنشاء", titleB: "نماذج 3D من النص أو الصورة.", subtitle: "أنشئ نماذج ثلاثية الأبعاد جاهزة للألعاب، خامات PBR ورسوم متحركة في أقل من دقيقة. صدّر إلى Blender وUnity وUnreal وGodot وRoblox وThree.js وSecond Life.", text: "نص", image: "صورة", generate: "إنشاء", try: "جرّب:", placeholder: "قوس إلفي مزخرف بنقوش متوهجة…", noCard: "بدون بطاقة · 25 رصيد مجاني" },
    common: { language: "اللغة", chooseLanguage: "اختر لغتك" }
  }},
  hi: { translation: {
    nav: { home: "होम", features: "विशेषताएँ", community: "समुदाय", secondLife: "Second Life", integrations: "एकीकरण", tutorials: "ट्यूटोरियल", docs: "दस्तावेज़", roadmap: "रोडमैप", whatsNew: "नया क्या है", signIn: "साइन इन", launchApp: "ऐप खोलें", dashboard: "डैशबोर्ड", credits: "क्रेडिट", teams: "टीमें", profile: "प्रोफ़ाइल" },
    hero: { badge: "नया · Image-to-3D v2 आ गया", titleA: "सबसे तेज़ तरीका", titleB: "टेक्स्ट या इमेज से 3D बनाने का。", subtitle: "एक मिनट से कम में गेम-तैयार 3D मॉडल, PBR टेक्सचर और एनिमेशन जनरेट करें। Blender, Unity, Unreal, Godot, Roblox, Three.js, Second Life पर एक्सपोर्ट करें।", text: "टेक्स्ट", image: "इमेज", generate: "जनरेट", try: "आज़माएँ:", placeholder: "चमकती रून्स वाला अलंकृत एल्फ धनुष…", noCard: "क्रेडिट कार्ड नहीं · 25 मुफ्त क्रेडिट" },
    common: { language: "भाषा", chooseLanguage: "अपनी भाषा चुनें" }
  }},
};

// Guard against double init in HMR / SSR re-imports.
if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      supportedLngs: LANGUAGES.map((l) => l.code),
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "kd_lang",
      },
    });
}

export default i18n;
