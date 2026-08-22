import { NumberList, type NumberItem } from "@/components/student/number-list";
import {
  createGetAvailableNumbersDeps,
  getAvailableNumbers,
} from "@/server/operations/get-available-numbers";

const VALID_REASONS = ["expired", "taken-over", "no-reservation"] as const;
type Reason = (typeof VALID_REASONS)[number];

function parseReason(value: string | string[] | undefined): Reason | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return VALID_REASONS.includes(raw as Reason) ? (raw as Reason) : null;
}

export default async function NumberSelectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  let initialNumbers: NumberItem[] = [];
  let initialError = false;
  try {
    const result = await getAvailableNumbers({ limit: 12 }, createGetAvailableNumbersDeps());
    initialNumbers = result.numbers;
  } catch {
    initialError = true;
  }

  return (
    <NumberList
      initialNumbers={initialNumbers}
      initialError={initialError}
      reason={parseReason(params.reason)}
    />
  );
}
