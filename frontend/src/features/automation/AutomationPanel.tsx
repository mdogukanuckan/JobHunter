import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { profileApi, profileKeys } from '../../api/profile';
import {
  isActiveAutomation,
  isRunningAutomation,
  type AutomationEvent,
  type AutomationFieldReport,
  type AutomationJob,
  type AutomationMode,
} from '../../api/types';
import { useNotify } from '../../components/Notify';
import { getErrorMessage } from '../../utils/errors';
import { formatDateTime } from '../../utils/format';
import { AutomationStatusChip } from './AutomationStatusChip';
import {
  useApplicationAutomationJobs,
  useApproveAutomation,
  useAutomationJobQuery,
  useAutomationReviewQuery,
  useCancelAutomation,
  useReviewScreenshotUrl,
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
  // "Calisiyor" spinner'i sadece gercekten calisirken gosterilir; AwaitingApproval kullaniciyi bekliyor.
  const running = isRunningAutomation(job.status);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t('automation.attempt', { n: job.attemptNumber })}
        </Typography>
        <AutomationStatusChip status={job.status} />
        {running && <CircularProgress size={14} />}
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

      {job.status === 'AwaitingApproval' && <ReviewPanel job={job} />}
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

// ---- Faz 11: onay ekrani ----

// Worker'daki (mapping.ts) CONSENT_RE ile ayni mantik: KVKK/aydinlatma kutusunu diger alanlardan ayirt eder,
// boylece backend/worker'a dokunmadan onay ekraninda checkbox olarak gosterilebilir.
const foldTr = (s: string) =>
  s.toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] ?? c);
const CONSENT_RE = /(kvkk|aydinlatma|kisisel veri|privacy|gizlilik|consent|onayliyorum|kabul ediyorum|i agree)/;
const NATIONAL_ID_RE = /(t\.?c\.?\s*kimlik|kimlik\s*no|national\s*id|social security)/;
const isConsentField = (f: AutomationFieldReport) => CONSENT_RE.test(foldTr(f.label));
const isNationalIdField = (f: AutomationFieldReport) => NATIONAL_ID_RE.test(foldTr(f.label));

/**
 * AwaitingApproval durumundaki bir denemenin onay ekrani: doldurma turunun ekran goruntusu, atlanan
 * alanlar icin cevap formu (KVKK ayri bir onay kutusu olarak, geri kalani metin alani olarak) ve
 * "Onayla ve gonder". Backend'e /approve ile gonderilir; is Submit turu icin n8n'e tekrar dusurulur.
 */
