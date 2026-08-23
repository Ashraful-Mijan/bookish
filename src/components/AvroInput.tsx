import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { avroToBengali } from '../bengali';
import { useSettings } from '../store/settingsStore';

/**
 * TextInput that applies Avro phonetic conversion to the whole buffer when the
 * global "Avro input" setting is enabled. Non-latin (already Bengali) characters
 * are left untouched, so mixing is supported for simple typing flows.
 */
export function AvroInput(props: TextInputProps) {
  const avroInput = useSettings((s) => s.avroInput);
  const onChangeText = props.onChangeText;

  const handleChange = (text: string) => {
    const out = avroInput ? avroToBengali(text) : text;
    onChangeText?.(out);
  };

  return <TextInput {...props} onChangeText={handleChange} />;
}
