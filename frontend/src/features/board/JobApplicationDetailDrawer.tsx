import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { APPLICATION_STATUSES, type ApplicationStatus, type JobApplicationDetail } from '../../api/types';
import { getErrorMessage } from '../../utils/errors';
import { formatDate, formatDateTime } from '../../utils/format';
import { AutomationPanel } from '../automation/AutomationPanel';
import { InterviewFormDialog, type InterviewDialogState } from '../interviews/InterviewFormDialog';
import { TodoFormDialog, type TodoDialogState } from '../todos/TodoFormDialog';
import { useToggleTodo } from '../todos/useTodos';
import { useBoardQuery, useDeleteJobApplication, useJobApplicationQuery, useMoveJobApplication } from './useBoard';

interface Props {
  id: string | null;
  onClose: () => void;
  onEdit: (detail: JobApplicationDetail) => void;
  onDeleted: () => void;
}

/** Karta tiklaninca sagdan acilan detay paneli. Mobilde tam genislik. */
export function JobApplicationDetailDrawer({ id, onClose, onEdit, onDeleted }: Props) {
  return (
    <Drawer
      anchor="right"
      open={id !== null}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 520 }, border: 'none' } } }}
    >
      {id && <DetailContent id={id} onClose={onClose} onEdit={onEdit} onDeleted={onDeleted} />}
    </Drawer>
  );
}

