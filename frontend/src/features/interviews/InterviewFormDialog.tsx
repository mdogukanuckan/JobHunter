import { useTranslation } from 'react-i18next';
import type { Interview, InterviewFormat, InterviewType } from '../../api/types';
import { useNotify } from '../../components/Notify';
import { SchemaFormDialog, nullable, str, type FieldDef, type FormValues } from '../../components/SchemaFormDialog';
import { getErrorMessage } from '../../utils/errors';
import { fromLocalInput, toLocalInput } from '../../utils/format';
import { useBoardQuery } from '../board/useBoard';
import { useSaveInterview } from './useInterviews';

export const INTERVIEW_TYPES: InterviewType[] = ['PhoneScreen', 'Technical', 'Behavioral', 'CaseStudy', 'Final', 'Other'];
export const INTERVIEW_FORMATS: InterviewFormat[] = ['Online', 'Phone', 'OnSite'];

/** null: dialog kapali. interview null ise yeni mulakat, doluysa duzenleme. */
export type InterviewDialogState = {
  interview: Interview | null;
  /** Yeni mulakatta onceden secili basvuru (kart detayindan acilinca). */
  jobApplicationId?: string;
  /** Yeni mulakatta baslangic (takvimde bir gune tiklaninca), datetime-local bicimi. */
  scheduledAt?: string;
} | null;

interface Props {
  state: InterviewDialogState;
  onClose: () => void;
}

/** Yarin saat 10:00 (yeni mulakat icin makul bir varsayilan). */
function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

/**
 * Mulakat ekleme/duzenleme. Hem Mulakatlar sayfasinda hem de pano kart detayinda kullanilir.
 * Yeni mulakat eklenince basvuru Wishlist/Applied'daysa backend karti otomatik "Mulakat" sutununa tasir.
 */
export function InterviewFormDialog({ state, onClose }: Props) {
  const { t } = useTranslation();
  const notify = useNotify();
  const boardQuery = useBoardQuery();
  const save = useSaveInterview();

  const interview = state?.interview ?? null;
  const isEdit = interview !== null;

  // Kapali/sonuclanmis basvurular da secilebilsin (gecmis mulakat kaydi girmek icin), ama sirali gelsin.
  const applications = [...(boardQuery.data ?? [])].sort((a, b) => a.companyName.localeCompare(b.companyName));

  const fields: FieldDef[] = [
    {
      name: 'jobApplicationId',
      label: t('interviews.fields.application'),
      type: 'select',
      required: true,
      disabled: () => isEdit, // backend baglanti degisikligine izin vermiyor
      options: isEdit
        ? [{ value: interview.jobApplicationId, label: `${interview.companyName} – ${interview.jobTitle}` }]
        : applications.map((a) => ({ value: a.id, label: `${a.companyName} – ${a.jobTitle} (${t(`status.${a.status}`)})` })),
      helperText: !isEdit && applications.length === 0 ? t('interviews.noApplications') : undefined,
    },
    { name: 'scheduledAt', label: t('interviews.fields.scheduledAt'), type: 'datetime', required: true, half: true },
    { name: 'durationMinutes', label: t('interviews.fields.duration'), type: 'number', min: 5, max: 1440, half: true },
    {
      name: 'type',
      label: t('interviews.fields.type'),
      type: 'select',
      required: true,
      half: true,
      options: INTERVIEW_TYPES.map((v) => ({ value: v, label: t(`interviewType.${v}`) })),
    },
    {
      name: 'format',
      label: t('interviews.fields.format'),
      type: 'select',
      required: true,
      half: true,
      options: INTERVIEW_FORMATS.map((v) => ({ value: v, label: t(`interviewFormat.${v}`) })),
    },
    { name: 'meetingUrl', label: t('interviews.fields.meetingUrl'), type: 'url', maxLength: 2000, half: true },
    { name: 'location', label: t('interviews.fields.location'), type: 'text', maxLength: 300, half: true },
    { name: 'interviewers', label: t('interviews.fields.interviewers'), type: 'text', maxLength: 500, helperText: t('interviews.hints.interviewers') },
    { name: 'preparationNotes', label: t('interviews.fields.preparationNotes'), type: 'multiline' },
    ...(isEdit ? [{ name: 'feedbackNotes', label: t('interviews.fields.feedbackNotes'), type: 'multiline' } as FieldDef] : []),
  ];

  const initialValues: FormValues = {
    jobApplicationId: interview?.jobApplicationId ?? state?.jobApplicationId ?? '',
    scheduledAt: interview ? toLocalInput(interview.scheduledAt) : (state?.scheduledAt ?? defaultStart()),
    durationMinutes: interview ? str(interview.durationMinutes) : '60',
    type: interview?.type ?? 'PhoneScreen',
    format: interview?.format ?? 'Online',
    meetingUrl: str(interview?.meetingUrl),
    location: str(interview?.location),
    interviewers: str(interview?.interviewers),
    preparationNotes: str(interview?.preparationNotes),
    feedbackNotes: str(interview?.feedbackNotes),
  };

  const submit = (v: FormValues) => {
    const duration = nullable(v.durationMinutes);
    const fields = {
      scheduledAt: fromLocalInput(v.scheduledAt as string),
      durationMinutes: duration === null ? null : Number(duration),
      type: v.type as InterviewType,
      format: v.format as InterviewFormat,
      location: nullable(v.location),
      meetingUrl: nullable(v.meetingUrl),
      interviewers: nullable(v.interviewers),
      preparationNotes: nullable(v.preparationNotes),
    };

    const onSuccess = () => {
      onClose();
      notify(isEdit ? t('common.savedMessage') : t('interviews.created'));
    };

    if (isEdit) {
      save.mutate({ id: interview.id, body: { ...fields, feedbackNotes: nullable(v.feedbackNotes) } }, { onSuccess });
    } else {
      save.mutate({ id: null, body: { ...fields, jobApplicationId: v.jobApplicationId as string } }, { onSuccess });
    }
  };

  return (
    <SchemaFormDialog
      open={state !== null}
      title={isEdit ? t('interviews.edit') : t('interviews.new')}
      fields={fields}
      initialValues={initialValues}
      loading={save.isPending}
      serverError={save.error ? getErrorMessage(save.error, t) : null}
      onClose={() => {
        save.reset();
        onClose();
      }}
      onSubmit={submit}
    />
  );
}
