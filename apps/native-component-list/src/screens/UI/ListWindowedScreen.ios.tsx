import {
  Button,
  Host,
  List,
  RNHostView,
  SwipeActions,
  Text as SwiftUIText,
  VStack,
} from '@expo/ui/swift-ui';
import { buttonStyle, refreshable } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from 'ThemeProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ListGalleryExample from './list-gallery-example';

type Example = 'Data changes' | 'Pagination' | 'Gallery';

type Item = { id: string; expanded: boolean };
const data: Item[] = Array.from({ length: 200 }, (_, index) => ({
  id: String(index),
  expanded: false,
}));
const keyExtractor = (item: Item) => item.id;

function TestAction({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexBasis: '47%',
        flexGrow: 1,
        minHeight: 44,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: theme.background.element,
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
      })}>
      <Text
        style={{ color: theme.icon.info, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
        {title}
      </Text>
    </Pressable>
  );
}

function ExampleTabs({
  example,
  onChange,
}: {
  example: Example;
  onChange: (example: Example) => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        margin: 16,
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: theme.background.element,
      }}>
      {(['Data changes', 'Pagination', 'Gallery'] as const).map((label) => {
        const selected = example === label;
        return (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) onChange(label);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              padding: 10,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9,
              backgroundColor: selected ? theme.background.default : 'transparent',
            }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: selected ? theme.text.default : theme.text.secondary,
              }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ id, expanded, onToggle }: Item & { onToggle: (id: string) => void }) {
  const { theme } = useTheme();
  const [taps, setTaps] = useState(0);
  return (
    <VStack alignment="leading" spacing={8}>
      <Button
        label={`Row ${id} · taps ${taps}`}
        onPress={() => setTaps((value) => value + 1)}
        // Keep this button's action separate from the embedded RN Pressable.
        modifiers={[buttonStyle('borderless')]}
      />
      <SwiftUIText>{'Variable height content. '.repeat(((Number(id) % 5) + 1) * 3)}</SwiftUIText>
      <RNHostView matchContents>
        {/* matchContents sizes both axes from RN; bound the width so text can wrap. */}
        <View
          style={{
            maxWidth: 280,
            padding: 12,
            gap: 8,
            backgroundColor: theme.background.element,
            borderRadius: 8,
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            testID={`expand-row-${id}`}
            onPress={() => onToggle(id)}
            style={{ paddingVertical: 8, minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: theme.icon.info, fontSize: 15, fontWeight: '500' }}>
              {`${expanded ? 'Collapse' : 'Expand'} RN content ${id}`}
            </Text>
          </Pressable>
          {expanded && (
            <Text testID={`details-row-${id}`} style={{ color: theme.text.default, fontSize: 16 }}>
              {`Details for row ${id}. ` +
                'This React Native text determines its own height. '.repeat(8)}
            </Text>
          )}
        </View>
      </RNHostView>
    </VStack>
  );
}

export default function ListWindowedScreen() {
  const { theme } = useTheme();
  const [example, setExample] = useState<Example>('Data changes');
  return (
    <View style={{ flex: 1, backgroundColor: theme.background.default }}>
      <ExampleTabs example={example} onChange={setExample} />
      {example === 'Gallery' ? (
        <ListGalleryExample />
      ) : example === 'Pagination' ? (
        <PaginationExample />
      ) : (
        <HardeningExample />
      )}
    </View>
  );
}

ListWindowedScreen.navigationOptions = {
  title: 'List — windowed rendering',
};

function PaginationExample() {
  const { theme } = useTheme();
  const [items, setItems] = useState(() => data.slice(0, 5));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshes, setRefreshes] = useState(0);
  const [requests, setRequests] = useState(0);
  const pending = useRef<{ kind: 'page' | 'refresh' } | null>(null);
  const hasMore = items.length < 15;
  useEffect(
    () => () => {
      // Invalidate requests when switching examples or leaving the screen.
      pending.current = null;
    },
    []
  );
  const loadMore = useCallback(async () => {
    if (pending.current || !hasMore) return;
    const request = { kind: 'page' } as const;
    pending.current = request;
    setLoading(true);
    setRequests((value) => value + 1);
    // Simulated page fetch; real apps should also surface errors and a retry action.
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    if (pending.current !== request) return;
    setItems((current) => [...current, ...data.slice(current.length, current.length + 5)]);
    pending.current = null;
    setLoading(false);
  }, [hasMore]);
  const refresh = useCallback(async () => {
    if (pending.current?.kind === 'refresh') return;
    const request = { kind: 'refresh' } as const;
    // Supersede any page fetch. Its eventual result must not append to this feed.
    pending.current = request;
    setRefreshing(true);
    setLoading(false);
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    if (pending.current !== request) return;
    setItems(data.slice(0, 5));
    setRequests(0);
    setRefreshes((value) => value + 1);
    pending.current = null;
    setRefreshing(false);
  }, []);
  const toggle = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, expanded: !item.expanded } : item))
    );
  }, []);
  const renderItem = useCallback(
    ({ item }: { item: Item }) => <Row {...item} onToggle={toggle} />,
    [toggle]
  );
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background.default }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 12, gap: 6 }}>
        <Text
          selectable
          testID="pagination-status"
          style={{
            color: theme.text.default,
            fontSize: 15,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
          }}>
          {`${items.length} rows · ${requests} ${requests === 1 ? 'request' : 'requests'} · ${refreshing ? 'Refreshing…' : loading ? 'Loading…' : hasMore ? 'Ready to load' : 'All loaded'}`}
        </Text>
        <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 18 }}>
          Pull down to refresh (1s). Scroll to append pages of 5 (600ms), starting 2 items before
          the end. Refresh replaces the first page and discards older requests.
        </Text>
        <Text testID="refresh-status" style={{ color: theme.text.secondary, fontSize: 13 }}>
          {`Completed refreshes: ${refreshes}`}
        </Text>
      </View>
      <Host style={{ flex: 1 }}>
        <List
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedRowHeight={100}
          initialNumToRender={0}
          overscanCount={5}
          modifiers={[refreshable(refresh)]}
          onEndReached={!refreshing && hasMore ? loadMore : undefined}
          onEndReachedItemThreshold={2}
        />
      </Host>
    </SafeAreaView>
  );
}

