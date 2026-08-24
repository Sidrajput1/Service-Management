// models/index.ts
import Customer from "./customer";
import ServiceRequest from "./ServiceRequest";
import ServiceOffering from "./ServiceOffering";
import Technician from "./technician";
import Booking from "./booking";
import Job from "./job"
import ServiceProvider from "./ServiceProvider";

// exporting ensures imports are not tree-shaken
export { Customer, ServiceRequest, ServiceOffering,Technician,Booking,Job,ServiceProvider };
