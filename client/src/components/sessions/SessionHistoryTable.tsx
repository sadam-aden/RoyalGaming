import { format } from "date-fns";
import type { SessionHistoryRow } from "../../types";
import { Badge } from "../ui/Badge";
import { formatCurrency } from "../../lib/format";

const statusTone: Record<string, "green" | "amber" | "neutral" | "blue"> = {
  ACTIVE: "green",
  PAUSED: "amber",
  ENDED: "neutral",
  TRANSFERRED: "blue",
};

export function SessionHistoryTable({ rows }: { rows: SessionHistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-text-faint">No sessions for this date.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-faint">
            <th className="pb-3 pr-4 font-medium">Station</th>
            <th className="pb-3 pr-4 font-medium">Player</th>
            <th className="pb-3 pr-4 font-medium">Package</th>
            <th className="pb-3 pr-4 font-medium">Started</th>
            <th className="pb-3 pr-4 font-medium">Ended</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border-soft/60 text-text">
              <td className="py-3 pr-4 font-medium">{row.stationName}</td>
              <td className="py-3 pr-4 text-text-muted">{row.playerName || "Walk-in"}</td>
              <td className="py-3 pr-4 text-text-muted">{row.packageLabel}</td>
              <td className="py-3 pr-4 text-text-muted">{format(new Date(row.startedAt), "h:mm a")}</td>
              <td className="py-3 pr-4 text-text-muted">{row.endedAt ? format(new Date(row.endedAt), "h:mm a") : "—"}</td>
              <td className="py-3 pr-4">
                <Badge tone={statusTone[row.status]}>
                  {row.status === "TRANSFERRED" && row.transferredToStation
                    ? `Transferred → ${row.transferredToStation}`
                    : row.status}
                </Badge>
              </td>
              <td className="py-3 text-right font-medium">
                {row.finalAmount !== null ? formatCurrency(row.finalAmount) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