function HardeningExample() {
  const { theme } = useTheme();
  const { height } = useWindowDimensions();
  const [controlsOpen, setControlsOpen] = useState(true);
  const [generation, setGeneration] = useState(0);
  const [items, setItems] = useState(data);
  const [stress, setStress] = useState(false);
  const [step, setStep] = useState(0);
  const nextId = useRef(200);
  const toggleExpanded = useCallback((id: string) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index < 0) return current;
      // An immutable data edit on a tap, never a dataset copy during scrolling.
      const next = current.slice();
      next[index] = { ...current[index]!, expanded: !current[index]!.expanded };
      return next;
    });
  }, []);
  const deleteItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <SwipeActions>
        <Row {...item} onToggle={toggleExpanded} />
        <SwipeActions.Actions edge="trailing" allowsFullSwipe>
          <Button
            label="Delete"
            systemImage="trash"
            role="destructive"
            onPress={() => deleteItem(item.id)}
          />
        </SwipeActions.Actions>
      </SwipeActions>
    ),
    [toggleExpanded, deleteItem]
  );

  useEffect(() => {
    if (!stress) return;
    let tick = 0;
    // Mutations happen independently of gestures, so a fling can overlap native data commits.
    const timer = setInterval(() => {
      tick++;
      const id = String(nextId.current++);
      setItems((current) => {
        switch (tick % 5) {
          case 1:
            return [{ id, expanded: false }, ...current];
          case 2:
            return current.filter((item) => item.id !== '0');
          case 3:
            return [...current].reverse();
          case 4:
            return [];
          default:
            return data;
        }
      });
      setStep(tick);
      if (tick === 15) setStress(false);
    }, 900);
    return () => clearInterval(timer);
  }, [stress]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background.default }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Test controls"
        accessibilityState={{ expanded: controlsOpen }}
        onPress={() => setControlsOpen((open) => !open)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 12,
          minHeight: 52,
        }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: theme.text.default, fontSize: 15, fontWeight: '600' }}>
            Test controls
          </Text>
          <Text
            style={{
              color: theme.text.secondary,
              fontSize: 13,
              fontVariant: ['tabular-nums'],
            }}>{`${items.length} rows · ${stress ? 'Stress running' : 'Idle'} · ${step}/15 steps`}</Text>
        </View>
        <Text style={{ color: theme.icon.info, fontSize: 14 }}>
          {controlsOpen ? 'Hide −' : 'Show +'}
        </Text>
      </Pressable>
      {controlsOpen && (
        <ScrollView
          style={{ flexGrow: 0, maxHeight: height * 0.36 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TestAction
              title="Prepend"
              disabled={stress}
              onPress={() => {
                const id = String(nextId.current++);
                setItems((current) => [{ id, expanded: false }, ...current]);
              }}
            />
            <TestAction
              title="Swap first two"
              disabled={stress}
              onPress={() =>
                setItems((current) =>
                  current.length < 2 ? current : [current[1]!, current[0]!, ...current.slice(2)]
                )
              }
            />
            <TestAction
              title="Toggle row 0"
              disabled={stress}
              onPress={() =>
                setItems((current) =>
                  current.some((item) => item.id === '0')
                    ? current.filter((item) => item.id !== '0')
                    : [data[0]!, ...current]
                )
              }
            />
            <TestAction
              title="Clear / refill"
              disabled={stress}
              onPress={() => setItems((current) => (current.length ? [] : data))}
            />
            <TestAction
              title={stress ? 'Stop stress' : 'Start mutation stress'}
              onPress={() => {
                setStep(0);
                setStress((current) => !current);
              }}
            />
            <TestAction
              title="Reset rows"
              onPress={() => {
                setStress(false);
                setStep(0);
                setItems(data);
                nextId.current = 200;
                setGeneration((value) => value + 1);
              }}
            />
          </View>
          <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 17 }}>
            Swipe left to delete; full swipe also deletes. Tap a row to test local state. Expand RN
            content to test layout. Stress cycles prepend, remove, reverse, clear and refill.
          </Text>
        </ScrollView>
      )}
      <Host style={{ flex: 1 }}>
        <List
          key={generation}
          data={items}
          keyExtractor={keyExtractor}
          estimatedRowHeight={100}
          initialNumToRender={0}
          overscanCount={5}
          renderItem={renderItem}
        />
      </Host>
    </SafeAreaView>
  );
}
