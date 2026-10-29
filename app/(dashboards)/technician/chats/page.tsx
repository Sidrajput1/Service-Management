


import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import TechChatPage from "@/components/chat/TechChatPage";


export default async function TechnicianChatsPage() {
   const session = await getServerSession(authOptions);
    if(!session){
      return("/signin");
    }
  return (
   <TechChatPage session={session}/>
  );
}