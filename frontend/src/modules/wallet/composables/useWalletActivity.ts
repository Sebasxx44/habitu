import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { walletService } from "@/services/wallet/walletService";
import { wompiService } from "@/modules/payments/wompiService";
import { readCheckoutReturn } from "@/modules/payments/checkoutReturnService";
import type {
  WalletAccount,
  WalletTransactions,
} from "@/composables/wallet/types";
import type { CheckoutOrder } from "@/modules/payments/types";
import type {
  WalletActivityState,
  WalletFilters,
} from "@/modules/wallet/types";

// CONSTANTS
const emptyPage: WalletTransactions = {
  data: [],
  current_page: 1,
  last_page: 1,
  total: 0,
};

// COMPOSABLE
export const useWalletActivity = (): WalletActivityState => {
  const realtimeRevision = useRealtimeRevision(["wallet"]);
  // STATE
  const [params] = useSearchParams();
  const returnId = params.get("checkout");
  const transactionId = params.get("id");
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [page, setPage] = useState(emptyPage);
  const [pageNumber, setPageNumber] = useState(1);
  const [filters, setFilters] = useState<WalletFilters>({
    type: "",
    from: "",
    to: "",
  });
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [returned, setReturned] = useState<CheckoutOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [paymentsError, setPaymentsError] = useState(false);
  const [returnError, setReturnError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [revision, setRevision] = useState(0);
  const [checkRevision, setCheckRevision] = useState(0);

  // ACTIONS
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const check = useCallback(() => setCheckRevision((value) => value + 1), []);
  const change = (value: Partial<WalletFilters>) => {
    setFilters((current) => ({ ...current, ...value }));
    setPageNumber(1);
  };

  // EFFECTS
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    walletService
      .getWallet()
      .then((value) => {
        if (active) setWallet(value);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const abort = new AbortController();
    setPaymentsError(false);
    wompiService
      .history(abort.signal)
      .then((value) => { if (!abort.signal.aborted) setOrders(value); })
      .catch(() => {
        if (!abort.signal.aborted) setPaymentsError(true);
      });
    return () => {
      active = false;
      abort.abort();
    };
  }, [revision, realtimeRevision]);
  useEffect(() => {
    const abort = new AbortController();
    setHistoryLoading(true);
    setHistoryError(false);
    walletService
      .getTransactions(10, pageNumber, filters, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setPage(value);
      })
      .catch(() => {
        if (!abort.signal.aborted) setHistoryError(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setHistoryLoading(false);
      });
    return () => abort.abort();
  }, [pageNumber, filters, revision, realtimeRevision]);
  useEffect(() => {
    if (!returnId) {
      setReturned(null);
      setReturnError(false);
      setChecking(false);
      return;
    }
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(returnId)) {
      setReturned(null);
      setReturnError(true);
      setChecking(false);
      return;
    }
    const abort = new AbortController();
    setReturned(null);
    let count = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      setChecking(true);
      setReturnError(false);
      try {
        const { order, verificationPending } = await readCheckoutReturn(
          returnId,
          transactionId,
          "wallet",
          abort.signal,
        );
        if (abort.signal.aborted) return;
        setReturnError(verificationPending);
        setReturned(order);
        setOrders((current) => current.map((item) => item.id === order.id ? order : item));
        if ((order.status === "PENDING" || order.status === "EXPIRED") && ++count < 12)
          timer = setTimeout(() => {
            void poll();
          }, 10000);
        else if (order.status === "APPROVED") reload();
      } catch {
        if (!abort.signal.aborted) setReturnError(true);
      } finally {
        if (!abort.signal.aborted) setChecking(false);
      }
    };
    void poll();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [returnId, transactionId, checkRevision, reload]);

  // RETURN
  return {
    account: { wallet, loading, error, reload },
    history: {
      page,
      loading: historyLoading,
      error: historyError,
      filters,
      change,
      goTo: setPageNumber,
    },
    payments: {
      orders,
      error: paymentsError,
      returned,
      checking,
      returnError,
      check,
    },
  };
};
