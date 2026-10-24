import { useState } from 'react';
import { View, Text, Linking } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Body, Button } from './ui';
import {
  growthLabels,
  metrics,
  referenceFor,
  ageInReferenceMonths,
  type GrowthMetric,
} from '../domain/growth';
import type { Growth } from '../domain/health';
export function GrowthChart({
  records,
  dob,
  sex,
}: {
  records: Growth[];
  dob: string;
  sex: string | null;
}) {
  const [metric, setMetric] = useState<GrowthMetric>('weight');
  const reference = referenceFor(metric, sex);
  const field = metric === 'weight' ? 'weight_kg' : metric === 'head' ? 'head_cm' : 'height_cm';
  const points = records
    .filter((r) => r[field] !== null && (field !== 'height_cm' || r.height_method === metric))
    .map((r) => ({
      month: ageInReferenceMonths(dob, r.measured_on),
      value: r[field]!,
      date: r.measured_on,
    }));
  if (!reference)
    return (
      <Body muted>
        Measurements are saved without choosing a sex. WHO reference curves are available for female
        and male profiles; you can set this optional field in the profile. It is never used for
        activity suggestions.
      </Body>
    );
  const rows = reference.rows;
  const minX = rows[0]!.Month,
    maxX = rows[rows.length - 1]!.Month;
  const shown = points.filter((p) => p.month >= minX && p.month <= maxX);
  const low = Math.floor(Math.min(...rows.map((r) => r.P3), ...shown.map((p) => p.value)) * 0.9),
    high = Math.ceil(Math.max(...rows.map((r) => r.P97), ...shown.map((p) => p.value)) * 1.05);
  const x = (v: number) => 52 + ((v - minX) / (maxX - minX)) * 590,
    y = (v: number) => 268 - ((v - low) / (high - low)) * 232;
  const bands = ['P3', 'P15', 'P50', 'P85', 'P97'] as const;
  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-2">
        {metrics.map((m) => (
          <Button
            key={m}
            title={growthLabels[m]}
            variant={metric === m ? 'primary' : 'secondary'}
            onPress={() => setMetric(m)}
          />
        ))}
      </View>
      <Body>
        WHO {reference.sex} · {metric === 'weight' ? 'kg' : 'cm'} · {minX}–{maxX} months
      </Body>
      <Svg
        viewBox="0 0 710 310"
        width="100%"
        height={310}
        accessibilityRole="image"
        accessibilityLabel={`${growthLabels[metric]} chart with WHO 3rd, 15th, 50th, 85th and 97th percentile reference curves. ${shown.length} saved measurements. Exact values are listed below.`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const v = low + ((high - low) * i) / 4;
          return <ViewGrid key={i} yy={y(v)} value={v} />;
        })}
        {Array.from({ length: 6 }, (_, i) => minX + ((maxX - minX) * i) / 5).map((v) => (
          <SvgText key={v} x={x(v)} y={295} textAnchor="middle" fontSize={12} fill="#51665A">
            {Math.round(v)} mo
          </SvgText>
        ))}
        {bands.map((b, i) => (
          <Path
            key={b}
            d={rows.map((r, n) => `${n ? 'L' : 'M'}${x(r.Month)},${y(r[b])}`).join(' ')}
            stroke={i === 2 ? '#315F49' : '#9BAFA1'}
            strokeWidth={i === 2 ? 2.4 : 1.3}
            strokeDasharray={i === 2 ? undefined : '5 4'}
            fill="none"
          />
        ))}
        {bands.map((b) => (
          <SvgText
            key={b}
            x={650}
            y={y(rows[rows.length - 1]![b]) + 4}
            fontSize={11}
            fill="#315F49"
          >
            {b.slice(1)}th
          </SvgText>
        ))}
        {shown.map((p, i) => (
          <Circle
            key={i}
            cx={x(p.month)}
            cy={y(p.value)}
            r={5}
            fill="#AE593D"
            stroke="white"
            strokeWidth={1.5}
          />
        ))}
      </Svg>
      <Text className="text-sm leading-6 text-muted">
        Terracotta dots are your entries; lines are WHO monthly reference percentiles. These are
        reference charts, not an assessment or a target. Age is plotted as days ÷ 30.4375. Length
        and standing height use separate curves; no measurement conversion is applied. Ask your
        clinician to interpret trends, including prematurity.
      </Text>
      <Button
        title="Open WHO reference table"
        variant="quiet"
        onPress={() => void Linking.openURL(reference.url)}
      />
    </View>
  );
}
function ViewGrid({ yy, value }: { yy: number; value: number }) {
  return (
    <>
      <Line x1={52} x2={642} y1={yy} y2={yy} stroke="#DDE4DA" />
      <SvgText x={43} y={yy + 4} textAnchor="end" fontSize={12} fill="#51665A">
        {value.toFixed(1)}
      </SvgText>
    </>
  );
}
