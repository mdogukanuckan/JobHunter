import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import { Alert, Box, Button, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { jobApplicationKeys } from '../../api/jobApplications';
import { APPLICATION_STATUSES, type ApplicationStatus, type JobApplicationSummary } from '../../api/types';
import { getErrorMessage } from '../../utils/errors';
import { BoardColumn } from './BoardColumn';
import { findColumn, flattenColumns, groupByStatus, type BoardColumns } from './boardUtils';
import { JobApplicationDetailDrawer } from './JobApplicationDetailDrawer';
import { JobApplicationFormDialog, type FormDialogState } from './JobApplicationFormDialog';
import { JobCardView } from './JobCard';
import { useBoardQuery, useMoveJobApplication } from './useBoard';

/*
 * Kanban panosu.
 *
 * Surukle-birak akisi (dnd-kit "coklu konteyner" deseni):
 *  1. onDragStart : sunucu verisinin bir kopyasi (dragColumns) olusturulur; surukleme boyunca ekran bu kopyadan cizilir.
 *  2. onDragOver  : kart baska bir sutunun uzerine geldiginde kopyada o sutuna tasinir (diger kartlar yer acar).
 *  3. onDragEnd   : ayni sutun icindeki son sira hesaplanir, cache aninda guncellenir (optimistic update)
 *                   ve PATCH /move istegi gonderilir. Hata olursa eski liste geri yuklenir.
 */
export function BoardPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const boardQuery = useBoardQuery();
  const moveMutation = useMoveJobApplication();

  const [dragColumns, setDragColumns] = useState<BoardColumns | null>(null);
  const [activeItem, setActiveItem] = useState<JobApplicationSummary | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormDialogState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const lastDragEndAt = useRef(0);
  const [searchParams, setSearchParams] = useSearchParams();

  // Baska sayfalardan (orn. Mulakatlar) "/?open=<id>" ile gelinince o kartin detayini ac, sonra parametreyi temizle.
  const openParam = searchParams.get('open');
  useEffect(() => {
    if (openParam) {
      setOpenId(openParam);
      setSearchParams({}, { replace: true });
    }
  }, [openParam, setSearchParams]);

  const serverColumns = useMemo(() => groupByStatus(boardQuery.data ?? []), [boardQuery.data]);
  const columns = dragColumns ?? serverColumns;

  const sensors = useSensors(
    // Fare: 5px hareket etmeden surukleme baslamaz -> kisa tiklama karti acar.
    // (PointerSensor yerine Mouse+Touch ayri: PointerSensor dokunmatikte sayfa kaydirmayi engelliyordu.)
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Dokunmatikte 200ms basili tutunca surukleme baslar; hizli kaydirma sayfayi kaydirir.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    // Klavye: Space ile tut, oklarla tasi, Space ile birak, Esc ile iptal. Enter karti acmak icin serbest.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDragColumns(serverColumns);
    setActiveItem(boardQuery.data?.find((i) => i.id === active.id) ?? null);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    setDragColumns((prev) => {
      if (!prev) return prev;
      const from = findColumn(prev, activeId);
      const to = findColumn(prev, overId);
      // Ayni sutun icindeki siralamayi SortableContext kendisi animasyonla gosterir; burada sadece sutun degisimi.
      if (!from || !to || from === to) return prev;

      const fromItems = prev[from];
      const toItems = prev[to];
      const moving = fromItems.find((i) => i.id === activeId);
      if (!moving) return prev;

      let insertAt = toItems.length; // sutunun bos alanina birakildiysa en alta
      const overIndex = toItems.findIndex((i) => i.id === overId);
      if (overIndex >= 0) {
        // Kartin ust yarisindaysak onune, alt yarisindaysak arkasina ekle.
        const translated = active.rect.current.translated;
        const isBelow = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
        insertAt = overIndex + (isBelow ? 1 : 0);
      }

      return {
        ...prev,
        [from]: fromItems.filter((i) => i.id !== activeId),
        [to]: [...toItems.slice(0, insertAt), { ...moving, status: to }, ...toItems.slice(insertAt)],
      };
    });
  };

  const resetDrag = () => {
    setDragColumns(null);
    setActiveItem(null);
    lastDragEndAt.current = Date.now();
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const current = dragColumns;
    const original = boardQuery.data?.find((i) => i.id === active.id);
    resetDrag();
    if (!over || !current || !original) return;

    const activeId = String(active.id);
    const column = findColumn(current, activeId);
    if (!column) return;

    // Ayni sutun icinde yer degistirme: son siralamayi burada uygula.
    let finalColumns = current;
    const overColumn = findColumn(current, String(over.id));
    if (overColumn === column) {
      const items = current[column];
      const oldIndex = items.findIndex((i) => i.id === activeId);
      const newIndex = over.id === column ? items.length - 1 : items.findIndex((i) => i.id === over.id);
      if (newIndex >= 0 && oldIndex !== newIndex) {
        finalColumns = { ...current, [column]: arrayMove(items, oldIndex, newIndex) };
      }
    }

    const position = finalColumns[column].findIndex((i) => i.id === activeId);
    if (column === original.status && position === original.position) return; // hicbir sey degismedi

    const previous = boardQuery.data;
    // Optimistic update: sunucu cevabini beklemeden kart yeni yerinde gorunsun.
    void queryClient.cancelQueries({ queryKey: jobApplicationKeys.board() });
    queryClient.setQueryData(jobApplicationKeys.board(), flattenColumns(finalColumns));

    moveMutation.mutate(
      { id: activeId, body: { status: column, position }, previous },
      { onError: (error) => setToast(getErrorMessage(error, t)) },
    );
  };

  const openCard = (id: string) => {
    // Surukleme biterken tarayici bazen bir "click" de uretir; hemen ardindan gelen tiklamayi yok say.
    if (Date.now() - lastDragEndAt.current < 250) return;
    setOpenId(id);
  };

  const openCreate = (status: ApplicationStatus = 'Wishlist') => setFormState({ mode: 'create', status });

  if (boardQuery.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (boardQuery.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void boardQuery.refetch()}>
            {t('common.retry')}
          </Button>
        }
      >
        {getErrorMessage(boardQuery.error, t)}
      </Alert>
    );
  }

  const total = boardQuery.data.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: { md: 'calc(100vh - 112px)' } }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('nav.board')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('board.totalCount', { count: total })}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate()}>
          {t('board.newApplication')}
        </Button>
      </Stack>

      {total === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('board.emptyBoard')}
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={resetDrag}
      >
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, flexGrow: 1, minHeight: 0, alignItems: 'stretch' }}>
          {APPLICATION_STATUSES.map((status) => (
            <BoardColumn key={status} status={status} items={columns[status]} onAdd={openCreate} onOpen={openCard} />
          ))}
        </Box>

        {/* Imlecle birlikte hareket eden kopya. Liste kaydirilsa/yeniden cizilse de akici kalir. */}
        <DragOverlay>{activeItem ? <JobCardView item={activeItem} overlay /> : null}</DragOverlay>
      </DndContext>

      <JobApplicationDetailDrawer
        id={openId}
        onClose={() => setOpenId(null)}
        onEdit={(detail) => setFormState({ mode: 'edit', detail })}
        onDeleted={() => {
          setOpenId(null);
          setToast(t('board.deleted'));
        }}
      />

      <JobApplicationFormDialog
        state={formState}
        onClose={() => setFormState(null)}
        onSaved={(message) => {
          setFormState(null);
          setToast(message);
        }}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
