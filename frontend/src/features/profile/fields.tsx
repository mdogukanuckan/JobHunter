import { Autocomplete, Box, Chip, MenuItem, Paper, Stack, TextField, Typography, type TextFieldProps } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { PolicyField } from '../../api/types';
import { PolicyButton } from './PolicyButton';

/* Profilin ana alanlari (Genel / Kisisel sekmeleri) icin kucuk yardimci bilesenler. */

/** Baslikli bolum karti; icindeki alanlar sm ve ustunde iki kolon. */
export function FormSection({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {extra}
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>{children}</Box>
    </Paper>
  );
}

/** Alan + sagda otomasyon politikasi ikonu. */
export function WithPolicy({ field, full, children }: { field: PolicyField; full?: boolean; children: ReactNode }) {
  return (
    <Stack direction="row" sx={{ gap: 0.5, alignItems: 'flex-start', gridColumn: full ? '1 / -1' : undefined }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
      <PolicyButton field={field} />
    </Stack>
  );
}

/** Metin alani: bos metin null olarak disari verilir. */
export function TextInput({
  value,
  onChange,
  full,
  ...rest
}: Omit<TextFieldProps, 'value' | 'onChange'> & { value: string | null; onChange: (v: string | null) => void; full?: boolean }) {
  return (
    <TextField
      {...rest}
      fullWidth
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      sx={{ gridColumn: full ? '1 / -1' : undefined, ...rest.sx }}
    />
  );
}

/** Tam sayi alani. */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  ...rest
}: Omit<TextFieldProps, 'value' | 'onChange'> & { value: number | null; onChange: (v: number | null) => void; min?: number; max?: number }) {
  return (
    <TextField
      {...rest}
      fullWidth
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? null : Math.trunc(Number(raw)));
      }}
      slotProps={{ htmlInput: { min, max, step: 1 } }}
    />
  );
}

/** Tarih alani ("YYYY-MM-DD", backend DateOnly ile ayni bicim). */
export function DateInput({
  value,
  onChange,
  ...rest
}: Omit<TextFieldProps, 'value' | 'onChange'> & { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <TextField
      {...rest}
      fullWidth
      type="date"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
}

/** Enum secimi; "Belirtilmedi" secenegi null dondurur. */
export function EnumSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  labelOf,
  allowEmpty = true,
}: {
  label: string;
  value: T | null;
  onChange: (v: T | null) => void;
  options: readonly T[];
  labelOf: (v: T) => string;
  allowEmpty?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <TextField select fullWidth label={label} value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as T | null)}>
      {allowEmpty && (
        <MenuItem value="">
          <em>{t('common.notSpecified')}</em>
        </MenuItem>
      )}
      {options.map((o) => (
        <MenuItem key={o} value={o}>
          {labelOf(o)}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Evet / Hayir / Belirtilmedi (bool? alanlar icin). */
export function TriStateSelect({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  const { t } = useTranslation();
  return (
    <TextField
      select
      fullWidth
      label={label}
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')}
    >
      <MenuItem value="">
        <em>{t('common.notSpecified')}</em>
      </MenuItem>
      <MenuItem value="true">{t('common.yes')}</MenuItem>
      <MenuItem value="false">{t('common.no')}</MenuItem>
    </TextField>
  );
}

/** Serbest etiket girisi (yetenekler vb.). */
export function TagsInput({
  label,
  value,
  onChange,
  suggestions = [],
  helperText,
  full,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: readonly string[];
  helperText?: string;
  full?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Autocomplete
      multiple
      freeSolo
      options={[...suggestions]}
      value={value}
      onChange={(_e, v) => onChange(v.map((s) => s.trim()).filter(Boolean))}
      sx={{ gridColumn: full ? '1 / -1' : undefined }}
      renderValue={(items, getItemProps) =>
        items.map((option, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return <Chip key={key} label={option} size="small" {...itemProps} />;
        })
      }
      renderInput={(params) => <TextField {...params} label={label} helperText={helperText ?? t('common.tagsHint')} />}
    />
  );
}
