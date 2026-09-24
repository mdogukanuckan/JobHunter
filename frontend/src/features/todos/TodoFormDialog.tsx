import { useTranslation } from 'react-i18next';
import type { Todo, TodoPriority } from '../../api/types';
import { useNotify } from '../../components/Notify';
import { SchemaFormDialog, nullable, str, type FieldDef, type FormValues } from '../../components/SchemaFormDialog';
import { getErrorMessage } from '../../utils/errors';
import { formatDateTime, fromLocalInput, toLocalInput } from '../../utils/format';
import { useBoardQuery } from '../board/useBoard';
import { useInterviewsQuery } from '../interviews/useInterviews';
import { PRIORITIES } from './todoUtils';
import { useSaveTodo } from './useTodos';

/** null: dialog kapali. todo null ise yeni gorev, doluysa duzenleme. */
export type TodoDialogState = {
  todo: Todo | null;
  /** Yeni gorevde onceden secili basvuru (kart detayindan acilinca). */
  jobApplicationId?: string;
  /** Yeni gorevde onceden secili mulakat. */
  interviewId?: string;
} | null;

interface Props {
  state: TodoDialogState;
  onClose: () => void;
}

/**
 * Gorev ekleme/duzenleme. Yapilacaklar sayfasinda ve pano kart detayinda kullanilir.
 * Basvuru ve mulakat baglantisi opsiyonel; sadece mulakat secilirse basvuru backend'de mulakattan alinir.
 */
export function TodoFormDialog({ state, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const boardQuery = useBoardQuery();
  const interviewsQuery = useInterviewsQuery();
  const save = useSaveTodo();

  const todo = state?.todo ?? null;
  const isEdit = todo !== null;

  const applications = [...(boardQuery.data ?? [])].sort((a, b) => a.companyName.localeCompare(b.companyName));
  const interviews = interviewsQuery.data ?? [];

  const fields: FieldDef[] = [
    { name: 'title', label: t('todos.fields.title'), type: 'text', required: true, maxLength: 300 },
    { name: 'dueAt', label: t('todos.fields.dueAt'), type: 'datetime', half: true, helperText: t('todos.hints.dueAt') },
    {
      name: 'priority',
      label: t('todos.fields.priority'),
      type: 'select',
      required: true,
      half: true,
      options: PRIORITIES.map((p) => ({ value: p, label: t(`todoPriority.${p}`) })),
    },
    {
      name: 'jobApplicationId',
      label: t('todos.fields.application'),
      type: 'select',
      options: applications.map((a) => ({ value: a.id, label: `${a.companyName} – ${a.jobTitle}` })),
    },
    {
      name: 'interviewId',
      label: t('todos.fields.interview'),
      type: 'select',
      options: interviews.map((iv) => ({
        value: iv.id,
        label: `${iv.companyName} – ${t(`interviewType.${iv.type}`)} · ${formatDateTime(iv.scheduledAt, i18n.language)}`,
      })),
      helperText: t('todos.hints.interview'),
    },
    { name: 'description', label: t('todos.fields.description'), type: 'multiline' },
  ];

  const initialValues: FormValues = {
    title: str(todo?.title),
    dueAt: toLocalInput(todo?.dueAt),
    priority: todo?.priority ?? 'Medium',
    jobApplicationId: todo?.jobApplicationId ?? state?.jobApplicationId ?? '',
    interviewId: todo?.interviewId ?? state?.interviewId ?? '',
    description: str(todo?.description),
  };

  // Backend de kontrol ediyor; burada erken ve anlasilir uyari veriyoruz.
  const validate = (v: FormValues): string | null => {
    const appId = v.jobApplicationId as string;
    const ivId = v.interviewId as string;
    if (appId && ivId) {
      const iv = interviews.find((i) => i.id === ivId);
      if (iv && iv.jobApplicationId !== appId) return t('todos.interviewMismatch');
    }
    return null;
  };

  const submit = (v: FormValues) => {
    const due = nullable(v.dueAt);
    const body = {
      title: (v.title as string).trim(),
      description: nullable(v.description),
      dueAt: due === null ? null : fromLocalInput(due),
      priority: v.priority as TodoPriority,
      jobApplicationId: nullable(v.jobApplicationId),
      interviewId: nullable(v.interviewId),
    };
    save.mutate(
      { id: todo?.id ?? null, body },
      {
        onSuccess: () => {
          onClose();
          notify(isEdit ? t('common.savedMessage') : t('todos.created'));
        },
      },
    );
  };

  return (
    <SchemaFormDialog
      open={state !== null}
      title={isEdit ? t('todos.edit') : t('todos.new')}
      fields={fields}
      initialValues={initialValues}
      validate={validate}
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
