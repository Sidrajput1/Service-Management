import type {Server as  SocketIOServer} from "socket.io";

declare global {
    var io : SocketIOServer | undefined;
};

export function getIO(){
    return global.io;
};

export function emitConversationMessage(conversationId: string, payload: any){
    global.io?.to(`conversation:${conversationId}`).emit("message:new", payload);

};

export function emitConversationUpdate(conversationId:string,payload:any){
    global.io?.to(`conversation:${conversationId}`).emit("conversation:update", payload);
};

export function emitToUSer(userId: string,event:string,payload:any){
    global.io?.to(`user:${userId}`).emit(event, payload);
}