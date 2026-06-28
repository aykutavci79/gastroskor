import { Fragment, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import { RESERVATION_TABLE_COLORS, ReservationTheme } from '@/constants/reservation-theme';
import type { FloorPlanLayout, FloorPlanTable } from '@/lib/types';
import { formatTableCode, tableSurfaceLabel, ZONE_LABEL } from '@/lib/reservation-table-code';

const ZONE_ORDER = ['salon', 'bahce', 'teras'] as const;
const MIN_HIT_PX = 44;

type FloorPlanZone = FloorPlanTable['zone'];

type TableVisualState = 'available' | 'selected' | 'reserved' | 'closed' | 'mismatch';

type Props = {
  layout: FloorPlanLayout;
  backgroundUrl?: string | null;
  reservedTableIds: string[];
  closedTableIds?: string[];
  selectedTableId: string | null;
  partySize: number;
  onSelect: (table: FloorPlanTable | null) => void;
  onTablePress?: (table: FloorPlanTable, state: TableVisualState) => void;
};

function poiZone(poi: FloorPlanLayout['pois'][number]): FloorPlanZone {
  const zone = (poi as { zone?: string }).zone;
  if (zone === 'bahce' || zone === 'teras' || zone === 'salon') return zone;
  return 'salon';
}

function zonesWithTables(layout: FloorPlanLayout): FloorPlanZone[] {
  const present = new Set((layout.tables ?? []).map((table) => table.zone));
  const ordered = ZONE_ORDER.filter((zone) => present.has(zone));
  return ordered.length > 0 ? [...ordered] : ['salon'];
}

function tableVisualState(
  table: FloorPlanTable,
  partySize: number,
  reserved: Set<string>,
  closed: Set<string>,
  selectedTableId: string | null,
): TableVisualState {
  if (closed.has(table.id) || table.reservation_closed) return 'closed';
  if (reserved.has(table.id)) return 'reserved';
  if (selectedTableId === table.id) return 'selected';
  const fits = partySize >= table.seats_min && partySize <= table.seats_max;
  if (!fits) return 'mismatch';
  return 'available';
}

const TABLE_COLORS = RESERVATION_TABLE_COLORS;

function displaySeatCount(table: FloorPlanTable): number {
  return Math.min(8, Math.max(2, table.seats_max));
}

function tableDimensions(table: FloorPlanTable): { w: number; h: number } {
  const seats = displaySeatCount(table);
  if (seats <= 2) return { w: 0.1, h: 0.048 };
  if (seats <= 4) return { w: 0.078, h: 0.078 };
  if (seats <= 6) return { w: 0.116, h: 0.062 };
  return { w: 0.134, h: 0.068 };
}

function chairPositions(
  cx: number,
  cy: number,
  w: number,
  h: number,
  seats: number,
): Array<{ x: number; y: number }> {
  const gap = 0.012;

  if (seats === 2) {
    return [
      { x: cx - w / 2 - gap, y: cy },
      { x: cx + w / 2 + gap, y: cy },
    ];
  }

  if (seats === 3) {
    return [
      { x: cx - w / 2 - gap, y: cy },
      { x: cx + w / 2 + gap, y: cy },
      { x: cx, y: cy - h / 2 - gap },
    ];
  }

  if (seats === 4) {
    return [
      { x: cx, y: cy - h / 2 - gap },
      { x: cx + w / 2 + gap, y: cy },
      { x: cx, y: cy + h / 2 + gap },
      { x: cx - w / 2 - gap, y: cy },
    ];
  }

  const topCount = Math.ceil(seats / 2);
  const bottomCount = seats - topCount;
  const positions: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < topCount; i += 1) {
    const t = (i + 1) / (topCount + 1);
    positions.push({ x: cx - w / 2 + w * t, y: cy - h / 2 - gap });
  }
  for (let i = 0; i < bottomCount; i += 1) {
    const t = (i + 1) / (bottomCount + 1);
    positions.push({ x: cx - w / 2 + w * t, y: cy + h / 2 + gap });
  }

  return positions;
}

