import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventIcon from '@mui/icons-material/Event';
import FlagIcon from '@mui/icons-material/Flag';
import WorkOutlinedIcon from '@mui/icons-material/WorkOutlined';
import { Box, Checkbox, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import type { Todo } from '../../api/types';
import { formatDateTime } from '../../utils/format';
import { dueGroupOf, PRIORITY_HEX } from './todoUtils';

interface Props {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

/** Tek gorev satiri: onay kutusu, baslik, son tarih, oncelik ve baglanti etiketleri. */
export function TodoRow({ todo, onToggle, onEdit, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const done = todo.isCompleted;
  const group = done ? null : dueGroupOf(todo);
  const dueColor = group === 'overdue' ? 'error' : group === 'today' ? 'warning' : 'default';

  return (
    <Paper sx={(th) => ({ px: 1, py: 0.75, borderLeft: `4px solid ${done ? th.palette.divider : PRIORITY_HEX[todo.priority]}` })}>
      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 0.5 }}>
        <Checkbox
          checked={done}
          onChange={() => onToggle(todo)}
          slotProps={{ input: { 'aria-label': done ? t('todos.markOpen') : t('todos.markDone') } }}
          sx={{ mt: -0.25 }}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0, py: 0.75, cursor: 'pointer' }} onClick={() => onEdit(todo)}>
          <Typography
            sx={{
              fontWeight: 600,
              wordBreak: 'break-word',
              textDecoration: done ? 'line-through' : 'none',
              color: done ? 'text.disabled' : 'text.primary',
            }}
          >
            {todo.title}
          </Typography>

          {todo.description && !done && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {todo.description}
            </Typography>
          )}

          <Stack direction="row" sx={{ gap: 0.75, mt: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            {done && todo.completedAt && (
              <Typography variant="caption" color="text.secondary">
                {t('todos.completedAt', { date: formatDateTime(todo.completedAt, lng) })}
              </Typography>
            )}
            {!done && todo.dueAt && (
              <Chip size="small" color={dueColor} variant={dueColor === 'default' ? 'outlined' : 'filled'} label={formatDateTime(todo.dueAt, lng)} />
            )}
            {!done && todo.priority !== 'Medium' && (
              <Chip
                size="small"
                variant="outlined"
                icon={<FlagIcon sx={{ fontSize: '16px !important', color: `${PRIORITY_HEX[todo.priority]} !important` }} />}
                label={t(`todoPriority.${todo.priority}`)}
              />
            )}
            {todo.jobApplicationId && (
              // Tiklayinca panoda kartin detayi acilir; satirin duzenleme tiklamasini tetiklemesin.
              <Chip
                size="small"
                variant="outlined"
                icon={<WorkOutlinedIcon />}
                label={`${todo.companyName} – ${todo.jobTitle}`}
                component={RouterLink}
                to={`/?open=${todo.jobApplicationId}`}
                clickable
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                sx={{ maxWidth: 280 }}
              />
            )}
            {todo.interviewId && (
              <Tooltip title={t('todos.linkedInterview')}>
                <EventIcon fontSize="small" color="action" />
              </Tooltip>
            )}
          </Stack>
        </Box>

        <Stack direction="row" sx={{ pt: 0.25 }}>
          <Tooltip title={t('common.edit')}>
            <IconButton size="small" onClick={() => onEdit(todo)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton size="small" onClick={() => onDelete(todo)}>
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}
