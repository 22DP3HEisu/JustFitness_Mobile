// Modālais logs nodrošina svara izvēli ar decimālo daļu un izvēlēto mērvienību.
// Komponente ļauj precīzi ievadīt svaru kilogramos vai mārciņās un nodod izvēlēto vērtību atpakaļ formai.
import i18n from "../../lib/i18n";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useMemo, useState } from 'react';
const buildRange = (start, end, selectedValue) => {
  const values = [];
  for (let value = start; value <= end; value += 1) {
    values.push(value);
  }
  return values.includes(selectedValue) ? values : [...values, selectedValue].sort((a, b) => a - b);
};
const splitWeight = (weight, fallback) => {
  const parsed = Number(weight);
  if (!Number.isFinite(parsed)) {
    return {
      whole: fallback,
      decimal: 0
    };
  }
  const rounded = Math.round(parsed * 10) / 10;
  const whole = Math.floor(rounded);
  return {
    whole,
    decimal: Math.round((rounded - whole) * 10)
  };
};
const WeightPickerModal = ({
  visible,
  unit,
  weight,
  onConfirm,
  onClose
}) => {
  const isPounds = unit === 'lb' || unit === 'lbs';
  const fallbackWeight = isPounds ? 165 : 75;
  const initial = splitWeight(weight, fallbackWeight);
  const [draftWhole, setDraftWhole] = useState(initial.whole);
  const [draftDecimal, setDraftDecimal] = useState(initial.decimal);
  useEffect(() => {
    if (!visible) return;
    const next = splitWeight(weight, fallbackWeight);
    setDraftWhole(next.whole);
    setDraftDecimal(next.decimal);
  }, [fallbackWeight, visible, weight]);
  const wholeOptions = useMemo(() => {
    const range = isPounds ? buildRange(66, 550, draftWhole) : buildRange(30, 250, draftWhole);
    return range;
  }, [draftWhole, isPounds]);
  const decimalOptions = useMemo(() => buildRange(0, 9, draftDecimal), [draftDecimal]);
  const handleConfirm = () => {
    onConfirm(Number(`${draftWhole}.${draftDecimal}`));
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.actionText}>{i18n.t("ui.cancel_2")}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{i18n.t("ui.weight_2")}</Text>
            <TouchableOpacity onPress={handleConfirm} hitSlop={8}>
              <Text style={styles.actionText}>{i18n.t("ui.done")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerRow}>
            <Picker selectedValue={draftWhole} onValueChange={setDraftWhole} style={styles.picker} itemStyle={styles.pickerItem}>
              {wholeOptions.map(value => <Picker.Item key={value} label={String(value)} value={value} />)}
            </Picker>
            <Picker selectedValue={draftDecimal} onValueChange={setDraftDecimal} style={styles.decimalPicker} itemStyle={styles.pickerItem}>
              {decimalOptions.map(value => <Picker.Item key={value} label={`.${value}`} value={value} />)}
            </Picker>
            <View style={styles.unitColumn}>
              <Text style={styles.unitText}>{isPounds ? 'lb' : 'kg'}</Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>;
};
export default WeightPickerModal;
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)'
  },
  sheet: {
    backgroundColor: '#2F423D',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden'
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)'
  },
  title: {
    flex: 1,
    marginHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  },
  actionText: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700'
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  picker: {
    flex: 1,
    color: '#FFFFFF',
    backgroundColor: '#2F423D'
  },
  decimalPicker: {
    width: 110,
    color: '#FFFFFF',
    backgroundColor: '#2F423D'
  },
  pickerItem: {
    color: '#FFFFFF',
    fontSize: 18
  },
  unitColumn: {
    width: 72,
    alignItems: 'center'
  },
  unitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700'
  }
});
