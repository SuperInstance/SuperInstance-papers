import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-600');
    expect(button).toHaveClass('px-4 py-2.5');
  });

  it('renders with primary variant', () => {
    render(<Button variant="primary">Primary Button</Button>);

    const button = screen.getByRole('button', { name: /primary button/i });
    expect(button).toHaveClass('bg-primary-600');
    expect(button).toHaveClass('text-white');
  });

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);

    const button = screen.getByRole('button', { name: /secondary button/i });
    expect(button).toHaveClass('bg-secondary-100');
    expect(button).toHaveClass('text-secondary-800');
  });

  it('renders with accent variant', () => {
    render(<Button variant="accent">Accent Button</Button>);

    const button = screen.getByRole('button', { name: /accent button/i });
    expect(button).toHaveClass('bg-accent-600');
    expect(button).toHaveClass('text-white');
  });

  it('renders with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>);

    const button = screen.getByRole('button', { name: /outline button/i });
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('border-gray-300');
  });

  it('renders with small size', () => {
    render(<Button size="sm">Small Button</Button>);

    const button = screen.getByRole('button', { name: /small button/i });
    expect(button).toHaveClass('px-3');
    expect(button).toHaveClass('py-1.5');
    expect(button).toHaveClass('text-sm');
  });

  it('renders with medium size (default)', () => {
    render(<Button size="md">Medium Button</Button>);

    const button = screen.getByRole('button', { name: /medium button/i });
    expect(button).toHaveClass('px-4');
    expect(button).toHaveClass('py-2.5');
    expect(button).toHaveClass('text-base');
  });

  it('renders with large size', () => {
    render(<Button size="lg">Large Button</Button>);

    const button = screen.getByRole('button', { name: /large button/i });
    expect(button).toHaveClass('px-6');
    expect(button).toHaveClass('py-3');
    expect(button).toHaveClass('text-lg');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);

    const button = screen.getByRole('button', { name: /custom button/i });
    expect(button).toHaveClass('custom-class');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable Button</Button>);

    const button = screen.getByRole('button', { name: /clickable button/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('passes through additional props', () => {
    render(
      <Button
        type="submit"
        disabled
        aria-label="Submit form"
        data-testid="submit-button"
      >
        Submit
      </Button>
    );

    const button = screen.getByTestId('submit-button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-label', 'Submit form');
  });

  it('renders with children as React nodes', () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toContainHTML('<span>Icon</span>');
    expect(button).toContainHTML('<span>Text</span>');
  });

  it('has proper focus styles', () => {
    render(<Button>Focusable Button</Button>);

    const button = screen.getByRole('button', { name: /focusable button/i });
    expect(button).toHaveClass('focus:outline-none');
    expect(button).toHaveClass('focus:ring-2');
    expect(button).toHaveClass('focus:ring-offset-2');
  });

  it('has transition styles', () => {
    render(<Button>Transition Button</Button>);

    const button = screen.getByRole('button', { name: /transition button/i });
    expect(button).toHaveClass('transition-all');
    expect(button).toHaveClass('duration-200');
  });
});