import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AdminPanelScreen from '@/components/AdminPanelScreen';
import ChatScreen from '@/components/ChatScreen';
import CreateEventScreen from '@/components/CreateEventScreen';
import EventDetailsScreen from '@/components/EventDetailsScreen';
import LoadingScreen from '@/components/LoadingScreen';
import LoginScreen from '@/components/LoginScreen';
import MapScreen from '@/components/MapScreen';
import ProfileScreen from '@/components/ProfileScreen';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import {
  apiRequest,
  getApiUrl,
  getDefaultApiUrl,
  loadApiUrlPreference,
  resetApiUrlPreference,
  setApiUrlPreference,
} from '@/lib/api';
import { formatApiErrorDetail, formatApiErrorMessage } from '@/lib/errorHints';
import { connectRealtime, RealtimeMessage } from '@/lib/realtime';

import {
  AdminUserRow,
  Comment,
  Complaint,
  Event,
  EventWithArchive,
  User,
} from '@/types/models';

function alertApiError(e: unknown) {
  const { summary, hint } = formatApiErrorDetail(e);
  Alert.alert(summary, hint);
}

type ScreenName =
  | 'login'
  | 'map'
  | 'event'
  | 'chat'
  | 'profile'
  | 'admin'
  | 'create'
  | 'edit';

let nextEventId = 1;

function isEventArchived(event: Event) {
  const now = new Date();

  if (event.archivedManually) {
    return true;
  }

  if (event.isAdminEvent && event.endTime) {
    return event.endTime <= now;
  }

  if (!event.isAdminEvent) {
    const diffMs = now.getTime() - event.createdAt.getTime();
    return diffMs / (1000 * 60 * 60) >= 5;
  }

  return false;
}

