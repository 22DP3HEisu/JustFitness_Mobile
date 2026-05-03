import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Picker } from '@react-native-picker/picker'

const PickerModal = ({
  visible,
  title,
  selectedValue,
  options,
  onValueChange,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.actionText}>Atcelt</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.actionText}>Gatavs</Text>
          </TouchableOpacity>
        </View>

        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          {options.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </Pressable>
    </Pressable>
  </Modal>
)

export default PickerModal

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: '#2F423D',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  title: {
    flex: 1,
    marginHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionText: {
    color: '#F5C842',
    fontSize: 16,
    fontWeight: '700',
  },
  picker: {
    color: '#FFFFFF',
    backgroundColor: '#2F423D',
  },
  pickerItem: {
    color: '#FFFFFF',
    fontSize: 18,
  },
})