function hitBoxNorm(table: FloorPlanTable): { x: number; y: number; w: number; h: number } {
  const { w, h } = tableDimensions(table);
  const seats = displaySeatCount(table);
  const padX = seats <= 2 ? 0.022 : 0.018;
  const padY = seats <= 2 ? 0.014 : 0.018;
  return {
    x: table.x - w / 2 - padX,
    y: table.y - h / 2 - padY,
    w: w + padX * 2,
    h: h + padY * 2,
  };
}

function FloorPlanTableShape({
  table,
  state,
}: {
  table: FloorPlanTable;
  state: TableVisualState;
}) {
  const colors = TABLE_COLORS[state];
  const { w, h } = tableDimensions(table);
  const cx = table.x;
  const cy = table.y;
  const seats = displaySeatCount(table);
  const chairs = chairPositions(cx, cy, w, h, seats);
  const chairR = seats <= 2 ? 0.011 : 0.01;
  const surfaceLabel = tableSurfaceLabel(table.label);

  return (
    <>
      {chairs.map((chair, index) => (
        <Circle key={`${table.id}-chair-${index}`} cx={chair.x} cy={chair.y} r={chairR} fill={colors.chair} />
      ))}
      <Rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        rx={seats <= 2 ? 0.01 : 0.012}
        ry={seats <= 2 ? 0.01 : 0.012}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={0.003}
      />
      {state === 'closed' ? (
        <>
          <Line
            x1={cx - w / 2}
            y1={cy - h / 2}
            x2={cx + w / 2}
            y2={cy + h / 2}
            stroke="#f87171"
            strokeWidth={0.003}
          />
          <Line
            x1={cx + w / 2}
            y1={cy - h / 2}
            x2={cx - w / 2}
            y2={cy + h / 2}
            stroke="#f87171"
            strokeWidth={0.003}
          />
        </>
      ) : null}
      <SvgText
        x={cx}
        y={cy + 0.006}
        fill={colors.label}
        fontSize={seats <= 2 ? 0.032 : 0.028}
        fontWeight="900"
        textAnchor="middle">
        {surfaceLabel}
      </SvgText>
    </>
  );
}

