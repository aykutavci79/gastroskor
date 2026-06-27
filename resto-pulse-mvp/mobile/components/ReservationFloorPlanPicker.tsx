import { Fragment, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { FloorPlanLayout, FloorPlanTable } from '@/lib/types';
import { formatTableCode, ZONE_LABEL } from '@/lib/reservation-table-code';

const ZONE_ORDER = ['salon', 'bahce', 'teras'] as const;
const MIN_HIT_PX = 44;

type FloorPlanZone = FloorPlanTable['zone'];

type TableVisualState = 'available' | 'selected' | 'reserved' | 'closed' | 'mismatch';

type Props = {
  layout: FloorPlanLayout;
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

const TABLE_COLORS: Record<
  TableVisualState,
  { fill: string; stroke: string; label: string; chair: string }
> = {
  available: { fill: '#166534', stroke: '#4ade80', label: '#ecfdf5', chair: '#86efac' },
  selected: { fill: '#92400e', stroke: '#fbbf24', label: '#fffbeb', chair: '#fde68a' },
  reserved: { fill: '#334155', stroke: '#64748b', label: '#cbd5e1', chair: '#475569' },
  closed: { fill: '#1e293b', stroke: '#475569', label: '#94a3b8', chair: '#334155' },
  mismatch: { fill: '#312e81', stroke: '#6366f1', label: '#e0e7ff', chair: '#818cf8' },
};

function displaySeatCount(table: FloorPlanTable): number {
  return Math.min(8, Math.max(2, table.seats_max));
}

/** 2 kisilik siralar yatay; 4+ kare/dikdortgen. */
function tableDimensions(table: FloorPlanTable): { w: number; h: number } {
  const seats = displaySeatCount(table);
  if (seats <= 2) return { w: 0.074, h: 0.036 };
  if (seats <= 4) return { w: 0.056, h: 0.056 };
  if (seats <= 6) return { w: 0.084, h: 0.046 };
  return { w: 0.098, h: 0.05 };
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
  const chairR = seats <= 2 ? 0.008 : 0.007;
  const code = formatTableCode(table.zone, table.label);

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
        y={cy + 0.005}
        fill={colors.label}
        fontSize={seats <= 2 ? 0.02 : 0.018}
        fontWeight="800"
        textAnchor="middle">
        {code}
      </SvgText>
    </>
  );
}

export function ReservationFloorPlanPicker({
  layout,
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
        Sandalye sayisi masa kapasitesini gosterir · Yesil: uygun · Sari: secili · Gri: dolu · Capraz: kapali
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
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(15,23,42,0.6)',
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
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  zoneChipActive: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251,191,36,0.14)',
  },
  zoneChipText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
  zoneChipTextActive: {
    color: '#fbbf24',
  },
  zoneChipCount: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
  },
  zoneChipCountActive: {
    color: 'rgba(251,191,36,0.85)',
  },
  zoneHint: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  mapWrap: {
    width: '100%',
    height: 280,
    position: 'relative',
    marginHorizontal: 0,
  },
  tableHit: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  tableHitSelected: {
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    backgroundColor: 'rgba(251,191,36,0.06)',
  },
  legend: {
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 10,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.55)',
  },
});
