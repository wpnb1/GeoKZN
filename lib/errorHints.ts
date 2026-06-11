import type { ApiError } from './api';

/** Human-readable API error message plus a user hint */
export function formatApiErrorDetail(error: unknown): { summary: string; hint: string } {
  const err = error as Partial<ApiError> & { status?: number };
  const raw =
    err && typeof err === 'object' && 'error' in err && err.error != null ? String(err.error) : '';
  const details =
    err && typeof err === 'object' && 'details' in err && err.details && typeof err.details === 'object'
      ? (err.details as Record<string, unknown>)
      : null;

  const hints: Record<string, { summary: string; hint: string }> = {
    'Invalid credentials': {
      summary: 'Неверный email или пароль.',
      hint: 'Проверьте адрес почты, раскладку клавиатуры и Caps Lock. Если пароль забыт, создайте новый аккаунт или смените пароль после входа в существующий.',
    },
    'User is blocked': {
      summary: 'Аккаунт заблокирован.',
      hint: 'Обратитесь к администратору сервиса для разблокировки.',
    },
    'User already exists': {
      summary: 'Пользователь с таким email уже зарегистрирован.',
      hint: 'Войдите с этой почтой или используйте другой email.',
    },
    'Username already exists': {
      summary: 'Этот никнейм уже занят.',
      hint: 'Выберите другой никнейм.',
    },
    'Invalid current password': {
      summary: 'Неверный текущий пароль.',
      hint: 'Введите пароль, под которым вы сейчас в системе.',
    },
    'Cannot block yourself': {
      summary: 'Нельзя заблокировать самого себя.',
      hint: 'Выберите другого пользователя или отклоните жалобу.',
    },
    'Admin cannot send reports': {
      summary: 'Администратор не может отправлять жалобы.',
      hint: 'Используйте инструменты модерации в панели администратора.',
    },
    'Cannot report your own event': {
      summary: 'Нельзя пожаловаться на своё событие.',
      hint: 'Удалите или отредактируйте событие самостоятельно.',
    },
    'Cannot report your own comment': {
      summary: 'Нельзя пожаловаться на свой комментарий.',
      hint: 'Удалите или отредактируйте комментарий самостоятельно.',
    },
    'Official events must be created via /admin/events': {
      summary: 'Официальное событие создаётся только из админ-панели.',
      hint: 'Войдите как администратор и создайте событие на вкладке "Создать".',
    },
    'expiresAt is required for official events': {
      summary: 'Для официального события нужна дата окончания.',
      hint: 'Укажите время окончания в формате ISO, например 2026-05-13T18:00:00.',
    },
    'Unknown event type': {
      summary: 'Неизвестный тип события.',
      hint: 'Выберите тип из доступного списка.',
    },
    Forbidden: {
      summary: 'Недостаточно прав для этого действия.',
      hint: 'Войдите под нужным аккаунтом или обратитесь к администратору.',
    },
    'Event not found': {
      summary: 'Событие не найдено или уже удалено.',
      hint: 'Вернитесь на карту и обновите список событий.',
    },
    'Comment not found': {
      summary: 'Комментарий не найден или удалён.',
      hint: 'Обновите чат события.',
    },
    'Login required': {
      summary: 'Нужна авторизация.',
      hint: 'Войдите в аккаунт и повторите действие.',
    },
    'Invalid input': {
      summary: 'Данные заполнены некорректно.',
      hint: 'Проверьте email, пароль и ограничения длины полей.',
    },
  };

  if (raw === 'User is blocked') {
    const unblockAtRaw = details?.unblockAt;
    if (typeof unblockAtRaw === 'string' || unblockAtRaw instanceof Date) {
      const dt = new Date(unblockAtRaw);
      if (Number.isFinite(dt.getTime())) {
        return {
          summary: 'Аккаунт временно заблокирован.',
          hint: `Повторите вход после ${new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(dt)} или обратитесь к администратору.`,
        };
      }
    }
  }

  if (raw === 'Chat temporarily muted') {
    const muteUntilRaw = details?.muteUntil;
    if (typeof muteUntilRaw === 'string' || muteUntilRaw instanceof Date) {
      const dt = new Date(muteUntilRaw);
      if (Number.isFinite(dt.getTime())) {
        return {
          summary: 'Слишком много сообщений за короткое время.',
          hint: `Отправка комментариев временно отключена до ${new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(dt)}. Подождите немного и попробуйте снова.`,
        };
      }
    }
  }

  if (raw && hints[raw]) return hints[raw];

  if (raw.includes('description') || raw.toLowerCase().includes('too long')) {
    return {
      summary: raw || 'Ошибка валидации.',
      hint: 'Сократите описание события до допустимого лимита символов.',
    };
  }

  return {
    summary: raw || 'Произошла ошибка.',
    hint: 'Проверьте подключение к интернету и попробуйте снова.',
  };
}

export function formatApiErrorMessage(error: unknown): string {
  const { summary, hint } = formatApiErrorDetail(error);
  return `${summary}\n\nЧто сделать: ${hint}`;
}
