import { TextInput, TextInputProps } from "react-native";
import React from "react";

type InputFieldProps = TextInputProps & {
  className?: string;
};

export default function InputField({ className, ...props }: InputFieldProps) {
  return (
    <TextInput
      className={`border border-blue-300 rounded-md p-3 ${className || ""}`}
      {...props}
    />
  );
}
