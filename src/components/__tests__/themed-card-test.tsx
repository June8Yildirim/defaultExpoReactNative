import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { ThemedCard } from '@/components/themed-card';
import { Colors } from '@/constants/theme';

it('renders title, subtitle, string body and footer', async () => {
  await render(
    <ThemedCard title="Wedding" subtitle="14 June" footer={<Text>RSVP</Text>}>
      Dinner and dancing
    </ThemedCard>,
  );

  expect(screen.getByText('Wedding')).toBeOnTheScreen();
  expect(screen.getByText('14 June')).toBeOnTheScreen();
  expect(screen.getByText('Dinner and dancing')).toBeOnTheScreen();
  expect(screen.getByText('RSVP')).toBeOnTheScreen();
});

it('is not a button without onPress', async () => {
  await render(<ThemedCard title="Static" />);

  expect(screen.queryByRole('button')).toBeNull();
});

it('is a pressable button with onPress', async () => {
  const onPress = jest.fn();
  await render(<ThemedCard title="Open" onPress={onPress} accessibilityLabel="Open card" />);

  await fireEvent.press(screen.getByRole('button', { name: 'Open card' }));

  expect(onPress).toHaveBeenCalledTimes(1);
});

it('uses theme colors for the outlined variant', async () => {
  await render(<ThemedCard variant="outlined" testID="card" />);

  const style = StyleSheet.flatten(screen.getByTestId('card').props.style);
  expect(style).toMatchObject({
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.border,
    borderWidth: 1,
  });
});
