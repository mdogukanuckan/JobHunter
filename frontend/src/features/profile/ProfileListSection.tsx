import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileCollection, ProfileCollectionItems } from '../../api/profile';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useNotify } from '../../components/Notify';
import { SchemaFormDialog, type FieldDef, type FormValues } from '../../components/SchemaFormDialog';
import { getErrorMessage } from '../../utils/errors';
import { useProfileItemMutations } from './useProfile';

type Item<C extends ProfileCollection> = ProfileCollectionItems[C];

interface Props<C extends ProfileCollection> {
  collection: C;
  items: Item<C>[];
  title: string;
  addLabel: string;
  emptyText: string;
  /** Baslik satirinin sagina ek icerik (orn. politika butonu). */
  headerExtra?: ReactNode;
  fields: FieldDef[];
  toForm: (item: Item<C> | null) => FormValues;
  toBody: (values: FormValues) => Omit<Item<C>, 'id'>;
  validate?: (values: FormValues) => string | null;
  renderPrimary: (item: Item<C>) => ReactNode;
  renderSecondary?: (item: Item<C>) => ReactNode;
  /** Kaydin silme onayinda gosterilecek adi. */
  itemName: (item: Item<C>) => string;
}

/**
 * Profil alt listeleri icin ortak bolum: baslik + "Ekle" butonu + kayit kartlari + form ve silme onayi.
 * Hangi alanlarin oldugu ve kaydin nasil gosterilecegi props ile verilir.
 */
export function ProfileListSection<C extends ProfileCollection>(props: Props<C>) {
  const { collection, items, title, addLabel, emptyText, headerExtra, fields, toForm, toBody, validate, renderPrimary, renderSecondary, itemName } =
    props;
  const { t } = useTranslation();
  const notify = useNotify();
  const { save, remove } = useProfileItemMutations(collection);

  // undefined: dialog kapali, null: yeni kayit, Item: duzenleme
  const [editing, setEditing] = useState<Item<C> | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Item<C> | null>(null);

  const openForm = (item: Item<C> | null) => {
    save.reset();
    setEditing(item);
  };

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5, gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ({items.length})
        </Typography>
        {headerExtra}
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" startIcon={<AddIcon />} onClick={() => openForm(null)}>
          {addLabel}
        </Button>
      </Stack>

      {items.length === 0 ? (
        <Typography
          variant="body2"
          color="text.disabled"
          sx={{ py: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}
        >
          {emptyText}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {items.map((item) => (
            <Paper key={item.id} sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ fontWeight: 600 }}>{renderPrimary(item)}</Box>
                {renderSecondary && (
                  <Box sx={{ color: 'text.secondary', fontSize: 14, mt: 0.25 }}>{renderSecondary(item)}</Box>
                )}
              </Box>
              <Tooltip title={t('common.edit')}>
                <IconButton size="small" onClick={() => openForm(item)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.delete')}>
                <IconButton
                  size="small"
                  onClick={() => {
                    remove.reset();
                    setDeleting(item);
                  }}
                >
                  <DeleteOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>
      )}

      <SchemaFormDialog
        open={editing !== undefined}
        title={editing ? `${title} · ${t('common.edit')}` : addLabel}
        fields={fields}
        initialValues={toForm(editing ?? null)}
        validate={validate}
        loading={save.isPending}
        serverError={save.error ? getErrorMessage(save.error, t) : null}
        onClose={() => setEditing(undefined)}
        onSubmit={(values) =>
          save.mutate(
            { id: editing?.id ?? null, body: toBody(values) },
            {
              onSuccess: () => {
                setEditing(undefined);
                notify(t('common.savedMessage'));
              },
            },
          )
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        title={t('common.deleteConfirmTitle')}
        message={deleting ? t('common.deleteConfirmMessage', { name: itemName(deleting) }) : ''}
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
