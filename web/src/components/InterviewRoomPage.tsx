import { useEffect, useRef, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { apiFetch } from "../api";

export function InterviewRoomPage({ roomId }: { roomId: string }) {
  const roomRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let kit: ZegoUIKitPrebuilt | undefined;
    void apiFetch<{ token: string; roomId: string; userName: string }>(`/api/interviews/${encodeURIComponent(roomId)}/token?name=${encodeURIComponent("Interview guest")}`)
      .then(({ token }) => {
        if (disposed || !roomRef.current) return;
        kit = ZegoUIKitPrebuilt.create(token);
        kit.joinRoom({
          container: roomRef.current,
          scenario: { mode: ZegoUIKitPrebuilt.VideoConference },
          showPreJoinView: true,
          showScreenSharingButton: true,
          showTextChat: true,
          onLeaveRoom: () => window.history.back(),
        });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to open the interview room."));
    return () => {
      disposed = true;
      kit?.destroy();
    };
  }, [roomId]);

  return error
    ? <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center"><div><h1 className="text-xl font-black text-slate-950">Interview room unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></main>
    : <main className="min-h-screen bg-slate-950"><div ref={roomRef} className="h-screen w-full" /></main>;
}
