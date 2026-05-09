// Web stub for react-native-maps (web target には地図表示なし、placeholder のみ)
const React = require("react");
const { View, Text, StyleSheet } = require("react-native");

const stubStyles = StyleSheet.create({
  container: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    minHeight: 200,
  },
  text: {
    color: "#737373",
    fontSize: 14,
    textAlign: "center",
  },
});

const MapView = ({ style, children, ...rest }) =>
  React.createElement(
    View,
    { style: [stubStyles.container, style] },
    React.createElement(
      Text,
      { style: stubStyles.text },
      "🗺️ 地図 (web プレビューでは表示されません)",
    ),
  );

const Marker = () => null;
const Polyline = () => null;
const Callout = () => null;
const Circle = () => null;
const Polygon = () => null;
const Heatmap = () => null;
const Overlay = () => null;
const PROVIDER_GOOGLE = "google";
const PROVIDER_DEFAULT = "default";

module.exports = MapView;
module.exports.default = MapView;
module.exports.MapView = MapView;
module.exports.Marker = Marker;
module.exports.Polyline = Polyline;
module.exports.Callout = Callout;
module.exports.Circle = Circle;
module.exports.Polygon = Polygon;
module.exports.Heatmap = Heatmap;
module.exports.Overlay = Overlay;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