function DetailContent({ id, onClose, onEdit, onDeleted }: Props & { id: string }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const detailQuery = useJobApplicationQuery(id);
  const boardQuery = useBoardQuery();
  const moveMutation = useMoveJobApplication();
  const deleteMutation = useDeleteJobApplication();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [interviewDialog, setInterviewDialog] = useState<InterviewDialogState>(null);
  const [todoDialog, setTodoDialog] = useState<TodoDialogState>(null);
  const toggleTodo = useToggleTodo();

  if (detailQuery.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (detailQuery.isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{getErrorMessage(detailQuery.error, t)}</Alert>
        <Button sx={{ mt: 2 }} onClick={onClose}>
          {t('common.close')}
        </Button>
      </Box>
    );
  }

  const d = detailQuery.data;

  // Suruklemeye alternatif (mobil/erisilebilirlik): durumu listeden sec, kart hedef sutunun en altina gider.
  const changeStatus = (status: ApplicationStatus) => {
    if (status === d.status) return;
    const position = (boardQuery.data ?? []).filter((i) => i.status === status).length;
    moveMutation.mutate({ id: d.id, body: { status, position } });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Baslik */}
      <Stack direction="row" sx={{ alignItems: 'flex-start', p: 2.5, pb: 2, gap: 1 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {d.companyName}
          </Typography>
          <Typography color="text.secondary">{d.jobTitle}</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label={t('common.close')}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Stack direction="row" sx={{ px: 2.5, pb: 2, gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          select
          size="small"
          label={t('board.fields.status')}
          value={d.status}
          onChange={(e) => changeStatus(e.target.value as ApplicationStatus)}
          disabled={moveMutation.isPending}
          sx={{ minWidth: 170 }}
        >
          {APPLICATION_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              <Box component="span" sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', bgcolor: `status.${s}`, mr: 1 }} />
              {t(`status.${s}`)}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        {d.jobUrl && (
          <Button size="small" startIcon={<OpenInNewIcon />} href={d.jobUrl} target="_blank" rel="noopener noreferrer">
            {t('board.openListing')}
          </Button>
        )}
        <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(d)}>
          {t('common.edit')}
        </Button>
        <IconButton size="small" color="error" onClick={() => setConfirmOpen(true)} aria-label={t('common.delete')}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>

      {moveMutation.error && (
        <Alert severity="error" sx={{ mx: 2.5, mb: 2 }}>
          {getErrorMessage(moveMutation.error, t)}
        </Alert>
      )}

      <Divider />

      <Box sx={{ overflowY: 'auto', p: 2.5, flexGrow: 1 }}>
        <Stack spacing={3}>
          <Section title={t('board.detail.info')}>
            <InfoRow label={t('board.fields.location')} value={d.location} />
            <InfoRow label={t('board.fields.source')} value={d.source} />
            <InfoRow
              label={t('board.fields.cv')}
              value={d.cv ? (d.cv.isDeleted ? `${d.cv.name} (${t('board.cvDeleted')})` : d.cv.name) : null}
            />
            <InfoRow label={t('board.detail.appliedAt')} value={formatDate(d.appliedAt, lng) || null} />
            <InfoRow label={t('board.detail.createdAt')} value={formatDateTime(d.createdAt, lng)} />
          </Section>

          <AutomationPanel jobApplicationId={d.id} jobUrl={d.jobUrl} />

          <Section title={t('board.fields.jobDescription')}>
            <LongText text={d.jobDescription} empty={t('board.detail.noDescription')} />
          </Section>

          <Section title={t('board.fields.notes')}>
            <LongText text={d.notes} empty={t('board.detail.noNotes')} />
          </Section>

          <Section
            title={`${t('nav.interviews')} (${d.interviews.length})`}
            action={
              <Button size="small" startIcon={<AddIcon />} onClick={() => setInterviewDialog({ interview: null, jobApplicationId: d.id })}>
                {t('interviews.add')}
              </Button>
            }
          >
            {d.interviews.length === 0 ? (
              <EmptyText>{t('board.detail.noInterviews')}</EmptyText>
            ) : (
              <Stack spacing={1}>
                {d.interviews.map((iv) => (
                  <Box
                    key={iv.id}
                    onClick={() => setInterviewDialog({ interview: iv })}
                    sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                        {t(`interviewType.${iv.type}`)} · {t(`interviewFormat.${iv.format}`)}
                      </Typography>
                      <Chip size="small" label={t(`interviewOutcome.${iv.outcome}`)} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(iv.scheduledAt, lng)}
                      {iv.durationMinutes ? ` · ${t('board.detail.minutes', { count: iv.durationMinutes })}` : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Section>

          <Section
            title={`${t('nav.todos')} (${d.todos.length})`}
            action={
              <Button size="small" startIcon={<AddIcon />} onClick={() => setTodoDialog({ todo: null, jobApplicationId: d.id })}>
                {t('interviews.add')}
              </Button>
            }
          >
            {d.todos.length === 0 ? (
              <EmptyText>{t('board.detail.noTodos')}</EmptyText>
            ) : (
              <Stack spacing={0.25}>
                {d.todos.map((todo) => (
                  <Stack key={todo.id} direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                    {/* Ikona tiklayinca tamamla/geri al; basliga tiklayinca duzenle. */}
                    <IconButton
                      size="small"
                      aria-label={todo.isCompleted ? t('todos.markOpen') : t('todos.markDone')}
                      onClick={() => toggleTodo.mutate({ id: todo.id, isCompleted: !todo.isCompleted })}
                    >
                      {todo.isCompleted ? (
                        <CheckCircleIcon fontSize="small" color="success" />
                      ) : (
                        <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                      )}
                    </IconButton>
                    <Typography
                      variant="body2"
                      onClick={() => setTodoDialog({ todo })}
                      sx={{
                        flexGrow: 1,
                        cursor: 'pointer',
                        textDecoration: todo.isCompleted ? 'line-through' : 'none',
                        color: todo.isCompleted ? 'text.disabled' : 'text.primary',
                        '&:hover': { textDecoration: todo.isCompleted ? 'line-through' : 'underline' },
                      }}
                    >
                      {todo.title}
                    </Typography>
                    {todo.dueAt && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(todo.dueAt, lng)}
                      </Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </Section>

          <Section title={t('board.detail.history')}>
            <Stack spacing={1}>
              {[...d.statusHistory].reverse().map((h, index) => (
                <Stack key={`${h.changedAt}-${index}`} direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `status.${h.toStatus}`, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {h.fromStatus
                      ? t('board.detail.historyMoved', { from: t(`status.${h.fromStatus}`), to: t(`status.${h.toStatus}`) })
                      : t('board.detail.historyCreated', { to: t(`status.${h.toStatus}`) })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(h.changedAt, lng)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Section>
        </Stack>
      </Box>

      <InterviewFormDialog state={interviewDialog} onClose={() => setInterviewDialog(null)} />
      <TodoFormDialog state={todoDialog} onClose={() => setTodoDialog(null)} />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t('board.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('board.deleteConfirm', { company: d.companyName, title: d.jobTitle })}</DialogContentText>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {getErrorMessage(deleteMutation.error, t)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            loading={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(d.id, {
                onSuccess: () => {
                  setConfirmOpen(false);
                  onDeleted();
                },
              })
            }
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <Stack direction="row" sx={{ py: 0.5, gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 130, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value ?? '—'}
      </Typography>
    </Stack>
  );
}

function LongText({ text, empty }: { text: string | null; empty: string }) {
  if (!text) return <EmptyText>{empty}</EmptyText>;
  // pre-wrap: ilan metnindeki satir sonlari ve paragraflar korunur.
  return (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {text}
    </Typography>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.disabled">
      {children}
    </Typography>
  );
}
