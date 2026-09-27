import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PilotFeedbackBanner, PilotFeedbackProvider, SessionFeedbackPrompt } from '@/components/feedback/PilotFeedback';
import { submitPilotFeedback } from '@/lib/pilotFeedback';

vi.mock('@/lib/pilotFeedback', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/pilotFeedback')>(), submitPilotFeedback: vi.fn(),
}));
const voice = vi.hoisted(() => ({ callback: (_text: string) => {}, cancel: vi.fn(), start: vi.fn(), stop: vi.fn() }));
vi.mock('@/hooks/useFeedbackDictation', () => ({
  useFeedbackDictation: (callback: (text: string) => void) => { voice.callback = callback; return { ...voice, supported: true, status: 'idle', error: '', preview: '' }; },
}));
vi.mock('@/instrumentation/events', () => ({ track: vi.fn() }));

const renderFeedback = () => render(<PilotFeedbackProvider>
  <PilotFeedbackBanner context={{ source: 'practice', questionId: 'case-one', answeredCount: 1, caseCount: 3 }} />
  <SessionFeedbackPrompt answeredCount={3} caseCount={3} />
</PilotFeedbackProvider>);

describe('pilot feedback', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(submitPilotFeedback).mockResolvedValue(); });

  it('lets a guest submit session feedback in two taps without typing', async () => {
    renderFeedback();
    fireEvent.click(screen.getByRole('button', { name: 'Mixed', exact: true }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Mixed', exact: true })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send feedback' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Feedback sent');
    expect(submitPilotFeedback).toHaveBeenCalledWith(expect.objectContaining({ reaction: 'mixed', message: '', context: { source: 'session_complete', answeredCount: 3, caseCount: 3 } }));
  });

  it('keeps failed submissions and reuses their id on retry', async () => {
    vi.mocked(submitPilotFeedback).mockRejectedValueOnce(new Error('offline'));
    renderFeedback();
    fireEvent.click(screen.getByRole('button', { name: /early access: give feedback/i }));
    fireEvent.change(screen.getByLabelText(/what should we know/i), { target: { value: 'I could not find my next case.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your draft is still here');
    expect(screen.getByRole('textbox')).toHaveValue('I could not find my next case.');
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await screen.findByText('Feedback sent');
    expect(vi.mocked(submitPilotFeedback).mock.calls[0][0].id).toBe(vi.mocked(submitPilotFeedback).mock.calls[1][0].id);
  });

  it('keeps a dismissed draft, stops voice, and permits review and editing of dictated text', async () => {
    renderFeedback();
    const open = () => fireEvent.click(screen.getByRole('button', { name: /early access: give feedback/i }));
    open();
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeDisabled();
    act(() => voice.callback('The tutor is helpful.'));
    expect(submitPilotFeedback).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'The tutor is helpful, but the text is small.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close feedback' }));
    expect(voice.cancel).toHaveBeenCalled();
    open();
    expect(screen.getByRole('textbox')).toHaveValue('The tutor is helpful, but the text is small.');
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(submitPilotFeedback).toHaveBeenCalledWith(expect.objectContaining({ message: 'The tutor is helpful, but the text is small.', usedVoice: true })));
  });

  it('prevents repeated submits while a request is in flight', async () => {
    let finish!: () => void;
    vi.mocked(submitPilotFeedback).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    renderFeedback();
    fireEvent.click(screen.getByRole('button', { name: 'Useful', exact: true }));
    const send = screen.getByRole('button', { name: 'Send feedback' });
    fireEvent.click(send); fireEvent.click(send);
    expect(submitPilotFeedback).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });
});
