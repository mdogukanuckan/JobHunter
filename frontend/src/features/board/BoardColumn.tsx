import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ApplicationStatus, JobApplicationSummary } from '../../api/types';
import { STATUS_COLORS } from './boardUtils';
import { SortableJobCard } from './JobCard';

interface BoardColumnProps {
  status: ApplicationStatus;
  items: JobApplicationSummary[];
  onAdd: (status: ApplicationStatus) => void;
  onOpen: (id: string) => void;
}

export const COLUMN_WIDTH = 288;

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
        bgcolor: isOver ? 'action.hover' : '#eef1f6',
        borderRadius: 3,
        transition: 'background-color 120ms',
        maxHeight: '100%',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', px: 1.5, pt: 1.25, pb: 1, gap: 1 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[status], flexShrink: 0 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t(`status.${status}`)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {items.length}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={t('board.addToColumn')}>
          <IconButton size="small" onClick={() => onAdd(status)} aria-label={t('board.addToColumn')}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <SortableContext id={status} items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <Stack ref={setNodeRef} spacing={1} sx={{ px: 1, pb: 1.5, minHeight: 80, overflowY: 'auto', flexGrow: 1 }}>
          {items.map((item) => (
            <SortableJobCard key={item.id} item={item} onOpen={onOpen} />
          ))}
          {items.length === 0 && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ textAlign: 'center', py: 3, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}
            >
              {t('board.emptyColumn')}
            </Typography>
          )}
        </Stack>
      </SortableContext>
    </Box>
  );
}
