import { SessionStatus, StationStatus, type Prisma, type Session } from "@prisma/client";
import { DEFAULT_LOCATION_ID, prisma } from "../lib/prisma";
import { HttpError } from "../utils/asyncHandler";
import { computeAmount, deriveDisplayStatus, elapsedMs, remainingMs } from "../utils/sessionTime";
import { getIo, SOCKET_EVENTS } from "../sockets/io";

// Session carries a BigInt (totalPausedMs) and Decimal fields (ratePerHour,
// finalAmount) that Express's res.json() cannot serialize directly.
function serializeSession(session: Session) {
  return {
    ...session,
    ratePerHour: Number(session.ratePerHour),
    finalAmount: session.finalAmount !== null ? Number(session.finalAmount) : null,
    totalPausedMs: Number(session.totalPausedMs),
  };
}

const activeSessionsInclude = {
  sessions: {
    where: { status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] } },
    orderBy: { startedAt: "desc" as const },
  },
};

export async function startSession(params: {
  stationId: string;
  playerName?: string | null;
  packageLabel: string;
  ratePerHour: number;
  durationMin?: number | null;
  startedById?: string | null;
  orderItemId?: string | null;
}) {
  const station = await prisma.station.findUnique({
    where: { id: params.stationId },
    include: activeSessionsInclude,
  });
  if (!station) throw new HttpError(404, "Station not found");
  if (!station.allowMultipleSessions && station.sessions.length > 0) {
    throw new HttpError(409, "Station is not free");
  }

  const now = new Date();
  const plannedEndAt = params.durationMin ? new Date(now.getTime() + params.durationMin * 60_000) : null;

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        stationId: params.stationId,
        playerName: params.playerName ?? null,
        packageLabel: params.packageLabel,
        ratePerHour: params.ratePerHour,
        durationMin: params.durationMin ?? null,
        plannedEndAt,
        startedById: params.startedById ?? null,
        orderItemId: params.orderItemId ?? null,
        status: SessionStatus.ACTIVE,
      },
    });
    if (!station.allowMultipleSessions) {
      await tx.station.update({ where: { id: params.stationId }, data: { status: StationStatus.ACTIVE } });
    }
    return created;
  });

  await broadcastSnapshot();
  return serializeSession(session);
}

async function getActiveOrThrow(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new HttpError(404, "Session not found");
  if (session.status === SessionStatus.ENDED) throw new HttpError(409, "Session has already ended");
  return session;
}

/** Recomputes a station's coarse status field from its still-active sessions. Skipped for multi-session stations, where one station-wide value can't represent several independent occupants. */
async function syncStationStatus(tx: Prisma.TransactionClient, stationId: string) {
  const station = await tx.station.findUniqueOrThrow({ where: { id: stationId } });
  if (station.allowMultipleSessions) return;

  const remaining = await tx.session.findMany({
    where: { stationId, status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] } },
  });
  const status = remaining.length === 0
    ? StationStatus.FREE
    : remaining.some((s) => s.status === SessionStatus.ACTIVE)
      ? StationStatus.ACTIVE
      : StationStatus.PAUSED;
  await tx.station.update({ where: { id: stationId }, data: { status } });
}

export async function pauseSession(sessionId: string) {
  const session = await getActiveOrThrow(sessionId);
  if (session.status === SessionStatus.PAUSED) throw new HttpError(409, "Session is already paused");

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.PAUSED, pausedAt: now },
    });
    await syncStationStatus(tx, session.stationId);
    return s;
  });

  await broadcastSnapshot();
  return serializeSession(updated);
}

export async function resumeSession(sessionId: string) {
  const session = await getActiveOrThrow(sessionId);
  if (session.status !== SessionStatus.PAUSED || !session.pausedAt) {
    throw new HttpError(409, "Session is not paused");
  }

  const now = new Date();
  const pausedDurationMs = BigInt(now.getTime() - session.pausedAt.getTime());
  const newPlannedEndAt = session.plannedEndAt
    ? new Date(session.plannedEndAt.getTime() + Number(pausedDurationMs))
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.ACTIVE,
        pausedAt: null,
        totalPausedMs: session.totalPausedMs + pausedDurationMs,
        plannedEndAt: newPlannedEndAt,
      },
    });
    await syncStationStatus(tx, session.stationId);
    return s;
  });

  await broadcastSnapshot();
  return serializeSession(updated);
}

export async function extendSession(sessionId: string, minutes: number) {
  if (minutes <= 0) throw new HttpError(400, "Extension minutes must be positive");
  const session = await getActiveOrThrow(sessionId);

  const base = session.plannedEndAt ?? new Date();
  const newPlannedEndAt = new Date(base.getTime() + minutes * 60_000);

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      plannedEndAt: newPlannedEndAt,
      durationMin: (session.durationMin ?? 0) + minutes,
      extensionsMin: session.extensionsMin + minutes,
    },
  });

  await broadcastSnapshot();
  return serializeSession(updated);
}

