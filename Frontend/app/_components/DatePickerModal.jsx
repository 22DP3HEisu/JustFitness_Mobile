import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useEffect, useState } from 'react'

const DatePickerModal = ({
  visible,
  title,
  value,
  maximumDate,
  onConfirm,
  onClose,
}) => {
  const [draftDate, setDraftDate] = useState(value || new Date())
  const isAndroid = process.env.EXPO_OS === 'android'

  useEffect(() => {
    if (visible) {
      setDraftDate(value || new Date())
    }
  }, [value, visible])

  const handleChange = (event, selectedDate) => {
    if (selectedDate) {
      setDraftDate(selectedDate)
    }
  }

  const handleAndroidChange = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      onConfirm(selectedDate)
      return
    }
    onClose()
  }

  if (!visible) return null

  if (isAndroid) {
    return (
      <DateTimePicker
        value={value || new Date()}
        mode="date"
        onChange={handleAndroidChange}
        maximumDate={maximumDate}
      />
    )
  }

  return (
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
            <TouchableOpacity onPress={() => onConfirm(draftDate)} hitSlop={8}>
              <Text style={styles.actionText}>Gatavs</Text>
            </TouchableOpacity>
          </View>

          <DateTimePicker
            value={draftDate}
            mode="date"
            display="spinner"
            onChange={handleChange}
            maximumDate={maximumDate}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export default DatePickerModal

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
})
