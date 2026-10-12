"use client";
import { useEffect, useRef } from "react";

// Quick actions can target a view that is not mounted yet: the command waits here
// until that view mounts (or is delivered immediately if it is already listening).
export type QuickCommand = "stage" | "optimize" | "template" | "share" | "export" | "tap" | "camelot" | "stats";

let pending: QuickCommand | null = null;
const eventName = "mixnotes-quick-command";

export function queueCommand(command: QuickCommand) {
  pending = command;
  window.dispatchEvent(new Event(eventName));
}

export function useQuickCommands(accepts: QuickCommand[], handle: (command: QuickCommand) => void) {
  const handler = useRef(handle);
  useEffect(() => { handler.current = handle; });
  const key = accepts.join(",");
  useEffect(() => {
    const wanted = key.split(",");
    const deliver = () => {
      if (!pending || !wanted.includes(pending)) return;
      const command = pending;
      pending = null;
      // Let the view finish rendering before opening dialogs or scrolling.
      requestAnimationFrame(() => handler.current(command));
    };
    deliver();
    window.addEventListener(eventName, deliver);
    return () => window.removeEventListener(eventName, deliver);
  }, [key]);
}
