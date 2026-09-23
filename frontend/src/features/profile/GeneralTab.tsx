import { FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Cv, Profile, ProfileMainFields, WorkMode } from '../../api/types';
import { EnumSelect, FormSection, NumberInput, TagsInput, TextInput, WithPolicy } from './fields';

const WORK_MODES: WorkMode[] = ['Remote', 'Hybrid', 'OnSite', 'Flexible'];
const CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP'];

interface Props {
  profile: Profile | null;
  values: ProfileMainFields;
  update: (patch: Partial<ProfileMainFields>) => void;
  cvs: Cv[];
}

/** Genel: ozet, iletisim, calisma tercihleri, varsayilan CV. */
export function GeneralTab({ profile, values: v, update, cvs }: Props) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      <FormSection title={t('profile.sections.summary')}>
        <TextInput
          label={t('profile.fields.headline')}
          placeholder={t('profile.placeholders.headline')}
          value={v.headline}
          onChange={(headline) => update({ headline })}
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <NumberInput
          label={t('profile.fields.yearsOfExperience')}
          value={v.yearsOfExperience}
          onChange={(yearsOfExperience) => update({ yearsOfExperience })}
          min={0}
          max={60}
        />
        <TextInput
          full
          label={t('profile.fields.summary')}
          value={v.summary}
          onChange={(summary) => update({ summary })}
          multiline
          minRows={3}
          maxRows={10}
        />
        <TagsInput full label={t('profile.fields.skills')} value={v.skills} onChange={(skills) => update({ skills })} />
      </FormSection>

      <FormSection title={t('profile.sections.contact')}>
        {/* Ad-soyad ve e-posta hesap bilgisidir; burada sadece gosterilir. */}
        <TextField label={t('auth.fullName')} value={profile?.fullName ?? ''} disabled fullWidth />
        <TextField label={t('auth.email')} value={profile?.email ?? ''} disabled fullWidth />
        <TextInput
          label={t('profile.fields.phoneNumber')}
          type="tel"
          value={v.phoneNumber}
          onChange={(phoneNumber) => update({ phoneNumber })}
          slotProps={{ htmlInput: { maxLength: 30 } }}
        />
        <TextInput
          label="LinkedIn"
          type="url"
          placeholder="https://linkedin.com/in/..."
          value={v.linkedInUrl}
          onChange={(linkedInUrl) => update({ linkedInUrl })}
        />
        <TextInput
          label="GitHub"
          type="url"
          placeholder="https://github.com/..."
          value={v.gitHubUrl}
          onChange={(gitHubUrl) => update({ gitHubUrl })}
        />
        <TextInput
          label={t('profile.fields.portfolioUrl')}
          type="url"
          placeholder="https://"
          value={v.portfolioUrl}
          onChange={(portfolioUrl) => update({ portfolioUrl })}
        />
      </FormSection>

      <FormSection title={t('profile.sections.preferences')}>
        <WithPolicy field="ExpectedSalary">
          <Stack direction="row" spacing={1}>
            <NumberInput
              label={t('profile.fields.expectedSalary')}
              value={v.expectedSalary}
              onChange={(expectedSalary) => update({ expectedSalary })}
              min={0}
              helperText={t('profile.hints.expectedSalary')}
            />
            <TextField
              select
              label={t('profile.fields.currency')}
              value={v.salaryCurrency ?? ''}
              onChange={(e) => update({ salaryCurrency: e.target.value || null })}
              sx={{ minWidth: 100 }}
            >
              <MenuItem value="">
                <em>—</em>
              </MenuItem>
              {CURRENCIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </WithPolicy>
        <NumberInput
          label={t('profile.fields.noticePeriodDays')}
          value={v.noticePeriodDays}
          onChange={(noticePeriodDays) => update({ noticePeriodDays })}
          min={0}
          max={365}
        />
        <EnumSelect
          label={t('profile.fields.preferredWorkMode')}
          value={v.preferredWorkMode}
          onChange={(preferredWorkMode) => update({ preferredWorkMode })}
          options={WORK_MODES}
          labelOf={(m) => t(`workMode.${m}`)}
        />
        <TextInput
          label={t('profile.fields.workAuthorization')}
          placeholder={t('profile.placeholders.workAuthorization')}
          value={v.workAuthorization}
          onChange={(workAuthorization) => update({ workAuthorization })}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        <FormControlLabel
          control={<Switch checked={v.openToRelocation} onChange={(e) => update({ openToRelocation: e.target.checked })} />}
          label={t('profile.fields.openToRelocation')}
        />
        <FormControlLabel
          control={
            <Switch checked={v.requiresVisaSponsorship} onChange={(e) => update({ requiresVisaSponsorship: e.target.checked })} />
          }
          label={t('profile.fields.requiresVisaSponsorship')}
        />
      </FormSection>

      <FormSection title={t('profile.sections.defaultCv')}>
        <TextField
          select
          label={t('profile.fields.defaultCv')}
          value={v.defaultCvId ?? ''}
          onChange={(e) => update({ defaultCvId: e.target.value || null })}
          fullWidth
          helperText={t('profile.hints.defaultCv')}
        >
          <MenuItem value="">
            <em>{t('board.noCv')}</em>
          </MenuItem>
          {cvs.map((cv) => (
            <MenuItem key={cv.id} value={cv.id}>
              {cv.name}
            </MenuItem>
          ))}
        </TextField>
        {cvs.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {t('profile.hints.noCvs')}
          </Typography>
        )}
      </FormSection>
    </Stack>
  );
}
