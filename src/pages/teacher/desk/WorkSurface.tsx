import { MODE_META, type DeskMode, type DeskTask } from './deskTasks';
import { MiniChat } from './MiniChat';

export interface MaterialOption {
  id: string;
  title: string;
}

/**
 * The selected-task work surface that sits below the cube. Compact by design:
 * source label, title, student, a short real preview, then the embedded mini AI
 * chat (which replaced the old white draft textbox) and, for Assign, the drill
 * picker + due date. The right-panel button remains the single commit.
 */
export function WorkSurface({
  task,
  mode,
  editValue,
  onEditChange,
  onSend,
  sending,
  materials,
  materialsLoading,
  materialId,
  onMaterialChange,
  dueValue,
  onDueChange,
  localPreview,
}: {
  task: DeskTask | null;
  mode: DeskMode;
  editValue: string;
  onEditChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  sending: boolean;
  materials: MaterialOption[];
  materialsLoading: boolean;
  materialId: string;
  onMaterialChange: (value: string) => void;
  dueValue: string;
  onDueChange: (value: string) => void;
  localPreview: boolean;
}) {
  if (!task) {
    return (
      <div className="w-full max-w-[560px] border border-black/15 bg-white/12 p-5 text-center">
        <div className="text-sm font-semibold">{MODE_META[mode].label} is clear</div>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/50">
          Choose another mode or open the full workspace.
        </p>
      </div>
    );
  }

  const showChat = task.mode === 'reply' || (task.mode === 'review' && task.editableText !== undefined);

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

      {/* The mini AI chat sits where the white draft textbox used to be. */}
      {showChat ? (
        <MiniChat
          task={task}
          variant="draft"
          draft={editValue}
          onDraftChange={onEditChange}
          onSend={onSend}
          sending={sending}
          localPreview={localPreview}
        />
      ) : null}

      {task.mode === 'assign' ? (
        <>
          <MiniChat task={task} variant="advisory" draft="" onDraftChange={() => {}} localPreview={localPreview} />
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_150px] gap-3">
            <select
              value={materialId}
              onChange={(event) => onMaterialChange(event.target.value)}
              disabled={materialsLoading || materials.length === 0}
              aria-label="Guided drill to assign"
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
        </>
      ) : null}
    </div>
  );
}
