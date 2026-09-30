import { forwardRef, useCallback, useId, useRef, useState } from 'react';
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import { CircleAlert, CircleCheck, Eye, EyeOff, X } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Noctis Adaptive Field
 * ---------------------
 * An input that adapts to what it is asked to do, rather than a blank box:
 * it carries its own label, validation message, character counter, clear button,
 * and password toggle, keeping accessibility wiring (`aria-describedby`) unified.
 */

export type NoctisFieldType =
  'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';

export type NoctisFieldSize = 'sm' | 'md' | 'lg';

export interface NoctisFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'size' | 'type' | 'value' | 'defaultValue'
> {
  type?: NoctisFieldType;
  size?: NoctisFieldSize;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string, event?: ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  successMessage?: string;
  leadingElement?: ReactNode;
  trailingElement?: ReactNode;
  clearable?: boolean;
  showCharacterCount?: boolean;
  fullWidth?: boolean;
  className?: string;
  inputClassName?: string;
}

const SIZES: Record<NoctisFieldSize, string> = {
  sm: 'h-8 rounded-sm',
  md: 'h-9',
  lg: 'h-11 rounded-lg',
};

const WRAP =
  'flex w-full items-center border border-line bg-surface transition-colors ' +
  'motion-safe:transition-[border-color,box-shadow,background-color] ' +
  'has-[input:focus-visible]:border-primary has-[input:focus-visible]:shadow-focus';

const CONTROL_BUTTON =
  'text-foreground-subtle hover:text-foreground hover:bg-surface-subtle ' +
  'focus-visible:outline-primary focus-visible:outline-2 flex size-7 shrink-0 ' +
  'items-center justify-center rounded-sm border-0 bg-transparent p-0 ' +
  'motion-safe:transition-colors cursor-pointer';

export const NoctisField = forwardRef<HTMLInputElement, NoctisFieldProps>(
  function NoctisField(
    {
      id: idProp,
      label,
      name,
      type = 'text',
      placeholder,
      value,
      defaultValue,
      onChange,
      onBlur,
      disabled = false,
      readOnly = false,
      required = false,
      autoComplete,
      helperText,
      errorMessage,
      successMessage,
      leadingElement,
      trailingElement,
      clearable = false,
      onClear,
      showCharacterCount = false,
      maxLength,
      size = 'md',
      fullWidth = false,
      className,
      inputClassName,
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = idProp ?? `noctis-field-${generatedId}`;

    const inputRef = useRef<HTMLInputElement | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(() => {
      const initial = value !== undefined ? value : defaultValue;
      return initial === undefined || initial === null ? '' : String(initial);
    });

    const displayValue = isControlled
      ? value === undefined || value === null
        ? ''
        : String(value)
      : internalValue;

    const hasError = Boolean(errorMessage);
    const hasSuccess = Boolean(successMessage);
    const message = hasError
      ? errorMessage
      : hasSuccess
        ? successMessage
        : helperText;

    const messageId = message ? `${inputId}-message` : undefined;
    const counterId = showCharacterCount ? `${inputId}-count` : undefined;
    const describedBy =
      [messageId, counterId].filter(Boolean).join(' ') || undefined;

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      if (!isControlled) setInternalValue(nextValue);
      onChange?.(nextValue, event);
    };

    const handleClear = () => {
      if (!isControlled) setInternalValue('');
      onChange?.('');
      onClear?.();
      inputRef.current?.focus();
    };

    const isClearVisible =
      clearable && displayValue.length > 0 && !disabled && !readOnly;
    const counterText =
      maxLength !== undefined
        ? `${displayValue.length} / ${maxLength}`
        : String(displayValue.length);

    return (
      <div
        className={cn(
          'text-foreground inline-flex flex-col gap-1.5 text-left',
          fullWidth && 'w-full',
          className,
        )}
      >
        {label || showCharacterCount ? (
          <div className="flex w-full items-baseline justify-between gap-2">
            {label ? (
              <label
                htmlFor={inputId}
                className="text-foreground text-xs font-medium"
              >
                {label}
                {required ? (
                  <span
                    className="text-danger ml-0.5 font-semibold"
                    aria-hidden
                  >
                    *
                  </span>
                ) : null}
              </label>
            ) : null}
            {showCharacterCount ? (
              <span
                id={counterId}
                className="text-foreground-subtle text-xs tabular-nums"
                aria-live="off"
              >
                {counterText}
              </span>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            WRAP,
            SIZES[size],
            disabled && 'bg-surface-disabled cursor-not-allowed',
            readOnly && 'bg-surface-subtle',
            hasError && 'border-danger has-[input:focus-visible]:border-danger',
            hasSuccess && 'border-success',
            !disabled &&
              !readOnly &&
              !hasError &&
              !hasSuccess &&
              'hover:border-line-strong',
          )}
        >
          {leadingElement ? (
            <span className="text-foreground-subtle flex shrink-0 items-center pl-3">
              {leadingElement}
            </span>
          ) : null}

          <input
            ref={setRefs}
            id={inputId}
            name={name}
            type={showPassword ? 'text' : type}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleChange}
            onBlur={onBlur}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            aria-required={required}
            aria-label={ariaLabel}
            autoComplete={autoComplete}
            maxLength={maxLength}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'text-foreground placeholder:text-foreground-subtle h-full min-w-0 flex-1',
              'appearance-none border-0 bg-transparent px-3 text-sm outline-none',
              'disabled:text-foreground-disabled disabled:cursor-not-allowed',
              '[&::-ms-clear]:hidden [&::-ms-reveal]:hidden',
              '[&::-webkit-search-cancel-button]:appearance-none',
              '[&::-webkit-search-decoration]:appearance-none',
              '[&::-webkit-search-results-button]:appearance-none',
              '[&::-webkit-search-results-decoration]:appearance-none',
              inputClassName,
            )}
            {...rest}
          />

          {isClearVisible ? (
            <button
              type="button"
              className={cn(CONTROL_BUTTON, 'mr-1')}
              onClick={handleClear}
              aria-label="Clear field"
            >
              <X size={14} aria-hidden />
            </button>
          ) : null}

          {type === 'password' && !disabled ? (
            <button
              type="button"
              className={cn(CONTROL_BUTTON, 'mr-1')}
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden />
              ) : (
                <Eye size={16} aria-hidden />
              )}
            </button>
          ) : null}

          {trailingElement ? (
            <span className="text-foreground-subtle flex shrink-0 items-center pr-3">
              {trailingElement}
            </span>
          ) : null}
        </div>

        {message ? (
          <div className="flex items-start gap-1 text-xs" aria-live="polite">
            <span
              id={messageId}
              className={cn(
                'flex items-start gap-1',
                hasError && 'text-danger font-medium',
                hasSuccess && 'text-success',
                !hasError && !hasSuccess && 'text-foreground-muted',
              )}
            >
              {hasError ? (
                <CircleAlert size={14} className="mt-px shrink-0" aria-hidden />
              ) : hasSuccess ? (
                <CircleCheck size={14} className="mt-px shrink-0" aria-hidden />
              ) : null}
              {message}
            </span>
          </div>
        ) : null}
      </div>
    );
  },
);