export async function endSession(sessionId: string) {
  const session = await getActiveOrThrow(sessionId);
  const now = new Date();
  const billableMs = elapsedMs(session, now);
  const finalAmount = computeAmount(Number(session.ratePerHour), billableMs);

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.session.update({
      where: { id: sessionId },
      data: { status: SessionStatus.ENDED, endedAt: now, finalAmount },
    });
    await syncStationStatus(tx, session.stationId);
    return s;
  });

  await broadcastSnapshot();
  return serializeSession(updated);
}

export async function transferSession(sessionId: string, targetStationId: string) {
  const session = await getActiveOrThrow(sessionId);
  if (session.stationId === targetStationId) throw new HttpError(400, "Cannot transfer to the same station");

  const targetStation = await prisma.station.findUnique({
    where: { id: targetStationId },
    include: activeSessionsInclude,
  });
  if (!targetStation) throw new HttpError(404, "Target station not found");
  if (!targetStation.allowMultipleSessions && targetStation.sessions.length > 0) {
    throw new HttpError(409, "Target station is not free");
  }

  const now = new Date();

  const newSession = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        stationId: targetStationId,
        playerName: session.playerName,
        packageLabel: session.packageLabel,
        ratePerHour: session.ratePerHour,
        durationMin: session.durationMin,
        status: session.status,
        startedAt: session.startedAt,
        plannedEndAt: session.plannedEndAt,
        pausedAt: session.pausedAt,
        totalPausedMs: session.totalPausedMs,
        extensionsMin: session.extensionsMin,
        startedById: session.startedById,
        transferredFromId: session.id,
      },
    });
    await tx.session.update({
      where: { id: session.id },
      data: { status: SessionStatus.ENDED, endedAt: now },
    });
    await syncStationStatus(tx, session.stationId);
    if (!targetStation.allowMultipleSessions) {
      await tx.station.update({
        where: { id: targetStationId },
        data: { status: session.status === SessionStatus.PAUSED ? StationStatus.PAUSED : StationStatus.ACTIVE },
      });
    }
    return created;
  });

  await broadcastSnapshot();
  return serializeSession(newSession);
}

// ── Live snapshot for socket broadcast + REST polling fallback ──────────

export async function buildSnapshot(locationId: string = DEFAULT_LOCATION_ID) {
  const now = new Date();

  const stations = await prisma.station.findMany({
    where: { locationId, active: true },
    orderBy: { sortOrder: "asc" },
    include: activeSessionsInclude,
  });

  const stationPayload = stations.map((station) => {
    const sessions = station.sessions.map((session) => ({
      id: session.id,
      playerName: session.playerName,
      packageLabel: session.packageLabel,
      ratePerHour: Number(session.ratePerHour),
      status: session.status,
      startedAt: session.startedAt,
      plannedEndAt: session.plannedEndAt,
      durationMin: session.durationMin,
      extensionsMin: session.extensionsMin,
      elapsedMs: elapsedMs(session, now),
      remainingMs: remainingMs(session, now),
      displayStatus: deriveDisplayStatus(session, now),
    }));

    return {
      id: station.id,
      name: station.name,
      type: station.type,
      allowMultipleSessions: station.allowMultipleSessions,
      sessions,
    };
  });

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [activeCount, sessionsToday, endedToday] = await Promise.all([
    prisma.session.count({ where: { status: SessionStatus.ACTIVE, station: { locationId } } }),
    prisma.session.count({ where: { startedAt: { gte: startOfDay }, station: { locationId } } }),
    prisma.session.findMany({
      where: { status: SessionStatus.ENDED, endedAt: { gte: startOfDay }, station: { locationId } },
      select: { finalAmount: true },
    }),
  ]);

  const expiringSoonCount = stationPayload.reduce(
    (sum, s) => sum + s.sessions.filter((sess) => sess.displayStatus === "EXPIRING_SOON").length,
    0
  );

  const revenueToday = endedToday.reduce((sum, s) => sum + Number(s.finalAmount ?? 0), 0);

  return {
    stations: stationPayload,
    stats: {
      activeNow: activeCount,
      expiringSoon: expiringSoonCount,
      sessionsToday,
      revenueToday: Math.round(revenueToday * 100) / 100,
    },
  };
}

export async function broadcastSnapshot(locationId: string = DEFAULT_LOCATION_ID) {
  const snapshot = await buildSnapshot(locationId);
  getIo().emit(SOCKET_EVENTS.SESSIONS_SNAPSHOT, snapshot);
  return snapshot;
}
