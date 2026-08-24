


import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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