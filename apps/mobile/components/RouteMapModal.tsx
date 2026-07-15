import { Modal, View, Text, TouchableOpacity, Linking, StyleSheet, Pressable, Platform } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";
import { PARKING } from "@/lib/navigator";

const LAT = PARKING.lat;
const LON = PARKING.lon;
const NAME = PARKING.name;
const ADDR = PARKING.addr;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function RouteMapModal({ visible, onClose }: Props) {
  function openYandexMapsRoute() {
    // Веб-ссылка работает на всех платформах: открывает приложение Я.Карт или браузер
    const url = `https://yandex.ru/maps/?rtext=~${LAT},${LON}&rtt=auto&z=15`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.bg} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>📍 Как нас найти</Text>
              <Text style={s.subtitle}>{ADDR} · 5 минут до терминала</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeTxt}>×</Text>
            </TouchableOpacity>
          </View>

          {/* На вебе — iframe с картой; на native — статическое изображение карты Я.Статикмап */}
          {Platform.OS === "web" ? (
            <iframe
              title="Карта парковки"
              src={`https://yandex.ru/map-widget/v1/?ll=${LON}%2C${LAT}&z=15&pt=${LON},${LAT},pm2rdl&l=map`}
              style={{
                width: "100%", height: 320, border: 0,
                borderRadius: 12, marginTop: 16, marginBottom: 16,
              }}
            />
          ) : (
            <View style={s.mapBlock}>
              <Text style={s.mapPin}>📍</Text>
              <Text style={s.mapName}>{NAME}</Text>
              <Text style={s.mapCoord}>{LAT.toFixed(5)}, {LON.toFixed(5)}</Text>
              <Text style={s.mapHint}>Нажмите «Построить маршрут» — откроется в Я.Картах или Я.Навигаторе</Text>
            </View>
          )}

          <View style={s.btnRow}>
            <TouchableOpacity style={s.btnPrimary} onPress={openYandexMapsRoute} activeOpacity={0.85}>
              <Text style={s.btnPrimaryTxt}>🧭 Построить маршрут</Text>
            </TouchableOpacity>
          </View>

          <View style={s.info}>
            <Text style={s.infoTitle}>{NAME}</Text>
            <TouchableOpacity onPress={() => Linking.openURL("tel:+79099148881")}>
              <Text style={s.infoLink}>📞 +7 (909) 914-88-81</Text>
            </TouchableOpacity>
            <Text style={s.infoText}>🚐 Бесплатный трансфер до терминала 24/7</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(15,20,25,0.7)", justifyContent: "center", padding: 16 },
  sheet: { backgroundColor: "white", borderRadius: 20, padding: spacing.xl, maxWidth: 520, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: "700", color: colors.graphite },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f4f5f7", justifyContent: "center", alignItems: "center" },
  closeTxt: { fontSize: 22, color: colors.textPrimary, lineHeight: 24 },

  mapBlock: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: "center",
    marginVertical: spacing.md,
    minHeight: 180, justifyContent: "center",
  },
  mapPin: { fontSize: 48, marginBottom: 8 },
  mapName: { fontSize: 16, fontWeight: "700", color: colors.graphite, textAlign: "center" },
  mapCoord: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  mapHint: { fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 12, lineHeight: 18 },

  btnRow: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  btnPrimary: { flex: 1, backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: "center" },
  btnPrimaryTxt: { color: "white", fontWeight: "700", fontSize: 14 },
  btnSecondary: { flex: 1, backgroundColor: "white", padding: 14, borderRadius: 12, alignItems: "center", borderWidth: 1.5, borderColor: colors.primary },
  btnSecondaryTxt: { color: colors.primary, fontWeight: "700", fontSize: 14 },

  info: {
    marginTop: spacing.lg, padding: spacing.md,
    backgroundColor: colors.surfaceMuted, borderRadius: 12,
  },
  infoTitle: { fontSize: 14, fontWeight: "700", color: colors.graphite, marginBottom: 6 },
  infoLink: { fontSize: 13, color: colors.primary, fontWeight: "600", marginVertical: 4 },
  infoText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
