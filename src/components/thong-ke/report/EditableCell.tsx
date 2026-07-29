import React, { useRef, useEffect, useCallback } from 'react';

interface EditableCellProps {
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** If true, use a <div> with multiline support. If false, use a <td>-like inline cell */
  multiline?: boolean;
  dataPlaceholder?: string;
}

/**
 * A controlled contentEditable wrapper that prevents React re-renders
 * from overwriting user's in-progress edits.
 * 
 * Uses a ref to track the DOM element and only updates the text
 * when the element is NOT focused (i.e., user is not editing).
 */
export default function EditableCell({
  value,
  placeholder,
  onSave,
  disabled = false,
  className = '',
  multiline = false,
  dataPlaceholder,
}: EditableCellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);

  // Only update DOM text when value changes AND element is not focused
  useEffect(() => {
    if (ref.current && !isFocused.current) {
      const displayValue = value && value !== placeholder ? value : '';
      if (ref.current.textContent !== displayValue) {
        ref.current.textContent = displayValue;
      }
    }
  }, [value, placeholder]);

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    isFocused.current = false;
    const newValue = e.currentTarget.textContent || '';
    onSave(newValue);
  }, [onSave]);

  return (
    <div
      ref={ref}
      contentEditable={!disabled}
      suppressContentEditableWarning
      data-placeholder={dataPlaceholder || placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`editable-placeholder outline-none cursor-text break-words whitespace-normal min-h-[1.5em] w-full ${className}`}
    >
      {/* Initial value set via ref in useEffect, not via React children */}
    </div>
  );
}
