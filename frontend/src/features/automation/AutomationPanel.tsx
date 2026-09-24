import CodeIcon from '@mui/icons-material/Code';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isActiveAutomation, type AutomationEvent, type AutomationJob, type AutomationMode } from '../../api/types';
import { useNotify } from '../../components/Notify';
import { getErrorMessage } from '../../utils/errors';
import { formatDateTime } from '../../utils/format';
import { AutomationStatusChip } from './AutomationStatusChip';
import {
  useApplicationAutomationJobs,
  useAutomationJobQuery,
  useCancelAutomation,
  useStartAutomation,
} from './useAutomation';

interface Props {
  jobApplicationId: string;
  jobUrl: string | null;
}

/**
 * Basvuru detayindaki "Otomasyon" bolumu:
 *  - Baslat (mod secimi ile), aktif denemeyi iptal
 *  - Denemeler listesi (her deneme = ayri AutomationJob satiri, Faz 0 karari)
 *  - Secili denemenin adim adim gunlugu (n8n'in gonderdigi event'ler)
 */
export function AutomationPanel({ jobApplicationId, jobUrl }: Props) {
  const { t } = useTranslation();
  const jobs = useApplicationAutomationJobs(jobApplicationId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  const hasActive = jobs.some((j) => isActiveAutomation(j.status));
  // Secim yoksa en son deneme gosterilir; yeni deneme baslayinca otomatik olarak o one cikar.
  const shownId = selectedId && jobs.some((j) => j.id === selectedId) ? selectedId : (jobs[0]?.id ?? null);

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {t('automation.title')}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<PlayArrowIcon />}
          disabled={!jobUrl || hasActive}
          onClick={() => setStartOpen(true)}
        >
          {jobs.length > 0 ? t('automation.retry') : t('automation.start')}
        </Button>
      </Stack>

      {!jobUrl && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {t('automation.needsUrl')}
        </Alert>
      )}

      {jobs.length === 0 ? (
        jobUrl && (
          <Typography variant="body2" color="text.disabled">
            {t('automation.noAttempts')}
          </Typography>
        )
      ) : (
        <Stack spacing={1.5}>
          {jobs.length > 1 && (
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              {jobs.map((j) => (
                <Button
                  key={j.id}
                  size="small"
                  variant={j.id === shownId ? 'contained' : 'outlined'}
                  color={j.id === shownId ? 'primary' : 'inherit'}
                  onClick={() => setSelectedId(j.id)}
                  sx={{ minWidth: 0, px: 1.25 }}
                >
                  #{j.attemptNumber}
                </Button>
              ))}
            </Stack>
          )}
          {shownId && <AttemptDetail id={shownId} fallback={jobs.find((j) => j.id === shownId)!} />}
        </Stack>
      )}

      <StartDialog
        open={startOpen}
        jobApplicationId={jobApplicationId}
        onClose={() => setStartOpen(false)}
        onStarted={(job) => setSelectedId(job.id)}
      />
    </Box>
  );
}

