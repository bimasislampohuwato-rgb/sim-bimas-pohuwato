import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from '../app/page';

describe('Landing Page', () => {
  it('renders SIM Bimas Islam title', () => {
    render(<Home />);
    expect(screen.getByText('SIM Bimas Islam')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Home />);
    expect(screen.getByText('Kepegawaian')).toBeInTheDocument();
    expect(screen.getByText('Layanan PTSP')).toBeInTheDocument();
    expect(screen.getByText('Master Data')).toBeInTheDocument();
  });
});
