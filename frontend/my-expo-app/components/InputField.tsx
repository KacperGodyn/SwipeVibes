import { TextInput, TextInputProps } from "react-native";
import React from "react";

type InputFieldProps = TextInputProps & {
  className?: string;
};

export default function InputField({ className, ...props }: InputFieldProps) {
  return (
    <TextInput
      className={`items-center justify-center rounded-full border border-white/20 bg-white/30 shadow-md backdrop-blur-xl active:bg-white/40 ${className || ""}`}
      {...props}
    />
  );
}