export function ReservationFloorPlanPicker({
  layout,
  backgroundUrl,
  reservedTableIds,
  closedTableIds = [],
  selectedTableId,
  partySize,
  onSelect,
  onTablePress,
}: Props) {
  const zones = useMemo(() => zonesWithTables(layout), [layout]);
  const [activeZone, setActiveZone] = useState<FloorPlanZone>(zones[0] ?? 'salon');
  const [mapSize, setMapSize] = useState(0);

  useEffect(() => {
    if (!zones.includes(activeZone)) {
      setActiveZone(zones[0] ?? 'salon');
    }
  }, [activeZone, zones]);

  const zoneTables = useMemo(
    () => (layout.tables ?? []).filter((table) => table.zone === activeZone),
    [activeZone, layout.tables],
  );
  const zonePois = useMemo(
    () => (layout.pois ?? []).filter((poi) => poiZone(poi) === activeZone),
    [activeZone, layout.pois],
  );

  const reserved = useMemo(() => new Set(reservedTableIds), [reservedTableIds]);
  const closed = useMemo(() => new Set(closedTableIds), [closedTableIds]);
  const activeZoneLabel = ZONE_LABEL[activeZone] ?? activeZone;

  function onMapLayout(event: LayoutChangeEvent) {
    setMapSize(event.nativeEvent.layout.width);
  }

  function switchZone(zone: FloorPlanZone) {
    setActiveZone(zone);
    if (selectedTableId) {
      const selected = layout.tables.find((table) => table.id === selectedTableId);
      if (selected?.zone !== zone) onSelect(null);
    }
  }

  function handleTablePress(table: FloorPlanTable) {
    const state = tableVisualState(table, partySize, reserved, closed, selectedTableId);
    onTablePress?.(table, state);
    if (state === 'reserved' || state === 'closed') return;
    onSelect(table);
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.zoneRow}
        keyboardShouldPersistTaps="handled">
        {zones.map((zone) => {
          const count = layout.tables.filter((table) => table.zone === zone).length;
          const active = zone === activeZone;
          return (
            <Pressable
              key={zone}
              style={[styles.zoneChip, active && styles.zoneChipActive]}
              onPress={() => switchZone(zone)}>
              <Text style={[styles.zoneChipText, active && styles.zoneChipTextActive]}>
                {ZONE_LABEL[zone] ?? zone}
              </Text>
              <Text style={[styles.zoneChipCount, active && styles.zoneChipCountActive]}>{count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.zoneHint}>
        {activeZoneLabel} · {zoneTables.length} masa · masaya dokun
      </Text>

      <View style={styles.mapWrap} onLayout={onMapLayout}>
        {backgroundUrl ? (
          <Image
            source={{ uri: backgroundUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}
        <View style={styles.mapPhotoDim} pointerEvents="none" />
        <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" pointerEvents="none">
          {zonePois.map((poi) => (
            <Fragment key={poi.id}>
              <Circle cx={poi.x} cy={poi.y} r={0.014} fill="#7c3aed" />
              <SvgText x={poi.x + 0.018} y={poi.y + 0.008} fill="#ddd6fe" fontSize={0.022}>
                {poi.label}
              </SvgText>
            </Fragment>
          ))}
          {zoneTables.map((table) => (
            <FloorPlanTableShape
              key={table.id}
              table={table}
              state={tableVisualState(table, partySize, reserved, closed, selectedTableId)}
            />
          ))}
        </Svg>

        {mapSize > 0
          ? zoneTables.map((table) => {
              const box = hitBoxNorm(table);
              let left = box.x * mapSize;
              let top = box.y * mapSize;
              let width = box.w * mapSize;
              let height = box.h * mapSize;
              if (width < MIN_HIT_PX) {
                const extra = (MIN_HIT_PX - width) / 2;
                left -= extra;
                width = MIN_HIT_PX;
              }
              if (height < MIN_HIT_PX) {
                const extra = (MIN_HIT_PX - height) / 2;
                top -= extra;
                height = MIN_HIT_PX;
              }
              const state = tableVisualState(table, partySize, reserved, closed, selectedTableId);
              return (
                <Pressable
                  key={`hit-${table.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatTableCode(table.zone, table.label)}, ${table.seats_max} kisilik masa`}
                  style={[
                    styles.tableHit,
                    {
                      left,
                      top,
                      width,
                      height,
                    },
                    state === 'selected' && styles.tableHitSelected,
                  ]}
                  onPress={() => handleTablePress(table)}
                />
              );
            })
          : null}
      </View>

      <Text style={styles.legend}>
        Masa numarası masanın üzerinde · Altın: seçili · Yeşil: uygun · Gri: dolu
      </Text>
    </View>
  );
}

export { tableVisualState };
export { ZONE_LABEL } from '@/lib/reservation-table-code';
export type { TableVisualState };

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ReservationTheme.border,
    backgroundColor: ReservationTheme.panel,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  zoneRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ReservationTheme.borderSoft,
    backgroundColor: ReservationTheme.bgElevated,
  },
  zoneChipActive: {
    borderColor: ReservationTheme.accent,
    backgroundColor: ReservationTheme.accentGlow,
  },
  zoneChipText: {
    color: ReservationTheme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  zoneChipTextActive: {
    color: ReservationTheme.accent,
  },
  zoneChipCount: {
    color: ReservationTheme.textSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  zoneChipCountActive: {
    color: 'rgba(255,183,3,0.85)',
  },
  zoneHint: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    fontSize: 12,
    color: ReservationTheme.textSoft,
  },
  mapWrap: {
    width: '100%',
    height: 360,
    position: 'relative',
    marginHorizontal: 0,
    backgroundColor: ReservationTheme.bg,
  },
  mapPhotoDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ReservationTheme.mapOverlay,
  },
  tableHit: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  tableHitSelected: {
    borderWidth: 1,
    borderColor: ReservationTheme.accentGlow,
    backgroundColor: 'rgba(255,183,3,0.08)',
  },
  legend: {
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 10,
    lineHeight: 14,
    color: ReservationTheme.textSoft,
  },
});