function ReviewPanel({ job }: { job: AutomationJob }) {
  const { t } = useTranslation();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const reviewQuery = useAutomationReviewQuery(job.id, true);
  const report = reviewQuery.data?.report ?? null;
  const { url: screenshotUrl } = useReviewScreenshotUrl(job.id, reviewQuery.data?.hasScreenshot ?? false);
  const approveMutation = useApproveAutomation();

  // Atlanan alanlar (KVKK haric), name'e gore tekillestirilmis (sihirbaz formlarinda ayni alan birden
  // fazla adimda gorunebilir).
  const editableFields = useMemo(() => {
    const seen = new Set<string>();
    const list: AutomationFieldReport[] = [];
    for (const f of report?.skipped ?? []) {
      if (isConsentField(f) || seen.has(f.name)) continue;
      seen.add(f.name);
      list.push(f);
    }
    return list;
  }, [report]);

  const consentField = useMemo(() => (report?.skipped ?? []).find(isConsentField) ?? null, [report]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [addToBank, setAddToBank] = useState<Record<string, boolean>>({});
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const missingRequiredEmpty = editableFields.some((f) => f.required && !(answers[f.name] ?? '').trim());
  const consentMissing = consentField !== null && !kvkkAccepted;
  const canApprove = !missingRequiredEmpty && !consentMissing;

  const handleApprove = () => {
    setTouched(true);
    if (!canApprove) return;
    const trimmed = Object.fromEntries(
      Object.entries(answers)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v !== ''),
    );
    approveMutation.mutate(
      {
        id: job.id,
        body: { answers: Object.keys(trimmed).length ? trimmed : null, kvkkAccepted: consentField ? kvkkAccepted : true },
      },
      {
        onSuccess: async () => {
          notify(t('automation.review.approved'));
          // Kullanicinin isaretledigi alanlar hazir cevap bankasina eklenir (TC kimlik gibi alanlar haric,
          // checkbox zaten gosterilmiyor). Bu, onaydan bagimsiz bir istek: basarisiz olsa da is devam eder.
          const toSave = editableFields.filter((f) => addToBank[f.name] && !isNationalIdField(f) && trimmed[f.name]);
          if (toSave.length === 0) return;
          const results = await Promise.allSettled(
            toSave.map((f) => profileApi.addItem('screening-answers', { question: f.label, answer: trimmed[f.name], tags: [] })),
          );
          if (results.some((r) => r.status === 'rejected')) {
            notify(t('automation.review.bankAddError', { question: toSave[0]?.label ?? '' }), 'error');
          } else {
            queryClient.invalidateQueries({ queryKey: profileKeys.all });
          }
        },
        onError: (e) => notify(getErrorMessage(e, t), 'error'),
      },
    );
  };

  if (reviewQuery.isPending) {
    return (
      <Box sx={{ mt: 1.25 }}>
        <CircularProgress size={18} />
      </Box>
    );
  }

  if (reviewQuery.isError) {
    return (
      <Alert severity="error" sx={{ mt: 1.25 }}>
        {getErrorMessage(reviewQuery.error, t)}
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 1.25, border: '1px dashed', borderColor: 'warning.main', borderRadius: 2, p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t('automation.review.title')}
      </Typography>

      {!report && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {t('automation.review.noReport')}
        </Alert>
      )}

      {report && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t('automation.review.summary', { filled: report.filled.length, skipped: report.skipped.length })}
        </Typography>
      )}

      {reviewQuery.data?.hasScreenshot ? (
        screenshotUrl ? (
          <Box sx={{ mb: 1.5, position: 'relative', display: 'inline-block' }}>
            <Box
              component="img"
              src={screenshotUrl}
              alt={t('automation.review.screenshotAlt')}
              onClick={() => setScreenshotOpen(true)}
              sx={{
                maxWidth: '100%',
                maxHeight: 220,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'zoom-in',
                display: 'block',
              }}
            />
            <IconButton
              size="small"
              onClick={() => setScreenshotOpen(true)}
              sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
              title={t('automation.review.viewScreenshot')}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <CircularProgress size={18} sx={{ mb: 1.5 }} />
        )
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
          {t('automation.review.noScreenshot')}
        </Typography>
      )}

      {consentField && (
        <FormControlLabel
          sx={{ display: 'block', mb: 1, alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.25 } }}
          control={<Checkbox checked={kvkkAccepted} onChange={(e) => setKvkkAccepted(e.target.checked)} />}
          label={
            <Box>
              <Typography variant="body2">{t('automation.review.consentLabel')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {consentField.label}
              </Typography>
            </Box>
          }
        />
      )}
      {touched && consentMissing && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {t('automation.review.consentRequired')}
        </Alert>
      )}

      {editableFields.length > 0 && (
        <>
          <Divider sx={{ my: 1.25 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            {t('automation.review.fieldsTitle')}
          </Typography>
          <Stack spacing={1.5}>
            {editableFields.map((f) => {
              const empty = !(answers[f.name] ?? '').trim();
              return (
                <Box key={f.name}>
                  <TextField
                    size="small"
                    fullWidth
                    label={f.label + (f.required ? ` (${t('automation.review.requiredBadge')})` : '')}
                    value={answers[f.name] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    error={touched && f.required && empty}
                    helperText={touched && f.required && empty ? t('automation.review.fieldRequired') : f.reason || undefined}
                  />
                  {!isNationalIdField(f) && (
                    <FormControlLabel
                      sx={{ mt: 0.25 }}
                      control={
                        <Checkbox
                          size="small"
                          checked={addToBank[f.name] ?? false}
                          onChange={(e) => setAddToBank((prev) => ({ ...prev, [f.name]: e.target.checked }))}
                        />
                      }
                      label={<Typography variant="caption">{t('automation.review.addToBank')}</Typography>}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>
        </>
      )}
      {report && editableFields.length === 0 && !consentField && (
        <Typography variant="body2" color="text.disabled">
          {t('automation.review.noFields')}
        </Typography>
      )}

      {approveMutation.error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {getErrorMessage(approveMutation.error, t)}
        </Alert>
      )}

      <Button
        sx={{ mt: 1.5 }}
        variant="contained"
        color="success"
        startIcon={<CheckCircleOutlineIcon />}
        loading={approveMutation.isPending}
        onClick={handleApprove}
      >
        {t('automation.review.approve')}
      </Button>

      <Dialog open={screenshotOpen} onClose={() => setScreenshotOpen(false)} maxWidth="lg">
        <IconButton onClick={() => setScreenshotOpen(false)} sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}>
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          {screenshotUrl && (
            <Box
              component="img"
              src={screenshotUrl}
              alt={t('automation.review.screenshotAlt')}
              sx={{ maxWidth: '100%', display: 'block' }}
            />
          )}
        </DialogContent>
      </Dialog>
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
