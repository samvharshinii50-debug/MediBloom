import React, { useEffect, useRef, useState } from 'react';
import { TextInput, type KeyboardTypeOptions, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * A text field that is safe to back with slow storage.
 *
 * The settings fields used to be fully controlled straight off state that was
 * persisted to SQLite — or worse, to the encrypted keystore — on every single
 * keystroke. Each write is asynchronous, so the state update routinely landed
 * *after* the next character had already been typed, and React re-rendered the
 * field with the older string. The result was dropped letters, a jumping
 * cursor and text appearing in the wrong order.
 *
 * This keeps the value local while the user is typing, commits on a short
 * debounce and again on blur, and only accepts a new value from outside when
 * the field is not focused — so a late write can never yank the cursor back.
 */
export function FieldInput({
  value,
  onCommit,
  placeholder,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize = 'none',
  multiline = false,
  accessibilityLabel,
  style,
  debounceMs = 500,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<TextStyle>;
  debounceMs?: number;
}) {
  const { c, radius, f, fonts } = useTheme();
  const [text, setText] = useState(value);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accept outside changes only while the user is not in the field.
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const change = (next: string) => {
    setText(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(next), debounceMs);
  };

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    onCommit(text);
  };

  const base: TextStyle = {
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: f.small,
    color: c.ink,
    backgroundColor: c.surface,
  };

  return (
    <TextInput
      value={text}
      onChangeText={change}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        flush();
      }}
      placeholder={placeholder}
      placeholderTextColor={c.inkGhost}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      multiline={multiline}
      accessibilityLabel={accessibilityLabel}
      style={[base, multiline ? { minHeight: 64, textAlignVertical: 'top' } : null, style]}
    />
  );
}
