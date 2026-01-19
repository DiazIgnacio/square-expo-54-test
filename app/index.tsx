// eslint-disable-next-line import/no-unresolved
import { useSquarePayments } from "@/hooks/useSquarePayments";
import { CurrencyCode } from "mobile-payments-sdk-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SQUARE_ACCESS_TOKEN = process.env.EXPO_PUBLIC_SQUARE_ACCESS_TOKEN!;
const SQUARE_LOCATION_ID = process.env.EXPO_PUBLIC_SQUARE_LOCATION_ID!;

export default function Index() {
  const [amount, setAmount] = useState("1.00");
  const [note, setNote] = useState("");

  const {
    isAuthorized,
    isAuthorizing,
    authorizedLocation,
    error,
    authorize,
    deauthorize,
    processPayment,
    isProcessingPayment,
  } = useSquarePayments();

  const handleAuthorize = async () => {
    if (
      SQUARE_ACCESS_TOKEN === "YOUR_ACCESS_TOKEN" ||
      SQUARE_LOCATION_ID === "YOUR_LOCATION_ID"
    ) {
      Alert.alert(
        "Configuration Required",
        "Please update SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in app/index.tsx with your Square credentials.",
      );
      return;
    }
    await authorize(SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID);
  };

  const handlePayment = async () => {
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
      return;
    }

    try {
      const result = await processPayment(
        amountCents,
        CurrencyCode.USD,
        note || undefined,
      );
      Alert.alert(
        "Payment Successful",
        `Payment ID: ${result.id}\nAmount: $${(result.amountMoney.amount / 100).toFixed(2)}\nStatus: ${result.status}`,
      );
      setNote("");
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error(error);
      Alert.alert("Payment Failed", error.message || "Unknown error occurred");
    }
  };

  if (Platform.OS !== "ios") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Square Payments SDK</Text>
        <Text style={styles.subtitle}>iOS Only</Text>
        <Text style={styles.description}>
          The Square Mobile Payments SDK is currently only supported on iOS.
          Please run this app on an iOS device or simulator.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Square Payments</Text>
        <Text style={styles.subtitle}>Mobile Payments SDK Demo</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authorization</Text>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <Text
              style={[
                styles.statusValue,
                isAuthorized ? styles.statusAuthorized : styles.statusPending,
              ]}
            >
              {isAuthorizing
                ? "Authorizing..."
                : isAuthorized
                  ? "Authorized"
                  : "Not Authorized"}
            </Text>
          </View>
          {authorizedLocation && (
            <View style={styles.statusRow}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.locationValue}>{authorizedLocation}</Text>
            </View>
          )}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {error.code}: {error.message}
              </Text>
            </View>
          )}
          <View style={styles.buttonRow}>
            {!isAuthorized ? (
              <TouchableOpacity
                style={[styles.button, styles.authorizeButton]}
                onPress={handleAuthorize}
                disabled={isAuthorizing}
              >
                {isAuthorizing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Authorize SDK</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.deauthorizeButton]}
                onPress={deauthorize}
              >
                <Text style={styles.buttonText}>Deauthorize</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isAuthorized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Process Payment</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="Payment note"
                placeholderTextColor="#999"
                multiline
              />
            </View>
            <TouchableOpacity
              style={[
                styles.button,
                styles.paymentButton,
                isProcessingPayment && styles.buttonDisabled,
              ]}
              onPress={handlePayment}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  Charge ${parseFloat(amount || "0").toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 40,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
    color: "#666",
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusAuthorized: {
    color: "#34C759",
  },
  statusPending: {
    color: "#FF9500",
  },
  locationValue: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    color: "#C62828",
    fontSize: 12,
  },
  buttonRow: {
    marginTop: 12,
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  authorizeButton: {
    backgroundColor: "#007AFF",
  },
  deauthorizeButton: {
    backgroundColor: "#FF3B30",
  },
  paymentButton: {
    backgroundColor: "#34C759",
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  noteInput: {
    height: 80,
    textAlignVertical: "top",
  },
  instructions: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
});
