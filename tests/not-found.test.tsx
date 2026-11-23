import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NotFound from '../app/not-found';

describe('Not Found Page', () => {
  it('renders 404 heading', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders back to home link', () => {
    render(<NotFound />);
    expect(screen.getByText('Kembali ke Beranda')).toBeInTheDocument();
  });
});
