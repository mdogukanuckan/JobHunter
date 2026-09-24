import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ApplicationStatus, JobApplicationSummary } from '../../api/types';
import { SortableJobCard } from './JobCard';

interface BoardColumnProps {
  status: ApplicationStatus;
  items: JobApplicationSummary[];
  onAdd: (status: ApplicationStatus) => void;
  onOpen: (id: string) => void;
}

export const COLUMN_WIDTH = 272;

/**
 * Tek bir Kanban sutunu.
 *  - useDroppable: sutunun kendisi de birakma hedefidir (bos sutuna kart birakabilmek icin sart).
 *  - SortableContext: sutundaki kartlarin sirasini dnd-kit'e bildirir.
 */
export function BoardColumn({ status, items, onAdd, onOpen }: BoardColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: 'column' } });

  return (
    <Box
      sx={{
        width: COLUMN_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        // B tasarimi: sutunun zemini yok; surukleme sirasinda uzerine gelinince hafifce vurgulanir.
        bgcolor: isOver ? 'app.accentSoft' : 'transparent',
        borderRadius: 4,
        transition: 'background-color 120ms',
        maxHeight: '100%',
      }}
    >
      <Box sx={{ height: 4, borderRadius: 999, bgcolor: `status.${status}`, mx: 0.5 }} />
      <Stack direction="row" sx={{ alignItems: 'center', px: 0.75, pt: 1.5, pb: 1.25, gap: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{t(`status.${status}`)}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
          {items.length}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={t('board.addToColumn')}>
          <IconButton
            size="small"
            onClick={() => onAdd(status)}
            aria-label={t('board.addToColumn')}
            sx={{ bgcolor: 'app.surface2', width: 30, height: 30 }}
          >
            <AddIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <SortableContext id={status} items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <Stack ref={setNodeRef} spacing={1.5} sx={{ px: 0.5, pb: 1.5, minHeight: 80, overflowY: 'auto', flexGrow: 1 }}>
          {items.map((item) => (
            <SortableJobCard key={item.id} item={item} onOpen={onOpen} />
          ))}
          {items.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', py: 3, border: '1.5px dashed', borderColor: 'divider', borderRadius: 4 }}
            >
              {t('board.emptyColumn')}
            </Typography>
          )}
        </Stack>
      </SortableContext>
    </Box>
  );
}
