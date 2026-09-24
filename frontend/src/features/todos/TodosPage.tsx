import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { Todo } from '../../api/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useNotify } from '../../components/Notify';
import { getErrorMessage } from '../../utils/errors';
import { TodoFormDialog, type TodoDialogState } from './TodoFormDialog';
import { TodoRow } from './TodoRow';
import { compareOpen, DUE_GROUPS, dueGroupOf, type DueGroup } from './todoUtils';
import { useDeleteTodo, useSaveTodo, useTodosQuery, useToggleTodo } from './useTodos';

const VIEWS = ['open', 'completed'] as const;
type View = (typeof VIEWS)[number];

/** Basvuru filtresinde "basvuruya bagli olmayan gorevler" secenegi. */
const NO_APP = '__none__';

/*
 * Yapilacaklar sayfasi: ustte hizli ekleme, "Acik" (son tarihe gore gruplu) ve "Tamamlanan" sekmeleri,
 * basvuruya gore filtre. Veri tek istekle gelir (GET /api/todos); gruplama istemcide yapilir.
 */
export function TodosPage() {
  const { t } = useTranslation();
  const notify = useNotify();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as View | null;
  const view: View = viewParam && VIEWS.includes(viewParam) ? viewParam : 'open';

  const query = useTodosQuery();
  const quickSave = useSaveTodo();
  const toggle = useToggleTodo();
  const remove = useDeleteTodo();
  const [dialog, setDialog] = useState<TodoDialogState>(null);
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [appFilter, setAppFilter] = useState('');

  // Filtre listesi: gorevlerde gecen basvurular (panodaki tum basvurulari degil).
  const appOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const todo of query.data ?? []) {
      if (todo.jobApplicationId) map.set(todo.jobApplicationId, `${todo.companyName} – ${todo.jobTitle}`);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [query.data]);

  const { open, completed, groups } = useMemo(() => {
    const all = (query.data ?? []).filter((todo) =>
      appFilter === '' ? true : appFilter === NO_APP ? todo.jobApplicationId === null : todo.jobApplicationId === appFilter,
    );
    const openList = all.filter((todo) => !todo.isCompleted).sort(compareOpen);
    const completedList = all
      .filter((todo) => todo.isCompleted)
      .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());

    const now = new Date();
    const byGroup = new Map<DueGroup, Todo[]>();
    for (const todo of openList) {
      const g = dueGroupOf(todo, now);
      byGroup.set(g, [...(byGroup.get(g) ?? []), todo]);
    }
    return {
      open: openList,
      completed: completedList,
      groups: DUE_GROUPS.filter((g) => byGroup.has(g)).map((g) => ({ key: g, items: byGroup.get(g)! })),
    };
  }, [query.data, appFilter]);

  const quickAdd = (e: FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    const jobApplicationId = appFilter && appFilter !== NO_APP ? appFilter : null;
    quickSave.mutate(
      { id: null, body: { title, description: null, dueAt: null, priority: 'Medium', jobApplicationId, interviewId: null } },
      {
        onSuccess: () => setQuickTitle(''),
        onError: (err) => notify(getErrorMessage(err, t), 'error'),
      },
    );
  };

  const rowHandlers = {
    onToggle: (todo: Todo) =>
      toggle.mutate(
        { id: todo.id, isCompleted: !todo.isCompleted },
        {
          onSuccess: (_d, vars) => notify(vars.isCompleted ? t('todos.doneMessage') : t('todos.reopenedMessage')),
          onError: (err) => notify(getErrorMessage(err, t), 'error'),
        },
      ),
    onEdit: (todo: Todo) => setDialog({ todo }),
    onDelete: (todo: Todo) => {
      remove.reset();
      setDeleting(todo);
    },
  };

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('nav.todos')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('todos.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialog({ todo: null, jobApplicationId: appFilter && appFilter !== NO_APP ? appFilter : undefined })}
        >
          {t('todos.new')}
        </Button>
      </Stack>

      {/* Hizli ekleme: sadece baslik yazip Enter. Detaylar (tarih, oncelik) sonra duzenlenebilir. */}
      <Paper component="form" onSubmit={quickAdd} sx={{ p: 1.5, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={t('todos.quickAddPlaceholder')}
          slotProps={{
            htmlInput: { maxLength: 300 },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" edge="end" disabled={!quickTitle.trim() || quickSave.isPending} aria-label={t('todos.new')}>
                    <AddIcon />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Paper>

      <Stack direction="row" sx={{ alignItems: 'flex-end', gap: 2, mb: 2, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
        <Tabs value={view} onChange={(_e, v: View) => setSearchParams({ view: v }, { replace: true })} sx={{ flexGrow: 1 }}>
          <Tab value="open" label={`${t('todos.views.open')} (${open.length})`} />
          <Tab value="completed" label={`${t('todos.views.completed')} (${completed.length})`} />
        </Tabs>
        <TextField
          select
          size="small"
          label={t('todos.fields.application')}
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
          sx={{ minWidth: 220, mb: 1 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value={NO_APP}>
            <em>{t('todos.generalOnly')}</em>
          </MenuItem>
          {appOptions.map(([id, label]) => (
            <MenuItem key={id} value={id}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {query.isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : query.isError ? (
        <Alert severity="error">{getErrorMessage(query.error, t)}</Alert>
      ) : view === 'open' ? (
        groups.length === 0 ? (
          <EmptyState text={t('todos.emptyOpen')} />
        ) : (
          <Stack spacing={3}>
            {groups.map((g) => (
              <Box key={g.key}>
                <Typography
                  variant="overline"
                  color={g.key === 'overdue' ? 'error' : 'text.secondary'}
                  sx={{ fontWeight: 700, display: 'block', mb: 1 }}
                >
                  {t(`todos.groups.${g.key}`)} ({g.items.length})
                </Typography>
                <Stack spacing={1}>
                  {g.items.map((todo) => (
                    <TodoRow key={todo.id} todo={todo} {...rowHandlers} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )
      ) : completed.length === 0 ? (
        <EmptyState text={t('todos.emptyCompleted')} />
      ) : (
        <Stack spacing={1}>
          {completed.map((todo) => (
            <TodoRow key={todo.id} todo={todo} {...rowHandlers} />
          ))}
        </Stack>
      )}

      <TodoFormDialog state={dialog} onClose={() => setDialog(null)} />

      <ConfirmDialog
        open={deleting !== null}
        title={t('common.deleteConfirmTitle')}
        message={deleting ? t('common.deleteConfirmMessage', { name: deleting.title }) : ''}
        loading={remove.isPending}
        error={remove.error ? getErrorMessage(remove.error, t) : null}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null);
              notify(t('common.deletedMessage'));
            },
          })
        }
      />
    </Box>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Typography color="text.disabled" sx={{ textAlign: 'center', py: 6, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
      {text}
    </Typography>
  );
}
