import { Autocomplete, Chip, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  DRIVER_LICENSE_CLASSES,
  type Gender,
  type MaritalStatus,
  type MilitaryServiceStatus,
  type ProfileMainFields,
} from '../../api/types';
import { DateInput, EnumSelect, FormSection, NumberInput, TextInput, TriStateSelect, WithPolicy } from './fields';
import { PolicyButton } from './PolicyButton';

const GENDERS: Gender[] = ['Female', 'Male', 'Other', 'PreferNotToSay'];
const MARITAL: MaritalStatus[] = ['Single', 'Married', 'Divorced', 'Widowed', 'PreferNotToSay'];
const MILITARY: MilitaryServiceStatus[] = ['Completed', 'Exempt', 'Postponed', 'NotCompleted', 'NotApplicable'];

interface Props {
  values: ProfileMainFields;
  update: (patch: Partial<ProfileMainFields>) => void;
}

/** Kisisel: dogum tarihi, cinsiyet, medeni durum, askerlik, ehliyet, adres ve diger formlarda sorulan bilgiler. */
export function PersonalTab({ values: v, update }: Props) {
  const { t } = useTranslation();
  const hasLicense = v.driverLicenseClasses.length > 0;

  return (
    <Stack spacing={2}>
      <FormSection title={t('profile.sections.personal')}>
        <WithPolicy field="DateOfBirth">
          <DateInput label={t('profile.fields.dateOfBirth')} value={v.dateOfBirth} onChange={(dateOfBirth) => update({ dateOfBirth })} />
        </WithPolicy>
        <WithPolicy field="Nationality">
          <TextInput
            label={t('profile.fields.nationality')}
            placeholder={t('profile.placeholders.nationality')}
            value={v.nationality}
            onChange={(nationality) => update({ nationality })}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
        </WithPolicy>
        <WithPolicy field="Gender">
          <EnumSelect
            label={t('profile.fields.gender')}
            value={v.gender}
            onChange={(gender) => update({ gender })}
            options={GENDERS}
            labelOf={(g) => t(`gender.${g}`)}
          />
        </WithPolicy>
        <WithPolicy field="MaritalStatus">
          <EnumSelect
            label={t('profile.fields.maritalStatus')}
            value={v.maritalStatus}
            onChange={(maritalStatus) => update({ maritalStatus })}
            options={MARITAL}
            labelOf={(m) => t(`maritalStatus.${m}`)}
          />
        </WithPolicy>
      </FormSection>

      <FormSection title={t('profile.sections.military')} extra={<PolicyButton field="MilitaryService" inline />}>
        <EnumSelect
          label={t('profile.fields.militaryServiceStatus')}
          value={v.militaryServiceStatus}
          onChange={(militaryServiceStatus) =>
            // Tecilli degilse tecil tarihi anlamsiz: backend de zaten temizliyor, ekranda da temizle.
            update({ militaryServiceStatus, militaryPostponedUntil: militaryServiceStatus === 'Postponed' ? v.militaryPostponedUntil : null })
          }
          options={MILITARY}
          labelOf={(m) => t(`military.${m}`)}
        />
        {v.militaryServiceStatus === 'Postponed' && (
          <DateInput
            label={t('profile.fields.militaryPostponedUntil')}
            value={v.militaryPostponedUntil}
            onChange={(militaryPostponedUntil) => update({ militaryPostponedUntil })}
          />
        )}
      </FormSection>

      <FormSection title={t('profile.sections.driverLicense')} extra={<PolicyButton field="DriverLicense" inline />}>
        <Autocomplete
          multiple
          options={[...DRIVER_LICENSE_CLASSES]}
          value={v.driverLicenseClasses}
          onChange={(_e, classes) => {
            // Secim sirasi ne olursa olsun resmi siralamayla sakla.
            const ordered = DRIVER_LICENSE_CLASSES.filter((c) => classes.includes(c));
            update({ driverLicenseClasses: ordered, driverLicenseYear: ordered.length ? v.driverLicenseYear : null });
          }}
          renderValue={(items, getItemProps) =>
            items.map((option, index) => {
              const { key, ...itemProps } = getItemProps({ index });
              return <Chip key={key} label={option} size="small" {...itemProps} />;
            })
          }
          renderInput={(params) => (
            <TextField {...params} label={t('profile.fields.driverLicenseClasses')} helperText={t('profile.hints.driverLicense')} />
          )}
        />
        <NumberInput
          label={t('profile.fields.driverLicenseYear')}
          value={v.driverLicenseYear}
          onChange={(driverLicenseYear) => update({ driverLicenseYear })}
          min={1950}
          max={new Date().getFullYear()}
          disabled={!hasLicense}
        />
      </FormSection>

      <FormSection title={t('profile.sections.address')} extra={<PolicyButton field="Address" inline />}>
        <TextInput label={t('profile.fields.country')} value={v.country} onChange={(country) => update({ country })} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <TextInput label={t('profile.fields.city')} value={v.city} onChange={(city) => update({ city })} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <TextInput label={t('profile.fields.district')} value={v.district} onChange={(district) => update({ district })} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <TextInput label={t('profile.fields.postalCode')} value={v.postalCode} onChange={(postalCode) => update({ postalCode })} slotProps={{ htmlInput: { maxLength: 20 } }} />
        <TextInput
          full
          label={t('profile.fields.addressLine')}
          value={v.addressLine}
          onChange={(addressLine) => update({ addressLine })}
          multiline
          minRows={2}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </FormSection>

      <FormSection title={t('profile.sections.other')}>
        <WithPolicy field="Travel">
          <TriStateSelect label={t('profile.fields.canTravel')} value={v.canTravel} onChange={(canTravel) => update({ canTravel })} />
        </WithPolicy>
        <WithPolicy field="Smoking">
          <TriStateSelect label={t('profile.fields.isSmoker')} value={v.isSmoker} onChange={(isSmoker) => update({ isSmoker })} />
        </WithPolicy>
        <WithPolicy field="Disability">
          <TriStateSelect label={t('profile.fields.hasDisability')} value={v.hasDisability} onChange={(hasDisability) => update({ hasDisability })} />
        </WithPolicy>
      </FormSection>
    </Stack>
  );
}
