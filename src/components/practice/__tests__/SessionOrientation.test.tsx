import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionOrientation } from '../SessionOrientation';

describe('SessionOrientation', () => {
  beforeEach(() => sessionStorage.clear());

  it('shows a truthful cold-start map state', () => {
    render(<SessionOrientation questions={[{ id: 'q1' }]} concepts={[]} plannedCount={5} />);
    expect(screen.getByText('Session 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('UKMLA · building your map')).toBeInTheDocument();
  });

  it('uses actual mastery evidence rather than invented percentages', () => {
    sessionStorage.setItem('sba_answer_q1', JSON.stringify({ hasSubmitted: true }));
    render(<SessionOrientation questions={[{ id: 'q1' }, { id: 'q2' }]} concepts={[
      { mastery_data: { attempts: 2, mastery_level: 2 } },
      { mastery_data: { attempts: 1, mastery_level: 1 } },
      { mastery_data: { attempts: 0, mastery_level: 0 } },
    ]} plannedCount={5} />);
    expect(screen.getByText('Session 2 of 5')).toBeInTheDocument();
    expect(screen.getByText('UKMLA · 2 assessed · 1 secure')).toBeInTheDocument();
  });
});
