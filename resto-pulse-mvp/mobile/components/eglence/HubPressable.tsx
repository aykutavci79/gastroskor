import { Pressable, type PressableProps } from 'react-native';

import { playHubSfx } from '@/lib/gastro-hub-sfx';

type Props = PressableProps & {
  /** false ise tik sesi calinmaz (or. ozel odul sesi). */
  hubClickSfx?: boolean;
};

export function HubPressable({ onPress, hubClickSfx = true, ...rest }: Props) {
  return (
    <Pressable
      {...rest}
      onPress={(event) => {
        if (hubClickSfx) playHubSfx('click');
        onPress?.(event);
      }}
    />
  );
}
