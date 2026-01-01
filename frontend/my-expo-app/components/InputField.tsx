import { TextInput, TextInputProps } from 'react-native';
import React, { useState } from 'react';
import { useTheme } from '../services/theme/ThemeContext';

type InputFieldProps = TextInputProps & {
  className?: string;
};

export default function InputField({ className, style, ...props }: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { colors } = useTheme();

  return (
    <TextInput
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      placeholderTextColor={colors.textSecondary}
      style={[
        {
          width: '100%',
          paddingVertical: 18,
          paddingHorizontal: 24,
          fontSize: 16,
          color: colors.text,
          backgroundColor: colors.input,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: isFocused ? colors.inputBorderFocus : colors.inputBorder,
        },
        style,
      ]}
      {...props}
    />
  );
}
