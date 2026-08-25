import http from 'http';
import next from 'next';

import {Server} from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';

const app = next({dev});

const handle = app.getRequestHandler();


app.prepare().then(() => {
    const server = http.createServer((req,res) =>  handle(req,res));

    const io = new Server(server,{
        cors:{
            origin:process.env.NEXT_PUBLIC_APP_URL || "*",
            methods:["GET","POST"]
        }
    });

    global.io = io;

    io.use((socket,nextFn) => {
        const user = socket.handshake.auth.user;

        if(!user || !user.id){
            return nextFn(new Error("Unauthorized socket connection"));
        }

        socket.data.user = user;
        return nextFn();
    });

    io.on("connection",(socket) => {
         console.log("User connected:", socket.id);
        const user = socket.data.user;
        socket.join(`user:${user.id}`);

        socket.on("conversation:join",({conversationId}) => {
            if(conversationId) socket.join(`conversation:${conversationId}`);
        });

        socket.on("conversation:leave",({conversationId}) => {
            if(conversationId) socket.leave(`conversation:${conversationId}`);
        });

        socket.on("typing:start",({conversationId}) => {
            if(!conversationId) return;
            socket.to(`conversation:${conversationId}`).emit("typing:start",{
                conversationId,
                userId:user.id,
                name:user.name || "",
                role:user.role || "",
            });
        });

        socket.on("typing:stop",({conversationId}) => {
            if(!conversationId) return;
            socket.to(`conversation:${conversationId}`).emit("typing:stop",{
                conversationId,
                userId:user.id,
            });
        });
    });

    


    // const PORT = process.env.PORT || 3000;
    // server.listen(PORT,(err) => {
    //     if(err) throw err;
    //     console.log(`> Server is running on http://localhost:${PORT}`);
    // });

    //--------------------------
    // for production 
    //----------------------------

    const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, (err) => {
  if (err) throw err;

  console.log(
    `> Servizato server running on ${HOST}:${PORT}`,
  );
});
});