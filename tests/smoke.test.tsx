import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function Hello({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}

describe('test harness smoke', () => {
  it('arithmetic works', () => {
    expect(2 + 2).toBe(4);
  });

  it('renders a React component and asserts on the DOM', () => {
    render(<Hello name="Atomic Engine" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Hello, Atomic Engine');
  });
});
