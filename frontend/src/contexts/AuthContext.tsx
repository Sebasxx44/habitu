import { useTheme } from '@/components/theme-provider';
import i18n from '@/i18n';
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  authService,
  httpService,
  notificationService,
} from "@/services/auth/authService";
import type { GoogleCredentials, User } from "@/types/auth";
import type { AppNotification } from "@/types/notifications";
import { useNavigate } from "react-router-dom";
import { guestHome } from "@/modules/auth/services/routeAccess";

// Types
interface AuthContextValue {
  user: User | null;
  permissions: string[];
  loading: boolean;
  login: (
    email: string,
    password: string,
    twoFactorCode?: string,
  ) => Promise<User>;
  loginWithGoogle: (
    credentials: GoogleCredentials,
  ) => Promise<{ user: User; is_new_user?: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markNotificationsRead: () => void;
  refreshNotifications: () => Promise<void>;
}

// Contexts
const AuthContext = createContext<AuthContextValue | null>(null);
const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("Se requiere una sesión de AuthProvider.");
  return context;
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("Se requiere NotificationContext.");
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  // State
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const sessionVersion = useRef(0);

  useEffect(() => {
    if (user?.preferences?.language) void i18n.changeLanguage(user.preferences.language);
    if (user?.preferences?.theme) setTheme(user.preferences.theme);
  }, [user?.id, user?.preferences?.language, user?.preferences?.theme, setTheme]);

  // Actions
  const refreshUser = useCallback(async () => {
    const version = sessionVersion.current;
    const session = await authService.me();
    if (version !== sessionVersion.current) return;
    setUser(session.user); setPermissions(session.permissions);
  }, []);
  const clearSession = useCallback(() => {
    sessionVersion.current += 1;
    httpService.clearToken();
    setUser(null);
    setPermissions([]);
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const refreshNotifications = useCallback(async () => {
    const version = sessionVersion.current;
    const inbox = await notificationService.getAll();
    if (version !== sessionVersion.current) return;
    setNotifications(inbox.notifications);
    setUnreadCount(inbox.unread);
  }, []);

  const login = async (
    email: string,
    password: string,
    twoFactorCode?: string,
  ): Promise<User> => {
    const version = ++sessionVersion.current;
    await authService.login({
      email,
      password,
      two_factor_code: twoFactorCode,
    });
    const session = await authService.me();
    if (version !== sessionVersion.current)
      throw new Error(
        "La sesión cambió durante el acceso. Inténtalo de nuevo.",
      );
    setUser(session.user);
    setPermissions(session.permissions);
    return session.user;
  };

  const loginWithGoogle = async (credentials: GoogleCredentials) => {
    const version = ++sessionVersion.current;
    const result = await authService.loginWithGoogle(credentials);
    const session = await authService.me();
    if (version !== sessionVersion.current)
      throw new Error(
        "La sesión cambió durante el acceso. Inténtalo de nuevo.",
      );
    setUser(session.user);
    setPermissions(session.permissions);
    return { user: session.user, is_new_user: result.is_new_user };
  };

  const logout = () => {
    startTransition(() => {
      navigate(guestHome, { replace: true });
      void authService.logout().catch(() => undefined);
      clearSession();
    });
  };

  const markNotificationsRead = () => {
    const version = sessionVersion.current;
    void notificationService
      .markAllRead()
      .then(() => {
        if (version !== sessionVersion.current) return;
        setUnreadCount(0);
        setNotifications((current) =>
          current.map((notification) => ({ ...notification, read: true })),
        );
      })
      .catch(() => undefined);
  };

  // Lifecycle
  useEffect(() => {
    const syncClearedSession = () => {
      if (httpService.getToken()) return;
      sessionVersion.current += 1;
      setUser(null);
      setPermissions([]);
      setNotifications([]);
      setUnreadCount(0);
    };
    window.addEventListener("habitu:session-changed", syncClearedSession);
    return () => window.removeEventListener("habitu:session-changed", syncClearedSession);
  }, []);

  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    if (!httpService.isTokenValid()) {
      clearSession();
      setLoading(false);
      return;
    }
    void authService
      .me()
      .then((session) => {
        if (!active || version !== sessionVersion.current) return;
        setUser(session.user);
        setPermissions(session.permissions);
      })
      .catch(() => {
        if (active && version === sessionVersion.current) clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clearSession]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const inbox = await notificationService.getAll();
        if (active) {
          setNotifications(inbox.notifications);
          setUnreadCount(inbox.unread);
        }
      } catch {
        /* Inbox errors must not end an authenticated session. */
      }
    };
    const refresh = async () => {
      const version = sessionVersion.current;
      const expiry = Number(localStorage.getItem("eb_token_expiry"));
      if (!expiry || Date.now() < expiry - 5 * 60_000) return;
      try {
        await authService.refreshToken();
      } catch {
        if (active && version === sessionVersion.current) clearSession();
      }
    };
    void poll();
    const interval = window.setInterval(() => {
      void refresh();
    }, 60_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [user, clearSession]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationsRead,
      }}
    >
      <AuthContext.Provider
        value={{ user, permissions, loading, login, loginWithGoogle, logout, refreshUser }}
      >
        {children}
      </AuthContext.Provider>
    </NotificationContext.Provider>
  );
};
