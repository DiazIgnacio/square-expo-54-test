import * as ExpoLocation from "expo-location";
import {
  AdditionalPaymentMethodType,
  authorize,
  CurrencyCode,
  deauthorize,
  getAuthorizationState,
  observeAuthorizationChanges,
  ProcessingMode,
  PromptMode,
  startPayment,
} from "mobile-payments-sdk-react-native";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { v4 as uuidv4 } from "uuid";

export interface PaymentResult {
  id: string;
  status: string;
  amountMoney: {
    amount: number;
    currencyCode: string;
  };
  createdAt?: string;
}

export interface PaymentError {
  code: string;
  message: string;
  debugCode?: string;
  debugMessage?: string;
}

interface UseSquarePaymentsOptions {
  accessToken?: string;
  locationId?: string;
}

interface UseSquarePaymentsReturn {
  isAuthorized: boolean;
  isAuthorizing: boolean;
  authorizationState: any;
  authorizedLocation: string | null;
  error: PaymentError | null;
  authorize: (accessToken: string, locationId: string) => Promise<void>;
  deauthorize: () => Promise<void>;
  processPayment: (
    amountCents: number,
    currencyCode?: CurrencyCode,
    note?: string,
  ) => Promise<PaymentResult>;
  isProcessingPayment: boolean;
}

export function useSquarePayments(
  options: UseSquarePaymentsOptions = {},
): UseSquarePaymentsReturn {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizationState, setAuthorizationState] = useState<any>(null);
  const [authorizedLocation, setAuthorizedLocation] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<PaymentError | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    const checkAuthState = async () => {
      try {
        const state: any = await getAuthorizationState();
        console.log("Square SDK auth state:", state);
        setIsAuthorized(state === "AUTHORIZED");
        setAuthorizationState(state);
      } catch (err) {
        console.log("Error checking auth state:", err);
      }
    };

    checkAuthState();

    const subscription = observeAuthorizationChanges((state: any) => {
      console.log("Square SDK auth state changed:", state);
      setAuthorizationState(state);
      setIsAuthorized(state === "AUTHORIZED");
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (
      Platform.OS === "ios" &&
      options.accessToken &&
      options.locationId &&
      !isAuthorized &&
      !isAuthorizing
    ) {
      handleAuthorize(options.accessToken, options.locationId);
    }
  }, [options.accessToken, options.locationId, isAuthorized, isAuthorizing]);

  const handleAuthorize = useCallback(
    async (accessToken: string, locationId: string) => {
      if (Platform.OS !== "ios") {
        setError({
          code: "PLATFORM_NOT_SUPPORTED",
          message: "Square Mobile Payments SDK is only supported on iOS",
        });
        return;
      }

      setIsAuthorizing(true);
      setError(null);

      try {
        const result: any = await authorize(accessToken, locationId);
        setIsAuthorized(true);
        setAuthorizedLocation(result.locationId || locationId);
        console.log("Square SDK authorized for location:", result.locationId);
      } catch (err: unknown) {
        const error = err as Error & { userInfo?: Record<string, string> };
        const paymentError: PaymentError = {
          code: error.userInfo?.debugCode || "AUTHORIZATION_ERROR",
          message: error.message || "Failed to authorize Square SDK",
          debugCode: error.userInfo?.debugCode,
          debugMessage: error.userInfo?.debugMessage,
        };
        setError(paymentError);
        console.error("Square authorization error:", paymentError);
      } finally {
        setIsAuthorizing(false);
      }
    },
    [],
  );

  const handleDeauthorize = useCallback(async () => {
    if (Platform.OS !== "ios") {
      return;
    }

    try {
      await deauthorize();
      setIsAuthorized(false);
      setAuthorizedLocation(null);
      setAuthorizationState(null);
      setError(null);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Square deauthorization error:", error.message);
    }
  }, []);

  const processPayment = useCallback(
    async (
      amountCents: number,
      currencyCode: CurrencyCode = CurrencyCode.USD,
      note?: string,
    ): Promise<PaymentResult> => {
      if (Platform.OS !== "ios") {
        throw new Error("Square Mobile Payments SDK is only supported on iOS");
      }

      if (!isAuthorized) {
        throw new Error("Square SDK is not authorized");
      }

      setIsProcessingPayment(true);
      setError(null);

      try {
        const { status } =
          await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          throw new Error(
            "Location permission is required to process payments",
          );
        }

        const paymentParameters = {
          amountMoney: {
            amount: amountCents,
            currencyCode,
          },
          processingMode: ProcessingMode.ONLINE_ONLY,
          idempotencyKey: uuidv4(),
          note: note || undefined,
        };

        const promptParameters = {
          additionalMethods: [AdditionalPaymentMethodType.ALL],
          mode: PromptMode.DEFAULT,
        };

        const payment: any = await startPayment(
          paymentParameters,
          promptParameters,
        );

        const result: PaymentResult = {
          id: String(payment.id),
          status: String(payment.status || "COMPLETED"),
          amountMoney: {
            amount: Number(payment.amountMoney.amount),
            currencyCode: String(payment.amountMoney.currencyCode),
          },
          createdAt: payment.createdAt ? String(payment.createdAt) : undefined,
        };

        return result;
      } catch (err: unknown) {
        const error = err as Error & { userInfo?: Record<string, string> };
        const paymentError: PaymentError = {
          code: error.userInfo?.debugCode || "PAYMENT_ERROR",
          message: error.message || "Payment failed",
          debugCode: error.userInfo?.debugCode,
          debugMessage: error.userInfo?.debugMessage,
        };
        setError(paymentError);
        throw paymentError;
      } finally {
        setIsProcessingPayment(false);
      }
    },
    [isAuthorized],
  );

  return {
    isAuthorized,
    isAuthorizing,
    authorizationState,
    authorizedLocation,
    error,
    authorize: handleAuthorize,
    deauthorize: handleDeauthorize,
    processPayment,
    isProcessingPayment,
  };
}
