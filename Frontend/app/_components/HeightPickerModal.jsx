import i18n from "../../lib/i18n";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useMemo, useState } from 'react';
const cmToInches = cm => {
  const parsed = Number(cm);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed / 2.54);
};
const inchesToCm = inches => Number((inches * 2.54).toFixed(1));
const splitInches = totalInches => {
  if (!Number.isFinite(totalInches)) {
    return {
      feet: 5,
      inches: 8
    };
  }
  return {
    feet: Math.floor(totalInches / 12),
    inches: totalInches % 12
  };
};
const buildRange = (start, end, selectedValue) => {
  const values = [];
  for (let value = start; value <= end; value += 1) {
    values.push(value);
  }
  return values.includes(selectedValue) ? values : [...values, selectedValue].sort((a, b) => a - b);
};
const HeightPickerModal = ({
  visible,
  unit,
  heightCm,
  onConfirm,
  onClose
}) => {
  const initialCm = Number(heightCm) || 170;
  const initialInches = cmToInches(heightCm);
  const initialSplit = splitInches(initialInches);
  const [draftCm, setDraftCm] = useState(Math.round(initialCm));
  const [draftFeet, setDraftFeet] = useState(initialSplit.feet);
  const [draftInches, setDraftInches] = useState(initialSplit.inches);
  useEffect(() => {
    if (!visible) return;
    const nextCm = Number(heightCm) || 170;
    const nextSplit = splitInches(cmToInches(heightCm));
    setDraftCm(Math.round(nextCm));
    setDraftFeet(nextSplit.feet);
    setDraftInches(nextSplit.inches);
  }, [heightCm, visible]);
  const cmOptions = useMemo(() => buildRange(100, 230, draftCm), [draftCm]);
  const feetOptions = useMemo(() => buildRange(3, 8, draftFeet), [draftFeet]);
  const inchOptions = useMemo(() => buildRange(0, 11, draftInches), [draftInches]);
  const handleConfirm = () => {
    if (unit === 'in') {
      onConfirm(inchesToCm(draftFeet * 12 + draftInches));
      return;
    }
    onConfirm(draftCm);
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.actionText}>{i18n.t("ui.cancel_2")}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{i18n.t("ui.height")}</Text>
            <TouchableOpacity onPress={handleConfirm} hitSlop={8}>
              <Text style={styles.actionText}>{i18n.t("ui.done")}</Text>
            </TouchableOpacity>
          </View>

          {unit === 'in' ? <View style={styles.pickerRow}>
              <Picker selectedValue={draftFeet} onValueChange={setDraftFeet} style={styles.picker} itemStyle={styles.pickerItem}>
                {feetOptions.map(feet => <Picker.Item key={feet} label={`${feet} ft`} value={feet} />)}
              </Picker>
              <Picker selectedValue={draftInches} onValueChange={setDraftInches} style={styles.picker} itemStyle={styles.pickerItem}>
                {inchOptions.map(inches => <Picker.Item key={inches} label={`${inches} in`} value={inches} />)}
              </Picker>
            </View> : <Picker selectedValue={draftCm} onValueChange={setDraftCm} style={styles.singlePicker} itemStyle={styles.pickerItem}>
              {cmOptions.map(cm => <Picker.Item key={cm} label={`${cm} cm`} value={cm} />)}
            </Picker>}
        </Pressable>
      </Pressable>
    </Modal>;
};
export default HeightPickerModal;
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
    flexDirection: 'row'
  },
  picker: {
    flex: 1,
    color: '#FFFFFF',
    backgroundColor: '#2F423D'
  },
  singlePicker: {
    color: '#FFFFFF',
    backgroundColor: '#2F423D'
  },
  pickerItem: {
    color: '#FFFFFF',
    fontSize: 18
  }
});
