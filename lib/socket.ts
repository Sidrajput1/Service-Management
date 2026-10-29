import type { Server as SocketIOServer } from "socket.io";

declare global {
  var io:
    | (SocketIOServer & {
        emitAuthorizedJobStatus?: (id: string) => Promise<void>;
        emitAuthorizedConversation?: (
          id: string,
          event: string,
          payload: unknown,
        ) => Promise<void>;
      })
    | undefined;
}

export function getIO() {
  return global.io;
}

export function emitConversationMessage(conversationId: string, payload: any) {
  void global.io
    ?.emitAuthorizedConversation?.(conversationId, "message:new", payload)
    .catch(() => undefined);
}

export function emitConversationUpdate(conversationId: string, payload: any) {
  void global.io
    ?.emitAuthorizedConversation?.(
      conversationId,
      "conversation:update",
      payload,
    )
    .catch(() => undefined);
}

export function emitToUSer(userId: string, event: string, payload: any) {
  global.io?.to(`user:${userId}`).emit(event, payload);
}
