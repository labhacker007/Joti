'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  validation?: (value: any) => string | null;
}

export interface FormProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  loading?: boolean;
  error?: string;
  success?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  className?: string;
}

export function Form({
  fields,
  values,
  onChange,
  onSubmit,
  loading = false,
  error,
  success,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onCancel,
  className,
}: FormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate fields
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.required && !values[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.validation) {
        const error = field.validation(values[field.name]);
        if (error) {
          newErrors[field.name] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      setFieldErrors({});
    } catch {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const fieldError = fieldErrors[field.name];
    const baseInputClass = cn(
      'w-full px-4 py-2 bg-background border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors',
      fieldError && 'border-red-500/50 focus:ring-red-500/30'
    );

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            name={field.name}
            value={values[field.name] || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled || isSubmitting || loading}
            rows={field.rows || 4}
            className={baseInputClass}
          />
        );

      case 'select':
        return (
          <select
            name={field.name}
            value={values[field.name] || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            disabled={field.disabled || isSubmitting || loading}
            className={baseInputClass}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            name={field.name}
            checked={values[field.name] || false}
            onChange={(e) => onChange(field.name, e.target.checked)}
            disabled={field.disabled || isSubmitting || loading}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
          />
        );

      default:
        return (
          <input
            type={field.type}
            name={field.name}
            value={values[field.name] || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled || isSubmitting || loading}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Error</p>
            <p className="text-sm text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-600">Success</p>
            <p className="text-sm text-green-600/80">{success}</p>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-5">
        {fields.map((field) => (
          <div key={field.name}>
            {field.type !== 'checkbox' && (
              <label className="block text-sm font-medium text-foreground mb-2">
                {field.label}
                {field.required && <span className="text-red-600 ml-1">*</span>}
              </label>
            )}

            {renderField(field)}

            {fieldErrors[field.name] && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors[field.name]}</p>
            )}

            {field.type === 'checkbox' && (
              <label className="flex items-center gap-2 ml-1 cursor-pointer">
                {renderField(field)}
                <span className="text-sm font-medium text-foreground">{field.label}</span>
              </label>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSubmitting || loading ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || loading}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}

export default Form;
