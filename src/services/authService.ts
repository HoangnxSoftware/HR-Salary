import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Workspace Scopes for Sheets and Drive
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      const storedToken = await getAccessToken();
      if (storedToken) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(user, storedToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được Access Token từ Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    
    // Lưu trữ token vào localStorage để giữ phiên khi làm việc & đóng mở tab
    try {
      localStorage.setItem('google_access_token', credential.accessToken);
      localStorage.setItem('google_token_time', String(Date.now()));
      if (result.user.email) {
        localStorage.setItem('google_user_email', result.user.email);
      }
    } catch (e) {
      console.warn('Lỗi lưu token vào localStorage:', e);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored = localStorage.getItem('google_access_token');
    const storedTime = localStorage.getItem('google_token_time');
    if (stored && storedTime) {
      const elapsed = Date.now() - Number(storedTime);
      // Token Google thường có hạn 1 giờ (cho phép dùng trong 55 phút)
      if (elapsed < 55 * 60 * 1000) {
        cachedAccessToken = stored;
        return stored;
      } else {
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_time');
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc token:', e);
  }
  return null;
};

export const hasValidGoogleToken = (): boolean => {
  if (cachedAccessToken) return true;
  try {
    const stored = localStorage.getItem('google_access_token');
    const storedTime = localStorage.getItem('google_token_time');
    if (stored && storedTime) {
      const elapsed = Date.now() - Number(storedTime);
      return elapsed < 55 * 60 * 1000;
    }
  } catch (_) {}
  return false;
};

export const ensureGoogleAccessToken = async (): Promise<string> => {
  const token = await getAccessToken();
  if (token) return token;
  const res = await googleSignIn();
  if (!res?.accessToken) {
    throw new Error('Chưa cấp quyền Google. Vui lòng đăng nhập Google.');
  }
  return res.accessToken;
};

export const getCurrentUser = (): User | null => {
  return currentUser || auth.currentUser;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  currentUser = null;
  try {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_time');
    localStorage.removeItem('google_user_email');
  } catch (_) {}
};
