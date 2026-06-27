import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import type { FloorPlanLayout, FloorPlanTable } from '@/lib/types';

const ZONE_LABEL: Record<string, string> = {
  salon: 'Salon',
  bahce: 'Bahce',
  teras: 'Teras',
};

type Props = {
  layout: FloorPlanLayout;
  reservedTableIds: string[];
  selectedTableId: string | null;
  partySize: number;
  onSelect: (table: FloorPlanTable) => void;
};

export function ReservationFloorPlanPicker({
  layout,
  reservedTableIds,
  selectedTableId,
  partySize,
  onSelect,
}: Props) {
  const reserved = new Set(reservedTableIds);

  return (
    <View style={styles.wrap}>
      <Svg viewBox="0 0 1 1" width="100%" height={280} preserveAspectRatio="xMidYMid meet">
        {(layout.pois ?? []).map((poi) => (
          <Circle key={poi.id} cx={poi.x} cy={poi.y} r={0.018} fill="#a78bfa" />
        ))}
        {(layout.tables ?? []).map((table) => {
          const taken = reserved.has(table.id);
          const fits = partySize >= table.seats_min && partySize <= table.seats_max;
          const selectable = !taken && fits;
          const selected = selectedTableId === table.id;
          const fill = taken ? '#64748b' : selected ? '#fbbf24' : fits ? '#22c55e' : '#475569';
          return (
            <Circle
              key={table.id}
              cx={table.x}
              cy={table.y}
              r={0.028}
              fill={fill}
              stroke={selected ? '#fff' : '#0f172a'}
              strokeWidth={0.004}
              onPress={() => selectable && onSelect(table)}
            />
          );
        })}
        {(layout.tables ?? []).map((table) => (
          <SvgText
            key={`${table.id}-label`}
            x={table.x}
            y={table.y + 0.05}
            fill="#fff"
            fontSize={0.035}
            textAnchor="middle">
            {table.label}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.legend}>Yesil: uygun · Gri: dolu · Koyu: kisi sayisina uygun degil</Text>
      {selectedTableId ? (
        <Text style={styles.selected}>
          {(() => {
            const table = layout.tables.find((t) => t.id === selectedTableId);
            if (!table) return null;
            return `${ZONE_LABEL[table.zone] ?? table.zone} · ${table.label} (${table.seats_min}-${table.seats_max} kisi)`;
          })()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(15,23,42,0.6)',
    overflow: 'hidden',
    paddingBottom: 10,
  },
  legend: {
    paddingHorizontal: 12,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
  },
  selected: {
    paddingHorizontal: 12,
    paddingTop: 6,
    fontSize: 13,
    color: '#fbbf24',
    fontWeight: '600',
  },
});
