import { KeyboardAvoidingView as RNKeyboardAvoidingView, Platform } from 'react-native';
import { KeyboardAvoidingView as ControllerKeyboardAvoidingView } from 'react-native-keyboard-controller';

export const KeyboardAvoidingView =
  Platform.OS === 'android' ? RNKeyboardAvoidingView : ControllerKeyboardAvoidingView;
