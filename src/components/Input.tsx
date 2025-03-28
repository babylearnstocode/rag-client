import React from "react";

interface InputProps {
  type: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

const Input: React.FC<InputProps> = ({
  type,
  placeholder,
  value,
  onChange,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      className="input-field"
    />
  );
};

export default Input;
