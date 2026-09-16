import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * How much of the screen the on-screen keyboard is actually covering, in dp,
 * or 0 when it is closed.
 *
 * Android has been edge-to-edge since Expo SDK 54, which means the window is no
 * longer resized when the keyboard opens — `adjustResize` and
 * `KeyboardAvoidingView` both stop doing anything useful, and the composer ends
 * up behind the keys. Listening to the keyboard directly and moving the layout
 * ourselves is the one approach that survives that.
 *
 * There is a second trap. Android reports the IME height *excluding* the
 * gesture-bar inset, but draws the keyboard over that strip anyway. Measured on
 * a Pixel-class device: reported 312dp, actually covering 336dp, with a 24dp
 * gesture inset — so the inset has to be added back or every caller lands the
 * bottom of its layout a finger's width underneath the keys. iOS already
 * includes it, hence the platform check.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // iOS gets the "will" events so the move is in step with its animation;
    // Android only reliably emits the "did" pair.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates?.height ?? 0);
    const onHide = () => setHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    // Android also fires this when the keyboard resizes (switching to emoji,
    // a suggestion strip appearing) without a hide/show pair in between.
    const frameSub =
      Platform.OS === 'android'
        ? Keyboard.addListener('keyboardDidChangeFrame', onShow)
        : null;

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
    };
  }, []);

  if (height <= 0) return 0;
  return Platform.OS === 'android' ? height + insets.bottom : height;
}
