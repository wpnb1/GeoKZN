import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, StatusBar } from 'react-native';

import AdminPanelScreen from '@/components/AdminPanelScreen';
import ChatScreen from '@/components/ChatScreen';
import CreateEventScreen from '@/components/CreateEventScreen';
import EventDetailsScreen from '@/components/EventDetailsScreen';
import LoginScreen from '@/components/LoginScreen';
import MapScreen from '@/components/MapScreen';
import ProfileScreen from '@/components/ProfileScreen';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { apiRequest } from '@/lib/api';

import {
  Comment,
  Complaint,
  Event,
  EventWithArchive,
  User,
} from '@/types/models';

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

  // =========================
  // ARCHIVE LOGIC
  // =========================

  const eventsWithArchiveFlag = useMemo<EventWithArchive[]>(() => {
    const now = new Date();

    return events.map((e) => {
      let isArchived = false;

      if (e.archivedManually) {
        isArchived = true;
      } else if (e.isAdminEvent && e.endTime) {
        isArchived = e.endTime <= now;
      } else if (!e.isAdminEvent) {
        const diffMs =
          now.getTime() - e.createdAt.getTime();
        const hours = diffMs / (1000 * 60 * 60);
        if (hours >= 5) isArchived = true;
      }

      return { ...e, isArchived };
    });
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
        user: { username: string; role: string; createdAt: string };
      }>('/auth/login', { method: 'POST', body: { username, password } });

      setToken(data.token);
      const user: User = {
        username: data.user.username,
        isAdmin: data.user.role === 'admin',
        registeredAt: new Date(data.user.createdAt),
      };
      setCurrentUser(user);
      setCurrentScreen('map');
    } catch (e: any) {
      const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to login';
      throw new Error(msg);
    }
  };

  const handleRegister = async (username: string, password: string) => {
    try {
      const data = await apiRequest<{
        token: string;
        user: { username: string; role: string; createdAt: string };
      }>('/auth/register', { method: 'POST', body: { username, password } });

      setToken(data.token);
      const user: User = {
        username: data.user.username,
        isAdmin: data.user.role === 'admin',
        registeredAt: new Date(data.user.createdAt),
      };
      setCurrentUser(user);
      setCurrentScreen('map');
    } catch (e: any) {
      const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to register';
      throw new Error(msg);
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
      Alert.alert('Login required', 'Please login as admin.');
      return;
    }

    apiRequest(`/admin/events/${idNum}/archive`, { token, method: 'POST' })
      .then(async () => {
        await loadEvents();
        Alert.alert('OK', 'Event archived.');
      })
      .catch((e: any) => {
        const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to archive event';
        Alert.alert('Error', msg);
      });
  };

  const handleDeleteEvent = (eventId: string) => {
    const idNum = Number(eventId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Login required', 'Please login to delete events.');
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
        const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to delete event';
        Alert.alert('Error', msg);
      });
  };

  const handleDeleteComment = (commentId: string) => {
    const idNum = Number(commentId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Login required', 'Please login to manage comments.');
      return;
    }

    apiRequest(`/comments/${idNum}`, { token, method: 'DELETE' })
      .then(() => {
        setComments((prev) => prev.filter((c) => c.id !== String(idNum)));
      })
      .catch((e: any) => {
        const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to delete comment';
        Alert.alert('Error', msg);
      });
  };

  const handleEditComment = (commentId: string, text: string) => {
    const idNum = Number(commentId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Login required', 'Please login to edit comments.');
      return;
    }

    apiRequest(`/comments/${idNum}`, { token, method: 'PATCH', body: { text } })
      .then(() => {
        setComments((prev) =>
          prev.map((c) => (c.id === String(idNum) ? { ...c, text } : c)),
        );
      })
      .catch((e: any) => {
        const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to edit comment';
        Alert.alert('Error', msg);
      });
  };

  // =========================
  // COMMENTS
  // =========================

  const addCommentBestEffort = async (eventId: string, text: string) => {
    if (!currentUser || !token) {
      Alert.alert('Login required', 'Please login to comment.');
      return;
    }
    const idNum = Number(eventId);
    if (!Number.isFinite(idNum)) return;
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
    } catch (e: any) {
      Alert.alert('Error', e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to add comment');
    }
  };

  const reasonLabel = (name: string) => {
    const map: Record<string, string> = {
      spam: 'Spam',
      abuse: 'Abuse',
      fake: 'Fake info',
      other: 'Other',
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
      Alert.alert('Login required', 'Please login to send a report.');
      return;
    }

    if (currentUser.isAdmin) {
      Alert.alert('Недоступно', 'Администратор не может отправлять жалобы.');
      return;
    }

    if (targetType === 'event' && selectedEvent?.author === currentUser.username) {
      Alert.alert('Not allowed', 'You cannot report your own event.');
      return;
    }

    const items = reportReasons.length > 0 ? reportReasons : [];
    const buttons = items.map((r) => ({
      text: reasonLabel(r.name),
      onPress: () => {
        reportToApi(targetType, targetId, r.reason_id)
          .then(() => Alert.alert('Sent', 'Report submitted.'))
          .catch((e: any) => Alert.alert('Error', e?.message ? String(e.message) : 'Failed'));
      },
    }));

    if (buttons.length === 0) {
      if (!reportReasonOtherId) {
        Alert.alert('Error', 'Report reasons are not loaded.');
        return;
      }
      Alert.alert('Report', 'Send report with default reason?', [
        {
          text: 'Send',
          onPress: () => {
            reportToApi(targetType, targetId, reportReasonOtherId)
              .then(() => Alert.alert('Sent', 'Report submitted.'))
              .catch((e: any) => Alert.alert('Error', e?.message ? String(e.message) : 'Failed'));
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    Alert.alert('Choose reason', undefined, [...buttons, { text: 'Cancel', style: 'cancel' }]);
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
    data: Omit<
      Event,
      | 'id'
      | 'author'
      | 'createdAt'
      | 'endTime'
      | 'isAdminEvent'
      | 'archivedManually'
    >,
  ) => {
    try {
      if (!token) throw new Error('Login required');
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
      await loadEvents();
      setCurrentScreen('map');
    } catch (e: any) {
      const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to create event';
      Alert.alert('Error', msg);
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
    },
  ) => {
    const idNum = Number(eventId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Login required', 'Please login to edit events.');
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
        },
      });
      await loadEvents();
      setEditEvent(null);
      setCurrentScreen('map');
      Alert.alert('OK', 'Event updated.');
    } catch (e: any) {
      const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to update event';
      Alert.alert('Error', msg);
    }
  };

  const createOfficialEventBestEffort = async (
    data: Omit<Event, 'id' | 'author' | 'createdAt' | 'archivedManually'>,
  ) => {
    if (!token) {
      Alert.alert('Login required', 'Please login as admin.');
      return;
    }
    if (!data.endTime) {
      Alert.alert('Invalid', 'Official events must have an end time.');
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
      Alert.alert('OK', 'Official event created.');
    } catch (e: any) {
      const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed to create official event';
      Alert.alert('Error', msg);
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
    } catch {
      // ignore (offline demo)
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
      }));
      setComplaints(mapped);
    } catch {
      // ignore
    }
  };

  const adminReportAction = (action: 'reject' | 'delete-target' | 'block-target', reportId: string) => {
    const idNum = Number(reportId);
    if (!Number.isFinite(idNum)) return;
    if (!token) {
      Alert.alert('Login required', 'Please login as admin.');
      return;
    }

    apiRequest(`/admin/reports/${idNum}/${action}`, { token, method: 'POST' })
      .then(async () => {
        await loadAdminReports();
        await loadEvents();
        Alert.alert('OK', 'Action completed.');
      })
      .catch((e: any) => {
        const msg = e && typeof e === 'object' && 'error' in e ? String(e.error) : 'Failed';
        Alert.alert('Error', msg);
      });
  };

  useEffect(() => {
    if (token) {
      loadReportReasons();
    }
  }, [token]);

  useEffect(() => {
    if (currentScreen === 'map') {
      loadEvents();
    }
    if (currentScreen === 'admin' && token && currentUser?.isAdmin) {
      loadAdminReports();
    }
    // These loaders are stable enough for demo; avoid re-running due to function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, token, currentUser?.isAdmin]);

  useEffect(() => {
    if (currentScreen === 'chat' && token && selectedEvent) {
      const idNum = Number(selectedEvent.id);
      if (!Number.isFinite(idNum)) return;
      apiRequest<{ items: any[] }>(`/events/${idNum}/comments`, { token })
        .then((data) => {
          const mapped: Comment[] = data.items.map((c) => ({
            id: String(c.comment_id),
            eventId: String(idNum),
            author: c.author,
            text: c.text,
            createdAt: new Date(c.created_at),
          }));
          setComments((prev) => {
            // Replace only this event's comments, keep others if any.
            const rest = prev.filter((x) => x.eventId !== String(idNum));
            return [...rest, ...mapped];
          });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, token, selectedEvent?.id]);

  // =========================
  // NAVIGATION
  // =========================

  let content: React.ReactNode = null;

  if (currentScreen === 'login') {
    content = (
      <LoginScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        onGuest={() => {
          setToken(null);
          setCurrentUser(null);
          setCurrentScreen('map');
        }}
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

    const userComments = comments.filter(
      (c) =>
        c.author === currentUser.username,
    );

    content = (
      <ProfileScreen
        user={currentUser}
        events={userEvents}
        comments={userComments}
        onBack={() =>
          setCurrentScreen('map')
        }
        onLogout={handleLogout}
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
        onBack={() =>
          setCurrentScreen('map')
        }
        onArchiveEvent={handleArchiveEvent}
        onCreateOfficialEvent={createOfficialEventBestEffort}
        onRejectComplaint={(reportId) => adminReportAction('reject', reportId)}
        onDeleteComplaintTarget={(reportId) => adminReportAction('delete-target', reportId)}
        onBlockComplaintTarget={(reportId) => adminReportAction('block-target', reportId)}
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
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
