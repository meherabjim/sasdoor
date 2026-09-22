"use client";

import { HardHat, Check, Play, Undo2 } from "lucide-react";
import { api, fmtDate } from "@/lib/erp";
import { Badge, Button, Card, Select, useAction } from "@/components/erp/ui";

/**
 * The work sheet: which job, how many men it was sold as, who is on it, how far along.
 *
 * It sits on the order rather than on a workshop screen of its own. That is not a saving of
 * effort - it is where the question gets asked. You are looking at a door and you want to
 * know where it has got to; a second dashboard would be the same rows arranged differently,
 * and two screens showing one thing are two screens to keep in step.
 *
 * The men and days are what the door was sold as, copied onto the line the day the estimate
 * was saved. Change a labour rate next month and this order still says what was agreed.
 */

export type Step = {
  lineId: number; job: string; workers: number; days: number;
  workerId: number | null; workerName: string | null;
  startedAt: string | null; doneAt: string | null;
  state: "TODO" | "DOING" | "DONE";
};

const TONE = { TODO: "gray", DOING: "amber", DONE: "green" } as const;
const LABEL = { TODO: "Not started", DOING: "Being done", DONE: "Finished" } as const;

export function WorkSheet({ steps, work, workers, locked, onChange }: {
  steps: Step[];
  work: { total: number; done: number; workers: number; days: number };
  workers: { id: number; name: string; skill: string; active: boolean }[];
  /** An estimate nobody has agreed to, or a cancelled one: nothing is being made. */
  locked?: boolean;
  onChange: () => void;
}) {
  const { busy, run } = useAction();
  const set = async (lineId: number, body: Record<string, unknown>) => {
    if (await run(() => api.patch(`/api/admin/estimates/lines/${lineId}`, body))) onChange();
  };

  if (!steps.length) {
    return (
      <Card title="Work sheet">
        <p className="text-sm text-[#9a8b7e]">
          No jobs on this door. Set the workers and days for each job in <b>Price Settings → Labour Price</b>
          {" "}and <b>Design Price</b>, and every estimate made after that carries them.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Work sheet" actions={
      <span className="flex items-center gap-2 text-xs text-[#7a6a5d]">
        <HardHat className="h-4 w-4" />
        {work.workers} {work.workers === 1 ? "man" : "men"} · about {work.days} {work.days === 1 ? "day" : "days"} · {work.done} of {work.total} done
      </span>
    }>
      {locked && (
        <p className="mb-3 rounded-lg bg-[#faf7f3] px-3 py-2 text-xs text-[#7a6a5d]">
          This is still an estimate. The plan below is what it would take; nobody is put on a
          job until the customer says yes.
        </p>
      )}
      <ul className="divide-y divide-[#f1ebe3]">
        {steps.map((s) => (
          <li key={s.lineId} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-[180px] flex-1">
              <div className="font-medium text-[#1f1712]">{s.job}</div>
              <div className="text-xs text-[#9a8b7e]">
                {s.workers || s.days ? `${s.workers} ${s.workers === 1 ? "man" : "men"} · ${s.days} ${s.days === 1 ? "day" : "days"}` : "no plan set"}
                {s.doneAt ? ` · finished ${fmtDate(s.doneAt)}` : s.startedAt ? ` · started ${fmtDate(s.startedAt)}` : ""}
              </div>
            </div>

            <Select id={`w-${s.lineId}`} className="w-auto min-w-[150px]" value={s.workerId ?? ""} disabled={locked}
              onChange={(ev) => set(s.lineId, { workerId: ev.target.value ? Number(ev.target.value) : null })}>
              <option value="">Nobody yet</option>
              {/* A man taken off the list keeps his name on the jobs he already had. */}
              {workers.filter((w) => w.active || w.id === s.workerId).map((w) => (
                <option key={w.id} value={w.id}>{w.name}{w.active ? "" : " (gone)"}</option>
              ))}
            </Select>

            <Badge tone={TONE[s.state]}>{LABEL[s.state]}</Badge>

            <div className="flex gap-1.5">
              {s.state !== "DONE" && (
                <Button size="sm" variant={s.state === "DOING" ? "primary" : "ghost"} busy={busy} disabled={locked}
                  onClick={() => set(s.lineId, { state: s.state === "TODO" ? "DOING" : "DONE" })}>
                  {s.state === "TODO" ? <><Play className="h-3.5 w-3.5" />Start</> : <><Check className="h-3.5 w-3.5" />Finish</>}
                </Button>
              )}
              {s.state !== "TODO" && (
                <Button size="sm" variant="ghost" aria-label="Undo" title="Back a step" busy={busy} disabled={locked}
                  onClick={() => set(s.lineId, { state: s.state === "DONE" ? "DOING" : "TODO" })}>
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[#9a8b7e]">
        The customer sees these same jobs on their own page — the job and whether it is waiting,
        being done or finished. Not the headcount, and not who is on it.
      </p>
    </Card>
  );
}
