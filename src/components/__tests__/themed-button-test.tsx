import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { ThemedButton } from '@/components/themed-button';
import { Colors } from '@/constants/theme';

// The ripple animation isn't under test; a minimal stand-in avoids loading the native runtime.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const sharedValue = <T,>(initial: T) => {
    let value = initial;
    return { get: () => value, set: (next: T) => (value = next) };
  };
  return {
    __esModule: true,
    default: { View },
    useSharedValue: sharedValue,
    useAnimatedStyle: (factory: () => object) => factory(),
    withTiming: <T,>(value: T) => value,
  };
});

it('renders a string label and calls onPress', async () => {
  const onPress = jest.fn();
  await render(<ThemedButton onPress={onPress}>RSVP</ThemedButton>);

  await fireEvent.press(screen.getByRole('button', { name: 'RSVP' }));

  expect(onPress).toHaveBeenCalledTimes(1);
});

it('does not call onPress when disabled', async () => {
  const onPress = jest.fn();
  await render(
    <ThemedButton onPress={onPress} disabled>
      RSVP
    </ThemedButton>,
  );

  await fireEvent.press(screen.getByRole('button'));

  expect(onPress).not.toHaveBeenCalled();
  expect(screen.getByRole('button')).toBeDisabled();
});

it('shows a spinner and is busy while loading', async () => {
  const onPress = jest.fn();
  await render(
    <ThemedButton onPress={onPress} loading>
      Saving
    </ThemedButton>,
  );

  await fireEvent.press(screen.getByRole('button'));

  expect(onPress).not.toHaveBeenCalled();
  expect(screen.getByRole('button')).toBeBusy();
});

it('colors the background and label from the tone', async () => {
  await render(
    <ThemedButton tone="danger" onPress={() => {}}>
      Delete
    </ThemedButton>,
  );

  const button = StyleSheet.flatten(screen.getByRole('button').props.style);
  const label = StyleSheet.flatten(screen.getByText('Delete').props.style);
  expect(button.backgroundColor).toBe(Colors.light.danger);
  expect(label.color).toBe(Colors.light.buttonText);
});

it('uses a transparent background with tone-colored text for the border variant', async () => {
  await render(
    <ThemedButton type="border" onPress={() => {}}>
      Maybe
    </ThemedButton>,
  );

  const button = StyleSheet.flatten(screen.getByRole('button').props.style);
  expect(button.backgroundColor).toBe('transparent');
  expect(button.borderColor).toBe(Colors.light.accent);
});

it('renders custom children and an icon', async () => {
  await render(
    <ThemedButton onPress={() => {}} icon={<Text>★</Text>}>
      <Text>Custom</Text>
    </ThemedButton>,
  );

  expect(screen.getByText('★')).toBeOnTheScreen();
  expect(screen.getByText('Custom')).toBeOnTheScreen();
});
