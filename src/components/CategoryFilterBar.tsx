// src/components/CategoryFilterBar.tsx
//
// Two-row horizontal filter bar:
//   Row 1 — Dietary filter (All / Veg / Non-veg / Vegan)
//   Row 2 — Food type quick-picks (Burger / Pizza / Momo / …)
//
// Fully memoized — only re-renders when activeCategory or activeFoodType changes.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const C = {
  text: '#F2F2F7',
  primary: '#FF5C2A',
  input: '#2C2C2E',
};

const CATEGORIES = [
  { id: 'all', name: 'All', emoji: '🍴' },
  { id: 'veg', name: 'Veg', emoji: '🟢' },
  { id: 'non-veg', name: 'Non-veg', emoji: '🔴' },
  { id: 'vegan', name: 'Vegan', emoji: '🌱' },
] as const;

const FOOD_TYPES = [
  { id: 'burger', name: 'Burger', emoji: '🍔' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕' },
  { id: 'momo', name: 'Momo', emoji: '🥟' },
  { id: 'biryani', name: 'Biryani', emoji: '🍲' },
  { id: 'noodles', name: 'Noodles', emoji: '🍜' },
  { id: 'dessert', name: 'Dessert', emoji: '🍰' },
  { id: 'drinks', name: 'Drinks', emoji: '🥤' },
] as const;

interface CategoryFilterBarProps {
  activeCategory: string;
  activeFoodType: string;
  onCategoryChange: (id: string) => void;
  /** id = food type id, name = food type display name (used as search query) */
  onFoodTypeChange: (id: string, name: string) => void;
}

const CategoryFilterBar = React.memo(function CategoryFilterBar({
  activeCategory,
  activeFoodType,
  onCategoryChange,
  onFoodTypeChange,
}: CategoryFilterBarProps) {
  return (
    <View style={styles.container}>
      {/* Row 1 — Dietary */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces={false}
      >
        {CATEGORIES.map((c) => {
          const active = activeCategory === c.id;
          return (
            <Pressable
              key={c.id}
              style={styles.item}
              onPress={() => onCategoryChange(c.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${c.name} filter`}
            >
              <View style={[styles.iconLg, active && styles.iconActive]}>
                <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Row 2 — Food types */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces={false}
      >
        {FOOD_TYPES.map((c) => {
          const active = activeFoodType === c.id;
          return (
            <Pressable
              key={c.id}
              style={styles.item}
              onPress={() => onFoodTypeChange(c.id, c.name)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${c.name} filter`}
            >
              <View style={[styles.iconSm, active && styles.iconActive]}>
                <Text style={{ fontSize: 18 }}>{c.emoji}</Text>
              </View>
              <Text style={[styles.label, styles.labelSm, active && styles.labelActive]}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

export default CategoryFilterBar;

const styles = StyleSheet.create({
  container: { gap: 6 },
  scroll: { paddingVertical: 6, gap: 12, paddingRight: 16 },
  item: { alignItems: 'center', gap: 5 },
  iconLg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSm: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: { backgroundColor: C.primary },
  label: { color: C.text, fontSize: 12, fontWeight: '500' },
  labelSm: { fontSize: 11 },
  labelActive: { color: C.primary, fontWeight: '700' },
});