function AppContent() {
  const { isDark } = useTheme();

  const [token, setToken] = useState<string | null>(null);
  const [reportReasonOtherId, setReportReasonOtherId] = useState<number | null>(null);
  const [reportReasons, setReportReasons] = useState<
    { reason_id: number; name: string; description?: string; priority?: number }[]
  >([]);

  const [currentScreen, setCurrentScreen] =
    useState<ScreenName>('map');

  const [currentUser, setCurrentUser] =
    useState<User | null>(null);

  const [selectedEvent, setSelectedEvent] =
    useState<EventWithArchive | null>(null);

  const [editEvent, setEditEvent] = useState<EventWithArchive | null>(null);

  const [createCoords, setCreateCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [events, setEvents] = useState<Event[]>(() => {
    const now = new Date();
    return [
      {
        id: String(nextEventId++),
        type: 'accident',
        title: 'ДТП на Амирхана',
        description: 'Лёгкое столкновение, небольшая пробка в сторону центра.',
        lat: 55.823,
        lng: 49.148,
        author: 'system',
        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
        endTime: null,
        isAdminEvent: false,
        archivedManually: false,
      },
      {
        id: String(nextEventId++),
        type: 'police',
        title: 'Пост ДПС',
        description: 'Проверяют документы и ремни безопасности.',
        lat: 55.788,
        lng: 49.104,
        author: 'system',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endTime: null,
        isAdminEvent: false,
        archivedManually: false,
      },
      {
        id: String(nextEventId++),
        type: 'chat',
        title: 'Обсуждение района Азино',
        description: 'Чат жителей по вопросам парковки и шума.',
        lat: 55.827,
        lng: 49.151,
        author: 'system',
        createdAt: now,
        endTime: null,
        isAdminEvent: false,
        archivedManually: false,
      },
      {
        id: String(nextEventId++),
        type: 'official',
        title: 'Перекрытие улицы у Кремля',
        description: 'Официальное сообщение администрации о перекрытии на время фестиваля.',
        lat: 55.799,
        lng: 49.106,
        author: 'admin',
        createdAt: now,
        endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        isAdminEvent: true,
        archivedManually: false,
      },
    ];
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [isBooting, setIsBooting] = useState(true);
  const [apiUrl, setApiUrl] = useState(() => getApiUrl());

  const syncSelectedEvent = (nextEvents: Event[]) => {
    setSelectedEvent((prev) => {
      if (!prev) return prev;
      const next = nextEvents.find((event) => event.id === prev.id);
      if (!next) return null;
      return {
        ...next,
        isArchived: isEventArchived(next),
      };
    });
  };

  // =========================
  // ARCHIVE LOGIC
  // =========================

  const eventsWithArchiveFlag = useMemo<EventWithArchive[]>(() => {
    return events.map((e) => ({
      ...e,
      isArchived: isEventArchived(e),
    }));
  }, [events]);

  const visibleEvents = useMemo(
    () => eventsWithArchiveFlag.filter((e) => !e.isArchived),
    [eventsWithArchiveFlag],
  );

  const archivedEvents = useMemo(
    () => eventsWithArchiveFlag.filter((e) => e.isArchived),
    [eventsWithArchiveFlag],
  );

  // =========================
  // AUTH
  // =========================

  const handleLogin = async (username: string, password: string) => {
    try {
      const data = await apiRequest<{
        token: string;
        user: {
          userId: number;
          username: string;
          role: string;
          createdAt: string;
          avatarEmoji?: string | null;
        };
      }>('/auth/login', { method: 'POST', body: { username, password } });

      setToken(data.token);
      const user: User = {
        userId: data.user.userId,
        username: data.user.username,
        isAdmin: data.user.role === 'admin',
        registeredAt: new Date(data.user.createdAt),
        avatarEmoji: data.user.avatarEmoji ?? null,
      };
      setCurrentUser(user);
      setCurrentScreen('map');
    } catch (e: any) {
      throw new Error(formatApiErrorMessage(e));
    }
  };

  const handleRegister = async (username: string, password: string) => {
    try {
      const data = await apiRequest<{
        token: string;
        user: {
          userId: number;
          username: string;
          role: string;
          createdAt: string;
          avatarEmoji?: string | null;
        };
      }>('/auth/register', { method: 'POST', body: { username, password } });

      setToken(data.token);
      const user: User = {
        userId: data.user.userId,
        username: data.user.username,
        isAdmin: data.user.role === 'admin',
        registeredAt: new Date(data.user.createdAt),
        avatarEmoji: data.user.avatarEmoji ?? null,
      };
      setCurrentUser(user);
      setCurrentScreen('map');
    } catch (e: any) {
      throw new Error(formatApiErrorMessage(e));
    }
  };

  const updateProfileBestEffort = async (payload: { username?: string; avatarEmoji?: string | null }) => {
    if (!token) {
      Alert.alert('Вход нужен', 'Пожалуйста, авторизуйтесь, чтобы менять профиль.');
      return;
    }
    try {
      const data = await apiRequest<{
        user: {
          userId: number;
          username: string;
          role: string;
          createdAt: string;
          avatarEmoji?: string | null;
        };
      }>('/me', { token, method: 'PATCH', body: payload });
      setCurrentUser({
        userId: data.user.userId,
        username: data.user.username,
        isAdmin: data.user.role === 'admin',
        registeredAt: new Date(data.user.createdAt),
        avatarEmoji: data.user.avatarEmoji ?? null,
      });
      Alert.alert('OK', 'Профиль обновлён.');
    } catch (e: any) {
      alertApiError(e);
    }
  };

  const changePasswordBestEffort = async (currentPassword: string, newPassword: string) => {
    if (!token) {
      Alert.alert('Вход нужен', 'Пожалуйста, авторизуйтесь, чтобы менять пароль.');
      return;
    }
    try {
      await apiRequest('/me/password', { token, method: 'PATCH', body: { currentPassword, newPassword } });
      Alert.alert('OK', 'Пароль изменён.');
    } catch (e: any) {
      alertApiError(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedEvent(null);
    setToken(null);
    setCurrentScreen('map');
  };

  // =========================
  // EVENTS
  // =========================

  const handleArchiveEvent = (eventId: string) => {
    const idNum = Number(eventId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Нужен вход', 'Войдите как администратор.');
      return;
    }

    apiRequest(`/admin/events/${idNum}/archive`, { token, method: 'POST' })
      .then(async () => {
        await loadEvents();
        Alert.alert('Готово', 'Событие отправлено в архив.');
      })
      .catch((e: any) => {
        alertApiError(e);
      });
  };

  const handleDeleteEvent = (eventId: string) => {
    const idNum = Number(eventId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Нужен вход', 'Войдите в аккаунт, чтобы удалять события.');
      return;
    }

    apiRequest(`/events/${idNum}`, { token, method: 'DELETE' })
      .then(async () => {
        await loadEvents();
        setComments((prev) => prev.filter((c) => c.eventId !== String(idNum)));
        setSelectedEvent(null);
        setCurrentScreen('map');
      })
      .catch((e: any) => {
        alertApiError(e);
      });
  };

  const handleDeleteComment = (commentId: string) => {
    const idNum = Number(commentId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Нужен вход', 'Войдите в аккаунт для управления комментариями.');
      return;
    }

    apiRequest(`/comments/${idNum}`, { token, method: 'DELETE' })
      .then(() => {
        setComments((prev) => prev.filter((c) => c.id !== String(idNum)));
      })
      .catch((e: any) => {
        alertApiError(e);
      });
  };

  const handleEditComment = (commentId: string, text: string) => {
    const idNum = Number(commentId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Нужен вход', 'Войдите в аккаунт для редактирования комментариев.');
      return;
    }

    apiRequest(`/comments/${idNum}`, { token, method: 'PATCH', body: { text } })
      .then(() => {
        setComments((prev) =>
          prev.map((c) => (c.id === String(idNum) ? { ...c, text } : c)),
        );
      })
      .catch((e: any) => {
        alertApiError(e);
      });
  };

  // =========================
  // COMMENTS
  // =========================

  const addCommentBestEffort = async (eventId: string, text: string) => {
    if (!currentUser || !token) {
      Alert.alert('Нужен вход', 'Войдите в аккаунт, чтобы комментировать.');
      return false;
    }
    const idNum = Number(eventId);
    if (!Number.isFinite(idNum)) return false;
    try {
      const data = await apiRequest<{ commentId: number; createdAt: string }>(`/events/${idNum}/comments`, {
        token,
        method: 'POST',
        body: { text },
      });
      setComments((prev) => [
        ...prev,
        {
          id: String(data.commentId),
          eventId: String(idNum),
          author: currentUser.username,
          text,
          createdAt: new Date(data.createdAt),
        },
      ]);
      return true;
    } catch (e: any) {
      alertApiError(e);
      return false;
    }
  };

  const reasonLabel = (name: string) => {
    const map: Record<string, string> = {
      spam: 'Спам',
      abuse: 'Оскорбления',
      fake: 'Ложная информация',
      other: 'Другое',
    };
    return map[name] ?? name;
  };

  const reportToApi = async (targetType: 'event' | 'comment', targetId: number, reasonId: number) => {
    if (!token) throw new Error('Login required');
    await apiRequest('/reports', {
      token,
      method: 'POST',
      body: { targetType, targetId, reasonId },
    });
  };

  const promptReport = (targetType: 'event' | 'comment', targetId: number) => {
    if (!currentUser || !token) {
      Alert.alert('Нужен вход', 'Войдите в аккаунт, чтобы отправить жалобу.');
      return;
    }

    if (currentUser.isAdmin) {
      Alert.alert('Недоступно', 'Администратор не может отправлять жалобы.');
      return;
    }

    if (targetType === 'event' && selectedEvent?.author === currentUser.username) {
      Alert.alert('Недоступно', 'Нельзя пожаловаться на своё событие.');
      return;
    }

    const items = reportReasons.length > 0 ? reportReasons : [];
    const buttons = items.map((r) => ({
      text: reasonLabel(r.name),
      onPress: () => {
        reportToApi(targetType, targetId, r.reason_id)
          .then(() => Alert.alert('Отправлено', 'Жалоба принята.'))
          .catch((e: any) => alertApiError(e));
      },
    }));

    if (buttons.length === 0) {
      if (!reportReasonOtherId) {
        Alert.alert('Ошибка', 'Причины жалоб не загрузились. Проверьте соединение и перезайдите.');
        return;
      }
      Alert.alert('Жалоба', 'Отправить с причиной по умолчанию?', [
        {
          text: 'Отправить',
          onPress: () => {
            reportToApi(targetType, targetId, reportReasonOtherId)
              .then(() => Alert.alert('Отправлено', 'Жалоба принята.'))
              .catch((e: any) => alertApiError(e));
          },
        },
        { text: 'Отмена', style: 'cancel' },
      ]);
      return;
    }

    Alert.alert('Причина жалобы', undefined, [...buttons, { text: 'Отмена', style: 'cancel' }]);
  };

  const handleComplaintEvent = (_reason: string) => {
    if (!selectedEvent) return;
    const idNum = Number(selectedEvent.id);
    if (!Number.isFinite(idNum)) return;
    promptReport('event', idNum);
  };

  const handleComplaintComment = (commentId: string, _reason: string) => {
    const idNum = Number(commentId);
    if (!Number.isFinite(idNum)) return;
    promptReport('comment', idNum);
  };

  const createEventBestEffort = async (
    data: {
      type: Event['type'];
      title: string;
      description: string;
      lat: number;
      lng: number;
      endTime?: Date | null;
    },
  ) => {
    try {
      if (!token) throw new Error('Login required');

      if (data.type === 'official') {
        if (!currentUser?.isAdmin) {
          Alert.alert('Недоступно', 'Официальные события может создавать только администратор.');
          return;
        }
        if (!data.endTime) {
          Alert.alert('Некорректно', 'Для официального события требуется дата окончания.');
          return;
        }
        await apiRequest('/admin/events', {
          token,
          method: 'POST',
          body: {
            type: 'official',
            title: data.title,
            description: data.description,
            latitude: data.lat,
            longitude: data.lng,
            expiresAt: data.endTime.toISOString(),
          },
        });
      } else {
        await apiRequest('/events', {
          token,
          method: 'POST',
          body: {
            type: data.type,
            title: data.title,
            description: data.description,
            latitude: data.lat,
            longitude: data.lng,
          },
        });
      }
      await loadEvents();
      setCurrentScreen('map');
    } catch (e: any) {
      alertApiError(e);
    }
  };

  const updateEventBestEffort = async (
    eventId: string,
    data: {
      type: Event['type'];
      title: string;
      description: string;
      lat: number;
      lng: number;
      endTime?: Date | null;
    },
  ) => {
    const idNum = Number(eventId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Нужен вход', 'Войдите в аккаунт для редактирования событий.');
      return;
    }

    try {
      await apiRequest(`/events/${idNum}`, {
        token,
        method: 'PATCH',
        body: {
          type: data.type,
          title: data.title,
          description: data.description,
          latitude: data.lat,
          longitude: data.lng,
          expiresAt: data.type === 'official' ? (data.endTime ? data.endTime.toISOString() : undefined) : undefined,
        },
      });
      await loadEvents();
      setEditEvent(null);
      setCurrentScreen('map');
      Alert.alert('Готово', 'Событие обновлено.');
    } catch (e: any) {
      alertApiError(e);
    }
  };

  const createOfficialEventBestEffort = async (
    data: Omit<Event, 'id' | 'author' | 'createdAt' | 'archivedManually'>,
  ) => {
    if (!token) {
      Alert.alert('Нужен вход', 'Войдите как администратор.');
      return;
    }
    if (!data.endTime) {
      Alert.alert('Некорректно', 'Укажите дату окончания официального события (ISO).');
      return;
    }
    try {
      await apiRequest('/admin/events', {
        token,
        method: 'POST',
        body: {
          type: data.type ?? 'official',
          title: data.title,
          description: data.description,
          latitude: data.lat,
          longitude: data.lng,
          expiresAt: data.endTime ? data.endTime.toISOString() : undefined,
        },
      });
      await loadEvents();
      Alert.alert('Готово', 'Официальное событие создано.');
    } catch (e: any) {
      alertApiError(e);
    }
  };

  // =========================
  // API SYNC (best-effort)
  // =========================

  const loadReportReasons = async () => {
    try {
      const data = await apiRequest<{
        items: { reason_id: number; name: string; description?: string; priority?: number }[];
      }>(
        '/report-reasons',
      );
      setReportReasons(data.items);
      const other = data.items.find((r) => r.name === 'other') ?? data.items[0];
      if (other) setReportReasonOtherId(other.reason_id);
    } catch {
      // ignore
    }
  };

  const loadEvents = async () => {
    try {
      const data = await apiRequest<{ items: any[] }>('/events?includeArchived=true', {
        token,
      });
      const mapped: Event[] = data.items.map((row) => ({
        id: String(row.event_id),
        type: row.type,
        title: row.title,
        description: row.description ?? '',
        lat: Number(row.latitude),
        lng: Number(row.longitude),
        author: row.author,
        createdAt: new Date(row.created_at),
        endTime: row.expires_at ? new Date(row.expires_at) : null,
        isAdminEvent: row.type === 'official',
        archivedManually: Boolean(row.is_archived),
      }));
      setEvents(mapped);
      syncSelectedEvent(mapped);
    } catch {
      // ignore (offline demo)
    }
  };

  const loadCommentsForEvent = async (eventId: string) => {
    const idNum = Number(eventId);
    if (!Number.isFinite(idNum)) return;

    try {
      const data = await apiRequest<{ items: any[] }>(`/events/${idNum}/comments`, { token });
      const mapped: Comment[] = data.items.map((c) => ({
        id: String(c.comment_id),
        eventId: String(idNum),
        author: c.author,
        text: c.text,
        createdAt: new Date(c.created_at),
      }));
      setComments((prev) => {
        const rest = prev.filter((x) => x.eventId !== String(idNum));
        return [...rest, ...mapped];
      });
    } catch {
      // ignore
    }
  };

  const loadAdminReports = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ items: any[] }>('/admin/reports', { token });
      const mapped: Complaint[] = data.items.map((r) => ({
        id: String(r.report_id),
        type: r.event_id ? 'event' : 'comment',
        targetId: String(r.event_id ?? r.comment_id),
        reporter: r.reporter,
        reason: r.reason,
        createdAt: new Date(r.created_at),
        targetUsername: r.target_username ?? undefined,
        targetUserId: r.target_user_id != null ? String(r.target_user_id) : null,
        reportNote: r.report_note ?? null,
        eventId: r.event_id ? String(r.event_id) : r.comment_event_id != null ? String(r.comment_event_id) : null,
        eventTitle: r.event_title ?? null,
        eventDescription: r.event_description ?? null,
        eventAuthor: r.target_username ?? null,
        commentText: r.comment_text ?? null,
        commentEventTitle: r.comment_event_title ?? null,
      }));
      setComplaints(mapped);
    } catch {
      // ignore
    }
  };

  const loadAdminUsers = async (searchQuery = '') => {
    if (!token) return;
    try {
      const data = await apiRequest<{
        items: { userId: number; username: string; isAdmin: boolean; isBlocked: boolean; createdAt: string }[];
      }>(`/admin/users${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`, { token });
      setAdminUsers(
        data.items.map((u) => ({
          userId: String(u.userId),
          username: u.username,
          isAdmin: u.isAdmin,
          isBlocked: u.isBlocked,
          createdAt: new Date(u.createdAt),
        })),
      );
    } catch {
      // ignore
    }
  };

  const adminBlockUserById = async (userId: string, durationMinutes: number | null) => {
    if (!token) return;
    try {
      await apiRequest(`/admin/users/${userId}/block`, {
        token,
        method: 'POST',
        body: { durationMinutes: durationMinutes ?? null },
      });
      await loadAdminUsers();
      Alert.alert('Готово', 'Пользователь заблокирован.');
    } catch (e: any) {
      alertApiError(e);
    }
  };

  const adminUnblockUserById = async (userId: string) => {
    if (!token) return;
    try {
      await apiRequest(`/admin/users/${userId}/unblock`, { token, method: 'POST' });
      await loadAdminUsers();
      Alert.alert('Готово', 'Блокировка снята.');
    } catch (e: any) {
      alertApiError(e);
    }
  };

  const adminReportAction = (action: 'reject' | 'delete-target' | 'block-target', reportId: string) => {
    const idNum = Number(reportId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Нужен вход', 'Войдите как администратор.');
      return;
    }

    apiRequest(`/admin/reports/${idNum}/${action}`, { token, method: 'POST' })
      .then(async () => {
        await loadAdminReports();
        await loadEvents();
        await loadAdminUsers();
        Alert.alert('Готово', 'Действие выполнено.');
      })
      .catch((e: any) => {
        alertApiError(e);
      });
  };

  const saveServerUrl = async (nextUrl: string) => {
    const saved = await setApiUrlPreference(nextUrl);
    setApiUrl(saved);
    await loadEvents();
    if (token) {
      await loadReportReasons();
    }
  };

  const restoreDefaultServerUrl = async () => {
    const restored = await resetApiUrlPreference();
    setApiUrl(restored);
    await loadEvents();
    if (token) {
      await loadReportReasons();
    }
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const restoredApiUrl = await loadApiUrlPreference();
      if (isMounted) {
        setApiUrl(restoredApiUrl);
      }

      await Promise.all([
        loadEvents(),
        loadReportReasons(),
        new Promise((resolve) => setTimeout(resolve, 700)),
      ]);
    })().finally(() => {
      if (isMounted) setIsBooting(false);
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token) {
      loadReportReasons();
    }
  }, [token]);

  useEffect(() => {
    if (isBooting) return;
    if (currentScreen === 'map') {
      loadEvents();
    }
    if (currentScreen === 'admin' && token && currentUser?.isAdmin) {
      loadAdminReports();
      loadAdminUsers();
    }
    // These loaders are stable enough for demo; avoid re-running due to function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, token, currentUser?.isAdmin, isBooting]);

  useEffect(() => {
    if (currentScreen === 'chat' && selectedEvent) {
      loadCommentsForEvent(selectedEvent.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedEvent?.id]);

  useEffect(() => {
    if ((currentScreen === 'event' || currentScreen === 'chat') && !selectedEvent) {
      Alert.alert('Событие недоступно', 'Похоже, событие было удалено или скрыто. Возвращаемся на карту.');
      setCurrentScreen('map');
      return;
    }
    if (currentScreen === 'create' && !currentUser) {
      Alert.alert('\u041d\u0443\u0436\u0435\u043d \u0432\u0445\u043e\u0434', '\u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0437\u0434\u0430\u0432\u0430\u0442\u044c \u0441\u043e\u0431\u044b\u0442\u0438\u044f.');
      setCreateCoords(null);
      setCurrentScreen('login');
      return;
    }
    if (currentScreen === 'edit' && !editEvent) {
      setCurrentScreen('map');
    }
  }, [currentScreen, selectedEvent, editEvent, currentUser]);

  useEffect(() => {
    const disconnect = connectRealtime((message: RealtimeMessage) => {
      if (message.type === 'events:changed') {
        loadEvents();
        return;
      }

      if (
        message.type === 'comments:changed' &&
        selectedEvent &&
        String(message.eventId ?? '') === selectedEvent.id
      ) {
        loadCommentsForEvent(selectedEvent.id);
      }
    });

    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.id, apiUrl]);

  // =========================
  // NAVIGATION
  // =========================

  let content: React.ReactNode = null;

  if (isBooting) {
    content = <LoadingScreen />;
  }

  else if (currentScreen === 'login') {
    content = (
      <LoginScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        onGuest={() => {
          setToken(null);
          setCurrentUser(null);
          setCurrentScreen('map');
        }}
        serverUrl={apiUrl}
        defaultServerUrl={getDefaultApiUrl()}
        onSaveServerUrl={saveServerUrl}
        onResetServerUrl={restoreDefaultServerUrl}
      />
    );
  }

  else if (currentScreen === 'map') {
    content = (
      <MapScreen
        events={eventsWithArchiveFlag}
        currentUser={currentUser}
        onCreateEvent={() =>
          setCurrentScreen('create')
        }
        onEventClick={(event: EventWithArchive) => {
          setSelectedEvent(event);
          setCurrentScreen('event');
        }}
        onProfileClick={() =>
          setCurrentScreen('profile')
        }
        onLoginClick={() =>
          setCurrentScreen('login')
        }
        onAdminClick={() =>
          setCurrentScreen('admin')
        }
        onLogout={handleLogout}
        onMapLongPress={(coord: {
          latitude: number;
          longitude: number;
        }) => {
          if (!currentUser) {
            Alert.alert('\u041d\u0443\u0436\u0435\u043d \u0432\u0445\u043e\u0434', '\u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0437\u0434\u0430\u0432\u0430\u0442\u044c \u0441\u043e\u0431\u044b\u0442\u0438\u044f.');
            setCurrentScreen('login');
            return;
          }
          setCreateCoords(coord);
          setCurrentScreen('create');
        }}
      />
    );
  }

  else if (
    currentScreen === 'event' &&
    selectedEvent
  ) {
    content = (
      <EventDetailsScreen
        event={selectedEvent}
        currentUser={currentUser}
        onBack={() =>
          setCurrentScreen('map')
        }
        onOpenChat={() =>
          setCurrentScreen('chat')
        }
        onDelete={handleDeleteEvent}
        onEdit={() => {
          setEditEvent(selectedEvent);
          setCurrentScreen('edit');
        }}
        onComplaint={handleComplaintEvent}
      />
    );
  }

  else if (
    currentScreen === 'chat' &&
    selectedEvent
  ) {
    const eventComments = comments.filter(
      (c) => c.eventId === selectedEvent.id,
    );

    content = (
      <ChatScreen
        event={selectedEvent}
        comments={eventComments}
        currentUser={currentUser}
        onBack={() =>
          setCurrentScreen('event')
        }
        onAddComment={addCommentBestEffort}
        onComplaint={handleComplaintComment}
        onDeleteComment={handleDeleteComment}
        onEditComment={handleEditComment}
      />
    );
  }

  else if (
    currentScreen === 'profile' &&
    currentUser
  ) {
    const userEvents = visibleEvents.filter(
      (e) =>
        e.author === currentUser.username,
    );

    content = (
      <ProfileScreen
        user={currentUser}
        events={userEvents}
        onBack={() =>
          setCurrentScreen('map')
        }
        onLogout={handleLogout}
        onUpdateProfile={updateProfileBestEffort}
        onChangePassword={changePasswordBestEffort}
      />
    );
  }

  else if (
    currentScreen === 'admin' &&
    currentUser?.isAdmin
  ) {
    content = (
      <AdminPanelScreen
        complaints={complaints}
        events={visibleEvents}
        archivedEvents={archivedEvents}
        adminUsers={adminUsers}
        currentAdminUserId={currentUser.userId != null ? String(currentUser.userId) : undefined}
        onBack={() => setCurrentScreen('map')}
        onArchiveEvent={handleArchiveEvent}
        onCreateOfficialEvent={createOfficialEventBestEffort}
        onRejectComplaint={(reportId) => adminReportAction('reject', reportId)}
        onDeleteComplaintTarget={(reportId) => adminReportAction('delete-target', reportId)}
        onBlockComplaintTarget={(reportId) => adminReportAction('block-target', reportId)}
        onReloadAdminUsers={loadAdminUsers}
        onBlockUser={adminBlockUserById}
        onUnblockUser={adminUnblockUserById}
      />
    );
  }

  else if (
    currentScreen === 'create' &&
    currentUser
  ) {
    content = (
      <CreateEventScreen
        currentUser={currentUser}
        initialCoords={createCoords}
        onCreateEvent={createEventBestEffort}
        onCancel={() => {
          setCreateCoords(null);
          setCurrentScreen('map');
        }}
      />
    );
  }

  else if (
    currentScreen === 'edit' &&
    currentUser &&
    editEvent
  ) {
    content = (
      <CreateEventScreen
        currentUser={currentUser}
        initialEvent={editEvent}
        onUpdateEvent={updateEventBestEffort}
        onCancel={() => {
          setEditEvent(null);
          setCurrentScreen('event');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar
        barStyle={
          isDark ? 'light-content' : 'dark-content'
        }
      />
      {content}
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
