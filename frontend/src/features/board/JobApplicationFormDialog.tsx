import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { APPLICATION_STATUSES, type ApplicationStatus, type JobApplicationDetail, type JobApplicationFields } from '../../api/types';
import { getErrorMessage } from '../../utils/errors';
import { emptyToNull } from '../../utils/format';
import { useCreateJobApplication, useCvsQuery, useUpdateJobApplication } from './useBoard';

/** Dialog ya yeni kart icin (hedef sutunla) ya da mevcut karti duzenlemek icin (detayla) acilir. */
export type FormDialogState = { mode: 'create'; status: ApplicationStatus } | { mode: 'edit'; detail: JobApplicationDetail };

interface Props {
  state: FormDialogState | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const SOURCE_SUGGESTIONS = ['LinkedIn', 'Kariyer.net', 'Indeed', 'Glassdoor', 'Youthall', 'Secret CV', 'Referans', 'Şirket sitesi'];

export function JobApplicationFormDialog({ state, onClose, onSaved }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Kapanis animasyonu sirasinda icerik bosalmasin diye son acilan durum saklanir.
  const lastState = useRef<FormDialogState | null>(null);
  if (state) lastState.current = state;
  const shown = state ?? lastState.current;

  return (
    <Dialog open={state !== null} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      {shown && (
        // key: her acilista form alanlari o anki kartin verisiyle sifirdan baslar.
        <FormBody
          key={shown.mode === 'edit' ? `edit-${shown.detail.id}-${shown.detail.updatedAt}` : `create-${shown.status}`}
          state={shown}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function FormBody({ state, onClose, onSaved }: { state: FormDialogState; onClose: () => void; onSaved: (m: string) => void }) {
  const { t } = useTranslation();
  const detail = state.mode === 'edit' ? state.detail : null;

  const [companyName, setCompanyName] = useState(detail?.companyName ?? '');
  const [jobTitle, setJobTitle] = useState(detail?.jobTitle ?? '');
  const [jobUrl, setJobUrl] = useState(detail?.jobUrl ?? '');
  const [location, setLocation] = useState(detail?.location ?? '');
  const [source, setSource] = useState(detail?.source ?? '');
  const [status, setStatus] = useState<ApplicationStatus>(state.mode === 'create' ? state.status : 'Wishlist');
  const [cvId, setCvId] = useState(detail?.cv?.id ?? '');
  const [jobDescription, setJobDescription] = useState(detail?.jobDescription ?? '');
  const [notes, setNotes] = useState(detail?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const cvsQuery = useCvsQuery();
  const createMutation = useCreateJobApplication();
  const updateMutation = useUpdateJobApplication();
  const mutation = detail ? updateMutation : createMutation;

  // Istemci tarafi dogrulama (backend de ayni kurallari tekrar kontrol eder).
  const errors = {
    companyName: companyName.trim() === '' ? t('validation.required') : null,
    jobTitle: jobTitle.trim() === '' ? t('validation.required') : null,
    jobUrl: jobUrl.trim() !== '' && !isHttpUrl(jobUrl.trim()) ? t('validation.url') : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;

    const fields: JobApplicationFields = {
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      jobUrl: emptyToNull(jobUrl),
      location: emptyToNull(location),
      source: emptyToNull(source),
      jobDescription: emptyToNull(jobDescription),
      notes: emptyToNull(notes),
      cvId: cvId === '' ? null : cvId,
    };

    if (detail) {
      updateMutation.mutate({ id: detail.id, body: fields }, { onSuccess: () => onSaved(t('board.saved')) });
    } else {
      createMutation.mutate({ ...fields, status }, { onSuccess: () => onSaved(t('board.created')) });
    }
  };

  // Silinmis bir CV'ye bagli kart duzenlenirken o CV secenekte kalsin (yoksa Select bos gorunur).
  const cvOptions = (cvsQuery.data ?? []).map((cv) => ({ id: cv.id, label: cv.name }));
  if (detail?.cv && !cvOptions.some((o) => o.id === detail.cv!.id)) {
    cvOptions.push({ id: detail.cv.id, label: `${detail.cv.name} (${t('board.cvDeleted')})` });
  }

  const showError = (key: keyof typeof errors) => (submitted ? errors[key] : null);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogTitle>{detail ? t('board.editApplication') : t('board.newApplication')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {mutation.error && <Alert severity="error">{getErrorMessage(mutation.error, t)}</Alert>}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('board.fields.companyName')}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              error={Boolean(showError('companyName'))}
              helperText={showError('companyName')}
              required
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <TextField
              label={t('board.fields.jobTitle')}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              error={Boolean(showError('jobTitle'))}
              helperText={showError('jobTitle')}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
          </Stack>

          <TextField
            label={t('board.fields.jobUrl')}
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            error={Boolean(showError('jobUrl'))}
            helperText={showError('jobUrl')}
            placeholder="https://"
            type="url"
            fullWidth
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('board.fields.location')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            {/* freeSolo: listede olmayan bir kaynak da yazilabilir. */}
            <Autocomplete
              freeSolo
              options={SOURCE_SUGGESTIONS}
              inputValue={source}
              onInputChange={(_e, value) => setSource(value)}
              fullWidth
              renderInput={(params) => (
                <TextField {...params} label={t('board.fields.source')} slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps?.htmlInput, maxLength: 100 } }} />
              )}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {!detail && (
              <TextField
                select
                label={t('board.fields.status')}
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                fullWidth
              >
                {APPLICATION_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {t(`status.${s}`)}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              select
              label={t('board.fields.cv')}
              value={cvId}
              onChange={(e) => setCvId(e.target.value)}
              fullWidth
              helperText={cvsQuery.data?.length === 0 ? t('board.noCvsYet') : undefined}
            >
              <MenuItem value="">
                <em>{t('board.noCv')}</em>
              </MenuItem>
              {cvOptions.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label={t('board.fields.jobDescription')}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            helperText={t('board.jobDescriptionHint')}
            multiline
            minRows={4}
            maxRows={12}
            fullWidth
          />

          <TextField
            label={t('board.fields.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            maxRows={8}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" variant="contained" loading={mutation.isPending}>
          {detail ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </form>
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
