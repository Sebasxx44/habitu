import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { mercadoPagoService } from "@/services/payment/mercadoPagoService";
import { walletService } from "@/services/wallet/walletService";
import type { BookingApiError } from "@/composables/booking/types";
import type {
  WalletAccount,
  WalletState,
  WalletTransaction,
} from "@/composables/wallet/types";

// COMPOSABLE
export const useWallet = (): WalletState => {
  const realtimeRevision = useRealtimeRevision(["wallet"]);
  // STATE
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const submitting = useRef(false);
  const amount = selectedQuick ?? Number(customAmount);

  // ACTIONS
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [account, history] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions(20, 1),
      ]);
      setWallet(account);
      setTransactions(history.data);
    } catch {
      setError("No se pudo cargar la billetera. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  const topUp = async () => {
    if (submitting.current) return;
    if (
      !Number.isFinite(amount) ||
      amount < 5000 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001
    ) {
      setCheckoutError(
        "La recarga mínima es $5.000 y admite máximo dos decimales.",
      );
      return;
    }
    submitting.current = true;
    setProcessing(true);
    setCheckoutError(null);
    try {
      const preference = await mercadoPagoService.createWalletPreference(
        amount,
        "Recarga de billetera",
      );
      const target = new URL(preference.init_point);
      const allowed =
        /^([a-z0-9-]+\.)*mercadopago\.(com|com\.co|com\.ar|com\.mx|com\.br|cl|com\.pe|com\.uy)$/.test(
          target.hostname,
        );
      if (target.protocol !== "https:" || !allowed)
        throw new Error("La dirección de pago no es válida.");
      window.location.assign(target.href);
    } catch (error) {
      const response = isAxiosError<BookingApiError>(error)
        ? error.response?.data
        : undefined;
      setCheckoutError(
        response?.error ||
          response?.message ||
          "No se pudo iniciar el pago. No se ha acreditado saldo.",
      );
      submitting.current = false;
      setProcessing(false);
    }
  };

  // EFFECTS
  useEffect(() => {
    void reload();
  }, [reload, realtimeRevision]);

  // RETURN
  return {
    account: { wallet, transactions, loading, error },
    checkout: {
      customAmount,
      selectedQuick,
      amount,
      processing,
      error: checkoutError,
    },
    actions: {
      reload,
      topUp,
      setCustomAmount: (value) => {
        setCustomAmount(value);
        setSelectedQuick(null);
      },
      selectAmount: (value) => {
        setSelectedQuick(value);
        setCustomAmount("");
      },
    },
  };
};
