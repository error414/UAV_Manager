import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import DateRangePicker from '../ui/DateRangePicker';

// Opens the popup, which is rendered into a portal on document.body
const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /any date/i }));

describe('DateRangePicker', () => {
  test('does not report a change while browsing months or years', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="" to="" onChange={onChange} />);

    openPanel();

    fireEvent.click(screen.getByLabelText('Previous month'));
    fireEvent.click(screen.getByLabelText('Next month'));
    fireEvent.click(screen.getByLabelText('Next month'));

    const [monthSelect, yearSelect] = screen.getAllByRole('combobox');
    fireEvent.change(monthSelect, { target: { value: '0' } });
    fireEvent.change(yearSelect, { target: { value: '2023' } });

    expect(onChange).not.toHaveBeenCalled();
    // Panel is still open after navigating
    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  test('emits both bounds once a full range is picked', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="" to="" onChange={onChange} />);

    openPanel();

    const [monthSelect, yearSelect] = screen.getAllByRole('combobox');
    fireEvent.change(yearSelect, { target: { value: '2025' } });
    fireEvent.change(monthSelect, { target: { value: '5' } }); // June 2025

    fireEvent.click(screen.getByLabelText('2025-06-03'));
    expect(onChange).not.toHaveBeenCalled(); // start only, nothing committed yet

    fireEvent.click(screen.getByLabelText('2025-06-17'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ from: '2025-06-03', to: '2025-06-17' });
  });

  test('presets commit a range immediately', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="" to="" onChange={onChange} />);

    openPanel();
    fireEvent.click(screen.getByText('This year'));

    const year = new Date().getFullYear();
    expect(onChange).toHaveBeenCalledWith({ from: `${year}-01-01`, to: `${year}-12-31` });
  });

  test('cancelling discards the draft selection', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="" to="" onChange={onChange} />);

    openPanel();
    const [monthSelect, yearSelect] = screen.getAllByRole('combobox');
    fireEvent.change(yearSelect, { target: { value: '2025' } });
    fireEvent.change(monthSelect, { target: { value: '5' } });

    fireEvent.click(screen.getByLabelText('2025-06-10'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Apply')).not.toBeInTheDocument();
  });

  test('clears an existing range from the trigger', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="2025-01-01" to="2025-03-01" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Clear date range'));

    expect(onChange).toHaveBeenCalledWith({ from: '', to: '' });
  });
});
