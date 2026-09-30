import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NoctisField } from './noctis-field';

describe('NoctisField', () => {
  it('renders with label and connects htmlFor to input id', () => {
    render(<NoctisField label="Lead Name" id="lead-name" />);
    const label = screen.getByText('Lead Name');
    const input = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for', 'lead-name');
    expect(input).toHaveAttribute('id', 'lead-name');
  });

  it('renders required indicator', () => {
    render(<NoctisField label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('required');
  });

  it('renders helper text and wires aria-describedby', () => {
    render(<NoctisField id="prospect-email" helperText="We will never share your email" />);
    const helper = screen.getByText('We will never share your email');
    const input = screen.getByRole('textbox');
    expect(helper).toHaveAttribute('id', 'prospect-email-message');
    expect(input).toHaveAttribute('aria-describedby', 'prospect-email-message');
  });

  it('renders error message and marks aria-invalid', () => {
    render(<NoctisField id="err-test" errorMessage="Invalid deal value" />);
    const input = screen.getByRole('textbox');
    expect(screen.getByText('Invalid deal value')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('prioritizes error message over helper and success text', () => {
    render(
      <NoctisField
        errorMessage="Critical error"
        successMessage="Good"
        helperText="Helpful hint"
      />,
    );
    expect(screen.getByText('Critical error')).toBeInTheDocument();
    expect(screen.queryByText('Good')).not.toBeInTheDocument();
    expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument();
  });

  it('prioritizes success message over helper text', () => {
    render(<NoctisField successMessage="Saved successfully" helperText="Helpful hint" />);
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument();
  });

  it('handles uncontrolled input typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NoctisField onChange={onChange} placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here');
    await user.type(input, 'Apex');
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(input).toHaveValue('Apex');
  });

  it('handles controlled input changes', () => {
    const { rerender } = render(<NoctisField value="Initial" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Initial');
    rerender(<NoctisField value="Updated" onChange={() => {}} />);
    expect(input).toHaveValue('Updated');
  });

  it('treats null/undefined value as empty string rather than stringifying', () => {
    render(<NoctisField value={null as unknown as string} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
  });

  it('renders character counter when requested', () => {
    render(<NoctisField id="count-test" defaultValue="Testing" showCharacterCount maxLength={20} />);
    const counter = screen.getByText('7 / 20');
    expect(counter).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'count-test-count');
  });

  it('shows clear button when clearable and text exists', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<NoctisField defaultValue="Some text" clearable onClear={onClear} />);
    const clearBtn = screen.getByRole('button', { name: /clear field/i });
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });

  it('hides clear button when input is empty', () => {
    render(<NoctisField defaultValue="" clearable />);
    expect(screen.queryByRole('button', { name: /clear field/i })).not.toBeInTheDocument();
  });

  it('toggles password reveal on click', async () => {
    const user = userEvent.setup();
    render(<NoctisField type="password" defaultValue="secret123" />);
    const input = screen.getByDisplayValue('secret123');
    expect(input).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button', { name: /show password/i });
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');

    const hideToggle = screen.getByRole('button', { name: /hide password/i });
    await user.click(hideToggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders leading element slot', () => {
    render(<NoctisField leadingElement={<span data-testid="lead-icon">$</span>} />);
    expect(screen.getByTestId('lead-icon')).toBeInTheDocument();
  });

  it('renders trailing element slot', () => {
    render(<NoctisField trailingElement={<span data-testid="trail-icon">USD</span>} />);
    expect(screen.getByTestId('trail-icon')).toBeInTheDocument();
  });

  it('applies disabled state properly', () => {
    render(<NoctisField disabled defaultValue="Disabled value" clearable />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(screen.queryByRole('button', { name: /clear field/i })).not.toBeInTheDocument();
  });

  it('applies readOnly state properly', () => {
    render(<NoctisField readOnly defaultValue="Read only text" clearable />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: /clear field/i })).not.toBeInTheDocument();
  });

  it('forwards ref to inner input element', () => {
    let inputEl: HTMLInputElement | null = null;
    render(<NoctisField ref={(el) => { inputEl = el; }} placeholder="Ref test" />);
    expect(inputEl).toBeInstanceOf(HTMLInputElement);
  });

  it('combines message and character count in aria-describedby', () => {
    render(
      <NoctisField
        id="combo-test"
        helperText="Enter valid lead"
        showCharacterCount
        defaultValue="Acme"
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'combo-test-message combo-test-count');
  });

  it('calls onBlur handler when focus leaves input', () => {
    const onBlur = vi.fn();
    render(<NoctisField onBlur={onBlur} />);
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalled();
  });
});
