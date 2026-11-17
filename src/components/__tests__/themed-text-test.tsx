import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

const flat = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

it('renders its children', async () => {
  await render(<ThemedText>You are invited</ThemedText>);

  expect(screen.getByText('You are invited')).toBeOnTheScreen();
});

it('applies variant styles', async () => {
  await render(<ThemedText type="h1">Heading</ThemedText>);

  expect(flat('Heading')).toMatchObject({ fontSize: 32, fontWeight: 700 });
});

it('marks heading variants as headers for accessibility', async () => {
  await render(<ThemedText type="h2">Section</ThemedText>);

  expect(screen.getByRole('header', { name: 'Section' })).toBeOnTheScreen();
});

it('maps tone to a theme color', async () => {
  await render(<ThemedText tone="danger">Required</ThemedText>);

  expect(flat('Required').color).toBe(Colors.light.danger);
});

it('gives caption a secondary color by default, and themeColor wins over tone', async () => {
  await render(
    <>
      <ThemedText type="caption">Muted</ThemedText>
      <ThemedText tone="danger" themeColor="accent">
        Override
      </ThemedText>
    </>,
  );

  expect(flat('Muted').color).toBe(Colors.light.textSecondary);
  expect(flat('Override').color).toBe(Colors.light.accent);
});

it('applies weight, align and italic overrides', async () => {
  await render(
    <ThemedText type="body" weight="bold" align="center" italic>
      Styled
    </ThemedText>,
  );

  expect(flat('Styled')).toMatchObject({
    fontWeight: 700,
    textAlign: 'center',
    fontStyle: 'italic',
  });
});

it('styles card and error variants from the theme', async () => {
  await render(
    <>
      <ThemedText type="cardTitle">Title</ThemedText>
      <ThemedText type="cardBody">Body</ThemedText>
      <ThemedText type="error">Invalid</ThemedText>
    </>,
  );

  expect(flat('Title')).toMatchObject({ fontSize: 18, fontWeight: 700 });
  expect(flat('Body').color).toBe(Colors.light.textSecondary);
  expect(flat('Invalid').color).toBe(Colors.light.danger);
});
