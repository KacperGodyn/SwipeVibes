import { TextInput, TextInputProps } from "react-native";
import React from "react";

type InputFieldProps = TextInputProps & {
  className?: string;
};

export default function InputField({ className, ...props }: InputFieldProps) {
  return (
    <TextInput
      className={`items-center justify-center rounded-full border border-[#F05454]/20 bg-[#0F0F0F] shadow-md backdrop-blur-xl outline-none ${className || ""}`}
      {...props}
    />
  );
}