import Technician from "@/models/technician";
import { requireCurrentUser } from "./auth";

export async function requireTechnicianProfile() {
    const user = await requireCurrentUser();

    if(user.role !== "technician"){
        throw new Error("Unauthorized");
    };

    const tech = await Technician.findOne({userId: user._id});

    if(!tech){
        throw new Error("Technician not found");
    }

    return {user,tech};
}