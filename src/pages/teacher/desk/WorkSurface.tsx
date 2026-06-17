import { MODE_META, type DeskMode, type DeskTask } from './deskTasks';

export interface MaterialOption {
  id: string;
  title: string;
}

/**
 * The selected-task work surface that sits below the cube. Compact by design:
 * source label, title, student, a short real preview, then mode-specific light
 * controls (reply/review editor, or the Assign material picker + due date).
 */
export function WorkSurface({
  task,
  mode,
  editValue,
  onEditChange,
  materials,
  materialsLoading,
  materialId,
  onMaterialChange,
  dueValue,
  onDueChange,
}: {
  task: DeskTask | null;
  mode: DeskMode;
  editValue: string;
  onEditChange: (value: string) => void;
  materials: MaterialOption[];
  materialsLoading: boolean;
  materialId: string;
  onMaterialChange: (value: string) => void;
  dueValue: string;
  onDueChange: (value: string) => void;
}) {
  if (!task) {
    return (
      <div className="w-full max-w-[560px] border border-black/15 bg-white/12 p-5 text-center">
        <div className="text-sm font-semibold">{MODE_META[mode].empty}</div>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/50">No current teacher move.</p>
      </div>
    );
  }

  const showEditor = task.mode === 'reply' || (task.mode === 'review' && task.editableText !== undefined);

  return (
    <div className="w-full max-w-[620px] border border-black/18 bg-white/22 p-5 backdrop-blur-[1px]">
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-black/44">
        <span>{task.sourceLabel}</span>
        {task.suggested && (
          <>
            <span className="h-px w-5 bg-black/22" />
            <span>Suggested by assistant</span>
          </>
        )}
      </div>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">{task.title}</h1>
      <div className="mt-0.5 text-sm text-black/52">{task.studentName || task.subject}</div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-black/64">{task.preview}</p>

      {showEditor ? (
        <textarea
          value={editValue}
          onChange={(event) => onEditChange(event.target.value)}
          placeholder={
            task.mode === 'reply'
              ? 'Type a reply to send from here, or open the conversation.'
              : 'Light edit before approval.'
          }
          className="mt-4 min-h-[84px] w-full resize-none border border-black/16 bg-white/45 px-3 py-2 text-sm outline-none placeholder:text-black/35 focus:border-black"
        />
      ) : null}

      {task.mode === 'assign' ? (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_150px] gap-3">
          <select
            value={materialId}
            onChange={(event) => onMaterialChange(event.target.value)}
            disabled={materialsLoading || materials.length === 0}
            className="h-10 border border-black/16 bg-white/45 px-3 text-sm outline-none focus:border-black disabled:opacity-60"
          >
            {materialsLoading ? (
              <option value="">Loading guided drills…</option>
            ) : materials.length === 0 ? (
              <option value="">No guided drills available</option>
            ) : (
              <>
                <option value="">Select a guided drill…</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.title}
                  </option>
                ))}
              </>
            )}
          </select>
          <input
            type="date"
            value={dueValue}
            onChange={(event) => onDueChange(event.target.value)}
            className="h-10 border border-black/16 bg-white/45 px-3 text-sm outline-none focus:border-black"
            aria-label="Due date"
          />
        </div>
      ) : null}
    </div>
  );
}
