import { useState } from "react";
import { Platform, Text, TouchableOpacity, View, StyleSheet, Modal, Pressable } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors, radii, spacing } from "@/lib/theme";

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  label?: string;
}

/**
 * Кросс-платформенный date picker:
 *  - iOS:    отдельная модалка с встроенным spinner + кнопки «Готово/Отмена»
 *  - Android: системный диалог через DateTimePicker (открывается по нажатию)
 *  - Web:    нативный <input type="date">
 */
export function DatePickerField({ value, onChange, minimumDate, label }: Props) {
  const [open, setOpen] = useState(false);

  // На вебе используем нативный input — он работает идеально в react-native-web
  if (Platform.OS === "web") {
    return (
      <View>
        {label && <Text style={s.label}>{label}</Text>}
        <input
          type="date"
          value={value.toISOString().slice(0, 10)}
          min={minimumDate?.toISOString().slice(0, 10)}
          // Открываем календарь по клику в любом месте поля, а не только по иконке
          onClick={(e: any) => { try { e.target.showPicker?.(); } catch { /* нужен user gesture */ } }}
          onChange={(e: any) => {
            const v = e.target.value;
            if (!v) return;
            const [y, m, d] = v.split("-").map(Number);
            onChange(new Date(y, m - 1, d, 10, 0, 0));
          }}
          style={{
            backgroundColor: colors.surfaceMuted,
            color: colors.textPrimary,
            padding: 14,
            borderRadius: 12,
            fontSize: 16,
            borderWidth: 1,
            borderColor: colors.border,
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </View>
    );
  }

  function handleAndroidChange(_: DateTimePickerEvent, selected?: Date) {
    setOpen(false);
    if (selected) onChange(selected);
  }

  return (
    <View>
      {label && <Text style={s.label}>{label}</Text>}
      <TouchableOpacity style={s.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={s.fieldText}>
          {value.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
        </Text>
        <Text style={s.fieldIcon}>📅</Text>
      </TouchableOpacity>

      {open && Platform.OS === "android" && (
        <DateTimePicker
          value={value}
          mode="date"
          display="calendar"
          minimumDate={minimumDate}
          onChange={handleAndroidChange}
        />
      )}

      {open && Platform.OS === "ios" && (
        <Modal transparent animationType="slide" visible={open}>
          <Pressable style={s.modalBg} onPress={() => setOpen(false)}>
            <Pressable style={s.modalSheet} onPress={() => {}}>
              <View style={s.modalHead}>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={s.modalCancel}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={s.modalDone}>Готово</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                minimumDate={minimumDate}
                locale="ru-RU"
                onChange={(_, selected) => selected && onChange(selected)}
                themeVariant="light"
                style={{ backgroundColor: "white" }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: 11, letterSpacing: 1.5, fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  field: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  fieldText: { color: colors.textPrimary, fontSize: 16 },
  fieldIcon: { fontSize: 18 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHead: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  modalCancel: { color: colors.textMuted, fontSize: 16 },
  modalDone: { color: colors.primary, fontSize: 16, fontWeight: "700" },
});
