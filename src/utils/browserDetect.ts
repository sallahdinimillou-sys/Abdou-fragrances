/**
 * Browser detection utility to enforce Chrome / Google App only access.
 */

export function checkBrowserAccess(): { allowed: boolean; isAndroidInApp: boolean } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { allowed: true, isAndroidInApp: false };
  }

  // 1. Owner bypass via ?allow=1 (in query string or hash)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('allow') === '1' || window.location.hash.includes('allow=1')) {
      sessionStorage.setItem('abdou_owner_allow', '1');
    }
    if (sessionStorage.getItem('abdou_owner_allow') === '1') {
      return { allowed: true, isAndroidInApp: false };
    }
  } catch (_) {}

  // 2. Allow search engine and link-preview bots
  const ua = navigator.userAgent || '';
  if (/googlebot|bingbot|yandex|duckduckbot|slurp|baiduspider|facebookexternalhit|facebot|twitterbot|telegrambot|applebot|linkedinbot|embedly|quora link preview|rogerbot|showyoubot|outbrain|pinterest\/|slackbot|vkshare|w3c_validator/i.test(ua)) {
    return { allowed: true, isAndroidInApp: false };
  }

  // Check Android In-App browser
  const isAndroid = /Android/i.test(ua);
  const isAndroidInApp = isAndroid && (
    /; wv\)|; wv/i.test(ua) ||
    /Version\/4\.0/i.test(ua) ||
    /FBAN|FBAV|Instagram|TikTok|Line\/|Snapchat|MicroMessenger|WhatsApp/i.test(ua)
  );

  // 3. Google App (iOS or Android)
  if (/GSA\//i.test(ua)) {
    return { allowed: true, isAndroidInApp: false };
  }

  // 4. Chrome on iOS (iPhone / iPad)
  if (/CriOS\//i.test(ua) || /CriOS/i.test(ua)) {
    return { allowed: true, isAndroidInApp: false };
  }

  // 5. Excluded browsers (even if their UA string mentions Chrome)
  if (/Edg|EdgA|EdgiOS|OPR|OPT|SamsungBrowser|UCBrowser|YaBrowser|Vivaldi|DuckDuckGo|Firefox|FxiOS/i.test(ua)) {
    return { allowed: false, isAndroidInApp };
  }

  // 6. Android WebView
  if (/; wv\)|; wv/i.test(ua)) {
    return { allowed: false, isAndroidInApp };
  }

  // 7. Standard Google Chrome (Desktop, Android)
  if (/Chrome\//i.test(ua)) {
    return { allowed: true, isAndroidInApp: false };
  }

  // All other browsers (Safari, etc.)
  return { allowed: false, isAndroidInApp };
}
