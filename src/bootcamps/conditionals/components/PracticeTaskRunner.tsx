import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export type PracticeRound = {
  title: string;
  tasks: Array<{ title: string; content: ReactNode }>;
};

/** Navigation is formative. Moving between tasks never records completion. */
export function PracticeTaskRunner({ rounds }: { rounds: PracticeRound[] }) {
  const [current, setCurrent] = useState(0);
  const [moveFocus, setMoveFocus] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const tasks = rounds.flatMap((round, roundIndex) => round.tasks.map((task, taskIndex) => ({
    ...task, roundIndex, taskIndex,
  })));
  const task = tasks[current];
  useEffect(() => {
    if (!moveFocus) return;
    heading.current?.focus();
    setMoveFocus(false);
  }, [current, moveFocus]);
  function go(index: number) {
    setCurrent(index);
    setMoveFocus(true);
  }
  return <div className="co-task-runner">
    {rounds.length > 1 && <nav className="co-round-links" aria-label="Practice rounds">
      {rounds.map((round, index) => <button type="button" key={round.title}
        aria-pressed={task.roundIndex === index}
        onClick={() => go(tasks.findIndex(item => item.roundIndex === index))}>
        {index + 1}. {round.title}
      </button>)}
    </nav>}
    <div className="co-task-header">
      <p className="co-kicker" role="status">{rounds.length > 1 && <>Round {task.roundIndex + 1} of {rounds.length} · </>}Task {task.taskIndex + 1} of {rounds[task.roundIndex].tasks.length}</p>
      <h2 id={`${id}-heading`} ref={heading} tabIndex={-1}>{task.title}</h2>
      <progress value={current + 1} max={tasks.length} aria-label="Current practice task"/>
    </div>
    {tasks.map((item, index) => <div key={`${item.roundIndex}-${item.taskIndex}`} hidden={current !== index}
      role="region" aria-label={item.title} data-practice-task={index + 1}>
      {item.content}
    </div>)}
    <nav className="co-task-turn" aria-label="Task navigation">
      <button type="button" disabled={current === 0} onClick={() => go(current - 1)}>Previous task</button>
      <button type="button" disabled={current === tasks.length - 1} onClick={() => go(current + 1)}>Next task</button>
    </nav>
  </div>;
}
