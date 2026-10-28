import { useEffect, useState } from "react";
import { httpService } from "@/services/auth/authService";
import type {
  Recipe,
  RecipeKind,
  RecipeState,
  RetentionOverview,
} from "@/modules/automation/types";

// CONSTANTS
const initialRecipe = (kind: RecipeKind): Recipe => ({
  kind,
  enabled: false,
  inactive_days: 30,
  lead_days: 7,
  frequency_days: 30,
  minimum_discount: 5,
  maximum_discount: 15,
});
// COMPOSABLE
export const useRetentionRecipes = (businessId: number): RecipeState => {
  // STATE
  const [data, setData] = useState<RetentionOverview | null>(null);
  const [value, setValue] = useState<Recipe>(initialRecipe("RETURN_REMINDER"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    void httpService
      .get<{ data: RetentionOverview }>(`/v2/retention/${businessId}`, {
        signal: controller.signal,
      })
      .then((response) => {
        if (!controller.signal.aborted) {
          setData(response.data);
          setValue(
            (current) =>
              response.data.recipes.find(
                (recipe) => recipe.kind === current.kind,
              ) ?? current,
          );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [businessId, revision]);
  // ACTIONS
  const refresh = () => setRevision((current) => current + 1);
  const perform = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await operation();
      refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  // RETURN
  return {
    directory: {
      data,
      busy,
      error,
      refresh,
      scan: () =>
        perform(async () => {
          await httpService.post(`/v2/retention/${businessId}/scan`);
        }),
    },
    editor: {
      value,
      setValue,
      select: (kind) =>
        setValue(
          data?.recipes.find((recipe) => recipe.kind === kind) ??
            initialRecipe(kind),
        ),
      save: () =>
        perform(async () => {
          await httpService.put(`/v2/retention/${businessId}/recipes`, value);
        }),
    },
    actions: {
      approve: (action) =>
        perform(async () => {
          await httpService.post(
            `/v2/retention/${businessId}/actions/${action.id}/approve`,
            { discount: action.payload.suggested_discount ?? null },
          );
        }),
    },
  };
};
