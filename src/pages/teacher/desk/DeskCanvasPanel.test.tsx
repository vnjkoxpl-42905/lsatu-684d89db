import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeskCanvasPanel } from './DeskCanvasPanel';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

const baseProps = {
  value: '# Collaborative Workspace\n\nPaste your work here.',
  onChange: vi.fn(),
  onClose: vi.fn(),
  canUseAi: true,
};

function renderCanvas(props: Partial<React.ComponentProps<typeof DeskCanvasPanel>> = {}) {
  const onChange = vi.fn();
  render(<DeskCanvasPanel {...baseProps} onChange={onChange} {...props} />);
  return { onChange };
}

describe('DeskCanvasPanel', () => {
  let createdUrls: string[];
  let appendedAnchors: HTMLAnchorElement[];
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createdUrls = [];
    appendedAnchors = [];
    invokeMock.mockReset();
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: vi.fn(),
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: vi.fn(),
      });
    }
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      const url = `blob:canvas-${createdUrls.length + 1}`;
      createdUrls.push(url);
      return url;
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
      appendedAnchors.push(this);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens a Create dropdown with export and AI document actions', async () => {
    renderCanvas();

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByRole('menuitem', { name: 'Export as PDF' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Export as Markdown' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Copy markdown' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Polish document' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Make outline' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Draft next version' })).toBeInTheDocument();
  });

  it('exports the current canvas as markdown', async () => {
    renderCanvas({ value: '# Canvas\n\nCurrent draft body' });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Export as Markdown' }));

    expect(createdUrls).toEqual(['blob:canvas-1']);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendedAnchors[0].download).toBe('collaborative-workspace.md');
    expect(appendedAnchors[0].href).toBe('blob:canvas-1');
  });

  it('runs a full-document AI action and replaces the canvas text', async () => {
    invokeMock.mockResolvedValue({ data: { polished: '# Outline\n\n- First point' }, error: null });
    const { onChange } = renderCanvas({ value: 'messy notes' });

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Make outline' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('# Outline\n\n- First point'));
    expect(invokeMock).toHaveBeenCalledWith('polish-message', {
      body: {
        text: 'messy notes',
        instruction: expect.stringContaining('structured outline'),
      },
    });
  });

  it('shows an Ask Gemini popover for selected text and replaces only that selection', async () => {
    invokeMock.mockResolvedValue({ data: { polished: 'application plan' }, error: null });
    const { onChange } = renderCanvas({ value: 'Build an application today' });
    const editor = screen.getByLabelText('Collaborative canvas document') as HTMLTextAreaElement;

    editor.focus();
    editor.setSelectionRange(9, 20);
    fireEvent.mouseUp(editor, { clientX: 320, clientY: 240 });

    const popover = screen.getByRole('group', { name: 'Ask Gemini' });
    fireEvent.change(within(popover).getByPlaceholderText('Ask Gemini'), {
      target: { value: 'make this more specific' },
    });
    fireEvent.click(within(popover).getByRole('button', { name: 'Apply Gemini edit' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('Build an application plan today'));
    expect(invokeMock).toHaveBeenCalledWith('polish-message', {
      body: { text: 'application', instruction: 'make this more specific' },
    });
  });
});
