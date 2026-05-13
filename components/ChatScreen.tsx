import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/contexts/ThemeContext';
import { Comment, EventWithArchive, User } from '@/types/models';

type Props = {
  event: EventWithArchive;
  comments: Comment[];
  currentUser: User | null;
  onBack: () => void;
  onAddComment: (eventId: string, text: string) => Promise<boolean>;
  onComplaint: (commentId: string, reason: string) => void;
  onDeleteComment: (commentId: string) => void;
  onEditComment: (commentId: string, text: string) => void;
};

export default function ChatScreen({
  event,
  comments,
  currentUser,
  onBack,
  onAddComment,
  onComplaint,
  onDeleteComment,
  onEditComment,
}: Props) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleSend = async () => {
    if (!text.trim() || !currentUser || sending) return;
    setSending(true);
    try {
      const ok = await onAddComment(event.id, text.trim());
      if (ok) {
        setText('');
      }
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(date);

  const styles = createStyles(theme);

  const renderItem = ({ item }: { item: Comment }) => {
    const isMine = item.author === currentUser?.username;
    const isAuthor = item.author === event.author;
    const canModerate = Boolean(currentUser?.isAdmin);
    const canDelete = Boolean(currentUser && (isMine || canModerate));
    const canEdit = Boolean(currentUser && isMine);
    const canReport = Boolean(currentUser && !currentUser.isAdmin && !isMine);

    const isEditing = editingId === item.id;

    return (
      <View
        style={[
          styles.comment,
          {
            backgroundColor: isMine ? theme.primary + '15' : theme.surface,
            borderLeftColor: isMine ? theme.primary : 'transparent',
            shadowColor: theme.shadow,
          },
        ]}
      >
        <View style={styles.commentHeader}>
          <View style={styles.commentAuthorRow}>
            <View
              style={[
                styles.avatarSmall,
                {
                  backgroundColor: isMine ? theme.primary : theme.secondary,
                },
              ]}
            >
              <Text style={styles.avatarSmallText}>{item.author[0]?.toUpperCase() || 'U'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.commentAuthor, { color: theme.text }]} numberOfLines={1}>
                {item.author}
                {isAuthor && <Text style={[styles.authorBadge, { color: theme.secondary }]}> (Автор)</Text>}
              </Text>
              <Text style={[styles.commentTime, { color: theme.textDisabled }]}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            {canEdit && !isEditing && (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: theme.border }]}
                onPress={() => {
                  setEditingId(item.id);
                  setEditingText(item.text);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={14} color={theme.textSecondary} />
              </TouchableOpacity>
            )}

            {canDelete && !isEditing && (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: theme.error }]}
                onPress={() => {
                  Alert.alert('Удалить комментарий?', 'Точно хотите удалить этот комментарий?', [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Удалить', style: 'destructive', onPress: () => onDeleteComment(item.id) },
                  ]);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={14} color={theme.error} />
              </TouchableOpacity>
            )}

            {canReport && !isEditing && (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: theme.warning }]}
                onPress={() => onComplaint(item.id, 'report')}
                activeOpacity={0.7}
              >
                <Ionicons name="flag" size={14} color={theme.warning} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isEditing ? (
          <View>
            <TextInput
              style={[
                styles.editInput,
                {
                  backgroundColor: theme.surfaceVariant,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={editingText}
              onChangeText={setEditingText}
              multiline
            />
            <View style={styles.editButtonsRow}>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => {
                  const next = editingText.trim();
                  if (!next) return;
                  onEditComment(item.id, next);
                  setEditingId(null);
                  setEditingText('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.smallBtnText}>Сохранить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                onPress={() => {
                  setEditingId(null);
                  setEditingText('');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.smallBtnText, { color: theme.text }]}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={[styles.commentText, { color: theme.text }]}>{item.text}</Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Назад</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {event.title}
        </Text>
      </View>

      <View style={styles.content}>
        {comments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Сообщений пока нет.</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.commentsList}
          />
        )}
      </View>

      {currentUser ? (
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceVariant,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Написать комментарий..."
            placeholderTextColor={theme.textDisabled}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.primary, opacity: text.trim() && !sending ? 1 : 0.6 }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: theme.warning + '20',
              borderTopColor: theme.warning,
            },
          ]}
        >
          <Text style={[styles.noticeText, { color: theme.warning }]}>Авторизуйтесь, чтобы писать комментарии.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      gap: 12,
    },
    backText: { fontSize: 16, fontWeight: '600' },
    headerTitle: { fontSize: 17, fontWeight: '600', flex: 1 },
    content: { flex: 1 },
    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 15 },
    commentsList: { padding: 16, paddingBottom: 20 },
    comment: {
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderLeftWidth: 4,
      elevation: 2,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
      gap: 12,
    },
    commentAuthorRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
    avatarSmall: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    avatarSmallText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    commentAuthor: { fontSize: 14, fontWeight: '600' },
    authorBadge: { fontSize: 12, fontWeight: '600' },
    commentTime: { fontSize: 11, marginTop: 2 },
    actionsRow: { flexDirection: 'row', gap: 8 },
    actionButton: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 34,
    },
    commentText: { fontSize: 14, lineHeight: 20 },
    editInput: {
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    editButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    smallBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5 },
    smallBtnText: { color: '#FFFFFF', fontWeight: '700' },
    inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'flex-end' },
    input: {
      flex: 1,
      borderRadius: 20,
      borderWidth: 1.5,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      maxHeight: 100,
      marginRight: 10,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    noticeBox: { padding: 14, borderTopWidth: 2 },
    noticeText: { fontSize: 14, textAlign: 'center', fontWeight: '500' },
  });
