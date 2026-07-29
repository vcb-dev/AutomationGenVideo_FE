import React, { useState, useEffect } from 'react';

interface LinkInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export default function LinkInput({
  value,
  onChange,
  disabled = false,
}: LinkInputProps) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleBlur = () => {
    if (localVal !== value) {
      onChange(localVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      disabled={disabled}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="Dán link video..."
      className="w-full bg-transparent border-0 outline-none text-xs text-blue-400 placeholder-blue-400/50 hover:underline focus:underline font-medium py-1"
    />
  );
}
