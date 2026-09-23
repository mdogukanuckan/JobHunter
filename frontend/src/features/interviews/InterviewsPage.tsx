import AddIcon from '@mui/icons-material/Add';
import { Alert, Box, Button, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import type { Interview } from '../../api/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useNotify } from '../../components/Notify';
import { getErrorMessage } from '../../utils/errors';
import { localDayKey, toLocalInput } from '../../utils/format';
import { InterviewCalendar } from './InterviewCalendar';
import { InterviewCard } from './InterviewCard';
import { InterviewFormDialog, type InterviewDialogState } from './InterviewFormDialog';
import { useDeleteInterview, useInterviewsQuery, useSetInterviewOutcome } from './useInterviews';

const VIEWS = ['upcoming', 'past', 'calendar'] as const;
type View = (typeof VIEWS)[number];

/*
 * Mulakatlar sayfasi: Yaklasan (gune gore gruplu), Gecmis ve aylik Takvim gorunumleri.
 * Veri tek istekle gelir (GET /api/interviews); gorunumlere ayirma istemcide yapilir.
 */
export function InterviewsPage() {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as View | null;
  const view: View = viewParam && VIEWS.includes(viewParam) ? viewParam : 'upcoming';

  const query = useInterviewsQuery();
  const setOutcome = useSetInterviewOutcome();
  const remove = useDeleteInterview();
  const [dialog, setDialog] = useState<InterviewDialogState>(null);
  const [deleting, setDeleting] = useState<Interview | null>(null);

  const { upcoming, past, awaitingResult } = useMemo(() => {
    const all = query.data ?? [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const isUpcoming = (iv: Interview) => iv.outcome === 'Pending' && new Date(iv.scheduledAt) >= startOfToday;
    const pastList = all.filter((iv) => !isUpcoming(iv)).reverse(); // en yeni en ustte
    return {
      upcoming: all.filter(isUpcoming),
      past: pastList,
      // Tarihi gecmis ama sonucu girilmemis mulakatlar
      awaitingResult: pastList.filter((iv) => iv.outcome === 'Pending').length,
    };
  }, [query.data]);

  // Yaklasanlari gune gore grupla: "Bugun", "Yarin", sonra tarih.
  const upcomingGroups = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const groups: { key: string; label: string; items: Interview[] }[] = [];
    for (const iv of upcoming) {
      const date = new Date(iv.scheduledAt);
      const key = localDayKey(date);
      let group = groups.find((g) => g.key === key);
      if (!group) {
        const label =
          key === localDayKey(today)
            ? t('interviews.todayLabel')
            : key === localDayKey(tomorrow)
              ? t('interviews.tomorrow')
              : new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
        group = { key, label, items: [] };
        groups.push(group);
      }
      group.items.push(iv);
    }
    return groups;
  }, [upcoming, t, i18n.language]);

  const cardHandlers = {
    onEdit: (interview: Interview) => setDialog({ interview }),
    onDelete: (interview: Interview) => {
      remove.reset();
      setDeleting(interview);
    },
    onOutcome: (interview: Interview, outcome: Interview['outcome']) =>
      setOutcome.mutate(
        { id: interview.id, outcome },
        {
          onSuccess: () => notify(t('interviews.outcomeSet', { outcome: t(`interviewOutcome.${outcome}`) })),
          onError: (e) => notify(getErrorMessage(e, t), 'error'),
        },
      ),
  };

  return (
    <Box sx={{ maxWidth: view === 'calendar' ? 1200 : 900 }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('nav.interviews')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('interviews.subtitle')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ interview: null })}>
          {t('interviews.new')}
        </Button>
      </Stack>

      <Tabs
        value={view}
        onChange={(_e, v: View) => setSearchParams({ view: v }, { replace: true })}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="upcoming" label={`${t('interviews.views.upcoming')} (${upcoming.length})`} />
        <Tab value="past" label={`${t('interviews.views.past')} (${past.length})`} />
        <Tab value="calendar" label={t('interviews.views.calendar')} />
      </Tabs>

      {query.isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : query.isError ? (
        <Alert severity="error">{getErrorMessage(query.error, t)}</Alert>
      ) : (
        <>
          {awaitingResult > 0 && view !== 'calendar' && (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={
                view !== 'past' && (
                  <Button color="inherit" size="small" onClick={() => setSearchParams({ view: 'past' }, { replace: true })}>
                    {t('interviews.show')}
                  </Button>
                )
              }
            >
              {t('interviews.awaitingResult', { count: awaitingResult })}
            </Alert>
          )}

          {view === 'upcoming' &&
            (upcomingGroups.length === 0 ? (
              <EmptyState text={t('interviews.emptyUpcoming')} />
            ) : (
              <Stack spacing={3}>
                {upcomingGroups.map((g) => (
                  <Box key={g.key}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      {g.label}
                    </Typography>
                    <Stack spacing={1}>
                      {g.items.map((iv) => (
                        <InterviewCard key={iv.id} interview={iv} {...cardHandlers} />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ))}

          {view === 'past' &&
            (past.length === 0 ? (
              <EmptyState text={t('interviews.emptyPast')} />
            ) : (
              <Stack spacing={1}>
                {past.map((iv) => (
                  <InterviewCard key={iv.id} interview={iv} showDate {...cardHandlers} />
                ))}
              </Stack>
            ))}

          {view === 'calendar' && (
            <InterviewCalendar
              interviews={query.data}
              onSelect={(interview) => setDialog({ interview })}
              onCreateOnDay={(day) => {
                const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0);
                setDialog({ interview: null, scheduledAt: toLocalInput(start.toISOString()) });
              }}
            />
          )}
        </>
      )}

      <InterviewFormDialog state={dialog} onClose={() => setDialog(null)} />

      <ConfirmDialog
        open={deleting !== null}
        title={t('interviews.deleteTitle')}
        message={deleting ? t('interviews.deleteMessage', { company: deleting.companyName }) : ''}
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
