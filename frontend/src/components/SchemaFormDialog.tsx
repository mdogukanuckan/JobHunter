import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

/*
 * Alan tanimlarindan (schema) form ureten genel dialog.
 * Profildeki 7 alt liste (deneyim, egitim, sertifika...) icin ayri ayri form yazmak yerine
 * her liste sadece alanlarini tanimlar; cizim, dogrulama ve gonderim burada tek yerde yapilir.
 */

export type FormValue = string | boolean | string[];
export type FormValues = Record<string, FormValue>;

export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'multiline' | 'date' | 'select' | 'checkbox' | 'tags' | 'url' | 'email' | 'tel';
  required?: boolean;
  maxLength?: number;
  options?: { value: string; label: string }[];
  /** 'tags' icin oneri listesi. */
  suggestions?: string[];
  /** sm ve ustu ekranlarda yarim genislik (iki alan yan yana). */
  half?: boolean;
  helperText?: string;
  /** Diger alanlara bagli olarak pasif (orn. "halen calisiyorum" isaretliyse bitis tarihi). */
  disabled?: (values: FormValues) => boolean;
}

interface Props {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initialValues: FormValues;
  /** Alanlar arasi kurallar (orn. bitis >= baslangic). Hata metni ya da null doner. */
  validate?: (values: FormValues) => string | null;
  loading?: boolean;
  serverError?: string | null;
  onSubmit: (values: FormValues) => void;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function SchemaFormDialog(props: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      {/* key: her acilista form yeni initialValues ile sifirdan baslar. */}
      {props.open && <FormBody key={JSON.stringify(props.initialValues)} {...props} />}
    </Dialog>
  );
}

function FormBody({ title, fields, initialValues, validate, loading, serverError, onSubmit, onClose }: Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [submitted, setSubmitted] = useState(false);

  const set = (name: string, value: FormValue) => setValues((prev) => ({ ...prev, [name]: value }));

  const fieldError = (f: FieldDef): string | null => {
    if (f.disabled?.(values)) return null;
    const v = values[f.name];
    if (typeof v === 'string') {
      const s = v.trim();
      if (f.required && s === '') return t('validation.required');
      if (s !== '' && f.type === 'url' && !isHttpUrl(s)) return t('validation.url');
      if (s !== '' && f.type === 'email' && !EMAIL_RE.test(s)) return t('validation.email');
    }
    return null;
  };

  const errors = Object.fromEntries(fields.map((f) => [f.name, fieldError(f)]));
  const formError = validate?.(values) ?? null;
  const hasErrors = Object.values(errors).some(Boolean) || formError !== null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!hasErrors) onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {serverError && <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{serverError}</Alert>}
          {submitted && formError && <Alert severity="warning" sx={{ gridColumn: '1 / -1' }}>{formError}</Alert>}

          {fields.map((f) => {
            const error = submitted ? errors[f.name] : null;
            const disabled = f.disabled?.(values) ?? false;
            const span = f.half ? undefined : '1 / -1';
            const common = {
              label: f.label,
              required: f.required,
              disabled,
              error: Boolean(error),
              helperText: error ?? f.helperText,
              fullWidth: true,
            };

            if (f.type === 'checkbox') {
              return (
                <FormControlLabel
                  key={f.name}
                  sx={{ gridColumn: span }}
                  control={<Checkbox checked={Boolean(values[f.name])} onChange={(e) => set(f.name, e.target.checked)} />}
                  label={f.label}
                />
              );
            }

            if (f.type === 'tags') {
              return (
                <Autocomplete
                  key={f.name}
                  sx={{ gridColumn: span }}
                  multiple
                  freeSolo
                  options={f.suggestions ?? []}
                  value={(values[f.name] as string[]) ?? []}
                  onChange={(_e, v) => set(f.name, v.map((s) => s.trim()).filter(Boolean))}
                  renderValue={(value, getItemProps) =>
                    value.map((option, index) => {
                      const { key, ...itemProps } = getItemProps({ index });
                      return <Chip key={key} label={option} size="small" {...itemProps} />;
                    })
                  }
                  renderInput={(params) => <TextField {...params} {...common} helperText={f.helperText ?? t('common.tagsHint')} />}
                />
              );
            }

            if (f.type === 'select') {
              return (
                <TextField
                  key={f.name}
                  sx={{ gridColumn: span }}
                  select
                  {...common}
                  value={values[f.name] as string}
                  onChange={(e) => set(f.name, e.target.value)}
                >
                  {!f.required && (
                    <MenuItem value="">
                      <em>{t('common.notSpecified')}</em>
                    </MenuItem>
                  )}
                  {f.options?.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }

            return (
              <TextField
                key={f.name}
                sx={{ gridColumn: span }}
                {...common}
                type={f.type === 'multiline' || f.type === 'text' ? 'text' : f.type}
                multiline={f.type === 'multiline'}
                minRows={f.type === 'multiline' ? 3 : undefined}
                maxRows={f.type === 'multiline' ? 10 : undefined}
                value={disabled && f.type === 'date' ? '' : (values[f.name] as string)}
                onChange={(e) => set(f.name, e.target.value)}
                slotProps={{
                  htmlInput: { maxLength: f.maxLength },
                  // Tarih alaninda etiket her zaman yukarida dursun (tarayici "gg.aa.yyyy" gosteriyor).
                  inputLabel: f.type === 'date' ? { shrink: true } : undefined,
                }}
              />
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button type="submit" variant="contained" loading={loading}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </form>
  );
}

// ---------- Donusum yardimcilari ----------

/** API degeri (null olabilir) -> form degeri. */
export const str = (v: string | number | null | undefined): string => (v === null || v === undefined ? '' : String(v));

/** Form degeri -> API degeri: bos metin null olur. */
export const nullable = (v: FormValue | undefined): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s === '' ? null : s;
};