/** Tek denemenin ozeti + gunlugu. Detay gelene kadar listedeki (events'siz) kopya gosterilir. */
function AttemptDetail({ id, fallback }: { id: string; fallback: AutomationJob }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language;
  const notify = useNotify();
  const detailQuery = useAutomationJobQuery(id);
  const cancelMutation = useCancelAutomation();
  const job = detailQuery.data ?? fallback;
  const active = isActiveAutomation(job.status);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t('automation.attempt', { n: job.attemptNumber })}
        </Typography>
        <AutomationStatusChip status={job.status} />
        {active && <CircularProgress size={14} />}
        <Box sx={{ flexGrow: 1 }} />
        {active && (
          <Button
            size="small"
            color="error"
            startIcon={<StopCircleOutlinedIcon />}
            loading={cancelMutation.isPending}
            onClick={() =>
              cancelMutation.mutate(job.id, {
                onSuccess: () => notify(t('automation.cancelled')),
                onError: (e) => notify(getErrorMessage(e, t), 'error'),
              })
            }
          >
            {t('automation.cancel')}
          </Button>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        {t(`automation.mode.${job.mode}`)} · {job.cvName ? t('automation.cvUsed', { name: job.cvName }) : t('automation.noCv')}
        {' · '}
        {formatDateTime(job.createdAt, lng)}
        {job.finishedAt && ` → ${formatDateTime(job.finishedAt, lng)}`}
      </Typography>

      {job.status === 'AwaitingApproval' && (
        <Alert severity="warning" sx={{ mt: 1.25 }}>
          {t('automation.awaitingInfo')}
        </Alert>
      )}
      {job.errorMessage && (
        <Alert severity="error" sx={{ mt: 1.25, wordBreak: 'break-word' }}>
          {job.errorMessage}
        </Alert>
      )}
      {job.resultSummary && (
        <Alert severity="success" sx={{ mt: 1.25, wordBreak: 'break-word' }}>
          {job.resultSummary}
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, mt: 1.5, mb: 0.5 }}>
        {t('automation.log')}
      </Typography>
      {detailQuery.isPending ? (
        <CircularProgress size={18} />
      ) : detailQuery.isError ? (
        <Alert severity="error">{getErrorMessage(detailQuery.error, t)}</Alert>
      ) : (job.events ?? []).length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          {t('automation.noEvents')}
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {/* Gunluk eskiden yeniye gelir; en yeni en ustte daha kullanisli. */}
          {[...(job.events ?? [])].reverse().map((ev) => (
            <EventRow key={ev.id} event={ev} lng={lng} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

const LEVEL_ICON = {
  Info: <InfoOutlinedIcon fontSize="small" color="info" />,
  Warning: <WarningAmberIcon fontSize="small" color="warning" />,
  Error: <ErrorOutlineIcon fontSize="small" color="error" />,
} as const;

function EventRow({ event, lng }: { event: AutomationEvent; lng: string }) {
  const { t } = useTranslation();
  const [showData, setShowData] = useState(false);
  const hasData = event.data !== null && event.data !== undefined;
  const time = new Intl.DateTimeFormat(lng, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
    new Date(event.createdAt),
  );

  return (
    <Box>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{ pt: '1px' }}>{LEVEL_ICON[event.level]}</Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
            {event.message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {time}
            {event.step && (
              <Box component="span" sx={{ fontFamily: 'monospace', ml: 1 }}>
                {event.step}
              </Box>
            )}
          </Typography>
        </Box>
        {hasData && (
          <IconButton size="small" onClick={() => setShowData((v) => !v)} aria-label={t('automation.showData')} title={t('automation.showData')}>
            <CodeIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      {showData && (
        <Box
          component="pre"
          sx={{ m: 0, mt: 0.5, ml: 3.5, p: 1, fontSize: 12, bgcolor: 'action.hover', borderRadius: 1, overflowX: 'auto', maxHeight: 240 }}
        >
          {JSON.stringify(event.data, null, 2)}
        </Box>
      )}
    </Box>
  );
}

function StartDialog({
  open,
  jobApplicationId,
  onClose,
  onStarted,
}: {
  open: boolean;
  jobApplicationId: string;
  onClose: () => void;
  onStarted: (job: AutomationJob) => void;
}) {
  const { t } = useTranslation();
  const notify = useNotify();
  const [mode, setMode] = useState<AutomationMode>('HumanApproval');
  const startMutation = useStartAutomation();

  const close = () => {
    startMutation.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{t('automation.startTitle')}</DialogTitle>
      <DialogContent>
        <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as AutomationMode)}>
          {(['HumanApproval', 'Automatic'] as const).map((m) => (
            <FormControlLabel
              key={m}
              value={m}
              control={<Radio />}
              sx={{ alignItems: 'flex-start', mb: 1, '& .MuiRadio-root': { pt: 0.5 } }}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t(`automation.mode.${m}`)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t(`automation.modeHint.${m}`)}
                  </Typography>
                </Box>
              }
            />
          ))}
        </RadioGroup>
        <Typography variant="caption" color="text.secondary">
          {t('automation.cvNote')}
        </Typography>
        {startMutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {getErrorMessage(startMutation.error, t)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          loading={startMutation.isPending}
          onClick={() =>
            startMutation.mutate(
              { jobApplicationId, mode },
              {
                onSuccess: (job) => {
                  notify(t('automation.started'));
                  onStarted(job);
                  close();
                },
              },
            )
          }
        >
          {t('automation.start')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
